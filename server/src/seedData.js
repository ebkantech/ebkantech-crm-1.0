// Mirrors the mock data that used to live inline in src/ebkanCrm.jsx, so the
// database starts out matching the demo the app used to render from memory.

export const TENANTS = [
  { _id: "t1", name: "Rao & Kulkarni LLP", gstin: "27AAFCR1234M1Z5" },
  { _id: "t2", name: "Sethi Advisory", gstin: "07AAGCS8891K1ZQ" },
];

// Demo login password for every seeded account — change it after first
// login in anything beyond a local demo. seed.js hashes this before insert.
export const SEED_PASSWORD = "DayBook@2026";

export const STAFF = [
  { _id: "u1", name: "Priya Rao", email: "priya.rao@raokulkarni.com", role: "partner" },
  { _id: "u2", name: "Meera S.", email: "meera.s@raokulkarni.com", role: "sales" },
  { _id: "u3", name: "Anil K.", email: "anil.k@raokulkarni.com", role: "associate" },
  { _id: "u4", name: "Tejas Iyer", email: "tejas.iyer@raokulkarni.com", role: "developer" },
  { _id: "u6", name: "Rhea Kapoor", email: "rhea.kapoor@raokulkarni.com", role: "designer" },
  { _id: "u7", name: "Karan Malhotra", email: "karan.malhotra@raokulkarni.com", role: "developer" },
  { _id: "u5", name: "Nadia Farooqui", email: "nadia.farooqui@raokulkarni.com", role: "auditor" },
];

export const PROJECTS = [
  {
    _id: "p1",
    name: "Halcyon statutory audit",
    client: "Halcyon Textiles Pvt Ltd",
    leadRef: "l1",
    due: "2026-09-30",
    fee: 480000,
    team: [
      { id: "u1", part: "Team lead", alloc: 20 },
      { id: "u3", part: "Associate", alloc: 60 },
    ],
    milestones: [
      ["Engagement letter signed", true],
      ["Opening balances agreed", true],
      ["Fieldwork — inventory", true],
      ["Fieldwork — payables", false],
      ["Draft report to partner", false],
    ],
  },
  {
    _id: "p2",
    name: "Northline transfer pricing study",
    client: "Northline Logistics Ltd",
    leadRef: "l2",
    due: "2026-09-12",
    fee: 375000,
    team: [
      { id: "u1", part: "Team lead", alloc: 15 },
      { id: "u3", part: "Associate", alloc: 30 },
    ],
    milestones: [
      ["Scoping call", true],
      ["Benchmarking set built", true],
      ["Draft study", false],
      ["Filed", false],
    ],
  },
  {
    _id: "p3",
    name: "Client portal — phase 2",
    client: "Internal",
    leadRef: null,
    due: "2026-09-20",
    fee: 0,
    team: [
      { id: "u4", part: "Team lead", alloc: 50 },
      { id: "u7", part: "Developer", alloc: 80 },
      { id: "u6", part: "Designer", alloc: 40 },
    ],
    milestones: [
      ["Document upload", true],
      ["Sign-in and roles", true],
      ["Invoice history screen", false],
      ["Mobile pass", false],
      ["Security review", false],
    ],
  },
  {
    _id: "p4",
    name: "WhatsApp inbox rebuild",
    client: "Internal",
    leadRef: null,
    due: "2026-09-05",
    fee: 0,
    team: [
      { id: "u4", part: "Team lead", alloc: 30 },
      { id: "u6", part: "Designer", alloc: 30 },
    ],
    milestones: [
      ["Webhook replay", true],
      ["Thread merge rules", true],
      ["Unanswered view", true],
      ["Template approvals", false],
    ],
  },
  {
    _id: "p5",
    name: "Devi Ceramics onboarding",
    client: "Devi Ceramics",
    leadRef: "l3",
    due: "2026-10-15",
    fee: 96000,
    team: [{ id: "u3", part: "Team lead", alloc: 25 }],
    milestones: [
      ["Ledgers received", true],
      ["Chart of accounts mapped", false],
      ["First month closed", false],
      ["Handover call", false],
    ],
  },
];

