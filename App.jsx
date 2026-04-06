import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://rokjkzgpnytrnuvzmkye.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva2premdwbnl0cm51dnpta3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTcyNjUsImV4cCI6MjA5MDYzMzI2NX0.UbVyI0CloJCAEsTxF4nRXqZ75cgULJrgL3feq-OGRNI";

const api = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const db = {
  getAll: () => api("tasks?order=criado_em.desc"),
  insert: (task) => api("tasks", { method: "POST", body: JSON.stringify(task) }),
  update: (id, data) => api(`tasks?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id) => api(`tasks?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
};

const TEAM = ["João", "Dener", "Jean", "Alessandra", "Kamilly"];
const TEAM_COLORS = {
  "João": "#6366f1", "Dener": "#f59e0b", "Jean": "#10b981",
  "Alessandra": "#ec4899", "Kamilly": "#3b82f6"
};
const TEAM_INITIALS = (n) => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const STATUS = {
  aberto:    { label: "Em Aberto",    color: "#94a3b8", dot: "#64748b",  bg: "rgba(100,116,139,0.12)" },
  andamento: { label: "Em Andamento", color: "#f59e0b", dot: "#f59e0b",  bg: "rgba(245,158,11,0.12)"  },
  concluido: { label: "Concluída",    color: "#10b981", dot: "#10b981",  bg: "rgba(16,185,129,0.12)"  },
};
const DEMAND_TYPES = ["Judicial", "Administrativa", "Ambas"];
const SERVICE_TYPES = [
  "Execução Fiscal","Migração","Transação/Parcelamento",
  "Requerimento Administrativo","CAPAG","Estadual",
  "Monitória","Assessoria Mensal","Acompanhamento","Outros",
];
const SERVICE_COLORS = {
  "Execução Fiscal": "#ef4444", "Migração": "#8b5cf6", "Transação/Parcelamento": "#f59e0b",
  "Requerimento Administrativo": "#3b82f6", "CAPAG": "#10b981", "Estadual": "#06b6d4",
  "Monitória": "#f97316", "Assessoria Mensal": "#6366f1", "Acompanhamento": "#ec4899", "Outros": "#64748b",
};

const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function isOverdue(d) {
  if (!d) return false;
  return new Date(d + "T23:59:59") < new Date();
}
function isInPeriod(dateStr, period) {
  if (!dateStr || period === "todos") return true;
  const date = new Date(dateStr + "T12:00:00"), now = new Date();
  if (period === "dia") return date.toDateString() === now.toDateString();
  if (period === "semana") {
    const s = new Date(now); s.setDate(now.getDate()-now.getDay()); s.setHours(0,0,0,0);
    const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999);
    return date >= s && date <= e;
  }
  if (period === "mes") return date.getMonth()===now.getMonth()&&date.getFullYear()===now.getFullYear();
  if (period === "ano") return date.getFullYear()===now.getFullYear();
  return true;
}

const emptyForm = { empresa:"", cnpj:"", criador:"", responsavel:"", prazo:"", tipo:"", servico:"", observacoes:"" };

