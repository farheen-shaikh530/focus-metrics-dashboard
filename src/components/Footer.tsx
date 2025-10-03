import { Box, Typography, Link } from "@mui/material";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 4,
        py: 2,
        px: 2,
        bgcolor: "rgba(0,0,0,0.05)", // soft background
        textAlign: "center",
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        © {new Date().getFullYear()} Farheen Shaikh
      </Typography>

      <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
        Disclaimer:This dashboard is a personal productivity tracker built for measuring day-to-day productivity
      </Typography>

      <Box sx={{ mt: 1 }}>
        <Link
          href="https://github.com/farheen-shaikh530"
          target="_blank"
          rel="noopener"
          sx={{ mx: 1 }}
        >
          GitHub
        </Link>
        |
        <Link
          href="https://www.linkedin.com/in/farheen-shaikh0509/"
          target="_blank"
          rel="noopener"
          sx={{ mx: 1 }}
        >
          LinkedIn
        </Link>
      </Box>
    </Box>
  );
}