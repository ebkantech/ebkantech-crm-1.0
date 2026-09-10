import { useState, useMemo, useEffect, createContext, useContext } from "react";
import { api } from "./api";
import { C, F, FONTS } from "./theme";
import {
  Search,
  Plus,
  ChevronDown,
  ArrowLeft,
  Users,
  Inbox,
  UploadCloud,
  Radio,
  Settings2,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  AlertTriangle,
  Check,
  X,
  Hash,
  Lock,
  MessagesSquare,
  ShieldCheck,
  LayoutDashboard,
  ListChecks,
  CornerDownRight,
  Undo2,
  LogOut,
  UserCog,
} from "lucide-react";

// Populated from the API when the app boots — see the bootstrap effect in SalesCRM.
let TENANTS = [];

const STAGES = [
  { id: "new", label: "New" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal out" },
  { id: "negotiation", label: "Negotiating" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

const CHANNELS = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: C.green },
  email: { label: "Email", icon: Mail, color: C.stamp },
  call: { label: "Call", icon: Phone, color: C.amber },
  note: { label: "Note", icon: StickyNote, color: C.inkSoft },
};

const SOURCES = ["WhatsApp", "Website form", "Referral", "Import", "Event", "Cold call"];

const money = (n) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

const TODAY = new Date("2026-08-30");
const daysAgo = (d) => Math.max(0, Math.round((TODAY - new Date(d)) / 86400000));

const digits = (s) => (s || "").replace(/\D/g, "").slice(-10);
const norm = (s) => (s || "").trim().toLowerCase();

/* ------------------------------------------------------------------ *
 *  Who may do what. Permission is a vocabulary the roles draw from,
 *  not a switch buried in code — so a partner can read this table and
 *  understand exactly what a developer can see.
 * ------------------------------------------------------------------ */
const PERMS = {
  "leads.view": "See leads",
  "leads.edit": "Move leads and edit them",
  "client.message": "Write to clients",
  "fees.view": "See fee figures",
  "projects.view.own": "See projects they are on",
  "projects.view.all": "See every project",
  "team.view": "See who is staffed where",
  "team.manage": "Add staff accounts and set their role",
  "tasks.assign": "Open work and hand it to a lead",
  "import": "Bring in lists",
  "rules": "Change sources and rules",
};

const ROLES = {
  partner: {
    label: "Partner",
    perms: ["leads.view", "leads.edit", "client.message", "fees.view", "projects.view.own", "projects.view.all", "team.view", "team.manage", "tasks.assign", "import", "rules"],
    rooms: ["sales", "dev", "partners", "product"],
  },
  sales: {
    label: "Sales lead",
    perms: ["leads.view", "leads.edit", "client.message", "fees.view", "projects.view.own", "import"],
    rooms: ["sales", "product"],
  },
  associate: {
    label: "Associate",
    perms: ["leads.view", "leads.edit", "client.message", "projects.view.own"],
    rooms: ["sales", "product"],
  },
  developer: {
    label: "Developer",
    perms: ["leads.view", "projects.view.own"],
    rooms: ["dev", "product"],
  },
  designer: {
    label: "Designer",
    perms: ["projects.view.own"],
    rooms: ["dev", "product"],
  },
  auditor: {
    label: "Auditor, read only",
    perms: ["leads.view", "fees.view", "projects.view.all"],
    rooms: ["partners"],
  },
};

// Populated from the API when the app boots — see the bootstrap effect in SalesCRM.
let STAFF = [];

// Populated from the API when the app boots — see the bootstrap effect in SalesCRM.
let PROJECTS = [];

const progressOf = (p) => p.milestones.filter(([, d]) => d).length / p.milestones.length;
const daysLeft = (d) => Math.round((new Date(d) - TODAY) / 86400000);
const health = (p) => {
  const left = daysLeft(p.due);
  const done = progressOf(p);
  if (left < 0) return { label: "overdue", color: C.carbon };
  if (left < 16 && done < 0.6) return { label: "at risk", color: C.amber };
  return { label: "on track", color: C.green };
};


/* ------------------------------------------------------------------ *
 *  Tasks. One assignee, one assigner, and a parent_id — that last
 *  field is the whole delegation mechanism. A lead never reassigns
 *  what they were given; they break it out into children and stay
 *  answerable for the parent.
 * ------------------------------------------------------------------ */
const TSTATUS = {
  todo: { label: "To do", color: C.inkSoft },
  doing: { label: "Doing", color: C.stamp },
  blocked: { label: "Blocked", color: C.carbon },
  review: { label: "With lead", color: C.amber },
  done: { label: "Done", color: C.green },
};

const kidsOf = (tasks, id) => tasks.filter((t) => t.parent === id);
const project = (id) => PROJECTS.find((p) => p.id === id);
const leadOf = (p) => p?.team.find((t) => t.part === "Team lead")?.id;

/* a parent's status is never set by hand — it falls out of its children */
const rollup = (tasks, t) => {
  const kids = kidsOf(tasks, t.id);
  if (!kids.length) return t.status;
  const states = kids.map((k) => rollup(tasks, k));
  if (states.every((s) => s === "done")) return t.status === "done" ? "done" : "review";
  if (states.some((s) => s === "blocked")) return "blocked";
  if (states.some((s) => s === "doing" || s === "review")) return "doing";
  return "todo";
};

const isLeadOn = (me, projectId) => leadOf(project(projectId)) === me.id;

const ROOMS = [
  { id: "sales", name: "sales-team", about: "Pipeline, quotes, who's chasing what", roles: ["partner", "sales", "associate"] },
  { id: "dev", name: "developer-team", about: "The CRM itself: bugs, deploys, integrations", roles: ["partner", "developer"] },
  { id: "product", name: "product", about: "Where sales tells engineering what hurts", roles: ["partner", "sales", "associate", "developer"] },
  { id: "partners", name: "partners", about: "Fees, staffing, anything not for the floor", roles: ["partner", "auditor"] },
];

const Session = createContext({ id: "u1", name: "Priya Rao", role: "partner" });
const useMe = () => useContext(Session);
const can = (me, p) => ROLES[me.role].perms.includes(p);
const staffName = (id) => STAFF.find((s) => s.id === id)?.name || "Someone";

/* fee figures are hidden, not blanked, so it's obvious they exist */
const fee = (me, n) => (can(me, "fees.view") ? money(n) : "₹ ·····");

const WA_TEMPLATES = [
  { id: "intro", label: "Introduction", body: "Hi {name}, {owner} here from Rao & Kulkarni. You reached out about {topic} — free for a short call this week?" },
  { id: "nudge", label: "Gentle nudge", body: "Hi {name}, checking in on the proposal we sent. Anything you'd like changed before we proceed?" },
  { id: "docs", label: "Document request", body: "Hi {name}, to move ahead we'll need last year's financials and the GST credentials. Fine to send them here?" },
];

/* ------------------------------------------------------------------ */

function PipelineSpine({ leads, stage, onStage }) {
  const me = useMe();
  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const total = open.reduce((s, l) => s + l.value, 0) || 1;
  const cols = STAGES.slice(0, 4).map((s) => {
    const rows = open.filter((l) => l.stage === s.id);
    return { ...s, value: rows.reduce((a, b) => a + b.value, 0), count: rows.length };
  });
  const stale = open.filter((l) => daysAgo(l.lastTouch) > 14).length;

  return (
    <div className="px-5 pt-6 pb-7 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
          {can(me, "fees.view") ? `${money(total)} in play` : `${open.length} leads in play`}
        </h1>
        <p className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>
          {open.length} open leads
          {stale > 0 && (
            <span style={{ color: C.carbon }}> · {stale} untouched over a fortnight</span>
          )}
        </p>
      </div>

      <div className="mt-5 flex w-full gap-1">
        {cols.map((s) => {
          const on = stage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onStage(on ? "all" : s.id)}
              className="min-w-0 text-left"
              style={{ flexGrow: Math.max(s.value / total, 0.1), flexBasis: 0 }}
            >
              <div
                className="h-2 w-full"
                style={{
                  backgroundColor: s.value ? (on ? C.carbon : C.stamp) : "transparent",
                  border: s.value ? "none" : `1px dashed ${C.rule}`,
                  opacity: s.value && !on ? 0.45 + 0.18 * STAGES.findIndex((x) => x.id === s.id) : 1,
                }}
              />
              <p className="mt-2 truncate text-xs" style={{ fontFamily: F.mono, fontWeight: 500, color: C.ink }}>
                {s.value ? fee(me, s.value) : "—"}
              </p>
              <p className="truncate text-xs" style={{ fontFamily: F.body, color: on ? C.carbon : C.inkSoft }}>
                {s.label} · {s.count}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LeadRow({ lead, selected, onSelect }) {
  const me = useMe();
  const cold = daysAgo(lead.lastTouch);
  const last = lead.thread[lead.thread.length - 1];
  const Icon = CHANNELS[last?.ch || "note"].icon;
  const stageLabel = STAGES.find((s) => s.id === lead.stage)?.label;

  return (
    <button
      onClick={() => onSelect(lead.id)}
      className="block w-full px-5 py-4 text-left sm:px-8"
      style={{ borderBottom: `1px solid ${C.rule}`, backgroundColor: selected ? C.slip : "transparent" }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
          {lead.company}
        </span>
        <span className="shrink-0 text-sm" style={{ fontFamily: F.mono, fontWeight: 500, color: C.ink }}>
          {fee(me, lead.value)}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-4">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
          <Icon size={12} style={{ color: CHANNELS[last?.ch || "note"].color }} />
          {lead.name} · {lead.owner}
        </span>
        <span
          className="shrink-0 text-xs uppercase"
          style={{
            fontFamily: F.body,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: cold > 14 && lead.stage !== "won" && lead.stage !== "lost" ? C.carbon : C.inkSoft,
          }}
        >
          {cold > 14 && lead.stage !== "won" && lead.stage !== "lost" ? `cold ${cold}d` : stageLabel}
        </span>
      </div>
    </button>
  );
}

/* ---- the signature: every channel in one column, in one order ---- */
function Thread({ lead, onSend }) {
  const me = useMe();
  const outward = can(me, "client.message");
  const [ch, setCh] = useState(outward ? "whatsapp" : "note");
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    onSend(lead.id, { ch, dir: "out", at: "2026-08-30 09:00", body: text.trim() });
    setText("");
  };

  const useTemplate = (t) =>
    setText(
      t.body
        .replace("{name}", lead.name.split(" ")[0])
        .replace("{owner}", lead.owner === "Unassigned" ? "Priya" : lead.owner.split(" ")[0])
        .replace("{topic}", "your requirement")
    );

  return (
    <>
      <p className="mt-9 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
        Everything, in one column
      </p>

      <ol className="mt-4 space-y-4">
        {lead.thread.map((m, n) => {
          const meta = CHANNELS[m.ch];
          const Icon = meta.icon;
          const inbound = m.dir === "in";
          return (
            <li key={n} className={inbound ? "pr-6" : "pl-6"}>
              <div className="flex items-center gap-1.5">
                <Icon size={12} style={{ color: meta.color }} />
                <span className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: meta.color }}>
                  {inbound ? "from client" : meta.label}
                </span>
                <span className="text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>{m.at}</span>
              </div>
              <p
                className="mt-1.5 px-3 py-2 text-sm"
                style={{
                  fontFamily: F.body,
                  color: C.ink,
                  backgroundColor: inbound ? C.paper : "transparent",
                  borderLeft: inbound ? "none" : `2px solid ${meta.color}`,
                }}
              >
                {m.body}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-6" style={{ border: `1px solid ${C.rule}` }}>
        <div className="flex" style={{ borderBottom: `1px solid ${C.rule}` }}>
          {(outward ? ["whatsapp", "email", "call", "note"] : ["note"]).map((k) => {
            const meta = CHANNELS[k];
            const Icon = meta.icon;
            const on = ch === k;
            return (
              <button
                key={k}
                onClick={() => setCh(k)}
                className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs"
                style={{
                  fontFamily: F.body,
                  fontWeight: 600,
                  color: on ? meta.color : C.inkSoft,
                  backgroundColor: on ? C.paper : "transparent",
                }}
              >
                <Icon size={13} /> {meta.label}
              </button>
            );
          })}
        </div>

        {ch === "whatsapp" && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {WA_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => useTemplate(t)}
                className="px-2 py-1 text-xs"
                style={{ fontFamily: F.body, color: C.green, border: `1px solid ${C.rule}` }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={
            ch === "call" || ch === "note"
              ? "What was said, and what happens next"
              : `Write to ${lead.name.split(" ")[0]}`
          }
          className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
          style={{ fontFamily: F.body, color: C.ink }}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <span className="text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
            {!outward
              ? `${ROLES[me.role].label} — internal note only`
              : ch === "whatsapp"
              ? lead.phone
              : ch === "email"
              ? lead.email
              : "logged only"}
          </span>
          <button
            onClick={send}
            className="px-3 py-1.5 text-xs uppercase"
            style={{ backgroundColor: CHANNELS[ch].color, color: C.slip, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
          >
            {ch === "call" || ch === "note" ? "Log it" : "Send"}
          </button>
        </div>
      </div>
    </>
  );
}

function LeadCard({ lead, onClose, onStage, onSend, onDiscuss }) {
  const me = useMe();
  if (!lead) {
    return (
      <div className="hidden h-full flex-col items-center justify-center gap-2 px-10 text-center lg:flex">
        <p className="text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
          Pick a lead to see who they are and every word exchanged.
        </p>
      </div>
    );
  }

  const cold = daysAgo(lead.lastTouch);
  const idx = STAGES.findIndex((s) => s.id === lead.stage);

  return (
    <div className="relative h-full overflow-y-auto" style={{ backgroundColor: C.slip }}>
      <div className="flex items-center gap-2 px-6 pt-5 lg:hidden">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
          <ArrowLeft size={15} /> Pipeline
        </button>
      </div>

      <div className="px-6 pb-10 pt-6 sm:px-8">
        <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.carbon }}>
          {lead.source}
        </p>
        <h2 className="mt-3 text-xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
          {lead.company}
        </h2>
        <p className="mt-0.5 text-sm" style={{ fontFamily: F.body, color: C.ink }}>{lead.name}</p>

        {/* the three keys a lead is deduplicated on */}
        <div className="mt-4 space-y-1">
          {[
            ["Phone", lead.phone],
            ["Email", lead.email],
            ["PAN", lead.pan || "not on file"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 text-xs" style={{ fontFamily: F.mono }}>
              <span className="w-12 shrink-0" style={{ color: C.inkSoft }}>{k}</span>
              <span className="truncate" style={{ color: C.ink }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <p className="text-lg" style={{ fontFamily: F.mono, fontWeight: 600, color: C.ink }}>{fee(me, lead.value)}</p>
          <p className="text-xs" style={{ fontFamily: F.body, color: cold > 14 ? C.carbon : C.inkSoft }}>
            {cold === 0 ? "touched today" : `last touched ${cold} days ago`}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-1">
          {STAGES.map((s, n) => {
            const on = s.id === lead.stage;
            const past = n < idx && idx < 4;
            return (
              <button
                key={s.id}
                disabled={!can(me, "leads.edit")}
                onClick={() => onStage(lead.id, s.id)}
                className="px-2.5 py-1.5 text-xs"
                style={{
                  fontFamily: F.body,
                  fontWeight: on ? 600 : 400,
                  color: on ? C.slip : past ? C.ink : C.inkSoft,
                  backgroundColor: on ? (s.id === "lost" ? C.carbon : s.id === "won" ? C.green : C.stamp) : "transparent",
                  border: `1px solid ${on ? "transparent" : C.rule}`,
                  opacity: can(me, "leads.edit") || on ? 1 : 0.4,
                  cursor: can(me, "leads.edit") ? "pointer" : "not-allowed",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>
          {can(me, "leads.edit")
            ? `Owner: ${lead.owner}. Moving a stage writes to the ledger below.`
            : `Owner: ${lead.owner}. Your role reads the pipeline but doesn't move it.`}
        </p>

        <button
          onClick={() => onDiscuss(lead)}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase"
          style={{ border: `1px solid ${C.rule}`, color: C.ink, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em" }}
        >
          <MessagesSquare size={13} /> Take it to the team
        </button>

        <Thread lead={lead} onSend={onSend} />
      </div>
    </div>
  );
}

/* ---- capture: one lead at a time, deduplicated as you type ---- */
function NewLead({ leads, onClose, onCreate }) {
  const [f, setF] = useState({ name: "", company: "", phone: "", email: "", pan: "", value: "", source: "WhatsApp", owner: "Priya Rao" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const clash = leads.find(
    (l) =>
      (f.phone && digits(f.phone).length === 10 && digits(l.phone) === digits(f.phone)) ||
      (f.email && norm(l.email) === norm(f.email)) ||
      (f.pan && norm(l.pan) === norm(f.pan))
  );

  const field = (k, label, ph) => (
    <div>
      <label className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>
        {label}
      </label>
      <input
        value={f[k]}
        onChange={set(k)}
        placeholder={ph}
        className="mt-1 w-full bg-transparent py-1.5 text-sm outline-none"
        style={{ fontFamily: k === "name" || k === "company" ? F.body : F.mono, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center" style={{ backgroundColor: "rgba(23,22,52,0.45)" }}>
      <div className="max-h-full w-full max-w-lg overflow-y-auto p-6 sm:p-8" style={{ backgroundColor: C.slip }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.carbon }}>
              Capture
            </p>
            <h2 className="mt-1 text-xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
              Add a lead
            </h2>
          </div>
          <button onClick={onClose} style={{ color: C.inkSoft }}><X size={18} /></button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("name", "Contact", "Kavita Menon")}
          {field("company", "Firm", "Halcyon Textiles Pvt Ltd")}
          {field("phone", "Phone", "+91 98200 41123")}
          {field("email", "Email", "kavita@halcyon.co.in")}
          {field("pan", "PAN", "AAECH9021R")}
          {field("value", "Likely fee", "480000")}
          <div>
            <label className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>
              Came from
            </label>
            <select
              value={f.source}
              onChange={set("source")}
              className="mt-1 w-full bg-transparent py-1.5 text-sm outline-none"
              style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
            >
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>
              Owner
            </label>
            <select
              value={f.owner}
              onChange={set("owner")}
              className="mt-1 w-full bg-transparent py-1.5 text-sm outline-none"
              style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
            >
              {["Priya Rao", "Meera S.", "Anil K.", "Unassigned"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {clash && (
          <div className="mt-5 flex gap-2 p-3" style={{ border: `1px solid ${C.carbon}` }}>
            <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: C.carbon }} />
            <p className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>
              {clash.company} already has these details. Saving will add this to that lead's ledger instead of starting a second one.
            </p>
          </div>
        )}

        <div className="mt-7 flex gap-2">
          <button
            onClick={() => onCreate(f, clash)}
            className="px-4 py-2 text-xs uppercase"
            style={{ backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
          >
            {clash ? "Merge into existing" : "Save lead"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs uppercase"
            style={{ border: `1px solid ${C.rule}`, color: C.ink, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- the dump: paste a sheet, map the columns, see what merges ---- */
const TARGETS = [
  { id: "skip", label: "Don't import" },
  { id: "company", label: "Firm" },
  { id: "name", label: "Contact" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "pan", label: "PAN" },
  { id: "value", label: "Likely fee" },
];

const GUESS = (h) => {
  const k = norm(h);
  if (/(firm|company|org|business)/.test(k)) return "company";
  if (/(name|contact|person)/.test(k)) return "name";
  if (/(phone|mobile|whatsapp|number)/.test(k)) return "phone";
  if (/(mail)/.test(k)) return "email";
  if (/pan/.test(k)) return "pan";
  if (/(fee|value|amount|budget)/.test(k)) return "value";
  return "skip";
};

const SAMPLE = `Company,Contact Person,Mobile,Email,PAN,Budget
Sundar Foods Pvt Ltd,Latha Sundar,9820011234,latha@sundarfoods.in,AAJCS7712N,360000
Halcyon Textiles Pvt Ltd,Kavita Menon,9820041123,kavita@halcyon.co.in,AAECH9021R,500000
Meridian Pharma LLP,Zain Ahmed,9930088712,zain@meridianpharma.in,AAMFM3390T,275000
Kesar Agro Traders,Dinesh Kesar,9845512907,dinesh@kesaragro.com,AAKPK1120F,88000`;

function Import({ leads, onCommit }) {
  const [raw, setRaw] = useState("");
  const [map, setMap] = useState(null);

  const parsed = useMemo(() => {
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return null;
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));
    return { headers, rows };
  }, [raw]);

  const mapping = useMemo(() => {
    if (!parsed) return [];
    return map ?? parsed.headers.map(GUESS);
  }, [parsed, map]);

  const staged = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((r) => {
      const rec = {};
      mapping.forEach((t, i) => { if (t !== "skip") rec[t] = r[i]; });
      const dupe = leads.find(
        (l) =>
          (rec.phone && digits(l.phone) === digits(rec.phone)) ||
          (rec.email && norm(l.email) === norm(rec.email)) ||
          (rec.pan && norm(l.pan) === norm(rec.pan))
      );
      return { rec, dupe };
    });
  }, [parsed, mapping, leads]);

  const fresh = staged.filter((s) => !s.dupe).length;
  const merges = staged.length - fresh;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
      <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
        Bring in a list
      </h1>
      <p className="mt-1 max-w-xl text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
        Paste a spreadsheet, an export from your old CRM, or a chunk of a WhatsApp broadcast list. Anything already on file gets folded into the lead that exists rather than duplicated.
      </p>

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => setRaw(SAMPLE)}
          className="px-3 py-1.5 text-xs uppercase"
          style={{ border: `1px solid ${C.rule}`, color: C.ink, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
        >
          Use a sample sheet
        </button>
        {raw && (
          <button
            onClick={() => { setRaw(""); setMap(null); }}
            className="px-3 py-1.5 text-xs uppercase"
            style={{ border: `1px solid ${C.rule}`, color: C.inkSoft, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
          >
            Clear
          </button>
        )}
      </div>

      <textarea
        value={raw}
        onChange={(e) => { setRaw(e.target.value); setMap(null); }}
        rows={7}
        placeholder="Company,Contact,Mobile,Email,PAN,Budget"
        className="mt-4 w-full resize-none p-3 text-xs outline-none"
        style={{ fontFamily: F.mono, color: C.ink, backgroundColor: C.slip, border: `1px solid ${C.rule}` }}
      />

      {parsed && (
        <>
          <p className="mt-8 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
            What each column is
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {parsed.headers.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs" style={{ fontFamily: F.mono, color: C.ink }}>{h}</span>
                <select
                  value={mapping[i]}
                  onChange={(e) => {
                    const next = [...mapping];
                    next[i] = e.target.value;
                    setMap(next);
                  }}
                  className="flex-1 bg-transparent py-1 text-sm outline-none"
                  style={{ fontFamily: F.body, color: mapping[i] === "skip" ? C.inkSoft : C.ink, borderBottom: `1px solid ${C.rule}` }}
                >
                  {TARGETS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
            {staged.length} rows · {fresh} new · {merges} already on file
          </p>
          <div className="mt-3" style={{ borderTop: `1px solid ${C.rule}` }}>
            {staged.map(({ rec, dupe }, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 py-2.5" style={{ borderBottom: `1px solid ${C.rule}` }}>
                <div className="min-w-0">
                  <p className="truncate text-sm" style={{ fontFamily: F.body, color: C.ink }}>
                    {rec.company || rec.name || "—"}
                  </p>
                  <p className="truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                    {[rec.phone, rec.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className="flex shrink-0 items-center gap-1 text-xs uppercase"
                  style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", color: dupe ? C.amber : C.green }}
                >
                  {dupe ? <><AlertTriangle size={12} /> merge</> : <><Check size={12} /> new</>}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { onCommit(staged); setRaw(""); setMap(null); }}
            className="mt-6 px-4 py-2 text-xs uppercase"
            style={{ backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
          >
            Import {staged.length} rows
          </button>
        </>
      )}
    </div>
  );
}

/* ---- who is waiting on us: last word was theirs ---- */
const unanswered = (leads) =>
  leads
    .filter((l) => l.stage !== "won" && l.stage !== "lost")
    .map((l) => {
      const lastIn = [...l.thread].reverse().find((m) => m.dir === "in");
      if (!lastIn) return null;
      const repliedAfter = l.thread.some((m) => m.dir === "out" && m.at > lastIn.at);
      return repliedAfter ? null : { lead: l, msg: lastIn };
    })
    .filter(Boolean)
    .sort((a, b) => (a.msg.at < b.msg.at ? 1 : -1));

function ViewHead({ title, note }) {
  return (
    <div className="px-5 pt-6 pb-5 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
      <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
        {title}
      </h1>
      <p className="mt-1 max-w-xl text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
        {note}
      </p>
    </div>
  );
}

function InboxView({ leads, onOpen }) {
  const waiting = unanswered(leads);
  const answered = leads
    .flatMap((l) => l.thread.filter((m) => m.dir === "in").map((m) => ({ lead: l, msg: m })))
    .filter((x) => !waiting.some((w) => w.lead.id === x.lead.id && w.msg.at === x.msg.at))
    .sort((a, b) => (a.msg.at < b.msg.at ? 1 : -1))
    .slice(0, 6);

  const Line = ({ lead, msg, open }) => {
    const meta = CHANNELS[msg.ch];
    const Icon = meta.icon;
    return (
      <button
        onClick={() => onOpen(lead.id)}
        className="block w-full px-5 py-4 text-left sm:px-8"
        style={{ borderBottom: `1px solid ${C.rule}` }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon size={13} className="shrink-0" style={{ color: meta.color }} />
            <span className="truncate text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
              {lead.company}
            </span>
          </span>
          <span className="shrink-0 text-xs" style={{ fontFamily: F.mono, color: open ? C.carbon : C.inkSoft }}>
            {daysAgo(msg.at.slice(0, 10))}d
          </span>
        </div>
        <p className="mt-1.5 truncate text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
          {msg.body}
        </p>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <ViewHead
        title={waiting.length ? `${waiting.length} waiting on you` : "Nobody's waiting"}
        note="Everything a client sent where we haven't answered since, whichever channel it arrived on."
      />
      {waiting.map(({ lead, msg }) => (
        <Line key={lead.id + msg.at} lead={lead} msg={msg} open />
      ))}
      {!waiting.length && (
        <p className="px-5 py-10 text-sm sm:px-8" style={{ fontFamily: F.body, color: C.inkSoft }}>
          Every inbound message has an answer after it. Good place to be.
        </p>
      )}

      <p className="px-5 pt-8 pb-3 text-xs uppercase sm:px-8" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
        Already handled
      </p>
      {answered.map(({ lead, msg }) => (
        <Line key={lead.id + msg.at} lead={lead} msg={msg} />
      ))}
    </div>
  );
}

function ClientsView({ leads, onOpen }) {
  const me = useMe();
  const won = leads.filter((l) => l.stage === "won");
  const total = won.reduce((s, l) => s + l.value, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <ViewHead
        title={can(me, "fees.view") ? `${won.length} clients, ${money(total)} won` : `${won.length} clients`}
        note="Leads that closed. Each one carries its whole conversation across, so the person doing the work can see what was promised."
      />
      {won.length ? (
        won.map((l) => (
          <div key={l.id} className="px-5 py-4 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
            <div className="flex items-baseline justify-between gap-4">
              <button onClick={() => onOpen(l.id)} className="min-w-0 truncate text-left text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
                {l.company}
              </button>
              <span className="shrink-0 text-sm" style={{ fontFamily: F.mono, fontWeight: 500, color: C.ink }}>
                {fee(me, l.value)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <span className="truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                {l.name} · {l.phone} · PAN {l.pan || "not on file"}
              </span>
              <span className="flex shrink-0 gap-2">
                <button className="px-2.5 py-1 text-xs uppercase" style={{ border: `1px solid ${C.rule}`, color: C.ink, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em" }}>
                  Raise invoice
                </button>
                <button onClick={() => onOpen(l.id)} className="px-2.5 py-1 text-xs uppercase" style={{ border: `1px solid ${C.rule}`, color: C.inkSoft, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em" }}>
                  Open history
                </button>
              </span>
            </div>
          </div>
        ))
      ) : (
        <p className="px-5 py-10 text-sm sm:px-8" style={{ fontFamily: F.body, color: C.inkSoft }}>
          Nothing closed yet. Move a lead to Won and it lands here.
        </p>
      )}
    </div>
  );
}

function RulesView({ leads }) {
  const [keys, setKeys] = useState({ phone: true, email: true, pan: true });
  const [assign, setAssign] = useState("round");

  const perSource = SOURCES.map((s) => {
    const rows = leads.filter((l) => l.source === s);
    const won = rows.filter((l) => l.stage === "won");
    return { s, count: rows.length, value: rows.reduce((a, b) => a + b.value, 0), won: won.length };
  }).filter((r) => r.count);

  const Toggle = ({ on, onClick, label, note }) => (
    <button onClick={onClick} className="flex w-full items-start gap-3 py-3 text-left" style={{ borderBottom: `1px solid ${C.rule}` }}>
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center"
        style={{ border: `1px solid ${on ? C.stamp : C.rule}`, backgroundColor: on ? C.stamp : "transparent" }}
      >
        {on && <Check size={11} style={{ color: C.slip }} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm" style={{ fontFamily: F.body, color: C.ink }}>{label}</span>
        <span className="block text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>{note}</span>
      </span>
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <ViewHead
        title="Sources & rules"
        note="Where leads come in, how they connect, and what the system does with them before anyone looks."
      />

      <div className="px-5 py-6 sm:px-8">
        <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
          Connections
        </p>
        <div className="mt-3">
          {[
            ["WhatsApp Business", "+91 22 6841 2200", true, C.green],
            ["Email — Gmail", "priya@raokulkarni.in, 2 more", true, C.stamp],
            ["Website form", "raokulkarni.in/enquiry", true, C.stamp],
            ["Missed-call number", "not set up", false, C.inkSoft],
          ].map(([name, detail, on, colour]) => (
            <div key={name} className="flex items-baseline justify-between gap-4 py-3" style={{ borderBottom: `1px solid ${C.rule}` }}>
              <div className="min-w-0">
                <p className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>{name}</p>
                <p className="truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>{detail}</p>
              </div>
              <span className="shrink-0 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", color: on ? colour : C.inkSoft }}>
                {on ? "connected" : "connect"}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-9 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
          Treat as the same lead when
        </p>
        <div className="mt-1">
          <Toggle on={keys.phone} onClick={() => setKeys({ ...keys, phone: !keys.phone })} label="Phone number matches" note="Last ten digits, so +91 and 0 prefixes don't fool it." />
          <Toggle on={keys.email} onClick={() => setKeys({ ...keys, email: !keys.email })} label="Email matches" note="Case and spacing ignored." />
          <Toggle on={keys.pan} onClick={() => setKeys({ ...keys, pan: !keys.pan })} label="PAN matches" note="The one identifier a firm can't have two of. Catches renamed companies." />
        </div>

        <p className="mt-9 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
          New leads go to
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            ["round", "Round robin"],
            ["source", "By source"],
            ["none", "Nobody, until claimed"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAssign(id)}
              className="px-3 py-1.5 text-xs"
              style={{
                fontFamily: F.body,
                fontWeight: assign === id ? 600 : 400,
                color: assign === id ? C.slip : C.inkSoft,
                backgroundColor: assign === id ? C.stamp : "transparent",
                border: `1px solid ${assign === id ? "transparent" : C.rule}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-9 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
          Where they came from
        </p>
        <div className="mt-3" style={{ borderTop: `1px solid ${C.rule}` }}>
          {perSource.map((r) => (
            <div key={r.s} className="flex items-baseline justify-between gap-4 py-3" style={{ borderBottom: `1px solid ${C.rule}` }}>
              <span className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>{r.s}</span>
              <span className="text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                {r.count} leads · {money(r.value)} · {r.won} won
              </span>
            </div>
          ))}
        </div>

        <p className="mt-9 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
          Who may do what
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="py-2 pr-4 text-left text-xs" style={{ fontFamily: F.body, fontWeight: 600, color: C.inkSoft, borderBottom: `1px solid ${C.rule}` }}>
                  Permission
                </th>
                {Object.keys(ROLES).map((r) => (
                  <th key={r} className="px-2 py-2 text-xs" style={{ fontFamily: F.body, fontWeight: 600, color: C.ink, borderBottom: `1px solid ${C.rule}` }}>
                    {ROLES[r].label.split(",")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMS).map(([id, label]) => (
                <tr key={id}>
                  <td className="py-2 pr-4 text-sm" style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}>
                    {label}
                  </td>
                  {Object.keys(ROLES).map((r) => (
                    <td key={r} className="px-2 py-2 text-center" style={{ borderBottom: `1px solid ${C.rule}` }}>
                      {ROLES[r].perms.includes(id) ? (
                        <Check size={13} className="mx-auto" style={{ color: C.green }} />
                      ) : (
                        <span className="text-xs" style={{ fontFamily: F.mono, color: C.rule }}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-4 text-sm" style={{ fontFamily: F.body, color: C.ink }}>Rooms</td>
                {Object.keys(ROLES).map((r) => (
                  <td key={r} className="px-2 py-2 text-center text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                    {ROLES[r].rooms.length}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-9 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
          WhatsApp templates
        </p>
        <div className="mt-3" style={{ borderTop: `1px solid ${C.rule}` }}>
          {WA_TEMPLATES.map((t, i) => (
            <div key={t.id} className="flex items-baseline justify-between gap-4 py-3" style={{ borderBottom: `1px solid ${C.rule}` }}>
              <div className="min-w-0">
                <p className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>{t.label}</p>
                <p className="truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>{t.body}</p>
              </div>
              <span className="shrink-0 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", color: i === 2 ? C.amber : C.green }}>
                {i === 2 ? "in review" : "approved"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- team rooms: membership is the role, not an invite list ---- */
function TeamView({ messages, onPost, room, setRoom, leads, onOpen }) {
  const me = useMe();
  const [text, setText] = useState("");
  const mine = ROLES[me.role].rooms;
  const open = ROOMS.find((r) => r.id === room);
  const allowed = mine.includes(room);

  const post = () => {
    if (!text.trim() || !allowed) return;
    onPost(room, { body: text.trim() });
    setText("");
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* room list */}
      <div className="hidden w-52 shrink-0 flex-col overflow-y-auto py-5 sm:flex" style={{ borderRight: `1px solid ${C.rule}` }}>
        <p className="px-5 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
          Rooms
        </p>
        {ROOMS.map((r) => {
          const in_ = mine.includes(r.id);
          const on = r.id === room;
          return (
            <button
              key={r.id}
              onClick={() => setRoom(r.id)}
              className="flex items-center gap-2 px-5 py-2.5 text-left text-sm"
              style={{
                fontFamily: F.body,
                fontWeight: on ? 600 : 400,
                color: in_ ? (on ? C.ink : C.inkSoft) : C.rule,
                backgroundColor: on ? C.slip : "transparent",
              }}
            >
              {in_ ? <Hash size={13} /> : <Lock size={13} />}
              <span className="truncate">{r.name}</span>
            </button>
          );
        })}
        <p className="mt-4 px-5 text-xs leading-relaxed" style={{ fontFamily: F.body, color: C.inkSoft }}>
          Locked rooms stay visible on purpose. Knowing a conversation exists is not the same as reading it.
        </p>
      </div>

      {/* the room */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="px-5 py-4 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
          <div className="flex items-baseline gap-2">
            {allowed ? <Hash size={15} style={{ color: C.carbon }} /> : <Lock size={15} style={{ color: C.carbon }} />}
            <h1 className="text-xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>{open.name}</h1>
          </div>
          <p className="mt-1 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
            {open.about} · {open.roles.map((r) => ROLES[r].label).join(", ")}
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto sm:hidden">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoom(r.id)}
                className="shrink-0 pb-1 text-xs"
                style={{
                  fontFamily: F.body,
                  color: mine.includes(r.id) ? (r.id === room ? C.ink : C.inkSoft) : C.rule,
                  borderBottom: `2px solid ${r.id === room ? C.carbon : "transparent"}`,
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {allowed ? (
          <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-8">
              {(messages[room] || []).map((m, i) => {
                const isMe = m.by === me.id;
                const lead = m.lead && leads.find((l) => l.id === m.lead);
                return (
                  <div key={i}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: isMe ? C.stamp : C.ink }}>
                        {staffName(m.by)}
                      </span>
                      <span className="text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>{m.at}</span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm" style={{ fontFamily: F.body, color: C.ink }}>{m.body}</p>
                    {lead && (
                      <button
                        onClick={() => onOpen(lead.id)}
                        className="mt-2 flex items-center gap-2 px-3 py-2 text-left"
                        style={{ border: `1px solid ${C.rule}`, backgroundColor: C.slip }}
                      >
                        <span className="text-xs" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>{lead.company}</span>
                        <span className="text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                          {STAGES.find((s) => s.id === lead.stage).label} · {fee(me, lead.value)}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 pb-5 sm:px-8">
              <div className="flex items-end gap-2" style={{ border: `1px solid ${C.rule}`, backgroundColor: C.slip }}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  placeholder={`Write to ${open.name}`}
                  className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ fontFamily: F.body, color: C.ink }}
                />
                <button
                  onClick={post}
                  className="m-2 shrink-0 px-3 py-1.5 text-xs uppercase"
                  style={{ backgroundColor: C.stamp, color: C.slip, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
                >
                  Post
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                Posting as {me.name} · {ROLES[me.role].label}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
            <Lock size={18} style={{ color: C.carbon }} />
            <p className="max-w-sm text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
              {open.name} is for {open.roles.map((r) => ROLES[r].label).join(" and ")}. Ask a partner if you need to be in it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- one dashboard, assembled from what the role may see ---- */
function Bar({ value, color }) {
  return (
    <div className="flex h-1.5 w-full" style={{ backgroundColor: C.rule }}>
      <div style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

function ProjectRow({ p, showTeam, open, onToggle }) {
  const me = useMe();
  const h = health(p);
  const done = progressOf(p);
  const left = daysLeft(p.due);
  const lead = p.team.find((t) => t.part === "Team lead");

  return (
    <div style={{ borderBottom: `1px solid ${C.rule}` }}>
      <button onClick={onToggle} className="block w-full px-5 py-4 text-left sm:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="truncate text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
            {p.name}
          </span>
          <span className="shrink-0 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", color: h.color }}>
            {h.label}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Bar value={done} color={h.color} />
          </div>
          <span className="shrink-0 text-xs" style={{ fontFamily: F.mono, color: C.ink }}>
            {p.milestones.filter(([, d]) => d).length}/{p.milestones.length}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
            {p.client}
            {showTeam && lead ? ` · led by ${staffName(lead.id)}` : ""}
            {p.fee > 0 && can(me, "fees.view") ? ` · ${money(p.fee)}` : ""}
          </span>
          <span className="shrink-0 text-xs" style={{ fontFamily: F.mono, color: left < 0 ? C.carbon : C.inkSoft }}>
            {left < 0 ? `${-left}d over` : `${left}d left`}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 sm:px-8">
          {showTeam && (
            <>
              <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.12em", color: C.inkSoft }}>
                On this
              </p>
              <div className="mt-2 mb-5 flex flex-wrap gap-x-6 gap-y-2">
                {p.team.map((t) => (
                  <div key={t.id}>
                    <p className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>{staffName(t.id)}</p>
                    <p className="text-xs" style={{ fontFamily: F.mono, color: t.part === "Team lead" ? C.stamp : C.inkSoft }}>
                      {t.part} · {t.alloc}%
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.12em", color: C.inkSoft }}>
            Milestones
          </p>
          <ul className="mt-2 space-y-1.5">
            {p.milestones.map(([label, dn], i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                  style={{ border: `1px solid ${dn ? C.green : C.rule}`, backgroundColor: dn ? C.green : "transparent" }}
                >
                  {dn && <Check size={9} style={{ color: C.slip }} />}
                </span>
                <span className="text-sm" style={{ fontFamily: F.body, color: dn ? C.inkSoft : C.ink }}>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Dashboard({ leads, onGo, onOpenLead }) {
  const me = useMe();
  const [open, setOpen] = useState(null);

  const seesAll = can(me, "projects.view.all");
  const mine = PROJECTS.filter((p) => p.team.some((t) => t.id === me.id));
  const projects = seesAll ? PROJECTS : mine;

  const load = STAFF.map((s) => ({
    ...s,
    alloc: PROJECTS.reduce((n, p) => n + (p.team.find((t) => t.id === s.id)?.alloc || 0), 0),
    count: PROJECTS.filter((p) => p.team.some((t) => t.id === s.id)).length,
  })).filter((s) => s.count);

  const openLeads = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const waiting = unanswered(leads);
  const atRisk = projects.filter((p) => health(p).label !== "on track");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-6 pb-5 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.carbon }}>
          {seesAll ? "Admin dashboard" : ROLES[me.role].label}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
          {me.name.split(" ")[0]}, {atRisk.length
            ? `${atRisk.length} ${atRisk.length === 1 ? "project needs" : "projects need"} a look`
            : "everything is on track"}
        </h1>
        <p className="mt-1 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
          {seesAll
            ? `${PROJECTS.length} projects running across ${load.length} people.`
            : `${projects.length} ${projects.length === 1 ? "project" : "projects"} with your name on ${projects.length === 1 ? "it" : "them"}.`}
        </p>
      </div>

      {/* what the role is allowed to be measured on */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 px-5 py-5 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
        {can(me, "leads.view") && (
          <button onClick={() => onGo("pipeline")} className="text-left">
            <p className="text-lg" style={{ fontFamily: F.mono, fontWeight: 600, color: C.ink }}>
              {can(me, "fees.view") ? money(openLeads.reduce((s, l) => s + l.value, 0)) : openLeads.length}
            </p>
            <p className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>in the pipeline</p>
          </button>
        )}
        {can(me, "leads.view") && (
          <button onClick={() => onGo("inbox")} className="text-left">
            <p className="text-lg" style={{ fontFamily: F.mono, fontWeight: 600, color: waiting.length ? C.carbon : C.ink }}>
              {waiting.length}
            </p>
            <p className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>waiting on a reply</p>
          </button>
        )}
        <div>
          <p className="text-lg" style={{ fontFamily: F.mono, fontWeight: 600, color: C.ink }}>
            {Math.round(
              (projects.reduce((s, p) => s + progressOf(p), 0) / (projects.length || 1)) * 100
            )}%
          </p>
          <p className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>
            {seesAll ? "average across projects" : "average across yours"}
          </p>
        </div>
        {can(me, "team.view") && (
          <div>
            <p className="text-lg" style={{ fontFamily: F.mono, fontWeight: 600, color: load.some((s) => s.alloc > 100) ? C.carbon : C.ink }}>
              {load.filter((s) => s.alloc > 100).length}
            </p>
            <p className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>people over capacity</p>
          </div>
        )}
      </div>

      <p className="px-5 pt-7 pb-3 text-xs uppercase sm:px-8" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
        {seesAll ? "Active projects" : "Your projects"}
      </p>

      {projects.length ? (
        projects
          .slice()
          .sort((a, b) => new Date(a.due) - new Date(b.due))
          .map((p) => (
            <ProjectRow
              key={p.id}
              p={p}
              showTeam={can(me, "team.view")}
              open={open === p.id}
              onToggle={() => setOpen(open === p.id ? null : p.id)}
            />
          ))
      ) : (
        <p className="px-5 py-8 text-sm sm:px-8" style={{ fontFamily: F.body, color: C.inkSoft }}>
          You're not staffed on anything right now.
        </p>
      )}

      {/* staffing is admin-only: it's a view of people, not of work */}
      {can(me, "team.view") && (
        <div className="px-5 py-8 sm:px-8">
          <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
            Who is carrying what
          </p>
          <div className="mt-4 space-y-3">
            {load
              .slice()
              .sort((a, b) => b.alloc - a.alloc)
              .map((s) => (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>
                      {s.name}{" "}
                      <span className="text-xs" style={{ color: C.inkSoft }}>{ROLES[s.role].label}</span>
                    </span>
                    <span className="shrink-0 text-xs" style={{ fontFamily: F.mono, color: s.alloc > 100 ? C.carbon : C.inkSoft }}>
                      {s.alloc}% · {s.count} {s.count === 1 ? "project" : "projects"}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Bar value={Math.min(s.alloc / 100, 1)} color={s.alloc > 100 ? C.carbon : C.stamp} />
                  </div>
                </div>
              ))}
          </div>
          <p className="mt-4 text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>
            Allocation is what was committed when the work was staffed, not hours logged. Anything over 100% was promised twice.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- tasks: three audiences, one screen, assembled by relationship ---- */
function StatusPicker({ value, onPick, disabled }) {
  return (
    <div className="flex flex-wrap gap-1">
      {["todo", "doing", "blocked", "review", "done"].map((k) => {
        const on = value === k;
        return (
          <button
            key={k}
            disabled={disabled}
            onClick={() => onPick(k)}
            className="px-2 py-1 text-xs"
            style={{
              fontFamily: F.body,
              fontWeight: on ? 600 : 400,
              color: on ? C.slip : C.inkSoft,
              backgroundColor: on ? TSTATUS[k].color : "transparent",
              border: `1px solid ${on ? "transparent" : C.rule}`,
              opacity: disabled ? 0.45 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {TSTATUS[k].label}
          </button>
        );
      })}
    </div>
  );
}

function Breakout({ task, onAdd, onCancel }) {
  const me = useMe();
  const mates = project(task.project).team.filter((t) => t.id !== me.id);
  const [title, setTitle] = useState("");
  const [to, setTo] = useState(mates[0]?.id || "");
  const [due, setDue] = useState(task.due);

  return (
    <div className="mt-3 p-3" style={{ border: `1px solid ${C.rule}`, backgroundColor: C.paper }}>
      <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.12em", color: C.inkSoft }}>
        Break a piece off — it becomes theirs, the parent stays yours
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What exactly they should do"
        className="mt-3 w-full bg-transparent py-1.5 text-sm outline-none"
        style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
      />
      <div className="mt-3 flex flex-wrap gap-4">
        <div>
          <label className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>To</label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block bg-transparent py-1 text-sm outline-none"
            style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
          >
            {mates.map((m) => (
              <option key={m.id} value={m.id}>{staffName(m.id)} — {m.part}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>By</label>
          <input
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="block bg-transparent py-1 text-sm outline-none"
            style={{ fontFamily: F.mono, color: C.ink, borderBottom: `1px solid ${C.rule}`, width: "7rem" }}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => title.trim() && to && onAdd(task, title.trim(), to, due)}
          className="px-3 py-1.5 text-xs uppercase"
          style={{ backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
        >
          Hand it over
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs uppercase"
          style={{ border: `1px solid ${C.rule}`, color: C.inkSoft, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function TaskLine({ t, tasks, mine, onStatus, onHandBack, onBreak, breaking, setBreaking }) {
  const me = useMe();
  const kids = kidsOf(tasks, t.id);
  const state = rollup(tasks, t);
  const left = daysLeft(t.due);
  const canBreak = !kids.length && t.to === me.id && isLeadOn(me, t.project);

  return (
    <div className="px-5 py-4 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
          {t.title}
        </span>
        <span className="shrink-0 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", color: TSTATUS[state].color }}>
          {TSTATUS[state].label}
        </span>
      </div>

      <p className="mt-1 truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
        {project(t.project).name} · from {staffName(t.by)}
        {t.to !== me.id ? ` · with ${staffName(t.to)}` : ""}
        {" · "}
        <span style={{ color: left < 0 ? C.carbon : C.inkSoft }}>
          {left < 0 ? `${-left}d over` : `${left}d left`}
        </span>
      </p>

      {t.why && state === "blocked" && (
        <p className="mt-2 px-2 py-1.5 text-xs" style={{ fontFamily: F.body, color: C.ink, backgroundColor: C.paper, borderLeft: `2px solid ${C.carbon}` }}>
          {t.why}
        </p>
      )}

      {/* children: the lead sees what they handed out and can't fake the rollup */}
      {kids.length > 0 && (
        <ul className="mt-3 space-y-2">
          {kids.map((k) => {
            const ks = rollup(tasks, k);
            return (
              <li key={k.id} className="flex items-baseline gap-2">
                <CornerDownRight size={12} className="mt-0.5 shrink-0" style={{ color: C.rule }} />
                <span className="min-w-0 flex-1 truncate text-sm" style={{ fontFamily: F.body, color: C.ink }}>
                  {k.title}
                </span>
                <span className="shrink-0 text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                  {staffName(k.to)}
                </span>
                <span className="shrink-0 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.06em", color: TSTATUS[ks].color }}>
                  {TSTATUS[ks].label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* only a leaf you own has a status you can set */}
      {mine && !kids.length && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusPicker value={t.status} onPick={(v) => onStatus(t.id, v)} />
          {!isLeadOn(me, t.project) && (
            <button
              onClick={() => onHandBack(t)}
              className="flex items-center gap-1 text-xs"
              style={{ fontFamily: F.body, color: C.inkSoft }}
            >
              <Undo2 size={12} /> Hand back to {staffName(leadOf(project(t.project)) || t.by)}
            </button>
          )}
        </div>
      )}

      {mine && kids.length > 0 && (
        <p className="mt-3 text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>
          {rollup(tasks, t) === "review"
            ? "Every piece is done. Sign it off when you've checked it."
            : "Status follows the pieces below — you can't set it directly."}
          {rollup(tasks, t) === "review" && (
            <button
              onClick={() => onStatus(t.id, "done")}
              className="ml-2 px-2 py-1 text-xs uppercase"
              style={{ backgroundColor: C.green, color: C.slip, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em" }}
            >
              Sign off
            </button>
          )}
        </p>
      )}

      {canBreak && (
        breaking === t.id ? (
          <Breakout task={t} onAdd={onBreak} onCancel={() => setBreaking(null)} />
        ) : (
          <button
            onClick={() => setBreaking(t.id)}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase"
            style={{ border: `1px solid ${C.rule}`, color: C.ink, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em" }}
          >
            <CornerDownRight size={12} /> Break this out
          </button>
        )
      )}
    </div>
  );
}

function TasksView({ tasks, onStatus, onHandBack, onBreak, onOpen }) {
  const me = useMe();
  const [breaking, setBreaking] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [draft, setDraft] = useState({ project: PROJECTS[0]?.id || "", title: "", due: "2026-09-30" });

  const mine = tasks.filter((t) => t.to === me.id);
  const leaves = mine.filter((t) => !kidsOf(tasks, t.id).length);
  const parents = mine.filter((t) => kidsOf(tasks, t.id).length);
  const toSignOff = parents.filter((t) => rollup(tasks, t) === "review");
  const openLeaves = leaves.filter((t) => t.status !== "done");
  const blocked = tasks.filter((t) => rollup(tasks, t) === "blocked" && (can(me, "tasks.assign") || t.to === me.id || t.by === me.id));

  const Head = ({ children }) => (
    <p className="px-5 pt-8 pb-3 text-xs uppercase sm:px-8" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.inkSoft }}>
      {children}
    </p>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-6 pb-5 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.carbon }}>
          {ROLES[me.role].label}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
          {openLeaves.length
            ? `${openLeaves.length} ${openLeaves.length === 1 ? "thing" : "things"} on you`
            : parents.length
            ? "Nothing on you directly"
            : "Nothing assigned"}
        </h1>
        <p className="mt-1 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
          {blocked.length
            ? `${blocked.length} blocked — those need somebody else to move first.`
            : "Nothing is blocked."}
        </p>

        {can(me, "tasks.assign") && (
          assigning ? (
            <div className="mt-4 p-3" style={{ border: `1px solid ${C.rule}`, backgroundColor: C.slip }}>
              <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.12em", color: C.inkSoft }}>
                Goes to the team lead, who decides how to split it
              </p>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="What needs doing"
                className="mt-3 w-full bg-transparent py-1.5 text-sm outline-none"
                style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
              />
              <div className="mt-3 flex flex-wrap gap-4">
                <div>
                  <label className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>Project</label>
                  <select
                    value={draft.project}
                    onChange={(e) => setDraft({ ...draft, project: e.target.value })}
                    className="block bg-transparent py-1 text-sm outline-none"
                    style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
                  >
                    {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>Lands with</label>
                  <p className="py-1 text-sm" style={{ fontFamily: F.body, color: C.stamp }}>
                    {staffName(leadOf(project(draft.project)))}
                  </p>
                </div>
                <div>
                  <label className="text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>By</label>
                  <input
                    value={draft.due}
                    onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                    className="block bg-transparent py-1 text-sm outline-none"
                    style={{ fontFamily: F.mono, color: C.ink, borderBottom: `1px solid ${C.rule}`, width: "7rem" }}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    if (!draft.title.trim()) return;
                    onOpen(draft);
                    setDraft({ ...draft, title: "" });
                    setAssigning(false);
                  }}
                  className="px-3 py-1.5 text-xs uppercase"
                  style={{ backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
                >
                  Assign to lead
                </button>
                <button
                  onClick={() => setAssigning(false)}
                  className="px-3 py-1.5 text-xs uppercase"
                  style={{ border: `1px solid ${C.rule}`, color: C.inkSoft, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAssigning(true)}
              className="mt-4 flex items-center gap-1.5 px-3 py-2 text-xs uppercase"
              style={{ backgroundColor: C.stamp, color: C.slip, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
            >
              <ListChecks size={13} /> Open a task
            </button>
          )
        )}
      </div>

      {toSignOff.length > 0 && (
        <>
          <Head>Finished, waiting on your sign-off</Head>
          {toSignOff.map((t) => (
            <TaskLine key={t.id} t={t} tasks={tasks} mine onStatus={onStatus} onHandBack={onHandBack} onBreak={onBreak} breaking={breaking} setBreaking={setBreaking} />
          ))}
        </>
      )}

      <Head>Yours, soonest first</Head>
      {openLeaves.length ? (
        openLeaves
          .slice()
          .sort((a, b) => new Date(a.due) - new Date(b.due))
          .map((t) => (
            <TaskLine key={t.id} t={t} tasks={tasks} mine onStatus={onStatus} onHandBack={onHandBack} onBreak={onBreak} breaking={breaking} setBreaking={setBreaking} />
          ))
      ) : (
        <p className="px-5 py-6 text-sm sm:px-8" style={{ fontFamily: F.body, color: C.inkSoft }}>
          Nothing waiting on you personally.
        </p>
      )}

      {parents.filter((t) => !toSignOff.includes(t)).length > 0 && (
        <>
          <Head>What you handed out</Head>
          {parents
            .filter((t) => !toSignOff.includes(t))
            .map((t) => (
              <TaskLine key={t.id} t={t} tasks={tasks} mine onStatus={onStatus} onHandBack={onHandBack} onBreak={onBreak} breaking={breaking} setBreaking={setBreaking} />
            ))}
        </>
      )}

      {can(me, "tasks.assign") && (
        <>
          <Head>Everything, by project</Head>
          {PROJECTS.map((p) => {
            const rows = tasks.filter((t) => t.project === p.id && !t.parent);
            if (!rows.length) return null;
            return (
              <div key={p.id}>
                <p className="px-5 pt-4 pb-1 text-sm sm:px-8" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
                  {p.name}
                  <span className="ml-2 text-xs" style={{ fontFamily: F.mono, fontWeight: 400, color: C.inkSoft }}>
                    lead {staffName(leadOf(p))}
                  </span>
                </p>
                {rows.map((t) => (
                  <TaskLine key={t.id} t={t} tasks={tasks} mine={t.to === me.id} onStatus={onStatus} onHandBack={onHandBack} onBreak={onBreak} breaking={breaking} setBreaking={setBreaking} />
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ---- admin-only: who has an account, and what they can see ---- */
function StaffAdmin({ staff, onCreate, onUpdate }) {
  const me = useMe();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "associate" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onCreate(form);
      setNotice(`Invite sent to ${form.email}. They'll get an email to set their password.`);
      setForm({ name: "", email: "", role: "associate" });
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const roleFor = (id) => (
    <select
      value={staff.find((s) => s.id === id)?.role}
      onChange={(e) => onUpdate(id, { role: e.target.value })}
      disabled={id === me.id}
      className="bg-transparent py-1 text-sm outline-none"
      style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
    >
      {Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
    </select>
  );

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
            Team accounts
          </h1>
          <p className="mt-1 max-w-xl text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
            Add a staff member and set their role — they'll get an email to set their own password. Nobody chooses their own role.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs uppercase"
          style={{ backgroundColor: C.stamp, color: C.slip, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
        >
          <Plus size={14} /> Add team member
        </button>
      </div>

      {notice && (
        <p className="mt-4 text-sm" style={{ fontFamily: F.body, color: C.green }}>{notice}</p>
      )}

      {adding && (
        <form onSubmit={submit} className="mt-5 max-w-md p-4" style={{ border: `1px solid ${C.rule}`, backgroundColor: C.slip }}>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="mt-1 w-full bg-transparent py-1.5 text-sm outline-none"
                style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
              />
            </div>
            <div>
              <label className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="mt-1 w-full bg-transparent py-1.5 text-sm outline-none"
                style={{ fontFamily: F.mono, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
              />
            </div>
            <div>
              <label className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full bg-transparent py-1.5 text-sm outline-none"
                style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
              >
                {Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-sm" style={{ fontFamily: F.body, color: C.carbon }}>{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-1.5 text-xs uppercase"
              style={{ backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? "Sending…" : "Send invite"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-xs uppercase"
              style={{ border: `1px solid ${C.rule}`, color: C.inkSoft, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-7" style={{ borderTop: `1px solid ${C.rule}` }}>
        {staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3" style={{ borderBottom: `1px solid ${C.rule}` }}>
            <div className="min-w-0">
              <p className="truncate text-sm" style={{ fontFamily: F.body, fontWeight: 600, color: s.active === false ? C.inkSoft : C.ink }}>
                {s.name} {s.id === me.id && <span style={{ color: C.inkSoft, fontWeight: 400 }}>(you)</span>}
              </p>
              <p className="truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>{s.email || "—"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {roleFor(s.id)}
              <button
                onClick={() => onUpdate(s.id, { active: s.active === false })}
                disabled={s.id === me.id}
                className="px-2 py-1 text-xs uppercase"
                style={{
                  fontFamily: F.body, fontWeight: 600, letterSpacing: "0.06em",
                  color: s.active === false ? C.green : C.carbon,
                  opacity: s.id === me.id ? 0.4 : 1,
                }}
              >
                {s.active === false ? "Reactivate" : "Deactivate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function SalesCRM({ me, onLogout }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [switcher, setSwitcher] = useState(false);
  const [view, setView] = useState("home");
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("l1");
  const [adding, setAdding] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [messages, setMessages] = useState({});
  const [tasks, setTasks] = useState([]);
  const [room, setRoom] = useState(ROLES[me.role].rooms[0]);

  /* boot: pull everything the app used to keep in memory from the API instead.
   * Only fetch what this role is actually allowed to see — leads.list() and a
   * room's messages 403 for a role without that permission/membership, and a
   * single rejection would otherwise sink the whole Promise.all. */
  useEffect(() => {
    let cancelled = false;
    const myRooms = ROLES[me.role].rooms;
    (async () => {
      try {
        const [tenants, staff, projects, leadsData, tasksData, ...roomMessages] = await Promise.all([
          api.tenants.list(),
          api.staff.list(),
          api.projects.list(),
          can(me, "leads.view") ? api.leads.list() : Promise.resolve([]),
          api.tasks.list(),
          ...ROOMS.map((r) => (myRooms.includes(r.id) ? api.messages.list(r.id) : Promise.resolve([]))),
        ]);
        if (cancelled) return;
        TENANTS = tenants;
        STAFF = staff;
        PROJECTS = projects;
        const messagesMap = {};
        ROOMS.forEach((r, i) => { messagesMap[r.id] = roomMessages[i]; });
        setLeads(leadsData);
        setTasks(tasksData);
        setMessages(messagesMap);
        setTenant(tenants[0]);
        setReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setTaskStatus = (id, status) => {
    api.tasks.setStatus(id, status)
      .then((updated) => setTasks((ts) => ts.map((t) => (t.id === id ? updated : t))))
      .catch((err) => console.error(err));
  };

  const breakOut = (parent, title, to, due) => {
    api.tasks.breakout(parent.id, { title, to, due })
      .then((created) => setTasks((ts) => [...ts, created]))
      .catch((err) => console.error(err));
  };

  const handBack = (t) => {
    api.tasks.handBack(t.id)
      .then((updated) => setTasks((ts) => ts.map((x) => (x.id === t.id ? updated : x))))
      .catch((err) => console.error(err));
  };

  const openTask = (d) => {
    api.tasks.create({ project: d.project, title: d.title, due: d.due })
      .then((created) => setTasks((ts) => [...ts, created]))
      .catch((err) => console.error(err));
  };

  // STAFF is a module-level array (see the bootstrap effect above), not
  // React state — bumping this tick forces a re-render so components that
  // read it directly pick up whatever StaffAdmin just changed.
  const [, setStaffTick] = useState(0);
  const refreshStaff = async () => {
    STAFF = await api.staff.list();
    setStaffTick((t) => t + 1);
  };
  const createStaff = async (form) => {
    await api.staff.create(form);
    await refreshStaff();
  };
  const updateStaff = async (id, patch) => {
    await api.staff.update(id, patch);
    await refreshStaff();
  };

  const post = (id, msg) => {
    api.messages.post(id, msg)
      .then((created) => setMessages((m) => ({ ...m, [id]: [...(m[id] || []), created] })))
      .catch((err) => console.error(err));
  };

  const discuss = (lead) => {
    const target = ROLES[me.role].rooms.includes("sales") ? "sales" : ROLES[me.role].rooms[0];
    post(target, {
      body: `Bringing ${lead.company} in here — currently ${STAGES.find((s) => s.id === lead.stage).label.toLowerCase()}, last touched ${daysAgo(lead.lastTouch)} days ago.`,
      lead: lead.id,
    });
    setRoom(target);
    setView("team");
  };

  const rows = useMemo(() => {
    const q = norm(query);
    return leads
      .filter((l) => (stage === "all" ? true : l.stage === stage))
      .filter((l) => !q || norm(l.company).includes(q) || norm(l.name).includes(q) || digits(l.phone).includes(digits(q)))
      .sort((a, b) => new Date(b.lastTouch) - new Date(a.lastTouch));
  }, [leads, stage, query]);

  const current = leads.find((l) => l.id === selected);

  const openLead = (id) => {
    setSelected(id);
    setStage("all");
    setQuery("");
    setView("pipeline");
  };

  const appendEvent = (id, entry) => {
    api.leads.appendEvent(id, entry)
      .then((updated) => setLeads((ls) => ls.map((l) => (l.id === id ? updated : l))))
      .catch((err) => console.error(err));
  };

  const moveStage = (id, next) => {
    api.leads.moveStage(id, next)
      .then((updated) => setLeads((ls) => ls.map((l) => (l.id === id ? updated : l))))
      .catch((err) => console.error(err));
  };

  const createLead = (f, clash) => {
    api.leads.create(f, clash?.id)
      .then((result) => {
        setLeads((ls) => (clash ? ls.map((l) => (l.id === clash.id ? result : l)) : [result, ...ls]));
        setSelected(result.id);
        setAdding(false);
        setView("pipeline");
      })
      .catch((err) => console.error(err));
  };

  const commitImport = (staged) => {
    const rows = staged.map(({ rec, dupe }) => ({ rec, dupeId: dupe?.id || null }));
    api.leads.import(rows)
      .then((allLeads) => {
        setLeads(allLeads);
        setView("pipeline");
        setStage("new");
      })
      .catch((err) => console.error(err));
  };

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: C.paper }}>
        <style>{FONTS}</style>
        <p className="text-sm" style={{ fontFamily: F.body, color: loadError ? C.carbon : C.inkSoft }}>
          {loadError ? `Could not reach the server: ${loadError}` : "Loading…"}
        </p>
      </div>
    );
  }

  const waiting = unanswered(leads).length;
  const clientCount = leads.filter((l) => l.stage === "won").length;

  const NAV = [
    { icon: LayoutDashboard, label: "Dashboard", id: "home", badge: null, need: null },
    { icon: ListChecks, label: "Tasks", id: "tasks", badge: tasks.filter((t) => t.to === me.id && t.status !== "done" && !kidsOf(tasks, t.id).length).length || null, need: null },
    { icon: Radio, label: "Pipeline", id: "pipeline", badge: null, need: "leads.view" },
    { icon: Inbox, label: "Inbox", id: "inbox", badge: waiting || null, need: "leads.view" },
    { icon: MessagesSquare, label: "Team", id: "team", badge: ROLES[me.role].rooms.length, need: null },
    { icon: Users, label: "Clients", id: "clients", badge: clientCount || null, need: "leads.view" },
    { icon: UploadCloud, label: "Import", id: "import", badge: null, need: "import" },
    { icon: Settings2, label: "Sources & rules", id: "rules", badge: null, need: "rules" },
    { icon: UserCog, label: "Team accounts", id: "staff", badge: null, need: "team.manage" },
  ].filter((n) => !n.need || can(me, n.need));

  return (
    <Session.Provider value={me}>
    <div className="flex h-screen w-full flex-col overflow-hidden md:flex-row" style={{ backgroundColor: C.paper }}>
      <style>{FONTS}</style>

      {/* mobile: the rail, laid on its side */}
      <div className="shrink-0 md:hidden" style={{ backgroundColor: C.ink }}>
        <div className="flex items-baseline justify-between px-4 pt-3">
          <span className="text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.paper }}>
            {tenant.name}
          </span>
          <button
            onClick={() => setTenant(TENANTS[(TENANTS.findIndex((t) => t.id === tenant.id) + 1) % TENANTS.length])}
            className="text-xs uppercase"
            style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.carbon }}
          >
            Switch
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-2 pt-2">
          {NAV.map(({ icon: Icon, label, id, badge }) => {
            const active = view === id;
            return (
              <button
                key={label}
                onClick={() => setView(id)}
                className="flex shrink-0 items-center gap-1.5 pb-1 text-xs"
                style={{
                  fontFamily: F.body,
                  fontWeight: active ? 600 : 400,
                  color: active ? C.paper : C.inkSoft,
                  borderBottom: `2px solid ${active ? C.carbon : "transparent"}`,
                }}
              >
                <Icon size={14} />
                {label}
                {badge != null && label === "Inbox" && (
                  <span className="px-1" style={{ fontFamily: F.mono, backgroundColor: C.carbon, color: C.slip }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="hidden w-56 shrink-0 flex-col justify-between py-6 md:flex" style={{ backgroundColor: C.ink }}>
        <div>
          <div className="px-5">
            <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.18em", color: C.carbon }}>
              Day book
            </p>
            <div className="relative mt-3">
              <button onClick={() => setSwitcher((v) => !v)} className="flex w-full items-start gap-1.5 text-left">
                <span className="text-base leading-snug" style={{ fontFamily: F.display, fontWeight: 600, color: C.paper }}>
                  {tenant.name}
                </span>
                <ChevronDown size={14} className="mt-1.5 shrink-0" style={{ color: C.inkSoft }} />
              </button>
              {switcher && (
                <div className="absolute left-0 right-0 z-10 mt-2 py-1" style={{ backgroundColor: C.slip, border: `1px solid ${C.rule}` }}>
                  {TENANTS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTenant(t); setSwitcher(false); }}
                      className="block w-full px-3 py-2 text-left text-sm"
                      style={{ fontFamily: F.body, color: t.id === tenant.id ? C.stamp : C.ink }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>{tenant.gstin}</p>
            </div>
          </div>

          <nav className="mt-8">
            {NAV.map(({ icon: Icon, label, id, badge }) => {
              const active = view === id;
              return (
                <button
                  key={label}
                  onClick={() => setView(id)}
                  className="flex w-full items-center gap-2.5 px-5 py-2.5 text-sm"
                  style={{
                    fontFamily: F.body,
                    color: active ? C.paper : C.inkSoft,
                    fontWeight: active ? 600 : 400,
                    borderLeft: `2px solid ${active ? C.carbon : "transparent"}`,
                  }}
                >
                  <Icon size={15} />
                  <span className="flex-1 text-left">{label}</span>
                  {badge != null && (
                    <span
                      className="px-1.5 text-xs"
                      style={{
                        fontFamily: F.mono,
                        color: label === "Inbox" ? C.slip : C.inkSoft,
                        backgroundColor: label === "Inbox" ? C.carbon : "transparent",
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="relative px-5">
          {whoOpen && (
            <div className="absolute bottom-full left-5 right-5 mb-2 py-1" style={{ backgroundColor: C.slip, border: `1px solid ${C.rule}` }}>
              {can(me, "team.manage") && (
                <button
                  onClick={() => { setWhoOpen(false); setView("staff"); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                  style={{ fontFamily: F.body, color: C.ink }}
                >
                  <UserCog size={14} /> Manage team
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                style={{ fontFamily: F.body, color: C.carbon }}
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
          <button onClick={() => setWhoOpen((v) => !v)} className="flex w-full items-start gap-2 text-left">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: C.carbon }} />
            <span className="min-w-0">
              <span className="block truncate text-sm" style={{ fontFamily: F.body, fontWeight: 600, color: C.paper }}>{me.name}</span>
              <span className="block text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>{ROLES[me.role].label}</span>
            </span>
          </button>
        </div>
      </aside>

      {view !== "pipeline" ? (
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {view === "home" && <Dashboard leads={leads} onGo={setView} onOpenLead={openLead} />}
          {view === "tasks" && (
            <TasksView tasks={tasks} onStatus={setTaskStatus} onHandBack={handBack} onBreak={breakOut} onOpen={openTask} />
          )}
          {view === "import" && <Import leads={leads} onCommit={commitImport} />}
          {view === "inbox" && <InboxView leads={leads} onOpen={openLead} />}
          {view === "clients" && <ClientsView leads={leads} onOpen={openLead} />}
          {view === "rules" && <RulesView leads={leads} />}
          {view === "team" && (
            <TeamView messages={messages} onPost={post} room={room} setRoom={setRoom} leads={leads} onOpen={openLead} />
          )}
          {view === "staff" && (
            <StaffAdmin staff={STAFF} onCreate={createStaff} onUpdate={updateStaff} />
          )}
        </main>
      ) : (
        <>
          <main className={`flex min-w-0 flex-1 flex-col ${current ? "hidden lg:flex" : "flex"}`}>
            <header className="flex items-center gap-3 px-5 py-4 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
              <div className="flex min-w-0 flex-1 items-center gap-2" style={{ borderBottom: `1px solid ${C.rule}` }}>
                <Search size={15} style={{ color: C.inkSoft }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a firm, a person, or a phone number"
                  className="w-full bg-transparent py-1.5 text-sm outline-none"
                  style={{ fontFamily: F.body, color: C.ink }}
                />
              </div>
              {can(me, "leads.edit") && (
                <button
                  onClick={() => setAdding(true)}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs uppercase"
                  style={{ backgroundColor: C.stamp, color: C.slip, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
                >
                  <Plus size={14} /> Add lead
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto">
              <PipelineSpine leads={leads} stage={stage} onStage={setStage} />

              <div className="flex gap-5 overflow-x-auto px-5 py-3 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
                {[{ id: "all", label: "Everyone" }, ...STAGES].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setStage(t.id)}
                    className="shrink-0 pb-1 text-xs uppercase"
                    style={{
                      fontFamily: F.body,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      color: stage === t.id ? C.ink : C.inkSoft,
                      borderBottom: `2px solid ${stage === t.id ? C.carbon : "transparent"}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {rows.length ? (
                rows.map((l) => (
                  <LeadRow key={l.id} lead={l} selected={l.id === selected} onSelect={setSelected} />
                ))
              ) : (
                <div className="px-5 py-16 text-center sm:px-8">
                  <p className="text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
                    Nothing here yet. Add a lead, or bring in a list from Import.
                  </p>
                </div>
              )}
            </div>
          </main>

          <aside
            className={`${current ? "flex" : "hidden"} w-full shrink-0 flex-col lg:flex lg:w-96`}
            style={{ borderLeft: `1px solid ${C.rule}` }}
          >
            <LeadCard lead={current} onClose={() => setSelected(null)} onStage={moveStage} onSend={appendEvent} onDiscuss={discuss} />
          </aside>
        </>
      )}

      {adding && <NewLead leads={leads} onClose={() => setAdding(false)} onCreate={createLead} />}
    </div>
    </Session.Provider>
  );
}

