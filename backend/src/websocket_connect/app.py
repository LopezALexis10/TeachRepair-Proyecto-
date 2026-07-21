import json
import os
from datetime import datetime, timezone

import boto3


dynamodb = boto3.resource("dynamodb")
connections_table = dynamodb.Table(os.environ["CONEXIONES_TABLE"])


def handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    query = event.get("queryStringParameters") or {}

    item = {
        "connectionId": connection_id,
        "usuarioId": query.get("usuarioId", "anonimo"),
        "usuarioNombre": query.get("usuarioNombre", "Usuario"),
        "rol": query.get("rol", "CLIENTE"),
        "reparacionId": query.get("reparacionId", "sin-reparacion"),
        "connectedAt": datetime.now(timezone.utc).isoformat(),
    }
    connections_table.put_item(Item=item)

    return {"statusCode": 200, "body": json.dumps({"connected": True})}
