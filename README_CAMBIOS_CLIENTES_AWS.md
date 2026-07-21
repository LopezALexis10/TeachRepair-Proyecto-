# Como ver los nuevos cambios de clientes en TechRepair

Esta guia es para aplicar los cambios nuevos:

- Clientes pueden crear cuenta desde la pantalla de login.
- Clientes pueden crear solicitudes de reparacion.
- El tecnico ve esas solicitudes en casos activos.
- El tecnico tiene menu real de `Reparaciones`, `Historial` y `Reportes`.
- El cliente ya no ve menu lateral de tecnico.

## 1. Que cambio en AWS

Se agregaron recursos nuevos al stack:

- Tabla DynamoDB `TechRepair-Clientes`.
- Lambda `PreSignUpFunction`.
- Lambda `PostConfirmationFunction`.
- Trigger de Cognito para registrar clientes automaticamente.
- Endpoint nuevo: `GET /historial/conversaciones`.

Importante: usamos Cognito real, pero para evitar problemas de correos durante la demo, la cuenta
del cliente se autoconfirma. Eso significa que el cliente puede crear cuenta y entrar sin esperar
un codigo. La pantalla de confirmar cuenta queda como respaldo si AWS la solicita.

## 2. Actualizar backend en AWS

Abre una terminal en la carpeta del proyecto:

```bash
cd work/techrepair-aws/backend
```

Construye:

```bash
sam build
```

Despliega sobre el mismo stack:

```bash
sam deploy
```

Si SAM pregunta si aceptas cambios IAM, responde:

```txt
y
```

Esto es normal porque agregamos Lambdas nuevas y permisos para Cognito.

## 3. Si `sam deploy` falla

Mira primero el mensaje de la terminal. Si dice algo de permisos de AWS o CloudFormation, copia el
error y revisamos.

Tambien puedes ver errores en AWS:

1. Entra a AWS Console.
2. Busca `CloudFormation`.
3. Abre el stack `techrepair-aws`.
4. Ve a la pestaña `Events`.
5. Busca una fila roja con `CREATE_FAILED` o `UPDATE_FAILED`.

## 4. Actualizar frontend local

Despues de desplegar backend, prueba local:

```bash
cd ../frontend
npm install
npm.cmd run dev
```

Abre la URL local, normalmente:

```txt
http://localhost:5173
```

Si ves comportamiento raro, haz refresh fuerte:

```txt
Ctrl + F5
```

Si cambiaste de usuario, cierra sesion desde la app.

## 5. Probar registro de cliente

En la pantalla de login:

1. Haz clic en `Crear cuenta de cliente`.
2. Escribe nombre, correo y contraseña.
3. Usa una contraseña que cumpla Cognito:
   - minimo 8 caracteres
   - una mayuscula
   - una minuscula
   - un numero
4. Ejemplo:

```txt
ClienteNuevo123
```

Si todo funciona, la app entrara directamente al portal cliente.

## 6. Probar solicitud de reparacion como cliente

Como cliente:

1. Llena `Tipo`, `Marca`, `Modelo` y `Problema reportado`.
2. El problema tiene limite de 700 caracteres.
3. Adjunta una imagen si quieres.
4. Haz clic en `Enviar solicitud`.

La solicitud se guarda en DynamoDB `TechRepair-Reparaciones`.

## 7. Ver solicitud como tecnico

Cierra sesion y entra como tecnico:

```txt
tecnico@techrepair.demo
TechRepair123
```

En `Reparaciones` debe aparecer el caso nuevo.

El tecnico puede:

- cambiar estado
- ver evidencias
- abrir chat
- crear caso presencial como funcion secundaria

## 8. Ver historial de conversaciones

Como tecnico:

1. En el menu lateral, haz clic en `Historial`.
2. Veras una tabla con reparaciones y ultimo mensaje.
3. Haz clic en una fila para abrir esa reparacion y su chat.

## 9. Ver reportes

Como tecnico:

1. En el menu lateral, haz clic en `Reportes`.
2. Veras:
   - total de reparaciones
   - pendientes
   - finalizadas
   - esperando repuesto
   - reparaciones por estado
   - reparaciones por tipo de equipo

## 10. Subir cambios a GitHub y Amplify

Como ya tienes Amplify conectado a GitHub:

1. Guarda los cambios.
2. Haz commit.
3. Haz push a GitHub.
4. Amplify debe iniciar un build automaticamente.

Comandos tipicos:

```bash
git add .
git commit -m "Mejorar flujo real de clientes"
git push
```

Luego entra a Amplify y revisa que el build quede en verde.

## 11. Variables de entorno en Amplify

Confirma que sigan estas variables:

```txt
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=tu_user_pool_id
VITE_COGNITO_CLIENT_ID=tu_client_id
VITE_HTTP_API_URL=tu_http_api_url
VITE_WEBSOCKET_URL=tu_websocket_url
```

Si no las tienes, agregalas en:

```txt
Amplify > App settings > Environment variables
```

Despues haz redeploy.

## 12. Donde ver logs

### Errores del frontend

En el navegador:

```txt
F12 > Console
```

### Errores de Lambda

En AWS:

```txt
CloudWatch > Log groups
```

Busca grupos como:

```txt
/aws/lambda/techrepair-aws-RestApiFunction...
/aws/lambda/techrepair-aws-PreSignUpFunction...
/aws/lambda/techrepair-aws-PostConfirmationFunction...
/aws/lambda/techrepair-aws-WebSocketMessageFunction...
```

### Errores del despliegue

En AWS:

```txt
CloudFormation > techrepair-aws > Events
```

## 13. Que explicar en la presentacion

Puedes decir:

> Antes el tecnico tenia que crear reparaciones manualmente. Ahora el flujo es mas real: el
> cliente crea su cuenta con Cognito, Cognito dispara Lambdas de registro, el cliente crea su
> solicitud, DynamoDB guarda la reparacion y el tecnico la gestiona desde su panel.

Tambien puedes explicar:

- Cognito autentica.
- DynamoDB guarda perfiles y reparaciones.
- S3 guarda imagenes privadas.
- API Gateway HTTP maneja solicitudes normales.
- API Gateway WebSocket maneja chat.
- CloudWatch muestra logs.
