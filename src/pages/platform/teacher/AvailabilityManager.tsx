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
  Autocomplete,
  TextField,
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
import { useTeacherAvailability, useStudentsForPicker } from "../../../hooks/useQueries";
import { fullName } from "../../../types";
import type { AvailabilitySlot } from "../../../types";

type StudentOption = { id: string; first_name: string; last_name: string; email: string };

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
  const [reserveFor, setReserveFor] = useState<StudentOption | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useTeacherAvailability(profile?.id);
  const slots = data?.slots ?? [];
  const bookings = data?.bookings ?? [];
  const { data: students = [] } = useStudentsForPicker();

  const studentById = (id: string | null | undefined) =>
    id ? students.find((s) => s.id === id) ?? null : null;

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
      setReserveFor(null);
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
      .insert({
        teacher_id: profile!.id,
        start_time: pendingSlotTime.toISOString(),
        reserved_for_student_id: reserveFor?.id ?? null,
      });

    setSaving(false);
    if (insertError) {
      setError(_("avail_error_save"));
      return;
    }
    setDialogOpen(false);
    setReserveFor(null);
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
    const reservedStudent = !isBooked ? studentById(s.reserved_for_student_id) : null;
    const isReserved = !!reservedStudent;

    let title: string;
    if (isBooked) {
      title = fullName(booking!.profiles) || _("avail_booking");
    } else if (isReserved) {
      title = `${_("avail_reserved_for")} ${fullName(reservedStudent)}`;
    } else {
      title = _("avail_available");
    }

    const backgroundColor = isBooked
      ? booking!.status === "confirmed"
        ? "#1976d2"
        : "#ed6c02"
      : isReserved
      ? "#9c27b0"
      : "#4caf50";
    const borderColor = isBooked
      ? booking!.status === "confirmed"
        ? "#1565c0"
        : "#e65100"
      : isReserved
      ? "#7b1fa2"
      : "#388e3c";

    return {
      id: s.id,
      title,
      start: s.start_time,
      end: slotEnd(s.start_time),
      backgroundColor,
      borderColor,
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
              {!selectedSlot && (
                <Autocomplete
                  options={students}
                  value={reserveFor}
                  onChange={(_e, v) => setReserveFor(v)}
                  getOptionLabel={(o) => fullName(o)}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  sx={{ mt: 2 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={_("avail_reserve_for_label")}
                      placeholder={_("avail_reserve_for_placeholder")}
                      size="small"
                    />
                  )}
                />
              )}
              {selectedSlot?.reserved_for_student_id && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {_("avail_reserved_for")}{" "}
                  {fullName(studentById(selectedSlot.reserved_for_student_id))}
                </Alert>
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
