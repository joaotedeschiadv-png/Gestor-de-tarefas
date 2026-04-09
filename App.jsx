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
const TEAM_COLORS = { "João": "#6366f1", "Dener": "#f59e0b", "Jean": "#10b981", "Alessandra": "#ec4899", "Kamilly": "#3b82f6" };
const TEAM_INITIALS = (n) => (n || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const STATUS = {
  aberto:     { label: "Em Aberto",           dot: "#94a3b8", color: "#475569", bg: "#f1f5f9" },
  andamento:  { label: "Em Andamento",         dot: "#f59e0b", color: "#92400e", bg: "#fef3c7" },
  acompanhar: { label: "Acompanhar/Monitorar", dot: "#8b5cf6", color: "#5b21b6", bg: "#f5f3ff" },
  concluido:  { label: "Concluída",            dot: "#22c55e", color: "#14532d", bg: "#dcfce7" },
};

const ALERT_STATUSES = ["aberto", "andamento"]; // alertas só para estes status

const DEMAND_TYPES = ["Judicial", "Administrativa", "Ambas"];
const SERVICE_TYPES = [
  "Execução Fiscal", "Migração", "Transação/Parcelamento",
  "Requerimento Administrativo", "CAPAG", "Estadual",
  "Monitória", "Assessoria Mensal", "Acompanhamento", "Outros",
];
const SVC_COLORS = {
  "Execução Fiscal": "#ef4444", "Migração": "#8b5cf6", "Transação/Parcelamento": "#f59e0b",
  "Requerimento Administrativo": "#3b82f6", "CAPAG": "#10b981", "Estadual": "#06b6d4",
  "Monitória": "#f97316", "Assessoria Mensal": "#6366f1", "Acompanhamento": "#ec4899", "Outros": "#64748b",
};

const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function formatDate(d) { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }

function getAlertType(task) {
  if (!task.prazo || !ALERT_STATUSES.includes(task.status)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const due = new Date(task.prazo + "T00:00:00");
  if (due < today) return "vencido";
  if (due >= today && due < tomorrow) return "hoje";
  return null;
}

function isOverdue(d) { if (!d) return false; return new Date(d + "T23:59:59") < new Date(); }
function isDueToday(d) {
  if (!d) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const due = new Date(d + "T00:00:00");
  return due >= today && due < tomorrow;
}

function nowStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function isInPeriod(dateStr, period) {
  if (!dateStr || period === "todos") return true;
  const date = new Date(dateStr + "T12:00:00"), now = new Date();
  if (period === "dia") return date.toDateString() === now.toDateString();
  if (period === "semana") {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0);
    const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999);
    return date >= s && date <= e;
  }
  if (period === "mes") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (period === "ano") return date.getFullYear() === now.getFullYear();
  return true;
}

const emptyForm = { empresa: "", cnpj: "", criador: "", responsavel: "", prazo: "", tipo: "", servico: "", descricao: "", obsInicial: "" };

