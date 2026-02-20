import { useEffect, useState } from "react";
import { Box, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { getCityLabel } from "../lib/timezone";
import { useLang } from "../hooks/useLang";

interface CounterpartClockProps {
  timezone: string;
}

const CounterpartClock = ({ timezone }: CounterpartClockProps) => {
  const lang = useLang();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [time, setTime] = useState(() => formatTime(timezone));

  useEffect(() => {
    setTime(formatTime(timezone));
    const id = setInterval(() => setTime(formatTime(timezone)), 15_000);
    return () => clearInterval(id);
  }, [timezone]);

  const city = getCityLabel(timezone, lang);
  const label = `${time} — ${city}`;

  if (isMobile) {
    return (
      <Tooltip title={city}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1.5 }}>
          <AccessTimeIcon sx={{ fontSize: 16, opacity: 0.8 }} />
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {time}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 2 }}>
      <AccessTimeIcon sx={{ fontSize: 16, opacity: 0.8 }} />
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        {label}
      </Typography>
    </Box>
  );
};

function formatTime(tz: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date());
}

export default CounterpartClock;
