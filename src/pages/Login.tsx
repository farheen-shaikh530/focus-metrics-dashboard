// src/pages/Login.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Paper, Stack, TextField, Typography, Divider, Link as MuiLink,
} from "@mui/material";
import { motion, useAnimationControls } from "framer-motion";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/store/auth";

const GOLD = "#FFD54F";
const GOLD_HOVER = "#FFCC33";

export default function Login() {
  const nav = useNavigate();
  const { user, login, register, hydrate, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wrongCreds, setWrongCreds] = useState(false);
  const [loading, setLoading] = useState(false);

  const controls = useAnimationControls();

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (user) nav("/", { replace: true }); }, [user, nav]);
  useEffect(() => { controls.set({ x: 0, y: 0, rotate: 0 }); }, [controls]);

  const startFloat = () => {
    controls.start({
      x: [0, -240, 220, -180, 160, 0],
      y: [0, -140, 160, -90, 120, 0],
      rotate: [0, -4, 4, -3, 3, 0],
      transition: { duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
    });
  };
  const stopFloat = () => { controls.stop(); controls.set({ x: 0, y: 0, rotate: 0 }); };

  const resetInlineErrors = () => { if (wrongCreds) { setWrongCreds(false); stopFloat(); } if (error) setError(null); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      setError("Email and password are required.");
      setWrongCreds(true);
      startFloat();
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), pwd);
      setError(null);
      setWrongCreds(false);
    } catch (err: any) {
      setError(err?.message || "Wrong email or password.");
      setWrongCreds(true);
      startFloat();
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      setError("Email and password are required.");
      setWrongCreds(true);
      startFloat();
      return;
    }
    try {
      setLoading(true);
      await register(email.trim(), pwd);
    } catch (err: any) {
      setError(err?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
        bgcolor: "background.default",
      }}
    >
      {/* Left brand panel */}
      <Box
        sx={{
          position: "relative",
          display: { xs: "none", md: "block" },
          background: "linear-gradient(135deg, #0F1115 0%, #1B1F29 100%)",
        }}
      >
        <Box
          sx={{
            position: "absolute", inset: 0,
            background: "radial-gradient(800px 600px at 70% 30%, rgba(255,213,79,0.10), transparent 60%)",
          }}
        />
        <Box sx={{ position: "relative", p: 6, color: "#fff", height: "100%" }}>
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: 1, mb: 2 }}>
            MOMENTUM<Box component="span" sx={{ color: GOLD }}>OS</Box>
          </Typography>
          <Typography sx={{ opacity: 0.9, maxWidth: 520, lineHeight: 1.7 }}>
            Stay focused, move forward. Your tasks, shifts, and progress—elevated with clarity and rhythm.
          </Typography>

          <Box sx={{ position: "absolute", bottom: 32, left: 48 }}>
            <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Powered by
            </Typography>
            <Typography variant="body2" sx={{ color: GOLD, fontWeight: 700 }}>
              Productivity • Insights • Gemini
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right: form column */}
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          p: { xs: 2, md: 6 },
          background: "linear-gradient(180deg, rgba(255,213,79,0.08), rgba(255,213,79,0.0))",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: 380,
            p: 4,
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            Use your email/password or continue with Google.
          </Typography>

          <form onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                id="email" label="Email" type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); resetInlineErrors(); }}
                autoFocus required fullWidth
              />
              <TextField
                id="password" label="Password" type="password" value={pwd}
                onChange={(e) => { setPwd(e.target.value); resetInlineErrors(); }}
                onKeyDown={(e) => { if (e.key === "Enter") onSubmit(e as any); }}
                required fullWidth
              />

              {wrongCreds ? (
                <motion.div animate={controls} style={{ display: "grid", placeItems: "center" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{ py: 1.2, fontWeight: 700, bgcolor: GOLD, color: "#111", "&:hover": { bgcolor: GOLD_HOVER } }}
                  >
                    {loading ? "Signing in…" : "Sign in"}
                  </Button>
                </motion.div>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.2, fontWeight: 700, bgcolor: GOLD, color: "#111", "&:hover": { bgcolor: GOLD_HOVER } }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              )}

              <Button
                variant="outlined"
                fullWidth
                disabled={loading}
                onClick={onSignUp}
                sx={{ py: 1.1, fontWeight: 700, borderColor: "rgba(0,0,0,0.2)" }}
              >
                {loading ? "Creating…" : "Create account"}
              </Button>

              <Divider>or</Divider>

              <GoogleSignInButton
                onCredential={async (idToken) => {
                  setLoading(true);
                  try {
                    await loginWithGoogle(idToken);
                  } catch (e: any) {
                    setError(e?.message || "Google sign-in failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
              />

              {error && (
                <Typography
                  role="alert"
                  aria-live="assertive"
                  color="error"
                  variant="caption"
                >
                  {error}
                </Typography>
              )}
            </Stack>
          </form>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
            <MuiLink href="#" underline="hover" sx={{ fontSize: 12 }}>
              Forgot password?
            </MuiLink>
            <MuiLink href="/" underline="hover" sx={{ fontSize: 12 }}>
              Back to home
            </MuiLink>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}