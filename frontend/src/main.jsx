import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  ImagePlus,
  Laptop,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { StatusBadge } from "./components/StatusBadge";
import { api } from "./services/api";
import { getStoredSession, signIn, signOut } from "./services/auth";
import { awsConfig } from "./config";
import "./styles.css";

const estados = [
  "Recibido",
  "En diagnóstico",
  "En reparación",
  "Esperando repuesto",
  "Listo para retirar",
  "Entregado",
  "Cancelado",
];

const demoRepairs = [
  {
    reparacionId: "REP-DEMO-01",
    clienteNombre: "Camila Torres",
    clienteCorreo: "cliente.techrepair.demo@example.com",
    tipoEquipo: "Celular",
    marca: "Apple",
    modelo: "iPhone 13",
    problemaReportado: "Pantalla quebrada",
    diagnostico: "Requiere cambio de pantalla",
    estado: "En reparación",
    costoEstimado: 85,
    tecnicoAsignado: "Técnico Demo",
    fechaIngreso: "2026-07-15",
  },
  {
    reparacionId: "REP-DEMO-02",
    clienteNombre: "Diego Mora",
    clienteCorreo: "diego.demo@example.com",
    tipoEquipo: "Laptop",
    marca: "HP",
    modelo: "Pavilion 15",
    problemaReportado: "No enciende",
    diagnostico: "Pendiente revisar fuente y batería",
    estado: "En diagnóstico",
    costoEstimado: 45,
    tecnicoAsignado: "Técnico Demo",
    fechaIngreso: "2026-07-15",
  },
  {
    reparacionId: "REP-DEMO-03",
    clienteNombre: "Luis Vega",
    clienteCorreo: "luis.demo@example.com",
    tipoEquipo: "Consola",
    marca: "Sony",
    modelo: "PlayStation 5",
    problemaReportado: "Se apaga por temperatura",
    diagnostico: "Mantenimiento de ventilación recomendado",
    estado: "Esperando repuesto",
    costoEstimado: 60,
    tecnicoAsignado: "Técnico Demo",
    fechaIngreso: "2026-07-15",
  },
];

function isConfigured() {
  return !Object.values(awsConfig).some((value) => value.startsWith("REEMPLAZAR"));
}

function isTechnician(session) {
  return session?.groups?.includes("TECNICO");
}

function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Wrench size={21} />
      </div>
      <div>
        <strong>TechRepair</strong>
        <span>Service desk</span>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("tecnico@techrepair.demo");
  const [password, setPassword] = useState("TechRepair123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!isConfigured()) {
        throw new Error("Primero reemplaza los valores de src/config.js con los outputs de AWS.");
      }
      const session = await signIn(email, password);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <Logo />
        <h1>Seguimiento elegante para reparaciones reales.</h1>
        <p>
          Gestiona celulares, laptops y consolas con estados claros, evidencias, reportes y chat en
          tiempo real usando AWS serverless.
        </p>
        <div className="hero-grid">
          <span><ShieldCheck size={18} /> Cognito</span>
          <span><MessageSquare size={18} /> WebSocket</span>
          <span><BarChart3 size={18} /> Reportes</span>
        </div>
      </section>
      <section className="login-card">
        <h2>Iniciar sesión</h2>
        <p>Usa los usuarios demo creados con el script de despliegue.</p>
        <form onSubmit={submit}>
          <label>
            Correo
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        </form>
        {error && <p className="alert">{error}</p>}
        {!isConfigured() && (
          <p className="hint">Modo preparación: falta configurar Cognito/API en <code>src/config.js</code>.</p>
        )}
      </section>
    </main>
  );
}

function RepairForm({ session, onCreated }) {
  const [form, setForm] = useState({
    clienteId: "",
    clienteNombre: "Camila Torres",
    clienteCorreo: "cliente.techrepair.demo@example.com",
    tipoEquipo: "Celular",
    marca: "Apple",
    modelo: "iPhone 13",
    problemaReportado: "Pantalla quebrada",
    costoEstimado: 85,
  });
  const [message, setMessage] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      await api.createRepair(form, session);
      setMessage("Reparación creada correctamente.");
      onCreated();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <form className="repair-form" onSubmit={submit}>
      <label>Cliente ID Cognito<input value={form.clienteId} onChange={(e) => update("clienteId", e.target.value)} required /></label>
      <label>Nombre<input value={form.clienteNombre} onChange={(e) => update("clienteNombre", e.target.value)} required /></label>
      <label>Correo<input value={form.clienteCorreo} onChange={(e) => update("clienteCorreo", e.target.value)} required /></label>
      <label>Tipo<select value={form.tipoEquipo} onChange={(e) => update("tipoEquipo", e.target.value)}><option>Celular</option><option>Laptop</option><option>Consola</option></select></label>
      <label>Marca<input value={form.marca} onChange={(e) => update("marca", e.target.value)} required /></label>
      <label>Modelo<input value={form.modelo} onChange={(e) => update("modelo", e.target.value)} required /></label>
      <label>Problema<input value={form.problemaReportado} onChange={(e) => update("problemaReportado", e.target.value)} required /></label>
      <label>Costo estimado<input type="number" value={form.costoEstimado} onChange={(e) => update("costoEstimado", Number(e.target.value))} /></label>
      <button><Plus size={17} /> Crear reparación</button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
}

