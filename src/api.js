const BASE = "/api";

function readCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCookie("ebkan_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(BASE + path, {
    credentials: "include", // send the httpOnly session cookie
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request to ${path} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const patch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });

export const api = {
  auth: {
    me: () => get("/auth/me"),
    bootstrapStatus: () => get("/auth/bootstrap-status"),
    signup: (name, email, password) => post("/auth/signup", { name, email, password }),
    login: (email, password) => post("/auth/login", { email, password }),
    logout: () => post("/auth/logout"),
    forgotPassword: (email) => post("/auth/forgot-password", { email }),
    resetPassword: (email, token, password) => post("/auth/reset-password", { email, token, password }),
    changePassword: (currentPassword, newPassword) => post("/auth/change-password", { currentPassword, newPassword }),
  },
  tenants: { list: () => get("/tenants") },
  staff: {
    list: () => get("/staff"),
    create: (d) => post("/staff", d),
    update: (id, d) => patch(`/staff/${id}`, d),
  },
  projects: { list: () => get("/projects") },
  leads: {
    list: () => get("/leads"),
    create: (f, clashId) => post("/leads", { ...f, clashId }),
    import: (rows) => post("/leads/import", { rows }),
    moveStage: (id, stage) => post(`/leads/${id}/stage`, { stage }),
    appendEvent: (id, entry) => post(`/leads/${id}/events`, entry),
  },
  tasks: {
    list: () => get("/tasks"),
    create: (d) => post("/tasks", d),
    setStatus: (id, status) => patch(`/tasks/${id}/status`, { status }),
    breakout: (parentId, d) => post(`/tasks/${parentId}/breakout`, d),
    handBack: (id) => post(`/tasks/${id}/handback`),
  },
  messages: {
    list: (room) => get(`/messages/${room}`),
    post: (room, msg) => post(`/messages/${room}`, msg),
  },
  outreach: {
    list: () => get("/outreach"),
    sentToday: () => get("/outreach/sent-today"),
    markSent: (id) => post(`/outreach/${id}/sent`),
    stop: (id) => post(`/outreach/${id}/stop`),
    reply: (id) => post(`/outreach/${id}/reply`),
    enrich: (id, contact) => post(`/outreach/${id}/enrich`, { contact }),
  },
};
