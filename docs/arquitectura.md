# Arquitectura AWS - TechRepair

```mermaid
flowchart LR
    Usuario["Cliente / Tecnico"] --> Amplify["AWS Amplify<br>Frontend React"]
    Amplify --> Cognito["Amazon Cognito<br>Login y roles"]
    Amplify --> HttpApi["API Gateway HTTP<br>Operaciones REST"]
    Amplify --> WsApi["API Gateway WebSocket<br>Chat tiempo real"]

    HttpApi --> RestLambda["Lambda REST<br>Reparaciones, reportes, adjuntos"]
    WsApi --> ConnectLambda["Lambda Connect"]
    WsApi --> DisconnectLambda["Lambda Disconnect"]
    WsApi --> MessageLambda["Lambda Mensajes"]

    RestLambda --> Reparaciones["DynamoDB<br>Reparaciones"]
    RestLambda --> Historial["DynamoDB<br>HistorialEstados"]
    RestLambda --> AdjuntosTable["DynamoDB<br>Adjuntos"]
    RestLambda --> S3["S3 privado<br>Evidencias"]
    RestLambda --> SNS["SNS<br>Notificaciones"]

    ConnectLambda --> Conexiones["DynamoDB<br>ConexionesUsuarios"]
    DisconnectLambda --> Conexiones
    MessageLambda --> Conexiones
    MessageLambda --> Mensajes["DynamoDB<br>Mensajes"]

    RestLambda --> CloudWatch["CloudWatch<br>Logs"]
    MessageLambda --> CloudWatch
```

## Flujo de reparaciones

1. El tecnico inicia sesion con Cognito.
2. El frontend envia una solicitud a API Gateway HTTP.
3. API Gateway valida el token Cognito.
4. Lambda REST crea o actualiza la reparacion.
5. DynamoDB guarda los datos.
6. Si el estado cambia a `Listo para retirar`, Lambda publica una notificacion en SNS.

## Flujo de chat

1. Cliente y tecnico abren el detalle de una reparacion.
2. El frontend abre una conexion WebSocket.
3. API Gateway WebSocket registra cada conexion en DynamoDB.
4. Al enviar un mensaje, Lambda lo guarda en `Mensajes`.
5. Lambda envia el mensaje a las conexiones activas de esa reparacion.

## Seguridad

- Cognito autentica usuarios.
- API Gateway HTTP exige token JWT.
- S3 no es publico.
- Las Lambdas tienen permisos IAM solo para los recursos que usan.
- Los clientes solo pueden ver reparaciones asociadas a su `clienteId`.