function ChatPanel({ repair, session }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Desconectado");
  const socketRef = useRef(null);

  useEffect(() => {
    if (!repair || !isConfigured()) return undefined;

    api.getMessages(repair.reparacionId, session).then((data) => setMessages(data.items || [])).catch(() => setMessages([]));
    const params = new URLSearchParams({
      usuarioId: session.usuarioId,
      usuarioNombre: session.nombre,
      rol: isTechnician(session) ? "TECNICO" : "CLIENTE",
      reparacionId: repair.reparacionId,
    });
    const socket = new WebSocket(`${awsConfig.webSocketUrl}?${params.toString()}`);
    socketRef.current = socket;
    socket.onopen = () => {
      setStatus("Conectado");
      socket.send(JSON.stringify({ action: "joinRepairChat", reparacionId: repair.reparacionId }));
    };
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "newMessage") {
        setMessages((current) => [...current, payload.mensaje]);
      }
    };
    socket.onclose = () => setStatus("Desconectado");
    socket.onerror = () => setStatus("Error de conexión");
    return () => socket.close();
  }, [repair?.reparacionId]);

  function send() {
    if (!text.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ action: "sendMessage", reparacionId: repair.reparacionId, contenido: text.trim() }));
    setText("");
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-title">
        <div><p>Chat en tiempo real</p><h2>{repair?.reparacionId || "Selecciona una reparación"}</h2></div>
        <span className="connection">{status}</span>
      </div>
      <div className="messages">
        {messages.map((message) => (
          <article key={`${message.createdAt}-${message.mensajeId}`} className={message.emisorId === session.usuarioId ? "own" : ""}>
            <strong>{message.emisorNombre}</strong>
            <p>{message.contenido}</p>
          </article>
        ))}
      </div>
      <div className="chat-input">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje..." />
        <button onClick={send}>Enviar</button>
      </div>
    </section>
  );
}

