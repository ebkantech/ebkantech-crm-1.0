import { Router } from "express";
import Outreach from "../models/Outreach.js";
import Lead from "../models/Lead.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { nextStep } from "../constants/outreachSequence.js";
import { TODAY_DATE, TODAY_STAMP } from "../constants.js";

const router = Router();
router.use(requireAuth, requirePermission("outreach"));

router.get("/", async (_req, res) => {
  const rows = await Outreach.find().sort({ started: 1 });
  res.json(rows);
});

router.get("/sent-today", async (_req, res) => {
  const [row] = await Outreach.aggregate([
    { $unwind: "$sendLog" },
    { $match: { "sendLog.channel": "email", "sendLog.at": TODAY_DATE } },
    { $count: "n" },
  ]);
  res.json({ count: row?.n || 0 });
});

/* Marks the queue's current step sent. The step itself is recomputed here
 * from the lead's own stored progress, not taken from the request — a
 * client claiming to be further along than it really is shouldn't be able
 * to skip the sequence. */
router.post("/:id/sent", async (req, res) => {
  const lead = await Outreach.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: "Not found" });

  const step = nextStep(lead);
  if (!step) return res.status(400).json({ error: "This sequence is already finished" });

  lead.step = step.index + 1;
  lead.touched = TODAY_DATE;
  lead.sendLog.push({ step: step.key, channel: step.channel, at: TODAY_DATE });
  await lead.save();

  res.json(lead);
});

router.post("/:id/stop", async (req, res) => {
  const lead = await Outreach.findByIdAndUpdate(req.params.id, { state: "suppressed" }, { new: true });
  if (!lead) return res.status(404).json({ error: "Not found" });
  res.json(lead);
});

/* A reply ends the sequence and becomes a real lead in the pipeline */
router.post("/:id/reply", async (req, res) => {
  const outreach = await Outreach.findById(req.params.id);
  if (!outreach) return res.status(404).json({ error: "Not found" });

  outreach.state = "replied";
  await outreach.save();

  const newLead = await Lead.create({
    _id: "o2l" + Date.now().toString().slice(-6),
    name: outreach.contact || "Unnamed contact",
    company: outreach.company,
    phone: outreach.mobile || "",
    email: outreach.email,
    pan: "",
    source: "Saudi ICT campaign",
    stage: "new",
    owner: req.user.name,
    value: 0,
    lastTouch: TODAY_DATE,
    thread: [
      {
        ch: "note",
        dir: "out",
        at: TODAY_STAMP,
        body: `Replied to the ${outreach.segment} sequence at step ${outreach.step + 1}. Sequence stopped, lead opened.`,
      },
    ],
  });

  res.json({ outreach, lead: newLead });
});

/* A name is the whole game: this changes what tier the lead reads as, on the spot */
router.post("/:id/enrich", async (req, res) => {
  const contact = String(req.body.contact || "").trim();
  if (!contact) return res.status(400).json({ error: "contact is required" });
  const lead = await Outreach.findByIdAndUpdate(req.params.id, { contact }, { new: true });
  if (!lead) return res.status(404).json({ error: "Not found" });
  res.json(lead);
});

export default router;
