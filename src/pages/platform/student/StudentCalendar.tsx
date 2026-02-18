import { useEffect, useState, useCallback } from "react";
import { Box, Typography, CircularProgress, useTheme, useMediaQuery } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import BookingDialog from "./BookingDialog";
import type { FreeWindow, Booking, Pricing } from "../../../types";

const StudentCalendar = () => {
  const _ = useTranslator();
  const { profile } = useAuth();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const [freeWindows, setFreeWindows] = useState<FreeWindow[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<FreeWindow | null>(null);

  const fetchData = useCallback(async () => {
    const now = new Date().toISOString();

    // Fetch future availability ranges
    const { data: ranges } = await supabase
      .from("availability_ranges")
      .select("*")
      .gte("end_time", now)
      .order("start_time", { ascending: true });

    if (!ranges || ranges.length === 0) {
      setFreeWindows([]);
      setMyBookings([]);
      setLoading(false);
      return;
    }

    // Fetch existing bookings (pending or confirmed) for those ranges
    const rangeIds = ranges.map((r) => r.id);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .in("availability_range_id", rangeIds)
      .in("status", ["pending_confirmation", "confirmed"]);

    // Fetch current pricing
    const { data: pricingData } = await supabase
      .from("pricing")
      .select("*")
      .order("effective_from", { ascending: false })
      .limit(1)
      .single();

    setPricing(pricingData as Pricing | null);

    // Compute free windows by subtracting booked intervals from ranges
    const free: FreeWindow[] = [];
    for (const range of ranges) {
      const rangeStart = new Date(range.start_time).getTime();
      const rangeEnd = new Date(range.end_time).getTime();

      // Get bookings for this range, sorted by start time
      const rangeBookings = (bookings || [])
        .filter((b) => b.availability_range_id === range.id)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      let cursor = rangeStart;
      for (const booking of rangeBookings) {
        const bStart = new Date(booking.start_time).getTime();
        const bEnd = new Date(booking.end_time).getTime();

        if (cursor < bStart) {
          // Free gap before this booking
          const gapStart = Math.max(cursor, Date.now());
          if (gapStart < bStart) {
            free.push({
              rangeId: range.id,
              start: new Date(gapStart).toISOString(),
              end: new Date(bStart).toISOString(),
            });
          }
        }
        cursor = Math.max(cursor, bEnd);
      }

      // Free gap after last booking
      if (cursor < rangeEnd) {
        const gapStart = Math.max(cursor, Date.now());
        if (gapStart < rangeEnd) {
          free.push({
            rangeId: range.id,
            start: new Date(gapStart).toISOString(),
            end: new Date(rangeEnd).toISOString(),
          });
        }
      }
    }

    setFreeWindows(free);

    // Fetch this student's own bookings for display
    const { data: myBookingsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("student_id", profile!.id)
      .in("status", ["pending_confirmation", "confirmed"])
      .gte("end_time", now);

    setMyBookings((myBookingsData || []) as Booking[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
          locale={profile?.preferred_lang === "fr" ? "fr" : "en"}
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

      {selectedWindow && pricing && (
        <BookingDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedWindow(null);
          }}
          window={selectedWindow}
          pricing={pricing}
          onBooked={fetchData}
        />
      )}
    </Box>
  );
};

export default StudentCalendar;
