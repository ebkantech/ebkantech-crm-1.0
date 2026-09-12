// Mirrors the sequence engine in src/outreach.jsx. The frontend renders the
// copy and the countdown from this same shape, but the server recomputes it
// independently whenever a step actually gets marked sent — a client could
// always claim to be further along than it is.
export const SEQUENCE = [
  { key: "e1", day: 0, channel: "email" },
  { key: "e2", day: 3, channel: "email" },
  { key: "w1", day: 5, channel: "whatsapp", tiers: [1, 2] },
  { key: "e3", day: 8, channel: "email" },
  { key: "li", day: 10, channel: "linkedin" },
  { key: "e4", day: 15, channel: "email" },
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
