import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Paper, Stack, TextField, Typography, Divider
} from "@mui/material";
import { motion, useAnimationControls } from "framer-motion";

import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/store/auth";

import Footer from "@/components/Footer";

export default function Login() {
  const nav = useNavigate();
  const { user, login, register, hydrate, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wrongCreds, setWrongCreds] = useState(false);

  const controls = useAnimationControls();

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (user) nav("/", { replace: true }); }, [user, nav]);
  useEffect(() => { controls.set({ x: 0, y: 0, rotate: 0 }); }, [controls]);

  const startFloat = () => {
    controls.start({
      x: [0, -240, 220, -180, 160, 0],
      y: [0, -140, 160,  -90, 120, 0],
      rotate: [0, -4, 4, -3, 3, 0],
      transition: { duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
    });
  };
  const stopFloat = () => { controls.stop(); controls.set({ x: 0, y: 0, rotate: 0 }); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      setError("Email and password are required");
      setWrongCreds(true);
      startFloat();
      return;
    }
    try {
      await login(email.trim(), pwd);
      setError(null);
      setWrongCreds(false);
      stopFloat();
    } catch {
      setError("Wrong email or password");
      setWrongCreds(true);
      startFloat();
    }
  };

  const onSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      setError("Email and password are required");
      setWrongCreds(true);
      startFloat();
      return;
    }
    await register(email.trim(), pwd);
  };

  const onEmailChange = (v: string) => { setEmail(v); if (wrongCreds) { setWrongCreds(false); stopFloat(); } if (error) setError(null); };
  const onPwdChange   = (v: string) => { setPwd(v);   if (wrongCreds) { setWrongCreds(false); stopFloat(); } if (error) setError(null); };
  const onPasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); void onSubmit(e as any); } };

  return (
    <Box sx={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Background video */}
      <video autoPlay muted loop playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -2 }}>
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>
      {/* Overlay */}
      <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.45)", zIndex: -1 }} />

      {/* Login card */}
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
        <Paper sx={{
          p: 4, width: 360, bgcolor: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
        }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Welcome</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
            First time? <b>Sign up</b>. Returning? <b>Sign in</b>.
          </Typography>

          <form onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                id="email" label="Email" type="email" value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                autoFocus required
                error={!!error && !email.trim()}
                helperText={!!error && !email.trim() ? error : ""}
              />
              <TextField
                id="password" label="Password" type="password" value={pwd}
                onChange={(e) => onPwdChange(e.target.value)}
                onKeyDown={onPasswordKey} required
                error={!!error && !!email.trim() && !pwd.trim()}
                helperText={!!error && !!email.trim() && !pwd.trim() ? error : ""}
              />

              {wrongCreds ? (
                <motion.div
                  animate={controls}
                  style={{
                    position: "fixed", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1000, pointerEvents: "auto"
                  }}
                >
                  <Button type="submit" variant="contained" size="large">Sign in</Button>
                </motion.div>
              ) : (
                <Button type="submit" variant="contained" size="large" fullWidth>Sign in</Button>
              )}

              <Button variant="outlined" size="large" fullWidth onClick={onSignUp}>
                Sign up
              </Button>

              <Divider>or</Divider>

<GoogleSignInButton
  onCredential={async (idToken) => {
    // sends idToken to FastAPI /auth/google; store user with {name,email,picture}
    await loginWithGoogle(idToken);
  }}
/>


              {error && !!email.trim() && !!pwd.trim() && (
                <Typography role="alert" color="error" variant="caption">
                  {error}
                </Typography>
              )}
            </Stack>
          </form>
        </Paper>

        <Box sx={{ mt: 10 }}>
          <Footer />
        </Box>
      </Box>
    </Box>
  );
}