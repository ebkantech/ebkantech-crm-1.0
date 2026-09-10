import { createContext, useContext } from "react";

// Split out from Auth.jsx so that file can export only components
// (keeps Fast Refresh happy) while this one exports only the hook/context.
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
