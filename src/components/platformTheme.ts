import { createTheme, responsiveFontSizes } from "@mui/material";

export const palette = {
  ink: "#1A1F3E",
  inkSoft: "#3B4160",
  inkMute: "#6D7189",
  inkFaint: "#A0A3B6",
  cream: "#FAF7F2",
  creamDeep: "#F2EDE3",
  ivory: "#FBF9F5",
  hairline: "#E5E0D5",
  hairlineStrong: "#D3CCBB",
  accent: "#C86A4D",
  accentSoft: "rgba(200, 106, 77, 0.10)",
  accentSofter: "rgba(200, 106, 77, 0.05)",
  sage: "#6B8E5A",
  sageSoft: "rgba(107, 142, 90, 0.12)",
  brick: "#B8594D",
  brickSoft: "rgba(184, 89, 77, 0.10)",
  ochre: "#B8903A",
  ochreSoft: "rgba(184, 144, 58, 0.12)",
};

const platformTheme = responsiveFontSizes(
  createTheme({
    palette: {
      primary: { main: palette.ink, contrastText: palette.cream },
      secondary: { main: palette.accent, contrastText: palette.cream },
      success: { main: palette.sage },
      warning: { main: palette.ochre },
      error: { main: palette.brick },
      background: { default: palette.cream, paper: palette.ivory },
      text: {
        primary: palette.ink,
        secondary: palette.inkMute,
        disabled: palette.inkFaint,
      },
      divider: palette.hairline,
    },
    typography: {
      fontFamily:
        "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      h1: {
        fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
        fontVariationSettings: "'opsz' 144",
        fontWeight: 400,
        letterSpacing: "-0.02em",
        color: palette.ink,
        textShadow: "none",
      },
      h2: {
        fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
        fontVariationSettings: "'opsz' 144",
        fontWeight: 400,
        letterSpacing: "-0.015em",
        color: palette.ink,
        textShadow: "none",
      },
      h3: {
        fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
        fontVariationSettings: "'opsz' 120",
        fontWeight: 400,
        letterSpacing: "-0.015em",
        color: palette.ink,
        textShadow: "none",
      },
      h4: {
        fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
        fontVariationSettings: "'opsz' 96",
        fontWeight: 400,
        letterSpacing: "-0.01em",
        color: palette.ink,
      },
      h5: {
        fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
        fontVariationSettings: "'opsz' 72",
        fontWeight: 400,
        letterSpacing: "-0.005em",
        color: palette.ink,
      },
      h6: {
        fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
        fontVariationSettings: "'opsz' 48",
        fontWeight: 500,
        color: palette.ink,
      },
      subtitle1: { color: palette.inkSoft },
      subtitle2: { color: palette.inkMute, fontStyle: "italic" },
      body1: { fontSize: "0.95rem", lineHeight: 1.55, color: palette.ink },
      body2: { fontSize: "0.85rem", lineHeight: 1.5, color: palette.inkSoft },
      button: {
        textTransform: "none",
        fontWeight: 500,
        letterSpacing: 0,
      },
      caption: { color: palette.inkFaint },
    },
    shape: { borderRadius: 8 },
    breakpoints: {
      values: { xs: 0, sm: 830, md: 960, lg: 1280, xl: 1920 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.cream,
            color: palette.ink,
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: palette.ivory,
          },
          outlined: {
            borderColor: palette.hairline,
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0, variant: "outlined" },
        styleOverrides: {
          root: {
            backgroundColor: palette.ivory,
            border: `1px solid ${palette.hairline}`,
            borderRadius: 10,
            transition:
              "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            letterSpacing: 0,
            borderRadius: 8,
            padding: "6px 14px",
          },
          outlined: {
            borderColor: palette.hairlineStrong,
            color: palette.ink,
            "&:hover": {
              borderColor: palette.ink,
              backgroundColor: "transparent",
            },
          },
          contained: {
            backgroundColor: palette.ink,
            color: palette.cream,
            "&:hover": {
              backgroundColor: palette.accent,
            },
          },
          containedSuccess: {
            backgroundColor: palette.sage,
            color: palette.cream,
            "&:hover": { backgroundColor: "#587A48" },
          },
          containedError: {
            backgroundColor: palette.brick,
            color: palette.cream,
            "&:hover": { backgroundColor: "#9F4A3F" },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        defaultProps: { size: "small" },
        styleOverrides: {
          root: {
            fontWeight: 400,
            borderRadius: 100,
            fontSize: "0.72rem",
            letterSpacing: "0.01em",
            height: 22,
          },
          outlined: {
            borderColor: palette.hairlineStrong,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-root": {
              backgroundColor: palette.creamDeep,
              color: palette.inkMute,
              fontWeight: 500,
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              borderBottom: `1px solid ${palette.hairline}`,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${palette.hairline}`,
            fontSize: "0.88rem",
            color: palette.ink,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background 120ms ease",
            "&:last-child .MuiTableCell-root": { borderBottom: "none" },
            "&.MuiTableRow-hover:hover": {
              backgroundColor: palette.cream,
            },
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            backgroundColor: palette.ivory,
            border: `1px solid ${palette.hairline}`,
            borderRadius: 10,
            boxShadow: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.ivory,
            border: `1px solid ${palette.hairline}`,
            borderRadius: 12,
            overflow: "hidden",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: palette.accent,
              pointerEvents: "none",
              zIndex: 1,
            },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: "'Fraunces', Georgia, serif",
            fontVariationSettings: "'opsz' 96",
            fontWeight: 400,
            fontSize: "1.5rem",
            letterSpacing: "-0.01em",
            color: palette.ink,
            paddingTop: 22,
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            borderTop: `1px solid ${palette.hairline}`,
            backgroundColor: palette.cream,
            padding: "14px 24px",
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: "outlined", size: "small" },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: palette.cream,
            borderRadius: 8,
            "& fieldset": { borderColor: palette.hairlineStrong },
            "&:hover fieldset": { borderColor: palette.inkMute },
            "&.Mui-focused fieldset": { borderColor: palette.ink },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: palette.inkMute,
            "&.Mui-focused": { color: palette.ink },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: `1px solid ${palette.hairline}`,
          },
          standardInfo: {
            backgroundColor: palette.ivory,
            color: palette.ink,
            borderColor: palette.hairlineStrong,
            "& .MuiAlert-icon": { color: palette.inkMute },
          },
          standardSuccess: {
            backgroundColor: palette.sageSoft,
            color: palette.ink,
            borderColor: "rgba(107,142,90,0.35)",
            "& .MuiAlert-icon": { color: palette.sage },
          },
          standardWarning: {
            backgroundColor: palette.ochreSoft,
            color: palette.ink,
            borderColor: "rgba(184,144,58,0.35)",
            "& .MuiAlert-icon": { color: palette.ochre },
          },
          standardError: {
            backgroundColor: palette.brickSoft,
            color: palette.ink,
            borderColor: "rgba(184,89,77,0.35)",
            "& .MuiAlert-icon": { color: palette.brick },
          },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: palette.hairline } },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.ivory,
            borderRight: `1px solid ${palette.hairline}`,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: palette.ink,
            color: palette.cream,
            borderBottom: "none",
            "& .MuiTypography-root": { color: "inherit" },
            "& .MuiSvgIcon-root": { color: "inherit" },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: "1px 8px",
            paddingLeft: 14,
            paddingRight: 14,
            color: palette.inkSoft,
            transition: "background 140ms ease, color 140ms ease",
            "&:hover": {
              backgroundColor: palette.creamDeep,
              color: palette.ink,
            },
            "&.Mui-selected, &.Mui-selected:hover": {
              backgroundColor: "transparent",
              color: palette.ink,
              fontWeight: 500,
              position: "relative",
            },
            "&.Mui-selected::before": {
              content: '""',
              position: "absolute",
              left: -2,
              top: "50%",
              transform: "translateY(-50%)",
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: palette.accent,
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: { minWidth: 36, color: "inherit" },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: palette.ink,
            color: palette.cream,
            fontSize: "0.72rem",
            fontWeight: 400,
          },
          arrow: { color: palette.ink },
        },
      },
    },
  })
);

export default platformTheme;
