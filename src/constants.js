// Small date/format utilities shared by the CRM shell and the outreach
// module. TODAY is fixed (not the real clock) so every seeded days-ago/
// days-left figure in the demo data stays stable — it mirrors TODAY_DATE
// on the server (server/src/constants.js).
export const TODAY = new Date("2026-08-30");

export const daysAgo = (d) => Math.max(0, Math.round((TODAY - new Date(d)) / 86400000));
export const daysLeft = (d) => Math.round((new Date(d) - TODAY) / 86400000);

export const digits = (s) => (s || "").replace(/\D/g, "").slice(-10);
export const norm = (s) => (s || "").trim().toLowerCase();

export const money = (n) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

/* ------------------------------------------------------------------ *
 *  Outreach sequence engine — shared between the Outreach view (which
 *  renders it) and the CRM shell (which needs it just for the nav
 *  badge's "due today" count). Mirrored on the server
 *  (server/src/constants/outreachSequence.js), which is the copy that
 *  actually gets enforced when a step is marked sent.
 * ------------------------------------------------------------------ */
export const SEQUENCE = [
  { key: "e1", day: 0, channel: "email", label: "Email 1 — relevance and a small ask" },
  { key: "e2", day: 3, channel: "email", label: "Email 2 — one concrete example" },
  { key: "w1", day: 5, channel: "whatsapp", label: "WhatsApp — same person, new channel", tiers: [1, 2] },
  { key: "e3", day: 8, channel: "email", label: "Email 3 — cost and capacity" },
  { key: "li", day: 10, channel: "linkedin", label: "LinkedIn connect, no pitch" },
  { key: "e4", day: 15, channel: "email", label: "Email 4 — breakup" },
];

export const tierOf = (l) => {
  if (l.parked) return 0;
  if (l.region !== "sa") return 4;
  if (l.contact && l.mobile) return 1;
  if (l.contact || l.mobile) return 2;
  return 3;
};

export function nextStep(l) {
  const tier = tierOf(l);
  for (let i = l.step; i < SEQUENCE.length; i++) {
    const s = SEQUENCE[i];
    if (s.tiers && !s.tiers.includes(tier)) continue; // WhatsApp isn't offered below Tier 2
    return { ...s, index: i };
  }
  return null;
}

export const dueOn = (l, step) => {
  const d = new Date(l.started);
  d.setDate(d.getDate() + step.day);
  return d;
};
