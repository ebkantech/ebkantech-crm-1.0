// Mirrors the STAGES labels in src/ebkanCrm.jsx — needed server-side to
// write the same "Moved to X" note the frontend used to write locally.
export const STAGE_LABELS = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal out",
  negotiation: "Negotiating",
  won: "Won",
  lost: "Lost",
};

// The demo data is anchored to a fixed "today" (2026-08-30) so every seeded
// days-ago/days-left figure stays stable — new events keep using that same
// fixed date rather than the real wall clock, matching the old in-memory logic.
export const TODAY_DATE = "2026-08-30";
export const TODAY_STAMP = "2026-08-30 09:00";
