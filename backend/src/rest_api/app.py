import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key


dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")
sns = boto3.client("sns")

reparaciones_table = dynamodb.Table(os.environ["REPARACIONES_TABLE"])
mensajes_table = dynamodb.Table(os.environ["MENSAJES_TABLE"])
clientes_table = dynamodb.Table(os.environ["CLIENTES_TABLE"])
historial_table = dynamodb.Table(os.environ["HISTORIAL_TABLE"])
adjuntos_table = dynamodb.Table(os.environ["ADJUNTOS_TABLE"])

ADJUNTOS_BUCKET = os.environ["ADJUNTOS_BUCKET"]
SNS_TOPIC_ARN = os.environ["NOTIFICACIONES_TOPIC_ARN"]

ESTADOS_VALIDOS = {
    "Recibido",
    "En diagnóstico",
    "En reparación",
    "Esperando repuesto",
    "Listo para retirar",
    "Entregado",
    "Cancelado",
}


class JsonEncoder(json.JSONEncoder):
    def default(self, value):
        if isinstance(value, Decimal):
            return int(value) if value % 1 == 0 else float(value)
        return super().default(value)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
        },
        "body": json.dumps(body, cls=JsonEncoder, ensure_ascii=False),
    }


def parse_body(event):
    if not event.get("body"):
        return {}
    try:
        return json.loads(event["body"])
    except json.JSONDecodeError:
        return None


def claims_from(event):
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    raw_groups = claims.get("cognito:groups", "")
    if isinstance(raw_groups, list):
        groups = set(raw_groups)
    else:
        groups = {group.strip() for group in raw_groups.split(",") if group.strip()}
    return {
        "usuarioId": claims.get("sub", "demo-user"),
        "email": claims.get("email", "demo@techrepair.local"),
        "nombre": claims.get("name", "Usuario Demo"),
        "groups": groups,
    }


def is_technician(user):
    demo_technician_email = "tecnico@techrepair.demo"
    return "TECNICO" in user["groups"] or user.get("email", "").lower() == demo_technician_email


def scan_all(table):
    items = []
    response_data = table.scan()
    items.extend(response_data.get("Items", []))
    while "LastEvaluatedKey" in response_data:
        response_data = table.scan(ExclusiveStartKey=response_data["LastEvaluatedKey"])
        items.extend(response_data.get("Items", []))
    return items


def record_status_change(reparacion_id, old_status, new_status, user, observacion=""):
    historial_table.put_item(
        Item={
            "reparacionId": reparacion_id,
            "fechaCambio": now_iso(),
            "estadoAnterior": old_status,
            "estadoNuevo": new_status,
            "usuarioCambio": user["usuarioId"],
            "usuarioNombre": user["nombre"],
            "observacion": observacion,
        }
    )


def create_repair(event, user):
    body = parse_body(event)
    if body is None:
        return response(400, {"error": "JSON invalido"})

    required = ["tipoEquipo", "marca", "modelo", "problemaReportado"]
    if is_technician(user):
        required.extend(["clienteNombre", "clienteCorreo"])
    missing = [field for field in required if not body.get(field)]
    if missing:
        return response(400, {"error": "Campos obligatorios faltantes", "campos": missing})

    problem = body["problemaReportado"].strip()
    if len(problem) > 700:
        return response(400, {"error": "El problema reportado no puede superar 700 caracteres"})

    tipo = body["tipoEquipo"]
    if tipo not in {"Celular", "Laptop", "Consola"}:
        return response(400, {"error": "tipoEquipo debe ser Celular, Laptop o Consola"})

    timestamp = now_iso()
    repair_id = body.get("reparacionId") or f"REP-{uuid.uuid4().hex[:8].upper()}"
    client_name = body.get("clienteNombre") if is_technician(user) else user["nombre"]
    client_email = body.get("clienteCorreo") if is_technician(user) else user["email"]
    client_id = (
        body.get("clienteId")
        or f"manual#{client_email.lower()}"
        if is_technician(user)
        else user["usuarioId"]
    )
    item = {
        "reparacionId": repair_id,
        "clienteId": client_id,
        "clienteNombre": client_name,
        "clienteCorreo": client_email,
        "tipoEquipo": tipo,
        "marca": body["marca"],
        "modelo": body["modelo"],
        "problemaReportado": problem,
        "diagnostico": body.get("diagnostico", "Pendiente de revision"),
        "estado": body.get("estado", "Recibido") if is_technician(user) else "Recibido",
        "fechaIngreso": body.get("fechaIngreso", timestamp[:10]),
        "fechaFinalizacion": body.get("fechaFinalizacion"),
        "costoEstimado": Decimal(str(body.get("costoEstimado", 0))) if is_technician(user) else Decimal("0"),
        "tecnicoAsignado": body.get("tecnicoAsignado", "Por asignar") if is_technician(user) else "Por asignar",
        "observaciones": body.get("observaciones", ""),
        "origen": "TECNICO" if is_technician(user) else "CLIENTE",
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    if item["estado"] not in ESTADOS_VALIDOS:
        return response(400, {"error": "Estado invalido"})

    reparaciones_table.put_item(Item=item)
    record_status_change(repair_id, "Nuevo", item["estado"], user, "Reparacion registrada")
    return response(201, item)


def list_repairs(user):
    if is_technician(user):
        items = scan_all(reparaciones_table)
    else:
        result = reparaciones_table.query(
            IndexName="clienteId-index",
            KeyConditionExpression=Key("clienteId").eq(user["usuarioId"]),
        )
        items = result.get("Items", [])
    return response(200, {"items": sorted(items, key=lambda item: item.get("createdAt", ""), reverse=True)})


def get_client_repairs(cliente_id, user):
    if not is_technician(user) and cliente_id != user["usuarioId"]:
        return response(403, {"error": "No puedes consultar reparaciones de otro cliente"})
    result = reparaciones_table.query(
        IndexName="clienteId-index",
        KeyConditionExpression=Key("clienteId").eq(cliente_id),
    )
    return response(200, {"items": result.get("Items", [])})


def get_repair(reparacion_id, user):
    result = reparaciones_table.get_item(Key={"reparacionId": reparacion_id})
    item = result.get("Item")
    if not item:
        return response(404, {"error": "Reparacion no encontrada"})
    if not is_technician(user) and item.get("clienteId") != user["usuarioId"]:
        return response(403, {"error": "No puedes ver esta reparacion"})

    history = historial_table.query(
        KeyConditionExpression=Key("reparacionId").eq(reparacion_id)
    ).get("Items", [])
    attachments = adjuntos_table.query(
        KeyConditionExpression=Key("reparacionId").eq(reparacion_id)
    ).get("Items", [])
    for attachment in attachments:
        attachment["downloadUrl"] = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": ADJUNTOS_BUCKET, "Key": attachment["s3Key"]},
            ExpiresIn=3600,
        )
    return response(200, {"reparacion": item, "historial": history, "adjuntos": attachments})


