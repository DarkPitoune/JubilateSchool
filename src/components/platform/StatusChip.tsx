import { Chip, type ChipProps } from "@mui/material";
import { palette } from "../platformTheme";
import { useTranslator } from "../translator";
import type { BookingStatus } from "../../types";

type Tone = "confirmed" | "pending" | "error" | "neutral";

const toneStyles: Record<Tone, { color: string; bg: string; border: string }> = {
  confirmed: {
    color: palette.sage,
    bg: palette.sageSoft,
    border: "rgba(107, 142, 90, 0.35)",
  },
  pending: {
    color: palette.ochre,
    bg: palette.ochreSoft,
    border: "rgba(184, 144, 58, 0.35)",
  },
  error: {
    color: palette.brick,
    bg: palette.brickSoft,
    border: "rgba(184, 89, 77, 0.35)",
  },
  neutral: {
    color: palette.inkMute,
    bg: "transparent",
    border: palette.hairlineStrong,
  },
};

const statusTone: Record<BookingStatus, Tone> = {
  pending_confirmation: "pending",
  confirmed: "confirmed",
  rejected: "error",
  expired: "neutral",
  payment_failed: "error",
  cancelled_by_student: "neutral",
  cancelled_by_teacher: "neutral",
};

interface StatusChipProps extends Omit<ChipProps, "color"> {
  status: BookingStatus;
}

const StatusChip = ({ status, sx, ...rest }: StatusChipProps) => {
  const _ = useTranslator();
  const tone = statusTone[status];
  const s = toneStyles[tone];
  return (
    <Chip
      variant="outlined"
      label={_(`status_${status}`)}
      sx={{
        color: s.color,
        backgroundColor: s.bg,
        borderColor: s.border,
        fontStyle: "italic",
        ...(tone === "confirmed" && { transform: "rotate(-0.5deg)" }),
        ...sx,
      }}
      {...rest}
    />
  );
};

export default StatusChip;
