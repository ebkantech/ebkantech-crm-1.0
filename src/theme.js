/* ------------------------------------------------------------------ *
 *  Shared bill-book design tokens: ledger paper, indigo ink, stamp-pad
 *  violet, magenta carbon. Used by the CRM shell and the auth screens
 *  (login/forgot/reset) so they read as one product, not a bolt-on.
 * ------------------------------------------------------------------ */
export const C = {
  ink: "#171634",
  inkSoft: "#4A4870",
  paper: "#ECEEE8",
  slip: "#FBFAF6",
  rule: "#D5D6C8",
  stamp: "#5B2AA5",
  carbon: "#C42B6B",
  green: "#1C6B49",
  amber: "#9A6212",
};

export const F = {
  display: "'Familjen Grotesk', ui-sans-serif, system-ui, sans-serif",
  body: "'Public Sans', ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Public+Sans:wght@400;500;600&display=swap');
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;
