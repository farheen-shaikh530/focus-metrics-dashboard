// src/components/AppLayout.tsx
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { useAuth } from "../store/auth";
import LoginDialog from "./LoginDialog";

export default function AppLayout({ mode, setMode }: { mode:"light"|"dark"; setMode:(m:"light"|"dark")=>void }) {
  const { user } = useAuth();
  return (
    <>
      <Header mode={mode} setMode={setMode} />
      {/* login overlay */}
      <LoginDialog open={!user} />
      <Outlet />
      <Footer />
    </>
  );
}