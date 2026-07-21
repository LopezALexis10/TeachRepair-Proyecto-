import { awsConfig } from "../config";

function authHeaders(session, extra = {}) {
  return {
    Authorization: `Bearer ${session.idToken}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function apiRequest(path, options, session) {
  const response = await fetch(`${awsConfig.httpApiUrl}${path}`, {
    ...options,
    headers: authHeaders(session, options?.headers),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

export const api = {
  listRepairs: (session) => apiRequest("/reparaciones", { method: "GET" }, session),
  getRepair: (id, session) => apiRequest(`/reparaciones/${id}`, { method: "GET" }, session),
  createRepair: (payload, session) =>
    apiRequest("/reparaciones", { method: "POST", body: JSON.stringify(payload) }, session),
  changeStatus: (id, payload, session) =>
    apiRequest(`/reparaciones/${id}/estado`, { method: "PATCH", body: JSON.stringify(payload) }, session),
  getMessages: (id, session) => apiRequest(`/reparaciones/${id}/mensajes`, { method: "GET" }, session),
  createAttachment: (id, payload, session) =>
    apiRequest(`/reparaciones/${id}/adjuntos`, { method: "POST", body: JSON.stringify(payload) }, session),
  summary: (session) => apiRequest("/reportes/resumen", { method: "GET" }, session),
  reportStatus: (session) => apiRequest("/reportes/estados", { method: "GET" }, session),
  reportDeviceTypes: (session) => apiRequest("/reportes/tipos-equipo", { method: "GET" }, session),
};
