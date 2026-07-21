import os
from datetime import datetime, timezone

import boto3


dynamodb = boto3.resource("dynamodb")
cognito = boto3.client("cognito-idp")
clientes_table = dynamodb.Table(os.environ["CLIENTES_TABLE"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def handler(event, context):
    user_pool_id = event["userPoolId"]
    username = event["userName"]
    attributes = event["request"]["userAttributes"]

    cliente = {
        "clienteId": attributes["sub"],
        "nombre": attributes.get("name", attributes.get("email", "Cliente")),
        "correo": attributes.get("email", ""),
        "estado": "ACTIVO",
        "createdAt": now_iso(),
    }
    clientes_table.put_item(Item=cliente)

    cognito.admin_add_user_to_group(
        UserPoolId=user_pool_id,
        Username=username,
        GroupName="CLIENTE",
    )

    return event
