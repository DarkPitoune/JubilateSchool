import { useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import frLocale from "@fullcalendar/core/locales/fr";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import { useTeacherAvailability } from "../../../hooks/useQueries";
import type { AvailabilitySlot } from "../../../types";

const AvailabilityManager = () => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;
  const { profile } = useAuth();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [pendingSlotTime, setPendingSlotTime] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useTeacherAvailability(profile?.id);
  const slots = data?.slots ?? [];
  const bookings = data?.bookings ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
  };

  // Floor a date to the whole hour
  const floorToHour = (date: Date): Date => {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d;
  };

  const handleDateClick = ({ date }: { date: Date }) => {
    const slotTime = floorToHour(date);
    // If a slot already exists at this time, open remove dialog
    const existing = slots.find((s) => new Date(s.start_time).getTime() === slotTime.getTime());
    if (existing) {
      setSelectedSlot(existing);
      setPendingSlotTime(null);
    } else {
      setSelectedSlot(null);
      setPendingSlotTime(slotTime);
    }
    setError("");
    setDialogOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;
    if (props.type === "booking") return;

    const slot = slots.find((s) => s.id === clickInfo.event.id);
    if (!slot) return;

    setSelectedSlot(slot);
    setPendingSlotTime(null);
    setError("");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!pendingSlotTime) return;
    setError("");
    setSaving(true);

    const { error: insertError } = await supabase
      .from("availability_slots")
      .insert({ teacher_id: profile!.id, start_time: pendingSlotTime.toISOString() });

    setSaving(false);
    if (insertError) {
      setError(_("avail_error_save"));
      return;
    }
    setDialogOpen(false);
    invalidate();
  };

  const handleRemove = async () => {
    if (!selectedSlot) return;

    const hasActiveBooking = bookings.some((b) => b.availability_slot_id === selectedSlot.id);
    if (hasActiveBooking) {
      setError(_("avail_error_delete_has_bookings"));
      return;
    }

    setError("");
    setSaving(true);

    const { error: deleteError } = await supabase
      .from("availability_slots")
      .delete()
      .eq("id", selectedSlot.id);

    setSaving(false);
    if (deleteError) {
      setError(_("avail_error_delete"));
      return;
    }
    setDialogOpen(false);
    invalidate();
  };

  const slotEnd = (startIso: string) =>
    new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

  const calendarEvents = slots.map((s) => {
    const booking = bookings.find((b) => b.availability_slot_id === s.id);
    const isBooked = !!booking;
    return {
      id: s.id,
      title: isBooked
        ? booking!.profiles?.full_name || _("avail_booking")
        : _("avail_available"),
      start: s.start_time,
      end: slotEnd(s.start_time),
      backgroundColor: isBooked
        ? booking!.status === "confirmed"
          ? "#1976d2"
          : "#ed6c02"
        : "#4caf50",
      borderColor: isBooked
        ? booking!.status === "confirmed"
          ? "#1565c0"
          : "#e65100"
        : "#388e3c",
      extendedProps: { type: isBooked ? "booking" : "availability" },
    };
  });

  const dialogSlotTime = selectedSlot ? new Date(selectedSlot.start_time) : pendingSlotTime;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("avail_title")}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
        {_("avail_instructions")}
      </Typography>

      {isLoading ? (
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
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              events={calendarEvents}
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              height="auto"
              nowIndicator
              slotDuration="01:00:00"
              snapDuration="01:00:00"
            />
          </Box>

          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>
              {selectedSlot ? _("avail_remove_title") : _("avail_add_title")}
            </DialogTitle>
            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {dialogSlotTime && (
                <Typography sx={{ mt: 1 }}>
                  {format(dialogSlotTime, "PPPp", { locale })}
                  {" — "}
                  {format(new Date(dialogSlotTime.getTime() + 60 * 60 * 1000), "p", { locale })}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>{_("cancel")}</Button>
              {selectedSlot ? (
                <Button onClick={handleRemove} color="error" variant="contained" disabled={saving}>
                  {saving ? _("loading") : _("avail_delete")}
                </Button>
              ) : (
                <Button onClick={handleAdd} variant="contained" disabled={saving}>
                  {saving ? _("loading") : _("avail_add_confirm")}
                </Button>
              )}
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default AvailabilityManager;
