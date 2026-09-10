import { useEffect, useState } from "react";
import SalesCRM from "./ebkanCrm";
import { AuthProvider, LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage } from "./Auth";
import { useAuth } from "./authContext";
import { C, F, FONTS } from "./theme";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

/* A hand-rolled path router — the app only ever needs these few real
 * URLs (login/forgot/reset); everything else is a "view" inside SalesCRM. */
function usePath() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to) => {
    if (to !== window.location.pathname) window.history.pushState({}, "", to);
    setPath(to);
  };

  return [path, navigate];
}

function Gate() {
  const { user, checking, logout } = useAuth();
  const [path, navigate] = usePath();

  // Keep the URL and the session in sync: signed-out visitors only ever
  // see the auth pages, signed-in ones get bounced off them into the app.
  useEffect(() => {
    if (checking) return;
    if (user && AUTH_PAGES.includes(path)) navigate("/");
    if (!user && !AUTH_PAGES.includes(path)) navigate("/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, user, path]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: C.paper }}>
        <style>{FONTS}</style>
        <p className="text-sm" style={{ fontFamily: F.body, color: C.inkSoft }}>Loading…</p>
      </div>
    );
  }

  if (path === "/login") return <LoginPage navigate={navigate} />;
  if (path === "/signup") return <SignupPage navigate={navigate} />;
  if (path === "/forgot-password") return <ForgotPasswordPage navigate={navigate} />;
  if (path === "/reset-password") {
    const params = new URLSearchParams(window.location.search);
    return <ResetPasswordPage navigate={navigate} token={params.get("token") || ""} email={params.get("email") || ""} />;
  }

  if (!user) return null; // the redirect effect above is sending us to /login

  return <SalesCRM me={user} onLogout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