export const TASKS = [
  { _id: "t1", project: "p3", parent: null, title: "Invoice history screen", by: "u1", to: "u4", due: "2026-09-12", status: "todo" },
  { _id: "t1a", project: "p3", parent: "t1", title: "Empty and loading states", by: "u4", to: "u6", due: "2026-09-04", status: "doing" },
  { _id: "t1b", project: "p3", parent: "t1", title: "Wire the API and paging", by: "u4", to: "u7", due: "2026-09-08", status: "blocked", why: "Waiting on the cursor parameter for /invoices" },
  { _id: "t2", project: "p3", parent: null, title: "Mobile pass", by: "u1", to: "u4", due: "2026-09-18", status: "todo" },
  { _id: "t2a", project: "p3", parent: "t2", title: "Audit every breakpoint under 400px", by: "u4", to: "u6", due: "2026-09-15", status: "todo" },
  { _id: "t3", project: "p3", parent: null, title: "Security review before launch", by: "u1", to: "u4", due: "2026-09-19", status: "todo" },
  { _id: "t4", project: "p4", parent: null, title: "Template approvals", by: "u1", to: "u4", due: "2026-09-05", status: "todo" },
  { _id: "t4a", project: "p4", parent: "t4", title: "Submit three templates to Meta", by: "u4", to: "u7", due: "2026-08-29", status: "done" },
  { _id: "t4b", project: "p4", parent: "t4", title: "Copy for the rejection state", by: "u4", to: "u6", due: "2026-09-03", status: "doing" },
  { _id: "t5", project: "p1", parent: null, title: "Fieldwork — payables", by: "u1", to: "u3", due: "2026-09-09", status: "doing" },
  { _id: "t6", project: "p1", parent: null, title: "Draft report to partner", by: "u1", to: "u3", due: "2026-09-22", status: "todo" },
  { _id: "t7", project: "p2", parent: null, title: "Benchmarking write-up", by: "u1", to: "u3", due: "2026-09-06", status: "review" },
  { _id: "t8", project: "p5", parent: null, title: "Map the chart of accounts", by: "u1", to: "u3", due: "2026-09-14", status: "doing" },
];

