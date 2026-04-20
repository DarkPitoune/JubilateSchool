import { Box, Card } from "@mui/material";
import type { ReactNode } from "react";
import { palette } from "../platformTheme";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: ReactNode;
  delta?: ReactNode;
  pulse?: boolean;
  children?: ReactNode;
}

const StatCard = ({
  label,
  value,
  unit,
  icon,
  delta,
  pulse,
  children,
}: StatCardProps) => (
  <Card
    sx={{
      p: { xs: 2, sm: 2.5 },
      position: "relative",
      cursor: "default",
      "&:hover": {
        transform: "translateY(-1px)",
        borderColor: palette.hairlineStrong,
        boxShadow: `0 1px 0 rgba(26, 31, 62, 0.04)`,
      },
    }}
  >
    {icon && (
      <Box
        sx={{
          position: "absolute",
          top: 14,
          right: 14,
          color: palette.inkFaint,
          display: "flex",
          "& svg": { width: 18, height: 18 },
        }}
      >
        {icon}
      </Box>
    )}
    <Box
      sx={{
        fontSize: "0.66rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: palette.inkMute,
        fontWeight: 500,
        mb: 1.4,
      }}
    >
      {label}
    </Box>
    <Box
      sx={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontVariationSettings: "'opsz' 144",
        fontWeight: 400,
        fontSize: "2.5rem",
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: palette.ink,
        fontVariantNumeric: "tabular-nums",
        display: "flex",
        alignItems: "baseline",
        gap: 0.6,
      }}
    >
      <span>{value}</span>
      {unit && (
        <span
          style={{
            fontSize: "1.25rem",
            color: palette.inkMute,
            fontWeight: 300,
          }}
        >
          {unit}
        </span>
      )}
      {pulse && <PulseDot />}
    </Box>
    {delta && (
      <Box
        sx={{
          mt: 1.2,
          fontSize: "0.75rem",
          color: palette.inkMute,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        {delta}
      </Box>
    )}
    {children}
  </Card>
);

const PulseDot = () => (
  <Box
    sx={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: palette.accent,
      display: "inline-block",
      position: "relative",
      ml: 0.75,
      alignSelf: "center",
      animation: "jsPulse 2.2s ease-in-out infinite",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: -4,
        borderRadius: "50%",
        backgroundColor: palette.accent,
        opacity: 0.22,
        animation: "jsPulseRing 2.2s ease-out infinite",
      },
    }}
  />
);

export default StatCard;
