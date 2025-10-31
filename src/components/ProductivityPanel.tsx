// src/pages/Productivity.tsx
import { Box, Typography } from "@mui/material";
import ProductivityPanel from "@/components/ProductivityPanel";

export default function ProductivityPage() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
        Productivity
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
        Quick weekly KPIs and an AI generated retrospective.
      </Typography>

      <ProductivityPanel />
    </Box>
  );
}