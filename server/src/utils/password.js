import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

/* At least 10 characters with a letter and a number — enough to keep the
 * obvious weak passwords out without making a demo user's life miserable. */
export function passwordPolicyError(pw) {
  if (typeof pw !== "string" || pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must include a letter and a number.";
  return null;
}
