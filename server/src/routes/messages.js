import { Router } from "express";
import Message from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
router.use(requireAuth);

const inRoom = (user, room) => !!ROLES[user.role]?.rooms.includes(room);

router.get("/:room", async (req, res) => {
  if (!inRoom(req.user, req.params.room)) return res.status(403).json({ error: "You're not in this room" });
  const messages = await Message.find({ room: req.params.room }).sort({ at: 1 });
  res.json(messages);
});

router.post("/:room", async (req, res) => {
  if (!inRoom(req.user, req.params.room)) return res.status(403).json({ error: "You're not in this room" });
  const { body, lead } = req.body;
  if (!body) return res.status(400).json({ error: "body is required" });
  const message = await Message.create({ room: req.params.room, by: req.user.id, at: new Date().toISOString().slice(0, 16).replace("T", " "), body, lead: lead || null });
  res.status(201).json(message);
});

export default router;
