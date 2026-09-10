import { Router } from "express";
import Project from "../models/Project.js";
import { requireAuth } from "../middleware/auth.js";
import { can } from "../constants/roles.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  let projects = await Project.find().sort({ _id: 1 });

  if (!can(req.user, "projects.view.all")) {
    projects = projects.filter((p) => p.team.some((m) => m.id === req.user.id));
  }

  const seeFees = can(req.user, "fees.view");
  res.json(
    projects.map((p) => {
      const json = p.toJSON();
      if (!seeFees) delete json.fee;
      return json;
    })
  );
});

export default router;
