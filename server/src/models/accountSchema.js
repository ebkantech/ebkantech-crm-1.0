import mongoose from "mongoose";

const SENSITIVE_FIELDS = ["passwordHash", "resetTokenHash", "resetTokenExpires", "failedLoginAttempts", "lockUntil"];

/* Admin/Staff are two separate collections but the exact same document
 * shape — one factory keeps them from drifting apart by accident. */
export function createAccountSchema() {
  return new mongoose.Schema(
    {
      _id: { type: String },
      name: { type: String, required: true },
      role: { type: String, required: true },
      // unique: true only guarantees uniqueness within this one collection —
      // the cross-collection check lives in accounts.js (emailTaken).
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      active: { type: Boolean, default: true },
      lastLoginAt: { type: Date, default: null },
      failedLoginAttempts: { type: Number, default: 0 },
      lockUntil: { type: Date, default: null },
      resetTokenHash: { type: String, default: null },
      resetTokenExpires: { type: Date, default: null },
    },
    {
      versionKey: false,
      // Never let a password hash or a reset token leave the server, even by
      // accident — this transform runs on every res.json(accountDoc) call.
      toJSON: {
        virtuals: false,
        transform: (_doc, ret) => {
          ret.id = String(ret._id);
          delete ret._id;
          SENSITIVE_FIELDS.forEach((f) => delete ret[f]);
          return ret;
        },
      },
    }
  );
}
