// src/components/LoginDialog.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { motion, useAnimationControls } from "framer-motion";
import { useAuth } from "../store/auth";

export default function LoginDialog({ open }: { open: boolean }) {
  const { user, login, register, hydrate } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wrongCreds, setWrongCreds] = useState(false);

  const controls = useAnimationControls();

  useEffect(() => { hydrate(); }, [hydrate]);

  // floating animation for wrong password
  const startFloat = () => {
    controls.start({
      x: [0, -200, 200, -150, 150, 0],
      y: [0, -100, 150, -80, 120, 0],
      rotate: [0, -4, 4, -3, 3, 0],
      transition: { duration: 1.2, repeat: Infinity, repeatType: "mirror" },
    });
  };
  const stopFloat = () => {
    controls.stop();
    controls.set({ x: 0, y: 0, rotate: 0 });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      setError("Email and password required");
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

  return (
    <Dialog open={open} fullWidth maxWidth="xs">
      <DialogTitle>Welcome</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          First time? <b>Sign up</b>. Returning? <b>Sign in</b>.
        </Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              value={pwd}
              type="password"
              onChange={(e) => setPwd(e.target.value)}
              required
            />

            {wrongCreds ? (
              <motion.div animate={controls}>
                <Button type="submit" variant="contained" fullWidth>
                  Sign in
                </Button>
              </motion.div>
            ) : (
              <Button type="submit" variant="contained" fullWidth>
                Sign in
              </Button>
            )}

            <Button
              variant="outlined"
              fullWidth
              onClick={() => register(email.trim(), pwd)}
            >
              Sign up
            </Button>

            {error && (
              <Typography color="error" variant="caption">
                {error}
              </Typography>
            )}
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}