import { Router } from "express";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const newTaskId = () => "t" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

const leadOfProject = async (projectId) => {
  const project = await Project.findById(projectId);
  return project?.team.find((m) => m.part === "Team lead")?.id;
};

// Tasks span a whole delegation chain (a lead's task rolls up from its
// children, which usually belong to teammates) so, unlike leads/projects,
// the read side isn't filtered per role — only who can mutate a task is.
router.get("/", async (_req, res) => {
  const tasks = await Task.find().sort({ _id: 1 });
  res.json(tasks);
});

/* open a top-level task on a project; it always lands with that project's team lead */
router.post("/", requirePermission("tasks.assign"), async (req, res) => {
  const { project, title, due } = req.body;
  if (!project || !title || !due) return res.status(400).json({ error: "project, title and due are required" });
  const to = await leadOfProject(project);
  if (!to) return res.status(400).json({ error: "That project has no team lead to hand it to" });
  const task = await Task.create({ _id: newTaskId(), project, parent: null, title, by: req.user.id, to, due, status: "todo" });
  res.status(201).json(task);
});

router.patch("/:id/status", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.to !== req.user.id) return res.status(403).json({ error: "Only the person holding this task can change its status" });
  task.status = req.body.status;
  await task.save();
  res.json(task);
});

/* split a task into a child handed to someone else; the parent stays owned by whoever holds it */
router.post("/:id/breakout", async (req, res) => {
  const { title, to, due } = req.body;
  if (!title || !to || !due) return res.status(400).json({ error: "title, to and due are required" });

  const parent = await Task.findById(req.params.id);
  if (!parent) return res.status(404).json({ error: "Parent task not found" });
  if (parent.to !== req.user.id) return res.status(403).json({ error: "Only the person holding this task can break it up" });

  const hasKids = await Task.exists({ parent: parent.id });
  if (hasKids) return res.status(400).json({ error: "This task is already broken into pieces" });

  const project = await Project.findById(parent.project);
  if (!project?.team.some((m) => m.id === to)) {
    return res.status(400).json({ error: "That person isn't on this project's team" });
  }

  const task = await Task.create({
    _id: newTaskId(),
    project: parent.project,
    parent: parent.id,
    title,
    by: req.user.id,
    to,
    due,
    status: "todo",
  });
  res.status(201).json(task);
});

/* hand a task back up to the project's team lead, blocked, with a reason */
router.post("/:id/handback", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.to !== req.user.id) return res.status(403).json({ error: "Only the person holding this task can hand it back" });

  const lead = (await leadOfProject(task.project)) || task.by;
  task.to = lead;
  task.status = "blocked";
  task.why = `Handed back by ${req.user.name}`;
  await task.save();
  res.json(task);
});

export default router;