def change_status(event, reparacion_id, user):
    if not is_technician(user):
        return response(403, {"error": "Solo el tecnico puede cambiar estados"})

    body = parse_body(event)
    if body is None:
        return response(400, {"error": "JSON invalido"})

    new_status = body.get("estado")
    if new_status not in ESTADOS_VALIDOS:
        return response(400, {"error": "Estado invalido"})

    result = reparaciones_table.get_item(Key={"reparacionId": reparacion_id})
    item = result.get("Item")
    if not item:
        return response(404, {"error": "Reparacion no encontrada"})

    old_status = item["estado"]
    timestamp = now_iso()
    update_expression = "SET estado = :estado, updatedAt = :updatedAt"
    values = {":estado": new_status, ":updatedAt": timestamp}
    if new_status == "Entregado":
        update_expression += ", fechaFinalizacion = :fechaFinalizacion"
        values[":fechaFinalizacion"] = timestamp[:10]

    reparaciones_table.update_item(
        Key={"reparacionId": reparacion_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=values,
    )
    record_status_change(reparacion_id, old_status, new_status, user, body.get("observacion", ""))

    if new_status == "Listo para retirar":
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=f"TechRepair: {reparacion_id} listo para retirar",
            Message=(
                f"La reparacion {reparacion_id} de {item['clienteNombre']} "
                f"cambio a estado: Listo para retirar."
            ),
        )

    return response(200, {"reparacionId": reparacion_id, "estadoAnterior": old_status, "estadoNuevo": new_status})


def create_attachment(event, reparacion_id, user):
    repair = reparaciones_table.get_item(Key={"reparacionId": reparacion_id}).get("Item")
    if not repair:
        return response(404, {"error": "Reparacion no encontrada"})
    if not is_technician(user) and repair.get("clienteId") != user["usuarioId"]:
        return response(403, {"error": "No puedes agregar evidencias a esta reparacion"})

    body = parse_body(event)
    if body is None:
        return response(400, {"error": "JSON invalido"})

    file_name = body.get("fileName", "evidencia.jpg")
    content_type = body.get("contentType", "image/jpeg")
    archivo_id = str(uuid.uuid4())
    key = f"reparaciones/{reparacion_id}/{archivo_id}-{file_name}"
    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": ADJUNTOS_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=900,
    )
    download_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": ADJUNTOS_BUCKET, "Key": key},
        ExpiresIn=3600,
    )
    item = {
        "reparacionId": reparacion_id,
        "archivoId": archivo_id,
        "fileName": file_name,
        "contentType": content_type,
        "s3Key": key,
        "createdAt": now_iso(),
        "createdBy": user["usuarioId"],
        "createdByRol": "TECNICO" if is_technician(user) else "CLIENTE",
    }
    adjuntos_table.put_item(Item=item)
    return response(201, {"adjunto": item, "uploadUrl": upload_url, "downloadUrl": download_url})