const css = `
:root {
  --bg: #f0f4fa;
  --white: #ffffff;
  --surface: #f8fafc;
  --border: #e2e8f0;
  --border2: #bfdbfe;
  --text: #1e293b;
  --text2: #475569;
  --text3: #94a3b8;
  --accent: #2563eb;
  --accent2: #1d4ed8;
  --accent-light: #eff6ff;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

.layout { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

/* TOPBAR */
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 52px; background: var(--white); border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 12px; }
.logo { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; color: var(--text); }
.logo-icon { width: 28px; height: 28px; background: linear-gradient(135deg, #2563eb, #3b82f6); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #fff; }
.breadcrumb { font-size: 12px; color: var(--text3); margin-left: 2px; }
.topbar-right { display: flex; align-items: center; gap: 8px; }
.sync-pill { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; border: 1px solid; }
.sync-pill.ok { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.sync-pill.loading { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.sync-pill.error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.sync-dot { width: 6px; height: 6px; border-radius: 50%; }
.sync-pill.ok .sync-dot { background: #22c55e; }
.sync-pill.loading .sync-dot { background: #f59e0b; animation: blink .9s infinite; }
.sync-pill.error .sync-dot { background: #ef4444; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
.btn-primary { background: var(--accent); color: #fff; border: none; padding: 7px 16px; font-size: 12px; font-weight: 600; font-family: 'DM Sans', sans-serif; border-radius: 7px; cursor: pointer; transition: background .15s; }
.btn-primary:hover { background: var(--accent2); }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }

/* ALERT BELL BUTTON */
.alert-btn { position: relative; background: transparent; border: 1px solid var(--border); border-radius: 7px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 15px; transition: all .15s; }
.alert-btn:hover { border-color: var(--accent); }
.alert-btn.has-alerts { border-color: #ef4444; background: #fef2f2; animation: bell-shake 2s ease-in-out infinite; }
@keyframes bell-shake {
  0%,100%{transform:rotate(0)} 5%{transform:rotate(-8deg)} 10%{transform:rotate(8deg)}
  15%{transform:rotate(-6deg)} 20%{transform:rotate(6deg)} 25%{transform:rotate(0)}
}
.alert-badge { position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 2px solid var(--white); }

/* SUBBAR */
.subbar { display: flex; align-items: center; gap: 6px; padding: 8px 20px; border-bottom: 1px solid var(--border); background: var(--white); flex-shrink: 0; flex-wrap: wrap; }
.view-tab { background: transparent; border: none; color: var(--text3); padding: 5px 12px; font-size: 12px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; border-radius: 6px; transition: all .15s; }
.view-tab:hover { background: #f1f5f9; color: var(--text2); }
.view-tab.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.vdiv { width: 1px; height: 18px; background: var(--border); margin: 0 2px; }
.flabel { font-size: 11px; color: var(--text3); font-weight: 500; }
.fsel { background: var(--surface); border: 1px solid var(--border); color: var(--text2); padding: 4px 9px; font-size: 11px; font-family: 'DM Sans', sans-serif; border-radius: 6px; cursor: pointer; outline: none; transition: border .15s; }
.fsel:focus { border-color: var(--accent); }
.btn-refresh { background: var(--surface); border: 1px solid var(--border); color: var(--text3); padding: 4px 10px; font-size: 12px; border-radius: 6px; cursor: pointer; transition: all .15s; font-family: 'DM Sans', sans-serif; }
.btn-refresh:hover { border-color: var(--accent); color: var(--accent); }

/* MAIN */
.main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.content { flex: 1; overflow: auto; padding: 16px 20px; }

/* STATS */
.stats-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-chip { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--white); border: 1px solid var(--border); border-radius: 10px; }
.stat-num { font-size: 20px; font-weight: 600; font-family: 'DM Mono', monospace; line-height: 1; }
.stat-lbl { font-size: 11px; color: var(--text3); font-weight: 500; }

/* KANBAN */
.kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: start; }
.k-col { background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color .15s; }
.k-col.drag-over { border-color: var(--accent); background: var(--accent-light); }
.k-col-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 14px 11px; border-bottom: 1px solid #f1f5f9; }
.k-col-left { display: flex; align-items: center; gap: 8px; }
.k-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.k-col-name { font-size: 11px; font-weight: 600; color: var(--text2); }
.k-count { background: #f1f5f9; border: 1px solid var(--border); color: var(--text3); font-size: 10px; font-weight: 600; font-family: 'DM Mono', monospace; padding: 1px 7px; border-radius: 10px; }
.k-col-body { padding: 10px; display: flex; flex-direction: column; gap: 7px; min-height: 120px; }
.k-empty { display: flex; align-items: center; justify-content: center; height: 70px; color: #cbd5e1; font-size: 11px; border: 1.5px dashed var(--border); border-radius: 8px; }

/* CARD base */
.card { background: var(--white); border: 1px solid var(--border); border-radius: 9px; padding: 12px; cursor: pointer; transition: all .15s; position: relative; overflow: hidden; }
.card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.card.aberto::before { background: #94a3b8; }
.card.andamento::before { background: #f59e0b; }
.card.acompanhar::before { background: #8b5cf6; }
.card.concluido::before { background: #22c55e; }

/* CARD alert overrides — amarelo e vermelho sobrescrevem a borda lateral */
.card.alert-today { background: #fffbeb; border-color: #fbbf24; box-shadow: 0 0 0 2px #fde68a; z-index: 1; }
.card.alert-today::before { background: #f59e0b; }
.card.alert-vencido { background: #fef2f2; border-color: #fca5a5; box-shadow: 0 0 0 2px #fecaca; z-index: 2; }
.card.alert-vencido::before { background: #ef4444; }

.card[draggable=true] { cursor: grab; }
.card[draggable=true]:active { cursor: grabbing; }
.card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.card.alert-today:hover { box-shadow: 0 4px 16px rgba(245,158,11,.25); }
.card.alert-vencido:hover { box-shadow: 0 4px 16px rgba(239,68,68,.25); }
.card.dragging { opacity: .3; transform: scale(.97); }

.card-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.card-cnpj { font-size: 10px; color: var(--text3); font-family: 'DM Mono', monospace; margin-bottom: 8px; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 9px; }
.tag { font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }
.tag-tipo { background: #f1f5f9; color: var(--text2); border: 1px solid var(--border); }
.card-footer { display: flex; align-items: center; justify-content: space-between; }
.card-date { font-size: 10px; color: var(--text3); font-family: 'DM Mono', monospace; }
.card-date.today { color: #d97706; font-weight: 700; }
.card-date.overdue { color: #dc2626; font-weight: 700; }
.card-right { display: flex; align-items: center; gap: 6px; }
.avatar { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #fff; flex-shrink: 0; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); }
.sbadge { font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.card-hints { font-size: 10px; color: var(--text3); margin-top: 7px; padding-top: 7px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; gap: 6px; }
.alert-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }
.alert-tag.today { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
.alert-tag.vencido { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

/* LIST */
.list-wrap { display: flex; flex-direction: column; gap: 14px; }
.list-head { display: flex; align-items: center; gap: 8px; padding: 5px 0; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; }
.list-head-name { font-size: 10px; font-weight: 700; color: var(--text3); letter-spacing: .8px; text-transform: uppercase; }
.list-head-count { font-size: 10px; color: #cbd5e1; font-family: 'DM Mono', monospace; margin-left: 4px; }
.lcard { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--white); border: 1px solid var(--border); border-radius: 9px; margin-bottom: 5px; cursor: pointer; transition: all .15s; position: relative; }
.lcard:hover { border-color: var(--border2); box-shadow: 0 2px 8px rgba(37,99,235,.07); }
.lcard.alert-today { background: #fffbeb; border-color: #fbbf24; }
.lcard.alert-vencido { background: #fef2f2; border-color: #fca5a5; }
.lcard-stripe { width: 3px; height: 34px; border-radius: 2px; flex-shrink: 0; }
.lcard-info { flex: 1; min-width: 0; }
.lcard-title { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lcard-sub { font-size: 10px; color: var(--text3); margin-top: 2px; font-family: 'DM Mono', monospace; }
.lcard-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.lact { background: transparent; border: 1px solid transparent; color: var(--text3); font-size: 10px; font-family: 'DM Sans', sans-serif; font-weight: 500; padding: 3px 8px; border-radius: 5px; cursor: pointer; transition: all .15s; opacity: 0; }
.lcard:hover .lact { opacity: 1; border-color: var(--border); }
.lact:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
.lact.del:hover { border-color: #ef4444 !important; color: #ef4444 !important; }

/* OVERLAY */
.overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(3px); }

/* ALERT MODAL */
.alert-modal { background: var(--white); border-radius: 14px; width: 100%; max-width: 520px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(15,23,42,.22); border: 1px solid var(--border); }
.alert-modal-header { padding: 20px 22px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
.alert-modal-title { font-size: 16px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px; }
.alert-close { background: transparent; border: 1px solid var(--border); color: var(--text3); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.alert-close:hover { border-color: #94a3b8; color: var(--text); }
.alert-modal-body { padding: 16px 22px 20px; display: flex; flex-direction: column; gap: 16px; }
.alert-section-title { font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.alert-section-title.vencido { color: #dc2626; }
.alert-section-title.today { color: #d97706; }
.alert-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: filter .15s; }
.alert-item.vencido { background: #fef2f2; border: 1px solid #fecaca; }
.alert-item.vencido:hover { filter: brightness(.97); }
.alert-item.today { background: #fffbeb; border: 1px solid #fde68a; }
.alert-item.today:hover { filter: brightness(.97); }
.alert-item-left { flex: 1; min-width: 0; }
.alert-item-empresa { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert-item-meta { font-size: 11px; margin-top: 2px; font-family: 'DM Mono', monospace; }
.alert-item-meta.vencido { color: #dc2626; }
.alert-item-meta.today { color: #d97706; }
.alert-item-resp { font-size: 11px; color: var(--text3); margin-top: 1px; }
.alert-empty-ok { text-align: center; padding: 24px; color: #22c55e; font-size: 13px; font-weight: 500; }

/* DETAIL PANEL */
.detail-panel { background: var(--white); border-radius: 14px; width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(15,23,42,.18); border: 1px solid var(--border); display: flex; flex-direction: column; }
.detail-header { padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.detail-empresa { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.detail-cnpj { font-size: 11px; color: var(--text3); font-family: 'DM Mono', monospace; }
.detail-close { background: transparent; border: 1px solid var(--border); color: var(--text3); width: 30px; height: 30px; border-radius: 7px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
.detail-close:hover { border-color: #ef4444; color: #ef4444; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 16px; padding: 14px 24px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-label { font-size: 10px; color: var(--text3); font-weight: 600; letter-spacing: .4px; text-transform: uppercase; }
.meta-value { font-size: 12px; color: var(--text2); font-weight: 500; }
.detail-body { padding: 18px 24px; display: flex; flex-direction: column; gap: 20px; }
.section-title { font-size: 11px; font-weight: 700; color: var(--text3); letter-spacing: .6px; text-transform: uppercase; margin-bottom: 8px; }
.descricao-box { background: var(--accent-light); border: 1px solid var(--border2); border-radius: 8px; padding: 14px; font-size: 13px; color: #1e40af; line-height: 1.65; }
.descricao-empty { background: var(--surface); border: 1px dashed var(--border); border-radius: 8px; padding: 14px; font-size: 12px; color: #cbd5e1; font-style: italic; }
.hist-entries { display: flex; flex-direction: column; }
.hist-entry { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
.hist-entry:last-child { border-bottom: none; }
.hist-av { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; }
.hist-meta-text { font-size: 10px; color: var(--text3); margin-bottom: 3px; font-family: 'DM Mono', monospace; }
.hist-text { font-size: 12px; color: var(--text2); line-height: 1.55; }
.hist-empty { text-align: center; padding: 20px; color: #cbd5e1; font-size: 12px; font-style: italic; }
.hist-add-area { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.hist-add-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.detail-actions { display: flex; gap: 8px; padding: 14px 24px; border-top: 1px solid #f1f5f9; background: #fafbfc; border-radius: 0 0 14px 14px; align-items: center; }
.act-btn { background: transparent; border: 1px solid var(--border); color: var(--text3); font-size: 11px; font-weight: 500; font-family: 'DM Sans', sans-serif; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all .15s; }
.act-btn:hover { border-color: var(--accent); color: var(--accent); }
.act-btn.del:hover { border-color: #ef4444; color: #ef4444; }
.status-sel { background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; font-family: 'DM Sans', sans-serif; font-size: 11px; color: var(--text2); outline: none; cursor: pointer; margin-left: auto; transition: border .15s; }
.status-sel:focus { border-color: var(--accent); }

/* FORM MODAL */
.form-modal { background: var(--white); border-radius: 14px; width: 100%; max-width: 580px; max-height: 92vh; overflow-y: auto; padding: 24px 26px; box-shadow: 0 20px 60px rgba(15,23,42,.18); border: 1px solid var(--border); }
.form-modal h2 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.modal-sub { font-size: 11px; color: var(--text3); margin-bottom: 20px; }
.frow { margin-bottom: 14px; }
.frow label { display: block; font-size: 11px; font-weight: 600; color: var(--text3); margin-bottom: 5px; letter-spacing: .3px; }
.frow input, .frow select, .frow textarea { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 7px; padding: 8px 11px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text); outline: none; transition: border .15s; }
.frow input:focus, .frow select:focus, .frow textarea:focus { border-color: var(--accent); background: var(--white); box-shadow: 0 0 0 3px rgba(37,99,235,.07); }
.frow textarea { resize: vertical; min-height: 72px; }
.f2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.btn-ghost { background: var(--white); border: 1px solid var(--border); color: var(--text3); padding: 8px 18px; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 12px; border-radius: 7px; cursor: pointer; transition: border .15s; }
.btn-ghost:hover { border-color: #94a3b8; }
.req { color: #ef4444; }
.err-bar { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 14px; }
.empty-state { text-align: center; padding: 48px; color: #cbd5e1; font-size: 13px; }
@media(max-width:900px) { .kanban { grid-template-columns: repeat(2,1fr); } }
@media(max-width:600px) { .kanban { grid-template-columns: 1fr; } }
`;

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("kanban");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [histText, setHistText] = useState("");
  const [histAutor, setHistAutor] = useState(TEAM[0]);
  const [filterPeriod, setFilterPeriod] = useState("todos");
  const [filterResp, setFilterResp] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sync, setSync] = useState("ok");
  const [error, setError] = useState(null);
  const draggingId = useRef(null);
  const alertShownRef = useRef(false);

  const loadTasks = useCallback(async () => {
    try {
      setSync("loading");
      const data = await db.getAll();
      const parsed = (data || []).map(t => ({ ...t, historico: Array.isArray(t.historico) ? t.historico : [] }));
      setTasks(parsed);
      setSync("ok");
      // Mostra alertas automaticamente na primeira carga se houver pendências
      if (!alertShownRef.current) {
        alertShownRef.current = true;
        const hasAlerts = parsed.some(t => getAlertType(t) !== null);
        if (hasAlerts) setShowAlerts(true);
      }
    } catch { setSync("error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { const i = setInterval(loadTasks, 30000); return () => clearInterval(i); }, [loadTasks]);

  const saveTasksLocal = (fn) => setTasks(prev => fn(prev));

  const updateStatus = async (id, status) => {
    saveTasksLocal(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    try { await db.update(id, { status }); } catch { loadTasks(); }
  };

  const deleteTask = async (id) => {
    if (!confirm("Deseja excluir esta tarefa?")) return;
    saveTasksLocal(prev => prev.filter(t => t.id !== id));
    setShowDetail(false);
    try { await db.delete(id); } catch { loadTasks(); }
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setError(null); setShowForm(true); };
  const openEdit = (id) => {
    const t = tasks.find(x => x.id === id); if (!t) return;
    setEditingId(id);
    setForm({ empresa: t.empresa||"", cnpj: t.cnpj||"", criador: t.criador||"", responsavel: t.responsavel||"",
      prazo: t.prazo||"", tipo: t.tipo||"", servico: t.servico||"", descricao: t.descricao||"", obsInicial: "" });
    setError(null); setShowDetail(false); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.empresa || !form.criador || !form.responsavel || !form.prazo || !form.tipo) {
      setError("Preencha: Empresa, Criador, Responsável, Prazo e Tipo de Demanda."); return;
    }
    setSaving(true); setError(null);
    try {
      if (editingId) {
        const t = tasks.find(x => x.id === editingId);
        const newHist = form.obsInicial.trim()
          ? [...(t.historico || []), { autor: form.criador, data: nowStr(), texto: form.obsInicial.trim() }]
          : (t.historico || []);
        await db.update(editingId, { empresa: form.empresa, cnpj: form.cnpj, criador: form.criador,
          responsavel: form.responsavel, prazo: form.prazo, tipo: form.tipo, servico: form.servico,
          descricao: form.descricao, historico: newHist });
        saveTasksLocal(prev => prev.map(x => x.id === editingId ? { ...x, ...form, historico: newHist } : x));
      } else {
        const hist = form.obsInicial.trim() ? [{ autor: form.criador, data: nowStr(), texto: form.obsInicial.trim() }] : [];
        const newTask = { id: generateId(), status: "aberto", criado_em: new Date().toISOString(),
          empresa: form.empresa, cnpj: form.cnpj, criador: form.criador, responsavel: form.responsavel,
          prazo: form.prazo, tipo: form.tipo, servico: form.servico, descricao: form.descricao, historico: hist };
        await db.insert({ ...newTask });
        saveTasksLocal(prev => [newTask, ...prev]);
      }
      setShowForm(false);
    } catch { setError("Erro ao salvar. Tente novamente."); }
    finally { setSaving(false); }
  };

  const addHistEntry = async () => {
    if (!histText.trim()) return;
    const t = tasks.find(x => x.id === detailId); if (!t) return;
    const newHist = [...(t.historico || []), { autor: histAutor, data: nowStr(), texto: histText.trim() }];
    saveTasksLocal(prev => prev.map(x => x.id === detailId ? { ...x, historico: newHist } : x));
    setHistText("");
    try { await db.update(detailId, { historico: newHist }); } catch { loadTasks(); }
  };

  const fmtCNPJ = (v) => {
    const n = v.replace(/\D/g, "").slice(0, 14);
    return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "$1.$2.$3/$4")
      .replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3")
      .replace(/^(\d{2})(\d{3})$/, "$1.$2");
  };

  const filtered = tasks.filter(t =>
    isInPeriod(t.prazo, filterPeriod) &&
    (filterResp === "todos" || t.responsavel === filterResp) &&
    (filterStatus === "todos" || t.status === filterStatus)
  );

  const detailTask = tasks.find(x => x.id === detailId);

  // Calcula alertas
  const vencidas = tasks.filter(t => getAlertType(t) === "vencido");
  const vencendoHoje = tasks.filter(t => getAlertType(t) === "hoje");
  const totalAlerts = vencidas.length + vencendoHoje.length;

  const openDetailFromAlert = (id) => {
    setDetailId(id);
    setShowAlerts(false);
    setShowDetail(true);
  };

  return (
    <>
      <style>{fonts}{css}</style>
      <div className="layout">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="logo">
            <div className="logo-icon">⚖</div>
            <span>Advocacia</span>
            <span className="breadcrumb">/ Gestão de Tarefas</span>
          </div>
          <div className="topbar-right">
            <div className={`sync-pill ${sync}`}>
              <span className="sync-dot" />
              {sync === "ok" ? "Sincronizado" : sync === "loading" ? "Atualizando..." : "Erro de conexão"}
            </div>
            {/* BOTÃO DE ALERTAS */}
            <button
              className={`alert-btn${totalAlerts > 0 ? " has-alerts" : ""}`}
              onClick={() => setShowAlerts(true)}
              title="Ver alertas de prazo"
            >
              🔔
              {totalAlerts > 0 && <span className="alert-badge">{totalAlerts}</span>}
            </button>
            <button className="btn-primary" onClick={openNew} disabled={loading}>+ Nova Tarefa</button>
          </div>
        </div>

        {/* SUBBAR */}
        <div className="subbar">
          {["kanban", "lista"].map(v => (
            <button key={v} className={`view-tab${view === v ? " active" : ""}`} onClick={() => setView(v)}>
              {v === "kanban" ? "⊞ Kanban" : "☰ Lista"}
            </button>
          ))}
          <div className="vdiv" />
          <span className="flabel">Prazo</span>
          <select className="fsel" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="dia">Hoje</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
            <option value="ano">Este ano</option>
          </select>
          <span className="flabel">Responsável</span>
          <select className="fsel" value={filterResp} onChange={e => setFilterResp(e.target.value)}>
            <option value="todos">Todos</option>
            {TEAM.map(p => <option key={p}>{p}</option>)}
          </select>
          <span className="flabel">Status</span>
          <select className="fsel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="todos">Todos</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn-refresh" onClick={loadTasks}>↻ Atualizar</button>
        </div>

        {/* MAIN */}
        <div className="main">
          <div className="content">
            {!loading && (
              <div className="stats-row">
                {Object.entries(STATUS).map(([k, v]) => (
                  <div className="stat-chip" key={k}>
                    <span className="stat-num" style={{ color: v.dot }}>{tasks.filter(t => t.status === k).length}</span>
                    <span className="stat-lbl">{v.label}</span>
                  </div>
                ))}
                <div className="stat-chip">
                  <span className="stat-num" style={{ color: "#64748b" }}>{tasks.length}</span>
                  <span className="stat-lbl">Total</span>
                </div>
                {vencidas.length > 0 && (
                  <div className="stat-chip" style={{ background: "#fef2f2", border: "1px solid #fca5a5", cursor: "pointer" }} onClick={() => setShowAlerts(true)}>
                    <span className="stat-num" style={{ color: "#dc2626" }}>{vencidas.length}</span>
                    <span className="stat-lbl" style={{ color: "#dc2626" }}>Vencidas</span>
                  </div>
                )}
                {vencendoHoje.length > 0 && (
                  <div className="stat-chip" style={{ background: "#fffbeb", border: "1px solid #fbbf24", cursor: "pointer" }} onClick={() => setShowAlerts(true)}>
                    <span className="stat-num" style={{ color: "#d97706" }}>{vencendoHoje.length}</span>
                    <span className="stat-lbl" style={{ color: "#d97706" }}>Vencem hoje</span>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="empty-state">Conectando ao banco de dados...</div>
            ) : view === "kanban" ? (
              <KanbanView tasks={filtered} allTasks={tasks}
                onOpenDetail={(id) => { setDetailId(id); setShowDetail(true); }}
                updateStatus={updateStatus} draggingId={draggingId} />
            ) : (
              <ListView tasks={filtered}
                onOpenDetail={(id) => { setDetailId(id); setShowDetail(true); }}
                onEdit={openEdit} onDelete={deleteTask} />
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE ALERTAS */}
      {showAlerts && (
        <div className="overlay" onClick={e => e.target.className === "overlay" && setShowAlerts(false)}>
          <div className="alert-modal">
            <div className="alert-modal-header">
              <div className="alert-modal-title">🔔 Alertas de Prazo</div>
              <button className="alert-close" onClick={() => setShowAlerts(false)}>✕</button>
            </div>
            <div className="alert-modal-body">
              {totalAlerts === 0 ? (
                <div className="alert-empty-ok">✅ Nenhuma tarefa com prazo vencido ou vencendo hoje!</div>
              ) : (
                <>
                  {vencidas.length > 0 && (
                    <div>
                      <div className="alert-section-title vencido">🚨 Prazo Vencido ({vencidas.length})</div>
                      {vencidas.map(t => (
                        <div key={t.id} className="alert-item vencido" onClick={() => openDetailFromAlert(t.id)}>
                          <div className="alert-item-left">
                            <div className="alert-item-empresa">{t.empresa}</div>
                            <div className="alert-item-meta vencido">Venceu em {formatDate(t.prazo)} · {STATUS[t.status].label}</div>
                            <div className="alert-item-resp">Responsável: {t.responsavel}</div>
                          </div>
                          <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>Ver →</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {vencendoHoje.length > 0 && (
                    <div>
                      <div className="alert-section-title today">⚠️ Vence Hoje ({vencendoHoje.length})</div>
                      {vencendoHoje.map(t => (
                        <div key={t.id} className="alert-item today" onClick={() => openDetailFromAlert(t.id)}>
                          <div className="alert-item-left">
                            <div className="alert-item-empresa">{t.empresa}</div>
                            <div className="alert-item-meta today">Prazo: {formatDate(t.prazo)} · {STATUS[t.status].label}</div>
                            <div className="alert-item-resp">Responsável: {t.responsavel}</div>
                          </div>
                          <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600, whiteSpace: "nowrap" }}>Ver →</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {showDetail && detailTask && (
        <div className="overlay" onClick={e => e.target.className === "overlay" && setShowDetail(false)}>
          <div className="detail-panel">
            <div className="detail-header">
              <div>
                <div className="detail-empresa">{detailTask.empresa}</div>
                {detailTask.cnpj && <div className="detail-cnpj">CNPJ: {detailTask.cnpj}</div>}
              </div>
              <button className="detail-close" onClick={() => setShowDetail(false)}>✕</button>
            </div>
            <div className="detail-meta">
              {[
                ["Status", <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:STATUS[detailTask.status].dot, display:"inline-block" }}/>
                  {STATUS[detailTask.status].label}
                </span>],
                ["Responsável", detailTask.responsavel],
                ["Criado por", detailTask.criador],
                ["Prazo", <span style={{ color: getAlertType(detailTask) === "vencido" ? "#dc2626" : getAlertType(detailTask) === "hoje" ? "#d97706" : "inherit", fontWeight: getAlertType(detailTask) ? 700 : 500 }}>
                  {formatDate(detailTask.prazo)}
                  {getAlertType(detailTask) === "vencido" && " 🚨"}
                  {getAlertType(detailTask) === "hoje" && " ⚠️"}
                </span>],
                ["Demanda", detailTask.tipo],
                ...(detailTask.servico ? [["Serviço", detailTask.servico]] : []),
              ].map(([label, val], i) => (
                <div className="meta-item" key={i}>
                  <span className="meta-label">{label}</span>
                  <span className="meta-value">{val}</span>
                </div>
              ))}
            </div>
            <div className="detail-body">
              <div>
                <div className="section-title">📋 O que deve ser feito</div>
                {detailTask.descricao
                  ? <div className="descricao-box">{detailTask.descricao}</div>
                  : <div className="descricao-empty">Nenhuma descrição cadastrada para esta tarefa.</div>}
              </div>
              <div>
                <div className="section-title">💬 Histórico de observações</div>
                <div className="hist-entries">
                  {(!detailTask.historico || detailTask.historico.length === 0)
                    ? <div className="hist-empty">Nenhuma observação registrada ainda.</div>
                    : [...detailTask.historico].reverse().map((h, i) => (
                      <div className="hist-entry" key={i}>
                        <div className="hist-av" style={{ background: TEAM_COLORS[h.autor] || "#64748b" }}>
                          {TEAM_INITIALS(h.autor)}
                        </div>
                        <div>
                          <div className="hist-meta-text">{h.autor} · {h.data}</div>
                          <div className="hist-text">{h.texto}</div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="hist-add-area">
                  <textarea placeholder="Adicione uma observação sobre o andamento..."
                    value={histText} onChange={e => setHistText(e.target.value)}
                    style={{ width:"100%", background:"#fff", border:"1px solid #e2e8f0", borderRadius:7, padding:"9px 11px", fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#1e293b", outline:"none", resize:"vertical", minHeight:64 }} />
                  <div className="hist-add-row">
                    <select value={histAutor} onChange={e => setHistAutor(e.target.value)}
                      style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:7, padding:"6px 10px", fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#1e293b", outline:"none" }}>
                      {TEAM.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <button className="btn-primary" onClick={addHistEntry} style={{ padding:"6px 14px", fontSize:11 }}>Adicionar</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="act-btn" onClick={() => openEdit(detailId)}>✏ Editar</button>
              <button className="act-btn del" onClick={() => deleteTask(detailId)}>Excluir</button>
              <select className="status-sel" value={detailTask.status} onChange={e => updateStatus(detailId, e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="overlay" onClick={e => e.target.className === "overlay" && !saving && setShowForm(false)}>
          <div className="form-modal">
            <h2>{editingId ? "Editar Tarefa" : "Nova Tarefa"}</h2>
            <p className="modal-sub">Campos com <span className="req">*</span> são obrigatórios</p>
            {error && <div className="err-bar">⚠ {error}</div>}
            <div className="f2col">
              <div className="frow"><label>Empresa / Cliente <span className="req">*</span></label>
                <input placeholder="Nome da empresa" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} /></div>
              <div className="frow"><label>CNPJ</label>
                <input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: fmtCNPJ(e.target.value) })} /></div>
            </div>
            <div className="f2col">
              <div className="frow"><label>Criado por <span className="req">*</span></label>
                <select value={form.criador} onChange={e => setForm({ ...form, criador: e.target.value })}>
                  <option value="">Selecione</option>{TEAM.map(p => <option key={p}>{p}</option>)}</select></div>
              <div className="frow"><label>Responsável <span className="req">*</span></label>
                <select value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })}>
                  <option value="">Selecione</option>{TEAM.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="f2col">
              <div className="frow"><label>Prazo <span className="req">*</span></label>
                <input type="date" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} /></div>
              <div className="frow"><label>Tipo de Demanda <span className="req">*</span></label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Selecione</option>{DEMAND_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="frow"><label>Tipo de Serviço</label>
              <select value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })}>
                <option value="">Selecione</option>{SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="frow"><label>O que deve ser feito</label>
              <textarea placeholder="Descreva o que precisa ser executado nesta tarefa..." value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="frow"><label>Observação inicial</label>
              <textarea placeholder="Alguma observação para registrar? (opcional)" value={form.obsInicial}
                onChange={e => setForm({ ...form, obsInicial: e.target.value })} style={{ minHeight: 60 }} /></div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Tarefa"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskCard({ task, onOpenDetail, updateStatus, isDraggable, onDragStart, onDragEnd }) {
  const [dragging, setDragging] = useState(false);
  const st = STATUS[task.status];
  const sc = SVC_COLORS[task.servico];
  const alertType = getAlertType(task);
  const hc = (task.historico || []).length;

  let dateClass = "card-date";
  if (alertType === "vencido") dateClass += " overdue";
  else if (alertType === "hoje") dateClass += " today";

  let cardClass = `card ${task.status}`;
  if (alertType === "vencido") cardClass += " alert-vencido";
  else if (alertType === "hoje") cardClass += " alert-today";
  if (dragging) cardClass += " dragging";

  return (
    <div
      className={cardClass}
      draggable={isDraggable || false}
      onDragStart={e => { setDragging(true); onDragStart && onDragStart(e); }}
      onDragEnd={e => { setDragging(false); onDragEnd && onDragEnd(e); }}
      onClick={() => onOpenDetail(task.id)}
    >
      {alertType && (
        <div style={{ marginBottom: 8 }}>
          <span className={`alert-tag ${alertType === "vencido" ? "vencido" : "today"}`}>
            {alertType === "vencido" ? "🚨 Prazo Vencido" : "⚠️ Vence Hoje"}
          </span>
        </div>
      )}
      <div className="card-title">{task.empresa}</div>
      {task.cnpj && <div className="card-cnpj">{task.cnpj}</div>}
      <div className="card-tags">
        {task.servico && sc && <span className="tag" style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}>{task.servico}</span>}
        <span className="tag tag-tipo">{task.tipo}</span>
      </div>
      <div className="card-footer">
        <div className={dateClass}>📅 {formatDate(task.prazo)}</div>
        <div className="card-right">
          <span className="sbadge" style={{ background: st.bg, color: st.color, border: `1px solid ${st.dot}40` }}>{st.label}</span>
          <div className="avatar" style={{ background: TEAM_COLORS[task.responsavel] || "#64748b" }} title={task.responsavel}>
            {TEAM_INITIALS(task.responsavel)}
          </div>
        </div>
      </div>
      {(task.descricao || hc > 0) && (
        <div className="card-hints">
          {task.descricao && <span>📋 Descrição</span>}
          {task.descricao && hc > 0 && <span style={{ color: "#e2e8f0" }}>·</span>}
          {hc > 0 && <span>💬 {hc} obs.</span>}
        </div>
      )}
    </div>
  );
}

function KanbanView({ tasks, allTasks, onOpenDetail, updateStatus, draggingId }) {
  const [dragOver, setDragOver] = useState(null);
  const handleDrop = async (colKey) => {
    const id = draggingId.current;
    if (!id) return;
    const t = allTasks.find(x => x.id === id);
    if (!t || t.status === colKey) { setDragOver(null); return; }
    await updateStatus(id, colKey);
    setDragOver(null);
  };
  return (
    <div className="kanban">
      {Object.entries(STATUS).map(([key, st]) => {
        const colTasks = tasks.filter(t => t.status === key);
        // Ordena: vencidos primeiro, depois vence hoje, depois normais
        const sorted = [...colTasks].sort((a, b) => {
          const order = { vencido: 0, hoje: 1, null: 2 };
          return (order[getAlertType(a)] ?? 2) - (order[getAlertType(b)] ?? 2);
        });
        return (
          <div key={key} className={`k-col${dragOver === key ? " drag-over" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOver(key); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
            onDrop={() => handleDrop(key)}>
            <div className="k-col-header">
              <div className="k-col-left">
                <span className="k-dot" style={{ background: st.dot }} />
                <span className="k-col-name">{st.label}</span>
              </div>
              <span className="k-count">{colTasks.length}</span>
            </div>
            <div className="k-col-body">
              {sorted.length === 0
                ? <div className="k-empty">Arraste um card aqui</div>
                : sorted.map(t => (
                  <TaskCard key={t.id} task={t} onOpenDetail={onOpenDetail} updateStatus={updateStatus}
                    isDraggable={true}
                    onDragStart={() => { draggingId.current = t.id; }}
                    onDragEnd={() => { draggingId.current = null; setDragOver(null); }} />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, onOpenDetail, onEdit, onDelete }) {
  if (!tasks.length) return <div className="empty-state">Nenhuma tarefa encontrada para os filtros selecionados.</div>;
  const groups = Object.entries(STATUS).map(([k, v]) => ({ key: k, st: v, items: tasks.filter(t => t.status === k) })).filter(g => g.items.length > 0);
  return (
    <div className="list-wrap">
      {groups.map(g => (
        <div key={g.key}>
          <div className="list-head">
            <span className="k-dot" style={{ background: g.st.dot, display: "inline-block" }} />
            <span className="list-head-name">{g.st.label}</span>
            <span className="list-head-count">{g.items.length}</span>
          </div>
          {[...g.items].sort((a, b) => {
            const order = { vencido: 0, hoje: 1, null: 2 };
            return (order[getAlertType(a)] ?? 2) - (order[getAlertType(b)] ?? 2);
          }).map(t => {
            const sc = SVC_COLORS[t.servico];
            const alertType = getAlertType(t);
            return (
              <div key={t.id} className={`lcard${alertType === "vencido" ? " alert-vencido" : alertType === "hoje" ? " alert-today" : ""}`}
                onClick={() => onOpenDetail(t.id)}>
                <div className="lcard-stripe" style={{ background: alertType === "vencido" ? "#ef4444" : alertType === "hoje" ? "#f59e0b" : g.st.dot }} />
                <div className="lcard-info">
                  <div className="lcard-title">{t.empresa}</div>
                  <div className="lcard-sub">{t.cnpj ? t.cnpj + " · " : ""}{t.tipo}{t.servico ? " · " + t.servico : ""}</div>
                </div>
                <div className="lcard-right">
                  {alertType === "vencido" && <span className="alert-tag vencido">🚨 Vencido</span>}
                  {alertType === "hoje" && <span className="alert-tag today">⚠️ Hoje</span>}
                  {t.servico && sc && <span className="tag" style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}30`, fontSize: 10, padding: "2px 8px", borderRadius: 4 }}>{t.servico}</span>}
                  <span style={{ fontSize: 10, color: alertType === "vencido" ? "#dc2626" : alertType === "hoje" ? "#d97706" : "#94a3b8", fontFamily: "'DM Mono',monospace", fontWeight: alertType ? 700 : 400 }}>
                    {formatDate(t.prazo)}
                  </span>
                  <span className="sbadge" style={{ background: g.st.bg, color: g.st.color, border: `1px solid ${g.st.dot}40` }}>{g.st.label}</span>
                  <div className="avatar" style={{ background: TEAM_COLORS[t.responsavel] || "#64748b" }}>{TEAM_INITIALS(t.responsavel)}</div>
                  <button className="lact" onClick={e => { e.stopPropagation(); onEdit(t.id); }}>Editar</button>
                  <button className="lact del" onClick={e => { e.stopPropagation(); onDelete(t.id); }}>Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
