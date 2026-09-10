// Mirrors PERMS/ROLES in src/ebkanCrm.jsx. The frontend hides UI by these
// same rules, but that's a convenience, not the boundary — every route in
// this API re-checks against this table itself, since a client can always
// be bypassed (devtools, curl, a modified request).
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
  import: "Bring in lists",
  rules: "Change sources and rules",
};

export const ROLES = {
  partner: {
    label: "Partner",
    perms: ["leads.view", "leads.edit", "client.message", "fees.view", "projects.view.own", "projects.view.all", "team.view", "team.manage", "tasks.assign", "import", "rules"],
    rooms: ["sales", "dev", "partners", "product"],
  },
  sales: {
    label: "Sales lead",
    perms: ["leads.view", "leads.edit", "client.message", "fees.view", "projects.view.own", "import"],
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

export const can = (user, perm) => !!ROLES[user?.role]?.perms.includes(perm);