def list_attachments(reparacion_id, user):
    repair = reparaciones_table.get_item(Key={"reparacionId": reparacion_id}).get("Item")
    if not repair:
        return response(404, {"error": "Reparacion no encontrada"})
    if not is_technician(user) and repair.get("clienteId") != user["usuarioId"]:
        return response(403, {"error": "No puedes ver estos adjuntos"})

    items = adjuntos_table.query(
        KeyConditionExpression=Key("reparacionId").eq(reparacion_id)
    ).get("Items", [])
    for item in items:
        item["downloadUrl"] = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": ADJUNTOS_BUCKET, "Key": item["s3Key"]},
            ExpiresIn=3600,
        )
    return response(200, {"items": items})


def list_messages(reparacion_id, user):
    repair = reparaciones_table.get_item(Key={"reparacionId": reparacion_id}).get("Item")
    if not repair:
        return response(404, {"error": "Reparacion no encontrada"})
    if not is_technician(user) and repair.get("clienteId") != user["usuarioId"]:
        return response(403, {"error": "No puedes ver estos mensajes"})

    items = mensajes_table.query(
        KeyConditionExpression=Key("reparacionId").eq(reparacion_id)
    ).get("Items", [])
    return response(200, {"items": items})


def report_summary(user):
    if not is_technician(user):
        return response(403, {"error": "Solo el tecnico puede ver reportes"})
    items = scan_all(reparaciones_table)
    total = len(items)
    pendientes = len([item for item in items if item.get("estado", "Recibido") not in {"Entregado", "Cancelado"}])
    finalizadas = len([item for item in items if item.get("estado") == "Entregado"])
    esperando = len([item for item in items if item.get("estado") == "Esperando repuesto"])
    return response(200, {"total": total, "pendientes": pendientes, "finalizadas": finalizadas, "esperandoRepuesto": esperando})


def report_grouped(user, field):
    if not is_technician(user):
        return response(403, {"error": "Solo el tecnico puede ver reportes"})
    counts = {}
    for item in scan_all(reparaciones_table):
        key = item.get(field, "Sin dato")
        counts[key] = counts.get(key, 0) + 1
    return response(200, {"items": [{"label": key, "total": value} for key, value in sorted(counts.items())]})


def conversation_history(user):
    if not is_technician(user):
        return response(403, {"error": "Solo el tecnico puede ver el historial de conversaciones"})

    repairs = scan_all(reparaciones_table)
    conversations = []
    for repair in repairs:
        repair_id = repair.get("reparacionId")
        if not repair_id:
            continue
        try:
            result = mensajes_table.query(
                KeyConditionExpression=Key("reparacionId").eq(repair_id),
                ScanIndexForward=False,
                Limit=1,
            )
            last_message = result.get("Items", [None])[0]
        except Exception as error:
            print(f"No se pudo consultar mensajes para {repair_id}: {error}")
            last_message = None
        conversations.append({
            "reparacionId": repair_id,
            "clienteNombre": repair.get("clienteNombre", "Cliente"),
            "tipoEquipo": repair.get("tipoEquipo", ""),
            "marca": repair.get("marca", ""),
            "modelo": repair.get("modelo", ""),
            "estado": repair.get("estado", "Recibido"),
            "ultimoMensaje": last_message.get("contenido") if last_message else "Sin mensajes",
            "ultimoMensajeFecha": last_message.get("createdAt") if last_message else repair.get("createdAt", ""),
        })

    conversations.sort(key=lambda item: item.get("ultimoMensajeFecha", ""), reverse=True)
    return response(200, {"items": conversations})


def handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method")
    route_key = event.get("routeKey", "")
    path_params = event.get("pathParameters") or {}
    user = claims_from(event)

    if route_key == "POST /reparaciones":
        return create_repair(event, user)
    if route_key == "GET /reparaciones":
        return list_repairs(user)
    if route_key == "GET /reparaciones/{id}":
        return get_repair(path_params["id"], user)
    if route_key == "PATCH /reparaciones/{id}/estado":
        return change_status(event, path_params["id"], user)
    if route_key == "GET /clientes/{clienteId}/reparaciones":
        return get_client_repairs(path_params["clienteId"], user)
    if route_key == "POST /reparaciones/{id}/adjuntos":
        return create_attachment(event, path_params["id"], user)
    if route_key == "GET /reparaciones/{id}/adjuntos":
        return list_attachments(path_params["id"], user)
    if route_key == "GET /reparaciones/{id}/mensajes":
        return list_messages(path_params["id"], user)
    if route_key == "GET /reportes/resumen":
        return report_summary(user)
    if route_key == "GET /reportes/estados":
        return report_grouped(user, "estado")
    if route_key == "GET /reportes/tipos-equipo":
        return report_grouped(user, "tipoEquipo")
    if route_key == "GET /historial/conversaciones":
        return conversation_history(user)

    return response(405, {"error": f"Ruta no soportada: {method} {route_key}"})
