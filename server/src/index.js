import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import tenantsRouter from "./routes/tenants.js";
import staffRouter from "./routes/staff.js";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import leadsRouter from "./routes/leads.js";
import messagesRouter from "./routes/messages.js";

const app = express();

// Behind a reverse proxy in production, needed for req.ip / rate-limit / secure cookies to work correctly
app.set("trust proxy", 1);

app.use(helmet());

const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: ORIGIN, credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $/. operators from user input — closes NoSQL injection via req.body/query/params

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/staff", staffRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/messages", messagesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
