// src/components/TipsDialog.tsx
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Divider, Button, Stack, Chip
} from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";

// 🎨 Match header color (MomentumOS gold)
const HEADER_GOLD = "#B1973B";      
const HEADER_GOLD_DARK = "#8A752C"; 
const HEADER_GOLD_FADE = "rgba(177, 151, 59, 0.15)";

export default function TipsDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: HEADER_GOLD,
          color: "#fff",
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.25)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <LightbulbIcon fontSize="small" />
        </Box>

        <Typography
          variant="h6"
          sx={{ fontWeight: 800, letterSpacing: 0.4 }}
        >
          Fresh Start Tips
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Chip
          label="Zero Week"
          size="small"
          sx={{
            bgcolor: "rgba(255,255,255,0.25)",
            color: "#fff",
            fontWeight: 700,
          }}
        />
      </Box>

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ mb: 2, color: "text.secondary" }}>
          Looks like this week has a clean slate—no tracked tasks yet. Perfect
          moment to reset and kick things off fresh.
        </Typography>

        <Divider sx={{ my: 1.5, borderColor: HEADER_GOLD_FADE }} />

        <Stack component="ul" sx={{ pl: 2, m: 0, gap: 1.25 }}>
          <Typography component="li">
            <strong>Pick your top 3 priorities</strong> for the week. Even tiny ones count.
          </Typography>
          <Typography component="li">
            <strong>Break one bigger goal into the very first step.</strong> Do just that step.
          </Typography>
          <Typography component="li">
            <strong>Choose a simple tracking method</strong> (this board, a note, anything easy).
          </Typography>
        </Stack>

        <Typography
          sx={{
            mt: 2.5,
            fontStyle: "italic",
            color: HEADER_GOLD_DARK,
          }}
        >
          Tip: set a 25-minute timer and mark one task <strong>In Progress</strong>.
        </Typography>
      </DialogContent>

      {/* Footer buttons */}
      <DialogActions sx={{ px: 2.5, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{ color: HEADER_GOLD, fontWeight: 700 }}
        >
          CLOSE
        </Button>

        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            bgcolor: HEADER_GOLD,
            color: "#fff",
            fontWeight: 700,
            "&:hover": { bgcolor: HEADER_GOLD_DARK },
          }}
        >
          LET’S START
        </Button>
      </DialogActions>
    </Dialog>
  );
}