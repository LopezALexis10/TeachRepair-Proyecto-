# Guion de presentacion - 5 minutos

## 1. Problema

Muchos talleres de reparacion manejan el seguimiento por llamadas o chats sueltos. Eso provoca
perdida de informacion, clientes preguntando varias veces por el estado y poca trazabilidad.

## 2. Solucion

TechRepair centraliza el seguimiento de reparaciones de celulares, laptops y consolas. El tecnico
registra casos, cambia estados, sube evidencias y conversa por chat con el cliente. El cliente
consulta el estado y el historial desde la web.

## 3. Arquitectura

La solucion usa AWS serverless:

- Cognito para login.
- Amplify para publicar el frontend.
- API Gateway HTTP para operaciones REST.
- API Gateway WebSocket para chat en tiempo real.
- Lambda para la logica.
- DynamoDB para reparaciones, mensajes e historial.
- S3 para evidencias.
- SNS para notificaciones.
- CloudWatch para logs.

## 4. Demo

Orden recomendado:

1. Login como tecnico.
2. Mostrar dashboard y reportes.
3. Crear o abrir una reparacion.
4. Cambiar estado a `Listo para retirar`.
5. Mostrar historial.
6. Abrir sesion como cliente.
7. Enviar mensajes por chat en tiempo real.
8. Mostrar DynamoDB o CloudWatch como evidencia tecnica.

## 5. Respuestas rapidas

**Que hace Cognito?**  
Autentica usuarios y separa roles de cliente y tecnico.

**Que hace API Gateway?**  
Recibe solicitudes del frontend y las dirige a Lambda.

**Que hace Lambda?**  
Ejecuta la logica sin administrar servidores.

**Por que DynamoDB?**  
Es NoSQL, serverless y se adapta bien a datos por reparacion y mensajes por chat.

**Como funciona el chat?**  
El navegador abre una conexion WebSocket. Lambda guarda cada mensaje y lo reenvia a los usuarios
conectados a la misma reparacion.

**Que precaucion de seguridad se tomo?**  
S3 es privado, API HTTP exige token Cognito y las Lambdas usan permisos IAM limitados.
