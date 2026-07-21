# TechRepair AWS

Proyecto final de Aplicaciones para Ambientes Distribuidos.

TechRepair es una aplicacion web serverless para un taller ficticio que repara celulares,
laptops y consolas. Permite registrar reparaciones, consultar estados, chatear en tiempo real,
subir evidencias y ver reportes.

## Que construyo Codex

- Frontend en React + Vite con diseno minimalista y logo propio.
- Login real usando Amazon Cognito.
- Backend serverless con AWS Lambda.
- API Gateway HTTP para reparaciones, reportes y adjuntos.
- API Gateway WebSocket para chat en tiempo real.
- DynamoDB para reparaciones, mensajes, conexiones, historial y adjuntos.
- S3 privado para evidencias.
- SNS para notificacion por correo cuando una reparacion queda lista para retirar.
- Documentacion, diagrama de arquitectura, modelo de datos y scripts demo.

## Estructura

```txt
techrepair-aws/
  backend/
    template.yaml
    src/rest_api/app.py
    src/websocket_connect/app.py
    src/websocket_disconnect/app.py
    src/websocket_message/app.py
  frontend/
    package.json
    amplify.yml
    src/main.jsx
    src/config.js
    src/styles.css
  scripts/
    seed_aws.py
    configure_frontend.py
  docs/
    arquitectura.md
    modelo-datos.md
    presentacion.md
```

## Explicacion simple de AWS

- **Cognito:** controla el inicio de sesion. Se crean usuarios demo cliente y tecnico.
- **API Gateway HTTP:** recibe peticiones normales del frontend, por ejemplo crear una reparacion.
- **API Gateway WebSocket:** mantiene el chat abierto en tiempo real.
- **Lambda:** ejecuta el codigo del backend sin crear servidores.
- **DynamoDB:** guarda datos en tablas NoSQL.
- **S3:** guarda archivos o fotos del equipo de forma privada.
- **SNS:** envia una notificacion cuando ocurre un evento importante.
- **CloudWatch:** guarda logs de Lambdas para revisar errores y evidencias tecnicas.

## Requisitos en tu computadora

Necesitas instalar:

- AWS CLI.
- AWS SAM CLI.
- Node.js 20 o superior.
- Python 3.

Verifica:

```bash
aws --version
sam --version
node --version
python --version
```

Configura tu cuenta AWS:

```bash
aws configure
aws sts get-caller-identity
```

Si `aws sts get-caller-identity` devuelve tu cuenta, ya estas conectado.

## Desplegar backend

Entra a la carpeta del backend:

```bash
cd backend
sam build
sam deploy --guided
```

Respuestas recomendadas:

```txt
Stack Name: techrepair-aws
AWS Region: us-east-1
Confirm changes before deploy: y
Allow SAM CLI IAM role creation: y
Disable rollback: n
Save arguments to configuration file: y
SAM configuration file: samconfig.toml
SAM configuration environment: default
```

Al final SAM mostrara outputs como:

```txt
HttpApiUrl
WebSocketUrl
UserPoolId
UserPoolClientId
AdjuntosBucketName
NotificacionesTopicArn
```

Guardalos porque se usan en los siguientes pasos.

## Crear usuarios y datos demo

Desde la raiz del proyecto:

```bash
python scripts/seed_aws.py --region us-east-1 --user-pool-id TU_USER_POOL_ID --sns-topic-arn TU_TOPIC_ARN --notify-email TU_CORREO
```

Si no quieres SNS, puedes omitir los dos ultimos parametros:

```bash
python scripts/seed_aws.py --region us-east-1 --user-pool-id TU_USER_POOL_ID
```

Usuarios demo:

```txt
Tecnico: tecnico@techrepair.demo
Cliente: cliente@techrepair.demo
Password: TechRepair123
```

El script imprimira el `sub` del cliente. Ese valor es importante porque es el `clienteId` real
de Cognito.

## Configurar frontend

Desde la raiz del proyecto:

```bash
python scripts/configure_frontend.py \
  --region us-east-1 \
  --user-pool-id TU_USER_POOL_ID \
  --user-pool-client-id TU_USER_POOL_CLIENT_ID \
  --http-api-url TU_HTTP_API_URL \
  --websocket-url TU_WEBSOCKET_URL
```

Esto actualiza `frontend/src/config.js`.

## Probar frontend local

```bash
cd frontend
npm install
npm.cmd run dev
```

Abre la URL que Vite muestre, normalmente:

```txt
http://localhost:5173
```

Prueba:

1. Entra como tecnico.
2. Mira las reparaciones demo.
3. Cambia un estado a `Listo para retirar`.
4. Entra como cliente en otro navegador.
5. Abre la misma reparacion.
6. Envian mensajes por chat.

## Publicar frontend en Amplify

Opcion recomendada:

1. Sube este proyecto a GitHub.
2. En AWS abre **Amplify**.
3. Selecciona **Deploy an app**.
4. Conecta el repositorio.
5. Indica que la carpeta de la app es `frontend`.
6. Amplify detectara `amplify.yml`.
7. Despliega.

La URL de Amplify es la URL publica que debes entregar.

## Pruebas para la entrega

- Login con Cognito como tecnico.
- Login con Cognito como cliente.
- Crear una reparacion.
- Cambiar estado.
- Ver historial.
- Abrir chat en dos navegadores y enviar mensajes.
- Ver que los mensajes quedan en DynamoDB.
- Subir evidencia a S3.
- Revisar reportes.
- Ver logs en CloudWatch.
- Confirmar notificacion SNS si configuraste correo.

## Precauciones de costo

Este proyecto usa servicios de bajo costo si haces pocas pruebas:

- DynamoDB en pago por solicitud.
- Lambda solo cobra cuando se ejecuta.
- S3 cobra por almacenamiento, usa pocos archivos.
- API Gateway cobra por solicitudes, para demo es bajo.
- SNS por correo es barato para pruebas.

Despues de presentar, si no lo usaras, elimina el stack:

```bash
cd backend
sam delete
```

Tambien revisa manualmente S3, Cognito, CloudWatch Logs y Amplify para borrar recursos restantes.
