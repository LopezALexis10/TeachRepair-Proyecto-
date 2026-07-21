import argparse
from decimal import Decimal
from datetime import datetime, timezone

import boto3


PASSWORD = "TechRepair123"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def create_user(cognito, user_pool_id, email, name, group):
    try:
        cognito.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": name},
            ],
            MessageAction="SUPPRESS",
        )
    except cognito.exceptions.UsernameExistsException:
        pass

    cognito.admin_set_user_password(
        UserPoolId=user_pool_id,
        Username=email,
        Password=PASSWORD,
        Permanent=True,
    )
    cognito.admin_add_user_to_group(
        UserPoolId=user_pool_id,
        Username=email,
        GroupName=group,
    )
    user = cognito.admin_get_user(UserPoolId=user_pool_id, Username=email)
    sub = next(attr["Value"] for attr in user["UserAttributes"] if attr["Name"] == "sub")
    return {"email": email, "name": name, "sub": sub, "group": group}


def put_repair(table, history_table, item):
    table.put_item(Item=item)
    history_table.put_item(
        Item={
            "reparacionId": item["reparacionId"],
            "fechaCambio": item["createdAt"],
            "estadoAnterior": "Nuevo",
            "estadoNuevo": item["estado"],
            "usuarioCambio": "seed-script",
            "usuarioNombre": "Carga inicial",
            "observacion": "Dato ficticio para demostracion academica",
        }
    )


def main():
    parser = argparse.ArgumentParser(description="Crea usuarios demo y datos ficticios para TechRepair.")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--user-pool-id", required=True)
    parser.add_argument("--sns-topic-arn")
    parser.add_argument("--notify-email")
    args = parser.parse_args()

    cognito = boto3.client("cognito-idp", region_name=args.region)
    dynamodb = boto3.resource("dynamodb", region_name=args.region)
    sns = boto3.client("sns", region_name=args.region)

    tecnico = create_user(cognito, args.user_pool_id, "tecnico@techrepair.demo", "Técnico Demo", "TECNICO")
    cliente = create_user(cognito, args.user_pool_id, "cliente@techrepair.demo", "Camila Torres", "CLIENTE")

    if args.sns_topic_arn and args.notify_email:
        sns.subscribe(TopicArn=args.sns_topic_arn, Protocol="email", Endpoint=args.notify_email)
        print(f"SNS: revisa {args.notify_email} y confirma la suscripcion.")

    reparaciones = dynamodb.Table("TechRepair-Reparaciones")
    historial = dynamodb.Table("TechRepair-HistorialEstados")
    timestamp = now_iso()

    repairs = [
        {
            "reparacionId": "REP-1001",
            "clienteId": cliente["sub"],
            "clienteNombre": cliente["name"],
            "clienteCorreo": cliente["email"],
            "tipoEquipo": "Celular",
            "marca": "Apple",
            "modelo": "iPhone 13",
            "problemaReportado": "Pantalla quebrada",
            "diagnostico": "Requiere cambio de pantalla y prueba tactil.",
            "estado": "En reparación",
            "fechaIngreso": "2026-07-15",
            "fechaFinalizacion": None,
            "costoEstimado": Decimal("85"),
            "tecnicoAsignado": tecnico["name"],
            "observaciones": "Equipo recibido con protector dañado.",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "reparacionId": "REP-1002",
            "clienteId": cliente["sub"],
            "clienteNombre": cliente["name"],
            "clienteCorreo": cliente["email"],
            "tipoEquipo": "Laptop",
            "marca": "HP",
            "modelo": "Pavilion 15",
            "problemaReportado": "No enciende",
            "diagnostico": "Pendiente revisar cargador, batería y placa.",
            "estado": "En diagnóstico",
            "fechaIngreso": "2026-07-15",
            "fechaFinalizacion": None,
            "costoEstimado": Decimal("45"),
            "tecnicoAsignado": tecnico["name"],
            "observaciones": "Cliente reporta apagado repentino.",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "reparacionId": "REP-1003",
            "clienteId": cliente["sub"],
            "clienteNombre": cliente["name"],
            "clienteCorreo": cliente["email"],
            "tipoEquipo": "Consola",
            "marca": "Sony",
            "modelo": "PlayStation 5",
            "problemaReportado": "Se apaga por temperatura",
            "diagnostico": "Ventilador con ruido y acumulacion de polvo.",
            "estado": "Esperando repuesto",
            "fechaIngreso": "2026-07-15",
            "fechaFinalizacion": None,
            "costoEstimado": Decimal("60"),
            "tecnicoAsignado": tecnico["name"],
            "observaciones": "Esperando ventilador compatible.",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]
    for repair in repairs:
        put_repair(reparaciones, historial, repair)

    print("Usuarios demo creados:")
    print(f"  Tecnico: {tecnico['email']} / {PASSWORD} / sub={tecnico['sub']}")
    print(f"  Cliente: {cliente['email']} / {PASSWORD} / sub={cliente['sub']}")
    print("Reparaciones demo creadas: REP-1001, REP-1002, REP-1003")


if __name__ == "__main__":
    main()
