import { useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { C, F } from "./theme";
import { TODAY, tierOf, nextStep, dueOn } from "./constants";
import { useMe } from "./roles";

/* ------------------------------------------------------------------ *
 *  Outreach. The playbook's rules live here as data, so the sequence
 *  enforces itself instead of relying on someone remembering it.
 *  Tier is DERIVED from what we know about a lead — add a name and the
 *  lead moves tier on the spot, which is the point the playbook makes
 *  hardest: enrichment beats volume.
 *
 *  The sequence cursor (tierOf/nextStep) is shared from ./constants so
 *  the nav badge can count "due today" without duplicating the rules —
 *  but the server recomputes the same thing independently whenever a
 *  step actually gets marked sent, since this copy is display only.
 * ------------------------------------------------------------------ */
const TIERS = {
  1: { label: "Tier 1", how: "Named person and a Saudi mobile. WhatsApp or call first, email second.", color: C.green },
  2: { label: "Tier 2", how: "Reachable on WhatsApp or a named contact. Email day 0, WhatsApp day 5.", color: C.stamp },
  3: { label: "Tier 3", how: "Generic inbox only. Email sequence, and spend the spare hour finding a name.", color: C.amber },
  4: { label: "Tier 4", how: "Outside KSA. Hold for a separate GCC campaign.", color: C.inkSoft },
  0: { label: "Parked", how: "Placeholder, competitor or malformed. Do not send.", color: C.carbon },
};

const SEGMENTS = {
  si: {
    label: "SI / reseller",
    direct: false,
    subject: "delivery capacity",
    body: `Assalamu alaikum,

Quick question — is {company} taking on subcontract delivery partners this year?

We're a data science and ERP/CRM engineering team in India. We build under our partners' brand: you hold the client and the contract, we supply the engineers. Data stays in the Kingdom — we work inside your tenancy in the KSA region.

Most of our partners use us when they've won more than they can staff, or when local delivery cost is eating the margin on a fixed-price job.

Worth a conversation, or not a fit right now?

{sender} · Ebkan Tech`,
  },
  erp: {
    label: "ERP / software",
    direct: false,
    subject: "implementation overflow",
    body: `Assalamu alaikum,

Does {company} ever hand off implementation overflow?

We do ERP and CRM delivery work as a white-label team — data migration, integrations, custom modules, post-go-live support. Our partners bring us in when a rollout is bigger than the bench they have.

Data stays in the Kingdom; we work in your tenancy.

Is that something you'd ever outsource, or is it all in-house?

{sender} · Ebkan Tech`,
  },
  telecom: {
    label: "Telecom / network",
    direct: false,
    subject: "churn models",
    body: `Assalamu alaikum,

Does {company} build analytics for its telecom clients, or resell someone's platform?

We build the data side — churn prediction, network-ops dashboards, billing and mediation pipelines — under our partners' brand. It tends to be the piece network integrators don't want to staff for permanently.

Worth a short call, or not your area?

{sender} · Ebkan Tech`,
  },
  cyber: {
    label: "Cyber / GRC",
    direct: false,
    subject: "soc data pipelines",
    body: `Assalamu alaikum,

Most SOC work we see stalls on the data engineering, not the security — log normalisation, telemetry pipelines, getting NCA compliance reporting into something a board can read.

That's the part we build, as a subcontracted team under your name. Everything stays in your KSA environment.

Is data engineering something {company} currently subcontracts?

{sender} · Ebkan Tech`,
  },
  power: {
    label: "Solar / power",
    direct: true,
    subject: "solar epc tracking",
    body: `Assalamu alaikum,

Solar EPC is one of the sectors we build for — project tracking across sites, procurement and inventory against schedule, asset performance analytics once plants are live.

With the volume of NREP and PIF-backed capacity coming through, most EPC teams we speak to are running it on spreadsheets well past the point it works.

Would a fifteen-minute look at how you currently track projects be useful?

{sender} · Ebkan Tech`,
  },
};

const SHARED = {
  e2: {
    subject: "one example",
    body: `Following the note on Sunday — one concrete example rather than a brochure.

[Your real project here: client type, what you built, timeline, team size. If there's no Saudi reference yet, use the closest sector match and say so plainly.]

If subcontract delivery isn't something you use, tell me and I'll stop there.

{sender} · Ebkan Tech`,
  },
  e3: {
    subject: "cost per seat",
    body: `Last useful thing I can send.

A mid-level data engineer or ERP consultant in Riyadh runs you a certain monthly cost, before Saudization overhead. Our equivalent seat is a fraction of that, billed monthly, no notice period, scale up or down per project.

That gap is the whole reason partners work with us. If it isn't relevant to how {company} prices delivery, no problem at all.

{sender} · Ebkan Tech`,
  },
  e4: {
    subject: "closing this out",
    body: `I'll assume the timing isn't right and stop emailing.

If it changes — a project you've won and can't staff, or a fixed-price job where delivery cost is tight — my details are below.

Shukran, and best of luck with the year.

{sender} · Ebkan Tech`,
  },
  w1: {
    subject: null,
    body: `Assalamu alaikum {name} — {sender} from Ebkan Tech, I sent a note to your office email on Sunday about subcontract delivery partnerships. Not sure it reached the right person. Who handles that at {company}?`,
  },
  li: {
    subject: null,
    body: `[Connection request — no pitch in the note. Leave it blank or one line: "Working with a few Saudi integrators on delivery capacity — thought it worth connecting."]`,
  },
};

const DAILY_CAP = 120; // three warmed mailboxes at forty each

/* Saudi work week is Sunday to Thursday */
const sendWindow = () => {
  const d = TODAY.getDay();
  if (d === 5 || d === 6) return { ok: false, note: "Friday and Saturday are the Saudi weekend. Nothing goes out today." };
  if (d === 4) return { ok: true, note: "Thursday — send in the morning. Afternoon is the Friday-eve wind-down." };
  if (d === 0) return { ok: true, note: "Sunday is the inbox-clearing slot and the best day of the week to land." };
  if (d === 1 || d === 2) return { ok: true, note: "Good send day. Aim for 08:00–10:00 AST, which is 10:30–12:30 IST." };
  return { ok: true, note: "Mid-week. Fine, though Sunday to Tuesday lands better." };
};

const compose = (lead, key, sender) => {
  const seg = SEGMENTS[lead.segment];
  const t = key === "e1" ? seg : SHARED[key];
  const fill = (str) =>
    str.replace(/{company}/g, lead.company).replace(/{name}/g, lead.contact || "there").replace(/{sender}/g, sender);
  return { subject: t.subject, body: fill(t.body) };
};

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const hasLink = (s) => /https?:\/\/|www\.|\.com\/|\.sa\//i.test(s);

function OutreachRow({ l, sender, onSent, onStop, onReply, onEnrich, sendOk, capLeft }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const tier = tierOf(l);
  const step = nextStep(l);
  const skipped = step && step.index > l.step;

  if (!step) {
    return (
      <div className="px-5 py-4 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <div className="flex items-baseline justify-between gap-4">
          <span className="truncate text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.inkSoft }}>{l.company}</span>
          <span className="shrink-0 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", color: C.inkSoft }}>
            sequence finished
          </span>
        </div>
      </div>
    );
  }

  const due = dueOn(l, step);
  const late = Math.round((TODAY - due) / 86400000);
  const ready = late >= 0;
  const copy = compose(l, step.key, sender);
  const parked = tier === 0;
  const held = tier === 4;
  const blocked = parked
    ? "Parked — do not send."
    : held
    ? "Tier 4. Held for the GCC campaign."
    : !sendOk
    ? "Saudi weekend."
    : step.channel === "email" && capLeft <= 0
    ? "Daily cap reached."
    : null;

  const copyAndSend = async () => {
    try {
      await navigator.clipboard.writeText(copy.body);
    } catch {
      // clipboard access can be denied by the browser — sending still proceeds
    }
    onSent(l.id);
  };

  return (
    <div style={{ borderBottom: `1px solid ${C.rule}` }}>
      <button onClick={() => setOpen(!open)} className="block w-full px-5 py-4 text-left sm:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="truncate text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>{l.company}</span>
          <span className="shrink-0 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.08em", color: TIERS[tier].color }}>
            {TIERS[tier].label}
          </span>
        </div>
        <p className="mt-1.5 truncate text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
          {l.contact ? `${l.contact} · ` : ""}
          {l.email} · {SEGMENTS[l.segment].label}
          {SEGMENTS[l.segment].direct ? " · direct sale" : ""}
        </p>
        <p className="mt-1.5 text-xs" style={{ fontFamily: F.body, color: blocked ? C.carbon : ready ? C.stamp : C.inkSoft }}>
          {step.label}
          {" · "}
          {blocked ? blocked : ready ? (late > 0 ? `${late} days late` : "due today") : `in ${-late} days`}
        </p>
      </button>

      {open && (
        <div className="px-5 pb-5 sm:px-8">
          {skipped && (
            <p className="mb-3 text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>
              The day-5 WhatsApp was skipped — no mobile on file, so this lead isn't Tier 1 or 2.
            </p>
          )}

          <div className="p-3" style={{ border: `1px solid ${C.rule}`, backgroundColor: C.slip }}>
            {copy.subject && (
              <p className="text-xs" style={{ fontFamily: F.mono, color: C.inkSoft }}>
                subject: <span style={{ color: C.ink }}>{copy.subject}</span>
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-sm" style={{ fontFamily: F.body, color: C.ink }}>{copy.body}</p>
          </div>

          {step.key === "e1" && (
            <p className="mt-2 text-xs" style={{ fontFamily: F.mono, color: hasLink(copy.body) || words(copy.body) > 120 ? C.carbon : C.green }}>
              {words(copy.body)} words · {hasLink(copy.body) ? "contains a link — strip it" : "no links"}
              {words(copy.body) <= 120 && !hasLink(copy.body) ? " · clears the first-email rules" : ""}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={!!blocked || !ready}
              onClick={copyAndSend}
              className="px-3 py-1.5 text-xs uppercase"
              style={{
                backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em",
                opacity: blocked || !ready ? 0.4 : 1,
                cursor: blocked || !ready ? "not-allowed" : "pointer",
              }}
            >
              Copy and mark sent
            </button>
            <button
              onClick={() => onReply(l.id)}
              className="px-3 py-1.5 text-xs uppercase"
              style={{ border: `1px solid ${C.rule}`, color: C.green, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
            >
              They replied
            </button>
            <button
              onClick={() => onStop(l.id)}
              className="px-3 py-1.5 text-xs uppercase"
              style={{ border: `1px solid ${C.rule}`, color: C.carbon, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
            >
              Not interested — stop
            </button>
          </div>

          {/* enrichment, right where the weakness shows */}
          {tier === 3 && (
            <div className="mt-4 p-3" style={{ border: `1px solid ${C.rule}` }}>
              <p className="flex items-center gap-1.5 text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.12em", color: C.carbon }}>
                <Sparkles size={12} /> Worth more than the next three emails
              </p>
              <p className="mt-2 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
                Call the landline and ask, in Arabic or English: who handles delivery partnerships? Receptionists give this out
                freely. A name moves this lead two tiers.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name you were given"
                  className="bg-transparent py-1.5 text-sm outline-none"
                  style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}`, minWidth: "12rem" }}
                />
                <button
                  onClick={() => name.trim() && onEnrich(l.id, name.trim())}
                  className="px-3 py-1.5 text-xs uppercase"
                  style={{ backgroundColor: C.stamp, color: C.slip, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
                >
                  Save the name
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OutreachView({ list, onSent, onStop, onReply, onEnrich, sentToday, error }) {
  const me = useMe();
  const [tier, setTier] = useState("due");
  const win = sendWindow();
  const capLeft = DAILY_CAP - sentToday;

  const active = list.filter((l) => l.state === "active");
  const isDue = (l) => {
    const s = nextStep(l);
    return s && dueOn(l, s) <= TODAY && tierOf(l) !== 0 && tierOf(l) !== 4;
  };

  const lanes = [
    { id: "due", label: "Due today" },
    { id: "1", label: "Tier 1" },
    { id: "2", label: "Tier 2" },
    { id: "3", label: "Tier 3" },
    { id: "4", label: "Tier 4" },
    { id: "0", label: "Parked" },
    { id: "closed", label: "Stopped" },
  ];

  const rows =
    tier === "due" ? active.filter(isDue) : tier === "closed" ? list.filter((l) => l.state !== "active") : active.filter((l) => String(tierOf(l)) === tier);

  const dueCount = active.filter(isDue).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-6 pb-5 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.carbon }}>
          Saudi ICT campaign
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
          {win.ok ? `${dueCount} to send today` : "Nothing sends today"}
        </h1>
        <p className="mt-1 max-w-xl text-sm" style={{ fontFamily: F.body, color: win.ok ? C.inkSoft : C.carbon }}>
          {win.note}
        </p>
        <p className="mt-2 text-xs" style={{ fontFamily: F.mono, color: capLeft < 20 ? C.carbon : C.inkSoft }}>
          {sentToday} sent · {capLeft} left on today's cap of {DAILY_CAP} across three mailboxes
        </p>
        {error && (
          <div className="mt-3 flex items-start gap-2 p-3" style={{ border: `1px solid ${C.carbon}` }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: C.carbon }} />
            <p className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-5 overflow-x-auto px-5 py-3 sm:px-8" style={{ borderBottom: `1px solid ${C.rule}` }}>
        {lanes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTier(t.id)}
            className="shrink-0 pb-1 text-xs uppercase"
            style={{
              fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em",
              color: tier === t.id ? C.ink : C.inkSoft,
              borderBottom: `2px solid ${tier === t.id ? C.carbon : "transparent"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TIERS[tier] && (
        <p className="px-5 pt-4 text-sm sm:px-8" style={{ fontFamily: F.body, color: C.inkSoft }}>{TIERS[tier].how}</p>
      )}
      {tier === "due" && (
        <p className="px-5 pt-4 text-sm sm:px-8" style={{ fontFamily: F.body, color: C.inkSoft }}>
          Everything whose next touch has come round, in tier order. Work top to bottom and the sequence stays honest.
        </p>
      )}

      <div className="mt-2">
        {rows.length ? (
          rows
            .slice()
            .sort((a, b) => tierOf(a) - tierOf(b))
            .map((l) => (
              <OutreachRow key={l.id} l={l} sender={me.name} onSent={onSent} onStop={onStop} onReply={onReply} onEnrich={onEnrich} sendOk={win.ok} capLeft={capLeft} />
            ))
        ) : (
          <p className="px-5 py-10 text-sm sm:px-8" style={{ fontFamily: F.body, color: C.inkSoft }}>
            Nothing in this lane.
          </p>
        )}
      </div>
    </div>
  );
}
