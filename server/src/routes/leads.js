import { Router } from "express";
import Lead from "../models/Lead.js";
import { STAGE_LABELS, TODAY_DATE, TODAY_STAMP } from "../constants.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { can } from "../constants/roles.js";

const router = Router();
router.use(requireAuth);

const newLeadId = () => "l" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);

const stripFees = (leads, user) => {
  if (can(user, "fees.view")) return leads.map((l) => l.toJSON());
  return leads.map((l) => {
    const json = l.toJSON();
    delete json.value;
    return json;
  });
};

router.get("/", requirePermission("leads.view"), async (req, res) => {
  const leads = await Lead.find().sort({ lastTouch: -1 });
  res.json(stripFees(leads, req.user));
});

/* create a lead, or fold the details into an existing one if clashId is given */
router.post("/", requirePermission("leads.edit"), async (req, res) => {
  const { name, company, phone, email, pan, source, owner, value, clashId } = req.body;

  if (clashId) {
    const lead = await Lead.findById(clashId);
    if (!lead) return res.status(404).json({ error: "Clash lead not found" });
    lead.thread.push({
      ch: "note",
      dir: "out",
      at: TODAY_STAMP,
      body: `Captured again from ${source} — details matched this lead, so it was folded in.`,
    });
    lead.lastTouch = TODAY_DATE;
    await lead.save();
    return res.json(stripFees([lead], req.user)[0]);
  }

  const lead = await Lead.create({
    _id: newLeadId(),
    name: name || "Unnamed contact",
    company: company || name || "Unnamed firm",
    phone,
    email,
    pan: (pan || "").toUpperCase(),
    source,
    stage: "new",
    owner,
    value: Number(value) || 0,
    lastTouch: TODAY_DATE,
    thread: [{ ch: "note", dir: "out", at: TODAY_STAMP, body: `Captured from ${source}.` }],
  });
  res.status(201).json(stripFees([lead], req.user)[0]);
});

/* bulk import: rows already carry a dupeId resolved client-side against the loaded lead list */
router.post("/import", requirePermission("import"), async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

  for (let i = 0; i < rows.length; i++) {
    const { rec, dupeId } = rows[i];
    if (dupeId) {
      const lead = await Lead.findById(dupeId);
      if (lead) {
        lead.thread.push({ ch: "note", dir: "out", at: TODAY_STAMP, body: "Appeared in an imported list — merged, nothing overwritten." });
        lead.lastTouch = TODAY_DATE;
        await lead.save();
      }
    } else {
      await Lead.create({
        _id: "imp" + i + Date.now().toString().slice(-6),
        name: rec.name || "Unnamed contact",
        company: rec.company || rec.name || "Unnamed firm",
        phone: rec.phone || "",
        email: rec.email || "",
        pan: (rec.pan || "").toUpperCase(),
        source: "Import",
        stage: "new",
        owner: "Unassigned",
        value: Number(rec.value) || 0,
        lastTouch: TODAY_DATE,
        thread: [{ ch: "note", dir: "out", at: TODAY_STAMP, body: "Came in through an imported list." }],
      });
    }
  }

  const leads = await Lead.find().sort({ lastTouch: -1 });
  res.json(stripFees(leads, req.user));
});

router.post("/:id/stage", requirePermission("leads.edit"), async (req, res) => {
  const { stage } = req.body;
  if (!STAGE_LABELS[stage]) return res.status(400).json({ error: "Unknown stage" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  lead.stage = stage;
  lead.lastTouch = TODAY_DATE;
  lead.thread.push({ ch: "note", dir: "out", at: TODAY_STAMP, body: `Moved to ${STAGE_LABELS[stage]}.` });
  await lead.save();
  res.json(stripFees([lead], req.user)[0]);
});

// Logging an internal note only needs leads.view (already required to see
// the lead at all); reaching out over whatsapp/email/call needs client.message.
router.post("/:id/events", requirePermission("leads.view"), async (req, res) => {
  const { ch, dir, at, body } = req.body;
  if (!ch || !dir || !at || !body) return res.status(400).json({ error: "ch, dir, at and body are required" });
  if (ch !== "note" && !can(req.user, "client.message")) {
    return res.status(403).json({ error: "You don't have permission to do that" });
  }
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  lead.thread.push({ ch, dir, at, body });
  lead.lastTouch = TODAY_DATE;
  await lead.save();
  res.json(stripFees([lead], req.user)[0]);
});

export default router;
