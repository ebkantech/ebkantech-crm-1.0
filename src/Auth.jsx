import { useEffect, useState } from "react";
import { ShieldCheck, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "./api";
import { C, F, FONTS } from "./theme";
import { AuthContext, useAuth } from "./authContext";

/* ------------------------------------------------------------------ *
 *  Session: who is signed in, backed by the httpOnly cookie the API
 *  sets on login. The cookie itself is never touched from here — this
 *  just asks the server who it belongs to.
 * ------------------------------------------------------------------ */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([
      api.auth.me().catch(() => null),
      // Only matters for a brand-new install with zero accounts — if this
      // call fails for any reason, default to "closed", the safe side.
      api.auth.bootstrapStatus().catch(() => ({ needsSetup: false })),
    ]).then(([u, status]) => {
      setUser(u);
      setNeedsSetup(!!status.needsSetup);
      setChecking(false);
    });
  }, []);

  const login = async (email, password) => {
    const u = await api.auth.login(email, password);
    setUser(u);
    return u;
  };

  const signup = async (name, email, password) => {
    const u = await api.auth.signup(name, email, password);
    setUser(u);
    setNeedsSetup(false);
    return u;
  };

  const logout = async () => {
    await api.auth.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, checking, needsSetup, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ *
 *  Shared shell: a branding panel + a form card. Same tokens as the
 *  rest of the app so the sign-in flow doesn't feel bolted on.
 * ------------------------------------------------------------------ */
function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row" style={{ backgroundColor: C.paper }}>
      <style>{FONTS}</style>

      <div className="flex shrink-0 flex-col justify-between px-6 py-8 sm:px-10 md:w-[38%] md:py-12" style={{ backgroundColor: C.ink }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} style={{ color: C.carbon }} />
          <span className="text-sm" style={{ fontFamily: F.display, fontWeight: 600, color: C.paper }}>
            Day Book
          </span>
        </div>

        <div className="mt-8 md:mt-0">
          <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.18em", color: C.carbon }}>
            Rao &amp; Kulkarni LLP
          </p>
          <h1 className="mt-3 max-w-sm text-2xl leading-snug sm:text-3xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.paper }}>
            One ledger for leads, projects and the people carrying them.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ fontFamily: F.body, color: "#B9B7D6" }}>
            Every account only sees what its role is meant to see — sales sees the pipeline, developers see their
            projects, and only a partner sees it all.
          </p>
        </div>

        <p className="hidden text-xs md:block" style={{ fontFamily: F.mono, color: "#7A78A0" }}>
          © {new Date().getFullYear()} Rao &amp; Kulkarni LLP
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <p className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.14em", color: C.carbon }}>
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl" style={{ fontFamily: F.display, fontWeight: 600, color: C.ink }}>
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1.5 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
              {subtitle}
            </p>
          )}

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>
        {label}
      </span>
      <input
        {...props}
        className="mt-1.5 w-full bg-transparent py-2 text-sm outline-none"
        style={{ fontFamily: F.body, color: C.ink, borderBottom: `1px solid ${C.rule}` }}
      />
    </label>
  );
}

function PasswordField({ label, value, onChange, autoComplete, hint }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="text-xs uppercase" style={{ fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em", color: C.inkSoft }}>
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.rule}` }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full flex-1 bg-transparent py-2 text-sm outline-none"
          style={{ fontFamily: F.body, color: C.ink }}
        />
        <button type="button" onClick={() => setShow((v) => !v)} className="shrink-0 pb-0.5" style={{ color: C.inkSoft }} tabIndex={-1}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && (
        <span className="mt-1 block text-xs" style={{ fontFamily: F.body, color: C.inkSoft }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div className="mt-4 flex items-start gap-2 p-3" style={{ border: `1px solid ${C.carbon}` }}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: C.carbon }} />
      <p className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>
        {children}
      </p>
    </div>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-6 w-full px-4 py-2.5 text-xs uppercase"
      style={{
        backgroundColor: C.ink,
        color: C.paper,
        fontFamily: F.body,
        fontWeight: 600,
        letterSpacing: "0.1em",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export function LoginPage({ navigate }) {
  const { login, needsSetup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Sign in with the account your partner set up for you."
      footer={
        <div className="space-y-3">
          <p className="text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
            Forgot your password?{" "}
            <button type="button" onClick={() => navigate("/forgot-password")} style={{ color: C.stamp, fontWeight: 600 }}>
              Reset it
            </button>
          </p>
          {needsSetup && (
            <p className="text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
              First time here?{" "}
              <button type="button" onClick={() => navigate("/signup")} style={{ color: C.stamp, fontWeight: 600 }}>
                Set up the first admin account
              </button>
            </p>
          )}
        </div>
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="space-y-5">
          <Field
            label="Email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage({ navigate }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter the email on your account and we'll send a reset link."
      footer={
        <button type="button" onClick={() => navigate("/login")} className="flex items-center gap-1.5 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
          <ArrowLeft size={14} /> Back to sign in
        </button>
      }
    >
      {sent ? (
        <div className="flex items-start gap-2 p-3" style={{ border: `1px solid ${C.green}` }}>
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: C.green }} />
          <p className="text-sm" style={{ fontFamily: F.body, color: C.ink }}>
            If that email has an account, a reset link is on its way. It's valid for 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field label="Email" type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErrorNote>{error}</ErrorNote>
          <SubmitButton busy={busy}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

const passwordHint = "At least 10 characters, with a letter and a number.";
const passwordLooksValid = (pw) => pw.length >= 10 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);

export function SignupPage({ navigate }) {
  const { signup, needsSetup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!needsSetup) {
    return (
      <AuthShell
        eyebrow="Sign up"
        title="Signup is closed"
        subtitle="This firm already has accounts set up. Ask a partner there for an invite instead."
      >
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="px-4 py-2.5 text-xs uppercase"
          style={{ backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
        >
          Back to sign in
        </button>
      </AuthShell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required.");
    if (!passwordLooksValid(password)) return setError(passwordHint);
    if (password !== confirm) return setError("Passwords don't match.");

    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="First-time setup"
      title="Create the first admin account"
      subtitle="This firm has no accounts yet. The account you create here becomes a partner, with full access — every other account is invited from inside the app afterwards."
      footer={
        <button type="button" onClick={() => navigate("/login")} className="flex items-center gap-1.5 text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>
          <ArrowLeft size={14} /> Back to sign in
        </button>
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="space-y-5">
          <Field label="Name" required autoFocus autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordField label="Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint={passwordHint} />
          <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <SubmitButton busy={busy}>Create admin account</SubmitButton>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage({ navigate, token, email: emailFromLink }) {
  const { setUser } = useAuth();
  const [email, setEmail] = useState(emailFromLink || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!passwordLooksValid(password)) return setError(passwordHint);
    if (password !== confirm) return setError("Passwords don't match.");

    setBusy(true);
    try {
      const user = await api.auth.resetPassword(email.trim(), token, password);
      setUser(user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell eyebrow="Reset password" title="This link is incomplete" subtitle="Use the link from your email, or request a new one.">
        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          className="mt-2 px-4 py-2.5 text-xs uppercase"
          style={{ backgroundColor: C.ink, color: C.paper, fontFamily: F.body, fontWeight: 600, letterSpacing: "0.1em" }}
        >
          Request a new link
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Reset password" title="Set a new password" subtitle="Choose something you haven't used here before.">
      <form onSubmit={submit} noValidate>
        <div className="space-y-5">
          <Field label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordField label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint={passwordHint} />
          <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <SubmitButton busy={busy}>Set password &amp; sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
