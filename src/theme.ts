// src/theme.ts
import { createTheme } from "@mui/material/styles";
import { amber, grey } from "@mui/material/colors";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#FFC107", // Brand yellow
    },
    secondary: {
      main: grey[700],
    },
    background: {
      default: "#fafafa",
      paper: "#ffffff",
    },
  },

  shape: { borderRadius: 12 },

  components: {
    MuiButton: {
      defaultProps: {
        color: "primary",
        variant: "contained",
      },
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: "none",
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      defaultProps: {
        color: "primary",
        size: "small",
        variant: "filled",
      },
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: amber[500],
          },
        },
        track: {
          "&.Mui-checked": {
            backgroundColor: amber[500],
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: { fontWeight: 700, color: amber[700] },
        subheader: { color: grey[600] },
      },
    },
  },
});

// Optional: default colors for Recharts usage
export const rechartsColors = {
  bar: "#FFC107",
  line: "#FF9800",
  altBar: "#FFD54F",
};