const css = `
:root {
  --bg: #0d0d10;
  --surface: #13131a;
  --surface2: #1a1a24;
  --surface3: #21212e;
  --border: rgba(255,255,255,0.07);
  --border2: rgba(255,255,255,0.12);
  --text: #e2e8f0;
  --text2: #94a3b8;
  --text3: #475569;
  --accent: #6366f1;
  --accent2: #818cf8;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--surface3);border-radius:2px}

/* LAYOUT */
.layout{display:flex;flex-direction:column;height:100vh;overflow:hidden}

/* TOPBAR */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:48px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;gap:12px}
.topbar-left{display:flex;align-items:center;gap:10px}
.logo{font-size:13px;font-weight:600;color:var(--text);letter-spacing:-.2px;display:flex;align-items:center;gap:7px}
.logo-icon{width:22px;height:22px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px}
.breadcrumb{font-size:12px;color:var(--text3);display:flex;align-items:center;gap:6px}
.breadcrumb span{color:var(--text2)}
.topbar-right{display:flex;align-items:center;gap:8px}
.sync-pill{display:flex;align-items:center;gap:5px;padding:4px 9px;border-radius:20px;background:var(--surface3);font-size:11px;color:var(--text3);border:1px solid var(--border)}
.sync-pill .sd{width:5px;height:5px;border-radius:50%;background:#10b981;flex-shrink:0}
.sync-pill .sd.err{background:#ef4444}
.sync-pill .sd.spin{background:#f59e0b;animation:blink .9s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.btn-primary{background:var(--accent);color:#fff;border:none;padding:6px 14px;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;border-radius:6px;cursor:pointer;transition:background .15s,opacity .15s;letter-spacing:.1px}
.btn-primary:hover{background:var(--accent2)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed}

/* SUBBAR */
.subbar{display:flex;align-items:center;gap:6px;padding:8px 20px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;flex-wrap:wrap}
.view-tab{background:transparent;border:none;color:var(--text3);padding:5px 11px;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;border-radius:5px;transition:all .15s;display:flex;align-items:center;gap:5px}
.view-tab:hover{background:var(--surface3);color:var(--text2)}
.view-tab.active{background:var(--surface3);color:var(--text)}
.divider{width:1px;height:16px;background:var(--border2);margin:0 2px}
.filter-group{display:flex;align-items:center;gap:5px}
.filter-label{font-size:11px;color:var(--text3);font-weight:500}
.filter-select{background:var(--surface3);border:1px solid var(--border2);color:var(--text2);padding:4px 8px;font-size:11px;font-family:'DM Sans',sans-serif;border-radius:5px;cursor:pointer;outline:none;transition:border .15s}
.filter-select:hover,.filter-select:focus{border-color:var(--accent);color:var(--text)}
.btn-refresh{background:transparent;border:1px solid var(--border2);color:var(--text3);padding:4px 9px;font-size:11px;font-family:'DM Sans',sans-serif;border-radius:5px;cursor:pointer;transition:all .15s}
.btn-refresh:hover{border-color:var(--accent);color:var(--text2)}

/* MAIN */
.main{flex:1;overflow:hidden;display:flex;flex-direction:column}
.content{flex:1;overflow:auto;padding:16px 20px}

/* STATS */
.stats-row{display:flex;gap:8px;margin-bottom:16px}
.stat-chip{display:flex;align-items:center;gap:7px;padding:7px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:12px}
.stat-chip .num{font-size:18px;font-weight:600;font-family:'DM Mono',monospace;line-height:1}
.stat-chip .lbl{color:var(--text3);font-size:11px}

/* KANBAN */
.kanban{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start}
.k-col{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;transition:border-color .15s}
.k-col.drag-over{border-color:var(--accent);background:rgba(99,102,241,0.06)}
.k-col-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid var(--border)}
.k-col-left{display:flex;align-items:center;gap:8px}
.k-col-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.k-col-name{font-size:12px;font-weight:600;color:var(--text)}
.k-col-count{background:var(--surface3);border:1px solid var(--border);color:var(--text3);font-size:10px;font-weight:600;font-family:'DM Mono',monospace;padding:1px 7px;border-radius:10px}
.k-col-body{padding:10px;display:flex;flex-direction:column;gap:7px;min-height:120px}
.k-empty{display:flex;align-items:center;justify-content:center;height:80px;color:var(--text3);font-size:11px;border:1.5px dashed var(--border);border-radius:7px}

/* CARD */
.card{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;cursor:grab;transition:border-color .15s,box-shadow .15s,transform .1s,opacity .15s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:3px 0 0 3px}
.card.aberto::before{background:var(--text3)}
.card.andamento::before{background:#f59e0b}
.card.concluido::before{background:#10b981}
.card:active{cursor:grabbing}
.card:hover{border-color:var(--border2);box-shadow:0 4px 20px rgba(0,0,0,.4)}
.card.dragging{opacity:.3;transform:scale(.97)}
.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:9px}
.card-title{font-size:13px;font-weight:500;color:var(--text);line-height:1.4;flex:1}
.card-cnpj{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace;margin-top:2px}
.card-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:9px}
.tag{font-size:10px;font-weight:500;padding:2px 7px;border-radius:4px;letter-spacing:.1px}
.tag-servico{color:#fff}
.tag-tipo{background:rgba(255,255,255,0.06);color:var(--text2);border:1px solid var(--border2)}
.tag-overdue{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.25)}
.card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
.card-date{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace;display:flex;align-items:center;gap:4px}
.card-date.overdue{color:#ef4444}
.card-right{display:flex;align-items:center;gap:6px}
.avatar{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#fff;flex-shrink:0;border:1.5px solid var(--surface2)}
.status-badge{font-size:10px;font-weight:500;padding:2px 8px;border-radius:4px;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:opacity .15s;white-space:nowrap}
.status-badge:hover{opacity:.8}
.card-actions-row{display:flex;gap:4px;margin-top:9px;padding-top:8px;border-top:1px solid var(--border);opacity:0;transition:opacity .2s}
.card:hover .card-actions-row{opacity:1}
.act{background:transparent;border:1px solid var(--border2);color:var(--text3);font-size:10px;font-weight:500;font-family:'DM Sans',sans-serif;padding:3px 9px;border-radius:4px;cursor:pointer;transition:all .15s}
.act:hover{border-color:var(--accent);color:var(--text)}
.act.del:hover{border-color:#ef4444;color:#ef4444}

/* LIST */
.list-wrap{display:flex;flex-direction:column;gap:14px}
.list-section{}
.list-head{display:flex;align-items:center;gap:8px;padding:6px 0;margin-bottom:6px;border-bottom:1px solid var(--border)}
.list-head-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.list-head-name{font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.5px;text-transform:uppercase}
.list-head-count{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace}
.list-card{display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;transition:border-color .15s,background .15s;margin-bottom:5px}
.list-card:hover{border-color:var(--border2);background:var(--surface2)}
.list-card-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.list-card-stripe{width:3px;height:32px;border-radius:2px;flex-shrink:0}
.list-card-info{flex:1;min-width:0}
.list-card-title{font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list-card-sub{font-size:10px;color:var(--text3);margin-top:2px;font-family:'DM Mono',monospace}
.list-card-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
.list-card-date{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace}
.list-card-date.overdue{color:#ef4444}
.list-act{background:transparent;border:1px solid transparent;color:var(--text3);font-size:10px;font-family:'DM Sans',sans-serif;font-weight:500;padding:3px 8px;border-radius:4px;cursor:pointer;transition:all .15s;opacity:0}
.list-card:hover .list-act{opacity:1;border-color:var(--border2)}
.list-act:hover{border-color:var(--accent)!important;color:var(--text)!important}
.list-act.del:hover{border-color:#ef4444!important;color:#ef4444!important}

.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;color:var(--text3);gap:8px}
.empty-state svg{opacity:.3}
.empty-state p{font-size:13px}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
.modal{background:var(--surface);border:1px solid var(--border2);border-radius:12px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.6)}
.modal h2{font-size:16px;font-weight:600;color:var(--text);margin-bottom:2px}
.modal-sub{font-size:11px;color:var(--text3);margin-bottom:20px}
.form-row{margin-bottom:14px}
.form-row label{display:block;font-size:11px;font-weight:500;color:var(--text3);margin-bottom:5px;letter-spacing:.3px}
.form-row input,.form-row select,.form-row textarea{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:8px 11px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text);outline:none;transition:border .15s}
.form-row input:focus,.form-row select:focus,.form-row textarea:focus{border-color:var(--accent);background:var(--bg)}
.form-row select option{background:var(--surface2)}
.form-row textarea{resize:vertical;min-height:70px}
.form-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)}
.btn-ghost{background:transparent;border:1px solid var(--border2);color:var(--text3);padding:7px 16px;font-family:'DM Sans',sans-serif;font-weight:500;font-size:12px;border-radius:6px;cursor:pointer;transition:all .15s}
.btn-ghost:hover{border-color:var(--text3);color:var(--text)}
.err-bar{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;padding:8px 12px;border-radius:6px;font-size:12px;margin-bottom:14px}
.req{color:#ef4444}
@media(max-width:720px){.kanban{grid-template-columns:1fr}.stats-row{flex-wrap:wrap}}
`;

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("kanban");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterPeriod, setFilterPeriod] = useState("todos");
  const [filterResponsavel, setFilterResponsavel] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState("ok");
  const [error, setError] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      setSyncStatus("loading");
      const data = await db.getAll();
      setTasks(data || []);
      setSyncStatus("ok");
    } catch { setSyncStatus("error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { const t = setInterval(loadTasks, 30000); return () => clearInterval(t); }, [loadTasks]);

  const openNew = () => { setEditingTask(null); setForm(emptyForm); setError(null); setShowForm(true); };
  const openEdit = (task) => {
    setEditingTask(task.id);
    setForm({ empresa:task.empresa||"", cnpj:task.cnpj||"", criador:task.criador||"",
      responsavel:task.responsavel||"", prazo:task.prazo||"", tipo:task.tipo||"",
      servico:task.servico||"", observacoes:task.observacoes||"" });
    setError(null); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.empresa||!form.criador||!form.responsavel||!form.prazo||!form.tipo) {
      setError("Preencha: Empresa, Criador, Responsável, Prazo e Tipo de Demanda."); return;
    }
    setSaving(true); setError(null);
    try {
      if (editingTask) {
        await db.update(editingTask, { empresa:form.empresa,cnpj:form.cnpj,criador:form.criador,
          responsavel:form.responsavel,prazo:form.prazo,tipo:form.tipo,servico:form.servico,observacoes:form.observacoes });
        setTasks(p => p.map(t => t.id===editingTask ? {...t,...form} : t));
      } else {
        const nt = { id:generateId(), status:"aberto", criado_em:new Date().toISOString(), ...form };
        await db.insert(nt);
        setTasks(p => [nt,...p]);
      }
      setShowForm(false);
    } catch { setError("Erro ao salvar. Tente novamente."); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    setTasks(p => p.map(t => t.id===id ? {...t,status} : t));
    try { await db.update(id,{status}); } catch { loadTasks(); }
  };

  const deleteTask = async (id) => {
    if (!confirm("Excluir esta tarefa?")) return;
    setTasks(p => p.filter(t => t.id!==id));
    try { await db.delete(id); } catch { loadTasks(); }
  };

  const fmtCNPJ = (v) => {
    const n = v.replace(/\D/g,"").slice(0,14);
    return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5")
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/,"$1.$2.$3/$4")
      .replace(/^(\d{2})(\d{3})(\d{3})$/,"$1.$2.$3")
      .replace(/^(\d{2})(\d{3})$/,"$1.$2");
  };

  const filtered = tasks.filter(t =>
    isInPeriod(t.prazo, filterPeriod) &&
    (filterResponsavel==="todos"||t.responsavel===filterResponsavel) &&
    (filterStatus==="todos"||t.status===filterStatus)
  );

  return (
    <>
      <style>{fonts}{css}</style>
      <div className="layout">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="logo">
              <div className="logo-icon">⚖</div>
              <span>Advocacia</span>
            </div>
            <span style={{color:"var(--text3)",fontSize:12}}>/</span>
            <span style={{fontSize:12,color:"var(--text2)",fontWeight:500}}>Gestão de Tarefas</span>
          </div>
          <div className="topbar-right">
            <div className="sync-pill">
              <span className={`sd${syncStatus==="error"?" err":syncStatus==="loading"?" spin":""}`}/>
              {syncStatus==="ok"?"Sincronizado":syncStatus==="loading"?"Atualizando...":"Erro de conexão"}
            </div>
            <button className="btn-primary" onClick={openNew} disabled={loading}>+ Nova Tarefa</button>
          </div>
        </div>

        {/* SUBBAR */}
        <div className="subbar">
          <button className={`view-tab${view==="kanban"?" active":""}`} onClick={()=>setView("kanban")}>
            ⊞ Kanban
          </button>
          <button className={`view-tab${view==="lista"?" active":""}`} onClick={()=>setView("lista")}>
            ☰ Lista
          </button>
          <div className="divider"/>
          <div className="filter-group">
            <span className="filter-label">Prazo</span>
            <select className="filter-select" value={filterPeriod} onChange={e=>setFilterPeriod(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="dia">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Responsável</span>
            <select className="filter-select" value={filterResponsavel} onChange={e=>setFilterResponsavel(e.target.value)}>
              <option value="todos">Todos</option>
              {TEAM.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Status</span>
            <select className="filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="todos">Todos</option>
              {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <button className="btn-refresh" onClick={loadTasks}>↻</button>
        </div>

        {/* MAIN */}
        <div className="main">
          <div className="content">
            {/* Stats */}
            {!loading && (
              <div className="stats-row">
                {Object.entries(STATUS).map(([k,v])=>(
                  <div className="stat-chip" key={k}>
                    <span className="num" style={{color:v.dot}}>{tasks.filter(t=>t.status===k).length}</span>
                    <span className="lbl">{v.label}</span>
                  </div>
                ))}
                <div className="stat-chip">
                  <span className="num" style={{color:"var(--text2)"}}>{tasks.length}</span>
                  <span className="lbl">Total</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="empty-state"><p>Conectando ao banco de dados...</p></div>
            ) : view==="kanban" ? (
              <KanbanView tasks={filtered} allTasks={tasks} onEdit={openEdit} onDelete={deleteTask} onStatus={updateStatus} updateStatus={updateStatus} />
            ) : (
              <ListView tasks={filtered} onEdit={openEdit} onDelete={deleteTask} onStatus={updateStatus} />
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="overlay" onClick={e=>e.target.className==="overlay"&&!saving&&setShowForm(false)}>
          <div className="modal">
            <h2>{editingTask?"Editar Tarefa":"Nova Tarefa"}</h2>
            <p className="modal-sub">Campos marcados com <span className="req">*</span> são obrigatórios</p>
            {error && <div className="err-bar">⚠ {error}</div>}
            <div className="form-2col">
              <div className="form-row">
                <label>Empresa / Cliente <span className="req">*</span></label>
                <input placeholder="Nome da empresa" value={form.empresa} onChange={e=>setForm({...form,empresa:e.target.value})}/>
              </div>
              <div className="form-row">
                <label>CNPJ</label>
                <input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e=>setForm({...form,cnpj:fmtCNPJ(e.target.value)})}/>
              </div>
            </div>
            <div className="form-2col">
              <div className="form-row">
                <label>Criado por <span className="req">*</span></label>
                <select value={form.criador} onChange={e=>setForm({...form,criador:e.target.value})}>
                  <option value="">Selecione</option>
                  {TEAM.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Responsável <span className="req">*</span></label>
                <select value={form.responsavel} onChange={e=>setForm({...form,responsavel:e.target.value})}>
                  <option value="">Selecione</option>
                  {TEAM.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-2col">
              <div className="form-row">
                <label>Prazo <span className="req">*</span></label>
                <input type="date" value={form.prazo} onChange={e=>setForm({...form,prazo:e.target.value})}/>
              </div>
              <div className="form-row">
                <label>Tipo de Demanda <span className="req">*</span></label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                  <option value="">Selecione</option>
                  {DEMAND_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label>Tipo de Serviço</label>
              <select value={form.servico} onChange={e=>setForm({...form,servico:e.target.value})}>
                <option value="">Selecione</option>
                {SERVICE_TYPES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Observações</label>
              <textarea placeholder="Detalhes adicionais..." value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/>
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={()=>setShowForm(false)} disabled={saving}>Cancelar</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving?"Salvando...":"Salvar Tarefa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Avatar({ name }) {
  const color = TEAM_COLORS[name] || "#64748b";
  return (
    <div className="avatar" style={{background:color}} title={name}>
      {TEAM_INITIALS(name)}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatus, draggable:isDraggable, onDragStart, onDragEnd }) {
  const [dragging, setDragging] = useState(false);
  const st = STATUS[task.status];
  const nextStatus = { aberto:"andamento", andamento:"concluido", concluido:"aberto" };
  const overdue = isOverdue(task.prazo) && task.status !== "concluido";
  const svcColor = SERVICE_COLORS[task.servico];

  return (
    <div
      className={`card ${task.status}${dragging?" dragging":""}`}
      draggable={isDraggable||false}
      onDragStart={e=>{setDragging(true);onDragStart&&onDragStart(e);}}
      onDragEnd={e=>{setDragging(false);onDragEnd&&onDragEnd(e);}}
    >
      <div className="card-top">
        <div style={{flex:1,minWidth:0}}>
          <div className="card-title">{task.empresa}</div>
          {task.cnpj && <div className="card-cnpj">{task.cnpj}</div>}
        </div>
      </div>

      <div className="card-tags">
        {task.servico && (
          <span className="tag tag-servico" style={{background:`${svcColor}22`,color:svcColor,border:`1px solid ${svcColor}44`}}>
            {task.servico}
          </span>
        )}
        <span className="tag tag-tipo">{task.tipo}</span>
      </div>

      <div className="card-footer">
        <div className={`card-date${overdue?" overdue":""}`}>
          {overdue?"⚠":"📅"} {formatDate(task.prazo)}
        </div>
        <div className="card-right">
          <button
            className="status-badge"
            style={{background:st.bg, color:st.color, border:`1px solid ${st.dot}33`}}
            onClick={()=>onStatus(task.id, nextStatus[task.status])}
            title="Avançar status"
          >{st.label}</button>
          <Avatar name={task.responsavel}/>
        </div>
      </div>

      <div className="card-actions-row">
        <button className="act" onClick={()=>onEdit(task)}>Editar</button>
        <button className="act del" onClick={()=>onDelete(task.id)}>Excluir</button>
        {task.observacoes && (
          <span style={{fontSize:10,color:"var(--text3)",marginLeft:"auto",alignSelf:"center"}}>
            💬 {task.observacoes.slice(0,40)}{task.observacoes.length>40?"…":""}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanView({ tasks, allTasks, onEdit, onDelete, onStatus, updateStatus }) {
  const [dragOver, setDragOver] = useState(null);
  const draggingId = useRef(null);

  const handleDrop = async (colKey) => {
    const id = draggingId.current;
    if (!id) return;
    const task = allTasks.find(t=>t.id===id);
    if (!task||task.status===colKey) { setDragOver(null); return; }
    await updateStatus(id, colKey);
    setDragOver(null);
  };

  return (
    <div className="kanban">
      {Object.entries(STATUS).map(([key,st])=>{
        const colTasks = tasks.filter(t=>t.status===key);
        return (
          <div key={key} className={`k-col${dragOver===key?" drag-over":""}`}
            onDragOver={e=>{e.preventDefault();setDragOver(key);}}
            onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(null);}}
            onDrop={()=>handleDrop(key)}
          >
            <div className="k-col-header">
              <div className="k-col-left">
                <span className="k-col-dot" style={{background:st.dot}}/>
                <span className="k-col-name">{st.label}</span>
              </div>
              <span className="k-col-count">{colTasks.length}</span>
            </div>
            <div className="k-col-body">
              {colTasks.length===0
                ? <div className="k-empty">Arraste um card aqui</div>
                : colTasks.map(t=>(
                  <TaskCard key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onStatus={onStatus}
                    draggable={true}
                    onDragStart={()=>{draggingId.current=t.id;}}
                    onDragEnd={()=>{draggingId.current=null;setDragOver(null);}}
                  />
                ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, onEdit, onDelete, onStatus }) {
  if (!tasks.length) return (
    <div className="empty-state">
      <p>Nenhuma tarefa encontrada para os filtros selecionados.</p>
    </div>
  );
  const nextStatus = { aberto:"andamento", andamento:"concluido", concluido:"aberto" };
  const groups = Object.entries(STATUS).map(([k,v])=>({key:k,st:v,items:tasks.filter(t=>t.status===k)}));
  return (
    <div className="list-wrap">
      {groups.map(g=>g.items.length>0&&(
        <div className="list-section" key={g.key}>
          <div className="list-head">
            <span className="list-head-dot" style={{background:g.st.dot}}/>
            <span className="list-head-name">{g.st.label}</span>
            <span className="list-head-count">{g.items.length}</span>
          </div>
          {g.items.map(t=>{
            const overdue = isOverdue(t.prazo) && t.status!=="concluido";
            const svcColor = SERVICE_COLORS[t.servico];
            return (
              <div className="list-card" key={t.id}>
                <div className="list-card-left">
                  <div className="list-card-stripe" style={{background:g.st.dot}}/>
                  <div className="list-card-info">
                    <div className="list-card-title">{t.empresa}</div>
                    <div className="list-card-sub">
                      {t.cnpj && <>{t.cnpj} · </>}
                      {t.tipo}
                      {t.servico && <> · {t.servico}</>}
                    </div>
                  </div>
                </div>
                <div className="list-card-right">
                  {t.servico&&svcColor&&(
                    <span className="tag" style={{background:`${svcColor}22`,color:svcColor,border:`1px solid ${svcColor}33`,fontSize:10,padding:"2px 7px",borderRadius:4}}>
                      {t.servico}
                    </span>
                  )}
                  <span className={`list-card-date${overdue?" overdue":""}`}>
                    {overdue?"⚠ ":""}{formatDate(t.prazo)}
                  </span>
                  <button
                    className="status-badge"
                    style={{background:g.st.bg,color:g.st.color,border:`1px solid ${g.st.dot}33`}}
                    onClick={()=>onStatus(t.id,nextStatus[t.status])}
                  >{g.st.label}</button>
                  <Avatar name={t.responsavel}/>
                  <button className="list-act" onClick={()=>onEdit(t)}>Editar</button>
                  <button className="list-act del" onClick={()=>onDelete(t.id)}>Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
