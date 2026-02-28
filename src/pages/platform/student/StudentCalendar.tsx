import { useState, useMemo } from "react";
import { Box, Typography, CircularProgress, useTheme, useMediaQuery } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import frLocale from "@fullcalendar/core/locales/fr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import BookingDialog from "./BookingDialog";
import {
  useAvailabilityRangesForStudents,
  useBookingsByRanges,
  usePricing,
  useMyBookings,
  computeFreeWindows,
} from "../../../hooks/useQueries";
import type { FreeWindow } from "../../../types";

const StudentCalendar = () => {
  const _ = useTranslator();
  const lang = useLang();
  const { profile } = useAuth();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<FreeWindow | null>(null);

  const { data: ranges = [], isLoading: rangesLoading } = useAvailabilityRangesForStudents();
  const rangeIds = useMemo(() => ranges.map((r) => r.id), [ranges]);
  const { data: rangeBookings = [], isLoading: bookingsLoading } = useBookingsByRanges(rangeIds);
  const { data: pricing, isLoading: pricingLoading } = usePricing();
  const { data: myBookings = [] } = useMyBookings(profile?.id);

  const loading = rangesLoading || bookingsLoading || pricingLoading;

  const effectivePricing = useMemo(() => {
    if (!pricing) return null;
    const custom = profile?.custom_hourly_rate_cents;
    if (custom === undefined || custom === null) return pricing;
    return { ...pricing, hourly_rate_cents: custom };
  }, [pricing, profile?.custom_hourly_rate_cents]);

  const freeWindows = useMemo(
    () => computeFreeWindows(ranges, rangeBookings),
    [ranges, rangeBookings]
  );

  const handleEventClick = (clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;
    if (props.type !== "free") return;

    setSelectedWindow({
      rangeId: props.rangeId,
      start: clickInfo.event.start!.toISOString(),
      end: clickInfo.event.end!.toISOString(),
    });
    setDialogOpen(true);
  };

  const handleBooked = () => {
    queryClient.invalidateQueries({ queryKey: ["availability-ranges"] });
    queryClient.invalidateQueries({ queryKey: ["bookings", "by-ranges"] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  const calendarEvents = [
    ...freeWindows.map((w, i) => ({
      id: `free-${i}`,
      title: _("booking_available"),
      start: w.start,
      end: w.end,
      backgroundColor: "#4caf50",
      borderColor: "#388e3c",
      extendedProps: { type: "free", rangeId: w.rangeId },
    })),
    ...myBookings.map((b) => ({
      id: `my-${b.id}`,
      title:
        b.status === "confirmed"
          ? _("booking_my_confirmed")
          : _("booking_my_pending"),
      start: b.start_time,
      end: b.end_time,
      backgroundColor: b.status === "confirmed" ? "#1976d2" : "#ed6c02",
      borderColor: b.status === "confirmed" ? "#1565c0" : "#e65100",
      extendedProps: { type: "my_booking" },
    })),
  ];

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ mb: 1, color: "#030340", fontFamily: "'Kalam', cursive" }}
      >
        {_("booking_calendar_title")}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
        {_("booking_calendar_instructions")}
      </Typography>

      <Box
        sx={{
          mb: 3,
          p: 2,
          bgcolor: "#f9f9f9",
          borderLeft: "3px solid #4caf50",
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: "#555", fontSize: "0.875rem", lineHeight: 1.6 }}>
          💚 {_("booking_charity_disclaimer")}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
      <>
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 1,
          p: { xs: 1, sm: 2 },
          overflowX: "auto",
          "& .fc": { fontFamily: "inherit" },
          "& .fc .fc-toolbar": { flexWrap: "wrap", gap: 0.5 },
        }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={bigScreen ? "timeGridWeek" : "timeGridDay"}
          headerToolbar={
            bigScreen
              ? { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
              : { left: "prev,next", center: "title", right: "timeGridDay,timeGridWeek" }
          }
          locales={[frLocale]}
          locale={lang === "fr" ? "fr" : "en"}
          eventClick={handleEventClick}
          events={calendarEvents}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          height="auto"
          nowIndicator
          slotDuration="00:15:00"
        />
      </Box>

      {selectedWindow && effectivePricing && (
        <BookingDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedWindow(null);
          }}
          window={selectedWindow}
          pricing={effectivePricing}
          onBooked={handleBooked}
        />
      )}
      </>
      )}
    </Box>
  );
};

export default StudentCalendar;
