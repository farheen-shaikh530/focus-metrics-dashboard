import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useEffect, PropsWithChildren } from "react";

export default function RequireAuth({ children }: PropsWithChildren) {
  const { user, hydrate } = useAuth();
  const loc = useLocation();

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}