function Dashboard({ session, onLogout }) {
  const [repairs, setRepairs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reports, setReports] = useState({ summary: null, estados: [], tipos: [] });
  const [statusMessage, setStatusMessage] = useState("");
  const technician = isTechnician(session);

  async function load() {
    if (!isConfigured()) {
      setRepairs(demoRepairs);
      setSelected(demoRepairs[0]);
      return;
    }
    const data = await api.listRepairs(session);
    setRepairs(data.items || []);
    setSelected((current) => current || data.items?.[0] || null);
    if (technician) {
      const [summary, estadosData, tiposData] = await Promise.all([
        api.summary(session),
        api.reportStatus(session),
        api.reportDeviceTypes(session),
      ]);
      setReports({ summary, estados: estadosData.items || [], tipos: tiposData.items || [] });
    }
  }

  useEffect(() => {
    load().catch((error) => setStatusMessage(error.message));
  }, []);

  useEffect(() => {
    if (!selected || !isConfigured()) {
      setDetail(selected ? { reparacion: selected, historial: [], adjuntos: [] } : null);
      return;
    }
    api.getRepair(selected.reparacionId, session).then(setDetail).catch((error) => setStatusMessage(error.message));
  }, [selected?.reparacionId]);

  async function changeStatus(newStatus) {
    await api.changeStatus(selected.reparacionId, { estado: newStatus, observacion: "Actualizado desde panel TechRepair" }, session);
    await load();
    const refreshed = await api.getRepair(selected.reparacionId, session);
    setDetail(refreshed);
  }

  async function uploadAttachment(event) {
    const file = event.target.files[0];
    if (!file || !selected) return;
    const data = await api.createAttachment(selected.reparacionId, { fileName: file.name, contentType: file.type }, session);
    await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    setDetail(await api.getRepair(selected.reparacionId, session));
  }

  const deviceIcon = useMemo(() => ({ Celular: Smartphone, Laptop, Consola: Wrench }), []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          <span className="active"><Wrench size={18} /> Reparaciones</span>
          <span><MessageSquare size={18} /> Chat</span>
          <span><BarChart3 size={18} /> Reportes</span>
        </nav>
        <button className="ghost" onClick={() => { signOut(); onLogout(); }}><LogOut size={17} /> Salir</button>
      </aside>

      <section className="main-view">
        <header className="topbar">
          <div>
            <p>{technician ? "Panel técnico" : "Portal cliente"}</p>
            <h1>Hola, {session.nombre}</h1>
          </div>
          <button className="secondary" onClick={() => load()}><RefreshCcw size={17} /> Actualizar</button>
        </header>

        {!isConfigured() && <p className="alert">Vista demo local. Para conectar AWS reemplaza los valores de <code>src/config.js</code>.</p>}
        {statusMessage && <p className="alert">{statusMessage}</p>}

        <section className="dashboard-grid">
          <section className="panel list-panel">
            <div className="panel-title"><div><p>Casos activos</p><h2>Reparaciones</h2></div></div>
            <div className="repair-list">
              {repairs.map((repair) => {
                const Icon = deviceIcon[repair.tipoEquipo] || Wrench;
                return (
                  <button key={repair.reparacionId} className={`repair-card ${selected?.reparacionId === repair.reparacionId ? "selected" : ""}`} onClick={() => setSelected(repair)}>
                    <Icon size={19} />
                    <div>
                      <strong>{repair.marca} {repair.modelo}</strong>
                      <span>{repair.reparacionId} · {repair.clienteNombre}</span>
                    </div>
                    <StatusBadge status={repair.estado} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel detail-panel">
            <div className="panel-title"><div><p>Detalle</p><h2>{detail?.reparacion?.problemaReportado || "Sin selección"}</h2></div></div>
            {detail?.reparacion && (
              <>
                <div className="detail-grid">
                  <span>Equipo<strong>{detail.reparacion.tipoEquipo}</strong></span>
                  <span>Marca<strong>{detail.reparacion.marca}</strong></span>
                  <span>Modelo<strong>{detail.reparacion.modelo}</strong></span>
                  <span>Costo<strong>${detail.reparacion.costoEstimado}</strong></span>
                </div>
                <p className="diagnosis">{detail.reparacion.diagnostico}</p>
                <StatusBadge status={detail.reparacion.estado} />
                {technician && (
                  <div className="status-actions">
                    <select value={detail.reparacion.estado} onChange={(e) => changeStatus(e.target.value)}>
                      {estados.map((estado) => <option key={estado}>{estado}</option>)}
                    </select>
                    <label className="file-button"><ImagePlus size={17} /> Subir evidencia<input type="file" onChange={uploadAttachment} /></label>
                  </div>
                )}
                <h3>Historial</h3>
                <ul className="timeline">
                  {(detail.historial || []).map((item) => <li key={item.fechaCambio}>{item.estadoAnterior} → {item.estadoNuevo}</li>)}
                </ul>
                <h3>Evidencias</h3>
                <div className="attachments">
                  {(detail.adjuntos || []).map((item) => <a key={item.archivoId} href={item.downloadUrl} target="_blank">{item.fileName}</a>)}
                </div>
              </>
            )}
          </section>

          <ChatPanel repair={selected} session={session} />

          {technician && (
            <section className="panel reports-panel">
              <div className="panel-title"><div><p>Reportes</p><h2>Resumen del taller</h2></div></div>
              <div className="metrics">
                <span>Total<strong>{reports.summary?.total ?? repairs.length}</strong></span>
                <span>Pendientes<strong>{reports.summary?.pendientes ?? "-"}</strong></span>
                <span>Finalizadas<strong>{reports.summary?.finalizadas ?? "-"}</strong></span>
                <span>Esperando repuesto<strong>{reports.summary?.esperandoRepuesto ?? "-"}</strong></span>
              </div>
              <div className="bars">
                {[...reports.estados, ...reports.tipos].map((item) => <p key={`${item.label}-${item.total}`}><span>{item.label}</span><strong>{item.total}</strong></p>)}
              </div>
            </section>
          )}

          {technician && (
            <section className="panel create-panel">
              <div className="panel-title"><div><p>Nuevo caso</p><h2>Registrar reparación</h2></div></div>
              <RepairForm session={session} onCreated={load} />
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(getStoredSession());
  return session ? <Dashboard session={session} onLogout={() => setSession(null)} /> : <Login onLogin={setSession} />;
}

createRoot(document.getElementById("root")).render(<App />);
