import { Box, Typography } from "@mui/material";

export default function HeroVideo({ targetId }: { targetId?: string }) {
  return (
    <Box
      id={targetId}
      sx={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        scrollSnapAlign: "start",
      }}
    >
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      >
        <source src="/videos/ProductivityTracker.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay text */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: "rgba(0,0,0,0.4)", // darker overlay
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#F5DEB3", // creamy coffee beige
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Alfa Slab One', cursive",
            fontSize: { xs: "2.5rem", md: "4rem" },
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          Lazy Coffee
        </Typography>

        <Typography
          sx={{
            fontFamily: "'Alfa Slab One', cursive",
            fontSize: { xs: "1rem", md: "1.5rem" },
            textTransform: "uppercase",
            mt: 1,
            opacity: 0.85,
          }}
        >
          Productivity Dashboard
        </Typography>
      </Box>
    </Box>
  );
}