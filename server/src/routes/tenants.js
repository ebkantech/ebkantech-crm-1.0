import { Router } from "express";
import Tenant from "../models/Tenant.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const tenants = await Tenant.find().sort({ _id: 1 });
  res.json(tenants);
});

export default router;
