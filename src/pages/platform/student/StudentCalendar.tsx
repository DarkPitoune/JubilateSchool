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
  useAvailableSlots,
  usePricing,
  useMyBookings,
} from "../../../hooks/useQueries";
import type { AvailabilitySlot } from "../../../types";

const StudentCalendar = () => {
  const _ = useTranslator();
  const lang = useLang();
  const { profile } = useAuth();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const { data: availableSlots = [], isLoading: slotsLoading } = useAvailableSlots();
  const { data: pricing, isLoading: pricingLoading } = usePricing();
  const { data: myBookings = [] } = useMyBookings(profile?.id);

  const loading = slotsLoading || pricingLoading;

  const effectivePricing = useMemo(() => {
    if (!pricing) return null;
    const custom = profile?.custom_hourly_rate_cents;
    if (custom === undefined || custom === null) return pricing;
    return { ...pricing, hourly_rate_cents: custom };
  }, [pricing, profile?.custom_hourly_rate_cents]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;
    if (props.type !== "available") return;

    const slot = availableSlots.find((s) => s.id === props.slotId);
    if (slot) {
      setSelectedSlot(slot);
      setDialogOpen(true);
    }
  };

  const handleBooked = () => {
    queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  const slotEnd = (startIso: string) =>
    new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

  const calendarEvents = [
    ...availableSlots
      .filter((s) => !s.is_booked)
      .map((s) => ({
        id: `slot-${s.id}`,
        title: _("booking_available"),
        start: s.start_time,
        end: slotEnd(s.start_time),
        backgroundColor: "#4caf50",
        borderColor: "#388e3c",
        extendedProps: { type: "available", slotId: s.id },
      })),
    ...availableSlots
      .filter((s) => s.is_booked)
      .map((s) => ({
        id: `taken-${s.id}`,
        title: _("booking_taken"),
        start: s.start_time,
        end: slotEnd(s.start_time),
        backgroundColor: "#bdbdbd",
        borderColor: "#9e9e9e",
        extendedProps: { type: "taken" },
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
              slotDuration="01:00:00"
            />
          </Box>

          {selectedSlot && effectivePricing && (
            <BookingDialog
              open={dialogOpen}
              onClose={() => {
                setDialogOpen(false);
                setSelectedSlot(null);
              }}
              slot={selectedSlot}
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