export const LEADS = [
  {
    _id: "l1",
    name: "Kavita Menon",
    company: "Halcyon Textiles Pvt Ltd",
    phone: "+91 98200 41123",
    email: "kavita@halcyon.co.in",
    pan: "AAECH9021R",
    source: "Referral",
    stage: "negotiation",
    owner: "Priya Rao",
    value: 480000,
    lastTouch: "2026-08-28",
    thread: [
      { ch: "email", dir: "out", at: "2026-08-11 10:20", body: "Sent the engagement letter and fee schedule for the statutory audit." },
      { ch: "whatsapp", dir: "in", at: "2026-08-14 19:02", body: "Got it. Board meets on the 22nd, will confirm right after." },
      { ch: "call", dir: "out", at: "2026-08-22 16:40", body: "Walked through scope. They want the tax audit bundled in." },
      { ch: "whatsapp", dir: "out", at: "2026-08-28 11:15", body: "Revised quote with tax audit included — ₹4,80,000 all in." },
    ],
  },
  {
    _id: "l2",
    name: "Rohit Bansal",
    company: "Northline Logistics Ltd",
    phone: "+91 99450 77218",
    email: "rohit.bansal@northline.in",
    pan: "AACCN4417P",
    source: "Website form",
    stage: "proposal",
    owner: "Meera S.",
    value: 375000,
    lastTouch: "2026-08-19",
    thread: [
      { ch: "note", dir: "out", at: "2026-08-02 09:10", body: "Came in through the GST return form on the site." },
      { ch: "whatsapp", dir: "out", at: "2026-08-02 09:40", body: "Hi Rohit — Meera from Rao & Kulkarni. Free for a 15 min call this week?" },
      { ch: "whatsapp", dir: "in", at: "2026-08-02 13:22", body: "Thursday 4pm works." },
      { ch: "email", dir: "out", at: "2026-08-19 17:05", body: "Proposal for annual return plus reconciliation, ₹3,75,000." },
    ],
  },
  {
    _id: "l3",
    name: "Sunil Devi",
    company: "Devi Ceramics",
    phone: "+91 94430 20915",
    email: "accounts@deviceramics.com",
    pan: "AAEFD5590C",
    source: "WhatsApp",
    stage: "qualified",
    owner: "Anil K.",
    value: 96000,
    lastTouch: "2026-08-26",
    thread: [
      { ch: "whatsapp", dir: "in", at: "2026-08-24 21:14", body: "Saw your firm on the ICAI listing. Need monthly bookkeeping, 3 units." },
      { ch: "whatsapp", dir: "out", at: "2026-08-26 10:02", body: "Happy to help. Roughly how many vouchers a month across the three?" },
    ],
  },
  {
    _id: "l4",
    name: "Ashwin Bhatt",
    company: "Bhatt & Sons (proprietor)",
    phone: "+91 98111 55402",
    email: "ashwin.bhatt@gmail.com",
    pan: "AKQPB2210J",
    source: "Event",
    stage: "new",
    owner: "Unassigned",
    value: 42000,
    lastTouch: "2026-08-09",
    thread: [
      { ch: "note", dir: "out", at: "2026-08-09 18:30", body: "Met at the Bombay Chartered Accountants' seminar. Wants ITR help." },
    ],
  },
  {
    _id: "l5",
    name: "Farah Qureshi",
    company: "Ellora Infra LLP",
    phone: "+91 90040 66713",
    email: "farah@ellorainfra.com",
    pan: "AAHFE1188Q",
    source: "Referral",
    stage: "won",
    owner: "Priya Rao",
    value: 130000,
    lastTouch: "2026-08-04",
    thread: [
      { ch: "email", dir: "in", at: "2026-07-20 11:00", body: "Referred by Sundar Foods. Need net worth certification, two of them." },
      { ch: "email", dir: "out", at: "2026-08-04 15:12", body: "Engagement signed. Invoice RK/25-26/0133 raised." },
    ],
  },
  {
    _id: "l6",
    name: "Vikram Shetty",
    company: "Coastline Exports",
    phone: "+91 97400 31288",
    email: "vikram@coastlineexports.in",
    pan: "AAGCC7745L",
    source: "Cold call",
    stage: "lost",
    owner: "Anil K.",
    value: 210000,
    lastTouch: "2026-07-11",
    thread: [
      { ch: "call", dir: "out", at: "2026-07-11 12:30", body: "Staying with their existing auditor for another year. Try again in April." },
    ],
  },
];

export const MESSAGES = [
  { room: "sales", by: "u2", at: "2026-08-28 09:12", body: "Halcyon board met on the 22nd. Kavita wants the tax audit bundled — I've sent the revised number." },
  { room: "sales", by: "u1", at: "2026-08-28 09:20", body: "Good. Hold at 4.8 unless they push twice.", lead: "l1" },
  { room: "sales", by: "u3", at: "2026-08-29 14:05", body: "Devi Ceramics replied on WhatsApp about voucher volumes. Picking it up." },
  { room: "dev", by: "u4", at: "2026-08-27 11:40", body: "WhatsApp webhook was dropping messages when the payload had no profile name. Fixed, deployed at 11:20." },
  { room: "dev", by: "u1", at: "2026-08-27 12:02", body: "Was anything lost while it was broken?" },
  { room: "dev", by: "u4", at: "2026-08-27 12:15", body: "Nothing. They were queued and replayed into the ledger with their original timestamps." },
  { room: "product", by: "u2", at: "2026-08-25 16:30", body: "Import matched on phone but the sheet had 0-prefixed numbers. Took me a while to trust it." },
  { room: "product", by: "u4", at: "2026-08-25 16:44", body: "It compares the last ten digits now, so 0 and +91 both land on the same lead." },
  { room: "partners", by: "u1", at: "2026-08-26 08:00", body: "Northline is the one to watch this quarter. Everything else is retainer work." },
  { room: "partners", by: "u5", at: "2026-08-26 10:30", body: "Noted. I'll want the fee ledger for the audit file by mid-September." },
];
