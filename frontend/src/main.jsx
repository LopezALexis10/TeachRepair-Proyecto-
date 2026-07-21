import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  History,
  ImagePlus,
  Laptop,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Wrench,
} from "lucide-react";
import { StatusBadge } from "./components/StatusBadge";
import { api } from "./services/api";
import {
  confirmSignUp,
  getStoredSession,
  resendConfirmationCode,
  signIn,
  signOut,
  signUp,
} from "./services/auth";
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

const deviceIcons = { Celular: Smartphone, Laptop, Consola: Wrench };

function isConfigured() {
  return !Object.values(awsConfig).some((value) => String(value || "").startsWith("REEMPLAZAR"));
}

function normalizeGroups(groups) {
  return Array.isArray(groups) ? groups : [groups].filter(Boolean);
}

function isTechnician(session) {
  return normalizeGroups(session?.groups).includes("TECNICO") || session?.email?.toLowerCase() === "tecnico@techrepair.demo";
}

function normalizeRepair(repair) {
  return {
    reparacionId: repair?.reparacionId || "SIN-ID",
    clienteNombre: repair?.clienteNombre || "Cliente sin nombre",
    clienteCorreo: repair?.clienteCorreo || "",
    tipoEquipo: repair?.tipoEquipo || "Celular",
    marca: repair?.marca || "Sin marca",
    modelo: repair?.modelo || "Sin modelo",
    problemaReportado: repair?.problemaReportado || "Sin problema reportado",
    diagnostico: repair?.diagnostico || "Pendiente de revisión",
    estado: repair?.estado || "Recibido",
    costoEstimado: repair?.costoEstimado ?? 0,
    tecnicoAsignado: repair?.tecnicoAsignado || "Por asignar",
    fechaIngreso: repair?.fechaIngreso || "",
    origen: repair?.origen || "CLIENTE",
  };
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

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("tecnico@techrepair.demo");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("TechRepair123");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      if (!isConfigured()) {
        throw new Error("Primero configura los valores de AWS en src/config.js o variables de Amplify.");
      }
      const session = await signIn(email, password);
      onLogin(session);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const data = await signUp(name, email, password);
      if (data.UserConfirmed) {
        const session = await signIn(email, password);
        onLogin(session);
        return;
      }
      setMode("confirm");
      setMessage("Cuenta creada. Revisa tu correo y escribe el código de confirmación.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitConfirm(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      const session = await signIn(email, password);
      onLogin(session);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setMessage("");
    try {
      await resendConfirmationCode(email);
      setMessage("Código reenviado. Revisa el correo del cliente.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <Logo />
        <h1>Seguimiento elegante para reparaciones reales.</h1>
        <p>
          Clientes crean solicitudes, técnicos gestionan estados y ambos conversan por chat en tiempo
          real usando AWS serverless.
        </p>
        <div className="hero-grid">
          <span><ShieldCheck size={18} /> Cognito</span>
          <span><MessageSquare size={18} /> WebSocket</span>
          <span><BarChart3 size={18} /> Reportes</span>
        </div>
      </section>

      <section className="login-card">
        <h2>{mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Confirmar cuenta"}</h2>
        <p>{mode === "login" ? "Entra como cliente o técnico." : "El registro público crea cuentas de cliente."}</p>

        {mode === "login" && (
          <form onSubmit={submitLogin}>
            <label>Correo<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={submitRegister}>
            <label>Nombre completo<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label>Correo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <label>Confirmar contraseña<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
            <button disabled={loading}><UserPlus size={17} /> Crear cuenta</button>
          </form>
        )}

        {mode === "confirm" && (
          <form onSubmit={submitConfirm}>
            <label>Correo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Código<input value={code} onChange={(event) => setCode(event.target.value)} required /></label>
            <button disabled={loading}>Confirmar y entrar</button>
            <button type="button" className="secondary" onClick={resendCode}>Reenviar código</button>
          </form>
        )}

        {message && <p className="alert">{message}</p>}
        <div className="auth-switch">
          {mode !== "login" && <button className="ghost" onClick={() => setMode("login")}>Ya tengo cuenta</button>}
          {mode !== "register" && <button className="ghost" onClick={() => setMode("register")}>Crear cuenta de cliente</button>}
          {mode !== "confirm" && <button className="ghost" onClick={() => setMode("confirm")}>Confirmar cuenta</button>}
        </div>
      </section>
    </main>
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
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "newMessage") {
          setMessages((current) => [...current, payload.mensaje]);
        }
      } catch (error) {
        console.error("Mensaje WebSocket inválido", error);
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
        {messages.length === 0 && <p className="empty-state">No hay mensajes todavía.</p>}
        {messages.map((message, index) => (
          <article key={`${message.createdAt || index}-${message.mensajeId || index}`} className={message.emisorId === session.usuarioId ? "own" : ""}>
            <strong>{message.emisorNombre || "Usuario"}</strong>
            <p>{message.contenido || ""}</p>
          </article>
        ))}
      </div>
      <div className="chat-input">
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe un mensaje..." />
        <button onClick={send}>Enviar</button>
      </div>
    </section>
  );
}

function RepairList({ repairs, selected, onSelect }) {
  return (
    <section className="panel list-panel">
      <div className="panel-title"><div><p>Casos activos</p><h2>Reparaciones</h2></div></div>
      <div className="repair-list">
        {repairs.length === 0 && <p className="empty-state">No hay reparaciones todavía.</p>}
        {repairs.map((repair) => {
          const Icon = deviceIcons[repair.tipoEquipo] || Wrench;
          return (
            <button key={repair.reparacionId} className={`repair-card ${selected?.reparacionId === repair.reparacionId ? "selected" : ""}`} onClick={() => onSelect(repair)}>
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
  );
}

function RepairDetail({ detail, technician, onChangeStatus }) {
  if (!detail?.reparacion) {
    return (
      <section className="panel detail-panel">
        <div className="panel-title"><div><p>Detalle</p><h2>Sin selección</h2></div></div>
        <p className="empty-state">Selecciona una reparación para ver el detalle.</p>
      </section>
    );
  }

  const repair = detail.reparacion;
  return (
    <section className="panel detail-panel">
      <div className="panel-title"><div><p>Detalle</p><h2>{repair.problemaReportado}</h2></div></div>
      <div className="detail-grid">
        <span>Equipo<strong>{repair.tipoEquipo}</strong></span>
        <span>Marca<strong>{repair.marca}</strong></span>
        <span>Modelo<strong>{repair.modelo}</strong></span>
        <span>Costo<strong>${repair.costoEstimado}</strong></span>
      </div>
      <p className="diagnosis">{repair.diagnostico}</p>
      <StatusBadge status={repair.estado} />
      {technician && (
        <div className="status-actions">
          <select value={repair.estado} onChange={(event) => onChangeStatus(event.target.value)}>
            {estados.map((estado) => <option key={estado}>{estado}</option>)}
          </select>
        </div>
      )}
      <h3>Historial</h3>
      <ul className="timeline">
        {(detail.historial || []).length === 0 && <li>Sin cambios registrados todavía.</li>}
        {(detail.historial || []).map((item, index) => <li key={item.fechaCambio || index}>{item.estadoAnterior || "Anterior"} → {item.estadoNuevo || "Nuevo"}</li>)}
      </ul>
      <h3>Evidencias</h3>
      <div className="attachments">
        {(detail.adjuntos || []).length === 0 && <span className="empty-state inline">Sin evidencias.</span>}
        {(detail.adjuntos || []).map((item, index) => <a key={item.archivoId || index} href={item.downloadUrl} target="_blank" rel="noreferrer">{item.fileName || "Evidencia"}</a>)}
      </div>
    </section>
  );
}

function ClientRequestForm({ session, onCreated }) {
  const [form, setForm] = useState({ tipoEquipo: "Celular", marca: "", modelo: "", problemaReportado: "" });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      const repair = await api.createRepair(form, session);
      if (file) {
        const data = await api.createAttachment(repair.reparacionId, { fileName: file.name, contentType: file.type }, session);
        await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      }
      setForm({ tipoEquipo: "Celular", marca: "", modelo: "", problemaReportado: "" });
      setFile(null);
      setMessage("Solicitud enviada. El técnico ya puede verla en casos activos.");
      onCreated();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel create-panel">
      <div className="panel-title"><div><p>Nueva solicitud</p><h2>Solicitar reparación</h2></div></div>
      <form className="repair-form" onSubmit={submit}>
        <label>Nombre<input value={session.nombre} disabled /></label>
        <label>Correo<input value={session.email} disabled /></label>
        <label>Tipo<select value={form.tipoEquipo} onChange={(event) => update("tipoEquipo", event.target.value)}><option>Celular</option><option>Laptop</option><option>Consola</option></select></label>
        <label>Marca<input value={form.marca} onChange={(event) => update("marca", event.target.value)} required /></label>
        <label>Modelo<input value={form.modelo} onChange={(event) => update("modelo", event.target.value)} required /></label>
        <label className="wide-field">Problema reportado<textarea maxLength={700} value={form.problemaReportado} onChange={(event) => update("problemaReportado", event.target.value)} required /></label>
        <p className="char-count">{form.problemaReportado.length} / 700</p>
        <label className="file-button wide-field"><ImagePlus size={17} /> Adjuntar imagen de referencia<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files[0] || null)} /></label>
        {file && <p className="form-message">Archivo seleccionado: {file.name}</p>}
        <button><Plus size={17} /> Enviar solicitud</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function TechnicianManualForm({ session, onCreated }) {
  const [form, setForm] = useState({
    clienteNombre: "",
    clienteCorreo: "",
    tipoEquipo: "Celular",
    marca: "",
    modelo: "",
    problemaReportado: "",
    costoEstimado: 0,
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
      setMessage("Caso presencial creado correctamente.");
      onCreated();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel create-panel">
      <div className="panel-title"><div><p>Función secundaria</p><h2>Crear caso presencial</h2></div></div>
      <form className="repair-form" onSubmit={submit}>
        <label>Cliente<input value={form.clienteNombre} onChange={(event) => update("clienteNombre", event.target.value)} required /></label>
        <label>Correo<input value={form.clienteCorreo} onChange={(event) => update("clienteCorreo", event.target.value)} required /></label>
        <label>Tipo<select value={form.tipoEquipo} onChange={(event) => update("tipoEquipo", event.target.value)}><option>Celular</option><option>Laptop</option><option>Consola</option></select></label>
        <label>Marca<input value={form.marca} onChange={(event) => update("marca", event.target.value)} required /></label>
        <label>Modelo<input value={form.modelo} onChange={(event) => update("modelo", event.target.value)} required /></label>
        <label>Costo estimado<input type="number" value={form.costoEstimado} onChange={(event) => update("costoEstimado", Number(event.target.value))} /></label>
        <label className="wide-field">Problema<textarea maxLength={700} value={form.problemaReportado} onChange={(event) => update("problemaReportado", event.target.value)} required /></label>
        <button><Plus size={17} /> Crear caso presencial</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function ReportsView({ reports, repairs }) {
  return (
    <section className="panel reports-panel wide-panel">
      <div className="panel-title"><div><p>Reportes</p><h2>Resumen del taller</h2></div></div>
      <div className="metrics">
        <span>Total<strong>{reports.summary?.total ?? repairs.length}</strong></span>
        <span>Pendientes<strong>{reports.summary?.pendientes ?? "-"}</strong></span>
        <span>Finalizadas<strong>{reports.summary?.finalizadas ?? "-"}</strong></span>
        <span>Esperando repuesto<strong>{reports.summary?.esperandoRepuesto ?? "-"}</strong></span>
      </div>
      <div className="report-columns">
        <div>
          <h3>Por estado</h3>
          <div className="bars">{reports.estados.map((item) => <p key={item.label}><span>{item.label}</span><strong>{item.total}</strong></p>)}</div>
        </div>
        <div>
          <h3>Por tipo de equipo</h3>
          <div className="bars">{reports.tipos.map((item) => <p key={item.label}><span>{item.label}</span><strong>{item.total}</strong></p>)}</div>
        </div>
      </div>
    </section>
  );
}

function HistoryView({ conversations, onSelect }) {
  return (
    <section className="panel wide-panel">
      <div className="panel-title"><div><p>Historial</p><h2>Conversaciones por reparación</h2></div></div>
      <div className="history-table">
        <div className="history-head"><span>Caso</span><span>Cliente</span><span>Equipo</span><span>Estado</span><span>Último mensaje</span></div>
        {conversations.length === 0 && <p className="empty-state">Todavía no hay conversaciones.</p>}
        {conversations.map((item) => (
          <button key={item.reparacionId} className="history-row" onClick={() => onSelect(item.reparacionId)}>
            <span>{item.reparacionId}</span>
            <span>{item.clienteNombre}</span>
            <span>{item.tipoEquipo} · {item.marca} {item.modelo}</span>
            <span><StatusBadge status={item.estado} /></span>
            <span>{item.ultimoMensaje}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Dashboard({ session, onLogout }) {
  const [repairs, setRepairs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reports, setReports] = useState({ summary: null, estados: [], tipos: [] });
  const [conversations, setConversations] = useState([]);
  const [view, setView] = useState("reparaciones");
  const [statusMessage, setStatusMessage] = useState("");
  const technician = isTechnician(session);

  async function load() {
    setStatusMessage("");
    const data = await api.listRepairs(session);
    const items = Array.isArray(data.items) ? data.items.map(normalizeRepair) : [];
    setRepairs(items);
    setSelected((current) => current || items[0] || null);
    if (technician) {
      const [summary, estadosData, tiposData, historyData] = await Promise.allSettled([
        api.summary(session),
        api.reportStatus(session),
        api.reportDeviceTypes(session),
        api.conversationHistory(session),
      ]);
      setReports({
        summary: summary.status === "fulfilled" ? summary.value : { total: items.length },
        estados: estadosData.status === "fulfilled" ? estadosData.value.items || [] : [],
        tipos: tiposData.status === "fulfilled" ? tiposData.value.items || [] : [],
      });
      setConversations(historyData.status === "fulfilled" ? historyData.value.items || [] : []);
      const failures = [summary, estadosData, tiposData, historyData]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason.message);
      if (failures.length > 0) {
        setStatusMessage(`Algunos módulos no cargaron: ${failures.join(" | ")}`);
      }
    }
  }

  useEffect(() => {
    load().catch((error) => setStatusMessage(error.message));
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    api.getRepair(selected.reparacionId, session)
      .then((data) => setDetail({
        reparacion: normalizeRepair(data.reparacion),
        historial: Array.isArray(data.historial) ? data.historial : [],
        adjuntos: Array.isArray(data.adjuntos) ? data.adjuntos : [],
      }))
      .catch((error) => {
        setDetail({ reparacion: selected, historial: [], adjuntos: [] });
        setStatusMessage(error.message);
      });
  }, [selected?.reparacionId]);

  async function changeStatus(newStatus) {
    await api.changeStatus(selected.reparacionId, { estado: newStatus, observacion: "Actualizado desde panel TechRepair" }, session);
    await load();
    const refreshed = await api.getRepair(selected.reparacionId, session);
    setDetail({
      reparacion: normalizeRepair(refreshed.reparacion),
      historial: refreshed.historial || [],
      adjuntos: refreshed.adjuntos || [],
    });
  }

  function selectConversation(repairId) {
    const repair = repairs.find((item) => item.reparacionId === repairId);
    if (repair) {
      setSelected(repair);
      setView("reparaciones");
    }
  }

  if (!technician) {
    return (
      <main className="client-shell">
        <header className="client-header">
          <Logo />
          <div>
            <p>Portal cliente</p>
            <h1>Hola, {session.nombre}</h1>
            <span className="session-chip">{session.email} · CLIENTE</span>
          </div>
          <button className="ghost" onClick={() => { signOut(); onLogout(); }}><LogOut size={17} /> Salir</button>
        </header>
        {statusMessage && <p className="alert">{statusMessage}</p>}
        <section className="dashboard-grid">
          <ClientRequestForm session={session} onCreated={load} />
          <RepairList repairs={repairs} selected={selected} onSelect={setSelected} />
          <RepairDetail detail={detail} technician={false} onChangeStatus={changeStatus} />
          <ChatPanel repair={selected} session={session} />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          <button className={view === "reparaciones" ? "active" : ""} onClick={() => setView("reparaciones")}><Wrench size={18} /> Reparaciones</button>
          <button className={view === "historial" ? "active" : ""} onClick={() => setView("historial")}><History size={18} /> Historial</button>
          <button className={view === "reportes" ? "active" : ""} onClick={() => setView("reportes")}><BarChart3 size={18} /> Reportes</button>
        </nav>
        <button className="ghost" onClick={() => { signOut(); onLogout(); }}><LogOut size={17} /> Salir</button>
      </aside>

      <section className="main-view">
        <header className="topbar">
          <div>
            <p>Panel técnico</p>
            <h1>Hola, {session.nombre}</h1>
            <span className="session-chip">{session.email} · TECNICO</span>
          </div>
          <button className="secondary" onClick={load}><RefreshCcw size={17} /> Actualizar</button>
        </header>
        {statusMessage && <p className="alert">{statusMessage}</p>}
        <section className="dashboard-grid">
          {view === "reparaciones" && (
            <>
              <RepairList repairs={repairs} selected={selected} onSelect={setSelected} />
              <RepairDetail detail={detail} technician onChangeStatus={changeStatus} />
              <ChatPanel repair={selected} session={session} />
              <TechnicianManualForm session={session} onCreated={load} />
            </>
          )}
          {view === "historial" && <HistoryView conversations={conversations} onSelect={selectConversation} />}
          {view === "reportes" && <ReportsView reports={reports} repairs={repairs} />}
        </section>
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(getStoredSession());
  return session ? <Dashboard session={session} onLogout={() => setSession(null)} /> : <AuthScreen onLogin={setSession} />;
}

function Root() {
  const [error, setError] = useState("");

  useEffect(() => {
    function handleError(event) {
      setError(event.error?.message || event.message || "Error inesperado en el frontend");
    }
    function handleRejection(event) {
      setError(event.reason?.message || String(event.reason || "Promesa rechazada"));
    }
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (error) {
    return (
      <main className="fatal-screen">
        <Logo />
        <h1>TechRepair encontró un error</h1>
        <p>{error}</p>
        <button onClick={() => { signOut(); window.location.reload(); }}>Cerrar sesión y recargar</button>
      </main>
    );
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(<Root />);
