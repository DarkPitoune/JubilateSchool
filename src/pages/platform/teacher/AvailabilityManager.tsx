import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import type { AvailabilityRange, Booking } from "../../../types";

const AvailabilityManager = () => {
  const _ = useTranslator();
  const { profile } = useAuth();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<AvailabilityRange | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const { data: rangesData } = await supabase
      .from("availability_ranges")
      .select("*")
      .eq("teacher_id", profile!.id)
      .order("start_time", { ascending: true });

    setRanges((rangesData || []) as AvailabilityRange[]);

    if (rangesData && rangesData.length > 0) {
      const rangeIds = rangesData.map((r) => r.id);
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(full_name)")
        .in("availability_range_id", rangeIds)
        .in("status", ["pending_confirmation", "confirmed"]);

      setBookings((bookingsData || []) as Booking[]);
    } else {
      setBookings([]);
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toLocalDatetime = (date: Date | string) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const handleSelect = (selectInfo: DateSelectArg) => {
    setEditingRange(null);
    setStartTime(toLocalDatetime(selectInfo.start));
    setEndTime(toLocalDatetime(selectInfo.end));
    setError("");
    setDialogOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    // Only allow editing availability ranges, not bookings
    if (event.extendedProps.type === "booking") return;

    const range = ranges.find((r) => r.id === event.id);
    if (!range) return;

    setEditingRange(range);
    setStartTime(toLocalDatetime(range.start_time));
    setEndTime(toLocalDatetime(range.end_time));
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    const start = new Date(startTime).toISOString();
    const end = new Date(endTime).toISOString();

    if (new Date(end) <= new Date(start)) {
      setError(_("avail_error_invalid_range"));
      return;
    }

    if (editingRange) {
      // Check for confirmed bookings that would be outside new range
      const conflicting = bookings.filter(
        (b) =>
          b.availability_range_id === editingRange.id &&
          b.status === "confirmed" &&
          (new Date(b.start_time) < new Date(start) || new Date(b.end_time) > new Date(end))
      );
      if (conflicting.length > 0) {
        setError(_("avail_error_has_bookings"));
        return;
      }

      const { error } = await supabase
        .from("availability_ranges")
        .update({ start_time: start, end_time: end })
        .eq("id", editingRange.id);

      if (error) {
        setError(_("avail_error_save"));
        return;
      }
    } else {
      const { error } = await supabase
        .from("availability_ranges")
        .insert({
          teacher_id: profile!.id,
          start_time: start,
          end_time: end,
        });

      if (error) {
        setError(_("avail_error_save"));
        return;
      }
    }

    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!editingRange) return;

    const confirmedBookings = bookings.filter(
      (b) => b.availability_range_id === editingRange.id && b.status === "confirmed"
    );
    if (confirmedBookings.length > 0) {
      setError(_("avail_error_delete_has_bookings"));
      return;
    }

    const { error } = await supabase
      .from("availability_ranges")
      .delete()
      .eq("id", editingRange.id);

    if (error) {
      setError(_("avail_error_delete"));
      return;
    }

    setDialogOpen(false);
    fetchData();
  };

  // Build calendar events
  const calendarEvents = [
    ...ranges.map((r) => ({
      id: r.id,
      title: _("avail_available"),
      start: r.start_time,
      end: r.end_time,
      backgroundColor: "#4caf50",
      borderColor: "#388e3c",
      extendedProps: { type: "availability" },
    })),
    ...bookings.map((b) => ({
      id: `booking-${b.id}`,
      title: `${b.profiles?.full_name || _("avail_booking")} (${b.duration_minutes}min)`,
      start: b.start_time,
      end: b.end_time,
      backgroundColor: b.status === "confirmed" ? "#1976d2" : "#ed6c02",
      borderColor: b.status === "confirmed" ? "#1565c0" : "#e65100",
      extendedProps: { type: "booking", status: b.status },
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
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("avail_title")}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
        {_("avail_instructions")}
      </Typography>

      <Box sx={{ bgcolor: "white", borderRadius: 1, p: 2, "& .fc": { fontFamily: "inherit" } }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={bigScreen ? "timeGridWeek" : "timeGridDay"}
          headerToolbar={
            bigScreen
              ? { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
              : { left: "prev,next", center: "title", right: "timeGridDay,timeGridWeek" }
          }
          locale={profile?.preferred_lang === "fr" ? "fr" : "en"}
          selectable
          selectMirror
          select={handleSelect}
          eventClick={handleEventClick}
          events={calendarEvents}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          height="auto"
          nowIndicator
          slotDuration="00:15:00"
          snapDuration="00:15:00"
        />
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {editingRange ? _("avail_edit_title") : _("avail_create_title")}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label={_("avail_start")}
            type="datetime-local"
            fullWidth
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={_("avail_end")}
            type="datetime-local"
            fullWidth
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          {editingRange && (
            <Button onClick={handleDelete} color="error" sx={{ mr: "auto" }}>
              {_("avail_delete")}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>{_("cancel")}</Button>
          <Button onClick={handleSave} variant="contained">
            {_("save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvailabilityManager;
