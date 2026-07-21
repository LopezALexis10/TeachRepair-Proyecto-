import React from "react";

const statusClass = {
  Recibido: "neutral",
  "En diagnóstico": "warning",
  "En reparación": "info",
  "Esperando repuesto": "danger",
  "Listo para retirar": "success",
  Entregado: "done",
  Cancelado: "muted",
};

export function StatusBadge({ status }) {
  return <span className={`status-badge ${statusClass[status] || "neutral"}`}>{status}</span>;
}
