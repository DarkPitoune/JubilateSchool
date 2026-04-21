import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { palette } from "../platformTheme";

interface PageTitleProps {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}

const PageTitle = ({ kicker, title, subtitle }: PageTitleProps) => (
  <Box sx={{ mb: { xs: 3, sm: 4 }, maxWidth: 1100 }}>
    {kicker && (
      <Box
        sx={{
          fontSize: "0.78rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: palette.accent,
          fontWeight: 500,
          mb: 1,
        }}
      >
        {kicker}
      </Box>
    )}
    <Box sx={{ position: "relative", display: "inline-block" }}>
      <Typography
        variant="h3"
        sx={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontVariationSettings: "'opsz' 144",
          fontWeight: 400,
          fontSize: { xs: "2.2rem", sm: "2.7rem" },
          lineHeight: 1.05,
          letterSpacing: "-0.015em",
          color: palette.ink,
          m: 0,
          pr: 1,
        }}
      >
        {title}
      </Typography>
      <Box
        component="svg"
        viewBox="0 0 260 10"
        preserveAspectRatio="none"
        aria-hidden="true"
        sx={{
          position: "absolute",
          left: 0,
          bottom: -8,
          width: "64%",
          height: 10,
          pointerEvents: "none",
        }}
      >
        <path
          d="M2 6 Q 60 2, 130 5 T 258 4"
          fill="none"
          stroke={palette.accent}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
      </Box>
    </Box>
    {subtitle && (
      <Typography
        sx={{
          mt: 1.5,
          color: palette.inkMute,
          fontSize: "0.95rem",
          maxWidth: 640,
        }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

export default PageTitle;
