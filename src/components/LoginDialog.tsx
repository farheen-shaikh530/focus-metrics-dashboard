// src/components/LoginDialog.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { motion, useAnimationControls } from "framer-motion";
import { useAuth } from "@/store/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";

type Props = {
  open: boolean;
  onClose?: () => void;
};

export default function LoginDialog({ open, onClose }: Props) {
  const { user, login, register, hydrate, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongCreds, setWrongCreds] = useState(false);

  const controls = useAnimationControls();

  // hydrate auth store on mount
  useEffect(() => { hydrate(); }, [hydrate]);

  // if the user logs in successfully, close the dialog
  useEffect(() => {
    if (user && open && onClose) onClose();
  }, [user, open, onClose]);

  // playful float for wrong creds
  const startFloat = () => {
    controls.start({
      x: [0, -200, 200, -150, 150, 0],
      y: [0, -100, 150, -80, 120, 0],
      rotate: [0, -4, 4, -3, 3, 0],
      transition: { duration: 1.1, repeat: Infinity, repeatType: "mirror" },
    });
  };
  const stopFloat = () => { controls.stop(); controls.set({ x: 0, y: 0, rotate: 0 }); };

  const resetErrors = () => { setError(null); setWrongCreds(false); stopFloat(); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      setError("Email and password are required.");
      setWrongCreds(true);
      startFloat();
      return;
    }
    try {
      setSubmitting(true);
      await login(email.trim(), pwd);
      resetErrors();
    } catch {
      setError("Wrong email or password.");
      setWrongCreds(true);
      startFloat();
    } finally {
      setSubmitting(false);
    }
  };

  const onSignUp = async () => {
    if (!email.trim() || !pwd.trim()) {
      setError("Email and password are required.");
      setWrongCreds(true);
      startFloat();
      return;
    }
    try {
      setSubmitting(true);
      await register(email.trim(), pwd);
      resetErrors();
    } catch (e: any) {
      setError(String(e?.message || "Could not create account."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void onSubmit(ev as any);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="login-title"
    >
      <DialogTitle
        id="login-title"
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}
      >
        <Typography variant="h6" fontWeight={800}>Welcome</Typography>
        {onClose && (
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5, pb: 3 }}>
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          First time? <b>Sign up</b>. Returning? <b>Sign in</b>.
        </Typography>

        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              autoFocus
              label="Email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); resetErrors(); }}
              onKeyDown={handleKeyDown}
              fullWidth
              required
            />

            <TextField
              label="Password"
              type={showPwd ? "text" : "password"}
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); resetErrors(); }}
              onKeyDown={handleKeyDown}
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      onClick={() => setShowPwd((v) => !v)}
                      edge="end"
                    >
                      {showPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {wrongCreds ? (
              <motion.div animate={controls}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </motion.div>
            ) : (
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            )}

            <Button
              variant="outlined"
              fullWidth
              onClick={onSignUp}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Sign up"}
            </Button>

            {/* Divider-ish text */}
            <Typography variant="caption" sx={{ textAlign: "center", color: "text.secondary" }}>
              or continue with
            </Typography>

            {/* Google Sign-In */}
            <Box sx={{ display: "grid", placeItems: "center" }}>
              <GoogleSignInButton
                onCredential={async (idToken) => {
                  try {
                    setSubmitting(true);
                    await loginWithGoogle(idToken);
                    resetErrors();
                  } catch (e: any) {
                    setError(String(e?.message || "Google sign-in failed."));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            </Box>

            {error && (
              <Typography role="alert" color="error" variant="caption">
                {error}
              </Typography>
            )}
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}