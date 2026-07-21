import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError


dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table(os.environ["CONEXIONES_TABLE"])
messages_table = dynamodb.Table(os.environ["MENSAJES_TABLE"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def management_client(event):
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]
    return boto3.client("apigatewaymanagementapi", endpoint_url=f"https://{domain}/{stage}")


def send_to_connection(client, connection_id, payload):
    try:
        client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        )
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") == "GoneException":
            connections_table.delete_item(Key={"connectionId": connection_id})
        else:
            raise


def get_sender(connection_id):
    result = connections_table.get_item(Key={"connectionId": connection_id})
    return result.get("Item", {})


def join_repair_chat(event, body):
    connection_id = event["requestContext"]["connectionId"]
    reparacion_id = body.get("reparacionId")
    if not reparacion_id:
        return {"statusCode": 400, "body": "Falta reparacionId"}

    connections_table.update_item(
        Key={"connectionId": connection_id},
        UpdateExpression="SET reparacionId = :reparacionId",
        ExpressionAttributeValues={":reparacionId": reparacion_id},
    )
    client = management_client(event)
    send_to_connection(client, connection_id, {"type": "joined", "reparacionId": reparacion_id})
    return {"statusCode": 200, "body": "joined"}


def send_message(event, body):
    connection_id = event["requestContext"]["connectionId"]
    reparacion_id = body.get("reparacionId")
    contenido = (body.get("contenido") or "").strip()
    if not reparacion_id or not contenido:
        return {"statusCode": 400, "body": "Faltan reparacionId o contenido"}

    sender = get_sender(connection_id)
    created_at = now_iso()
    message = {
        "reparacionId": reparacion_id,
        "createdAt": created_at,
        "mensajeId": str(uuid.uuid4()),
        "emisorId": sender.get("usuarioId", body.get("emisorId", "anonimo")),
        "emisorNombre": sender.get("usuarioNombre", body.get("emisorNombre", "Usuario")),
        "emisorRol": sender.get("rol", body.get("emisorRol", "CLIENTE")),
        "contenido": contenido,
        "leido": False,
    }
    messages_table.put_item(Item=message)

    result = connections_table.query(
        IndexName="reparacionId-index",
        KeyConditionExpression=Key("reparacionId").eq(reparacion_id),
    )
    payload = {"type": "newMessage", "reparacionId": reparacion_id, "mensaje": message}
    client = management_client(event)
    for connection in result.get("Items", []):
        send_to_connection(client, connection["connectionId"], payload)

    return {"statusCode": 200, "body": "sent"}


def handler(event, context):
    route = event["requestContext"]["routeKey"]
    body = json.loads(event.get("body") or "{}")

    if route == "joinRepairChat":
        return join_repair_chat(event, body)
    if route == "sendMessage":
        return send_message(event, body)

    return {"statusCode": 400, "body": "Ruta WebSocket no soportada"}
