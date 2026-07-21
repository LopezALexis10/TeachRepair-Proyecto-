# Modelo de datos DynamoDB

## TechRepair-Reparaciones

Clave primaria:

- Partition key: `reparacionId`

Indice secundario:

- `clienteId-index`, para listar reparaciones de un cliente.

Campos principales:

```json
{
  "reparacionId": "REP-1001",
  "clienteId": "sub-cognito-del-cliente",
  "clienteNombre": "Camila Torres",
  "clienteCorreo": "cliente@techrepair.demo",
  "tipoEquipo": "Celular",
  "marca": "Apple",
  "modelo": "iPhone 13",
  "problemaReportado": "Pantalla quebrada",
  "diagnostico": "Requiere cambio de pantalla",
  "estado": "En reparación",
  "fechaIngreso": "2026-07-15",
  "fechaFinalizacion": null,
  "costoEstimado": 85,
  "tecnicoAsignado": "Técnico Demo",
  "observaciones": "Equipo recibido con protector dañado",
  "createdAt": "2026-07-15T00:00:00Z",
  "updatedAt": "2026-07-15T00:00:00Z"
}
```

## TechRepair-Mensajes

Clave primaria:

- Partition key: `reparacionId`
- Sort key: `createdAt`

Uso: guardar historial del chat por reparacion.

## TechRepair-ConexionesUsuarios

Clave primaria:

- Partition key: `connectionId`

Indice secundario:

- `reparacionId-index`

Uso: saber que usuarios estan conectados al chat de cada reparacion.

## TechRepair-HistorialEstados

Clave primaria:

- Partition key: `reparacionId`
- Sort key: `fechaCambio`

Uso: auditar cada cambio de estado.

## TechRepair-Adjuntos

Clave primaria:

- Partition key: `reparacionId`
- Sort key: `archivoId`

Uso: guardar metadatos de evidencias cargadas a S3.
