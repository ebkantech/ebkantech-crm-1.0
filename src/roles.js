import { createContext, useContext } from "react";

/* ------------------------------------------------------------------ *
 *  Who may do what. Permission is a vocabulary the roles draw from,
 *  not a switch buried in code — so an admin can read this table and
 *  understand exactly what a developer can see.
 *
 *  Mirrored on the server (server/src/constants/roles.js), which is the
 *  actual boundary — this copy only drives what the UI shows.
 * ------------------------------------------------------------------ */
export const PERMS = {
  "leads.view": "See leads",
  "leads.edit": "Move leads and edit them",
  "client.message": "Write to clients",
  "fees.view": "See fee figures",
  "projects.view.own": "See projects they are on",
  "projects.view.all": "See every project",
  "team.view": "See who is staffed where",
  "team.manage": "Add staff accounts and set their role",
  "tasks.assign": "Open work and hand it to a lead",
  "import": "Bring in lists",
  "rules": "Change sources and rules",
  "outreach": "Work the outreach queue",
};

// Super Admin and Admin are two labels over one identical permission set —
// two tiers of the same authority, not two different capability sets.
const FULL_ACCESS = [
  "leads.view", "leads.edit", "client.message", "fees.view",
  "projects.view.own", "projects.view.all", "team.view", "team.manage",
  "tasks.assign", "import", "rules", "outreach",
];
const FULL_ROOMS = ["sales", "dev", "partners", "product"];

export const ROLES = {
  superadmin: { label: "Super Admin", perms: FULL_ACCESS, rooms: FULL_ROOMS },
  admin: { label: "Admin", perms: FULL_ACCESS, rooms: FULL_ROOMS },
  sales: {
    label: "Sales lead",
    perms: ["leads.view", "leads.edit", "client.message", "fees.view", "projects.view.own", "import", "outreach"],
    rooms: ["sales", "product"],
  },
  associate: {
    label: "Associate",
    perms: ["leads.view", "leads.edit", "client.message", "projects.view.own"],
    rooms: ["sales", "product"],
  },
  developer: {
    label: "Developer",
    perms: ["leads.view", "projects.view.own"],
    rooms: ["dev", "product"],
  },
  designer: {
    label: "Designer",
    perms: ["projects.view.own"],
    rooms: ["dev", "product"],
  },
  auditor: {
    label: "Auditor, read only",
    perms: ["leads.view", "fees.view", "projects.view.all"],
    rooms: ["partners"],
  },
};

export const Session = createContext({ id: "u1", name: "", role: "admin" });
export const useMe = () => useContext(Session);
export const can = (me, p) => ROLES[me.role].perms.includes(p);
