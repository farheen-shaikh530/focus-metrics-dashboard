import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2C3E50",
    },
    secondary: {
      main: "#1ABC9C",
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#212529",
      secondary: "#6C757D",
    },
    error: {
      main: "#E74C3C",
    },
    success: {
      main: "#27AE60",
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: "1rem" },
    body2: { color: "#6C757D" },
  },
  shape: { borderRadius: 10 },
});