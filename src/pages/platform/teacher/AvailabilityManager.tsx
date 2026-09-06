import { useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Autocomplete,
  TextField,
  CircularProgress,
  Typography,
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
import { PageTitle } from "../../../components/platform";
import { palette } from "../../../components/platformTheme";
import { useLang } from "../../../hooks/useLang";
import {
  useTeacherAvailability,
  useStudentsForPicker,
} from "../../../hooks/useQueries";
import { fullName } from "../../../types";
import type { TeacherSlot } from "../../../types";

type StudentOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

const AvailabilityManager = () => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;
  const { profile } = useAuth();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TeacherSlot | null>(null);
  const [pendingSlotTime, setPendingSlotTime] = useState<Date | null>(null);
  const [reserveFor, setReserveFor] = useState<StudentOption | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useTeacherAvailability(profile?.id);
  const slots = data ?? [];
  const { data: students = [] } = useStudentsForPicker();

  const studentById = (id: string | null | undefined) =>
    id ? students.find((s) => s.id === id) ?? null : null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
  };

  const floorToHour = (date: Date): Date => {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d;
  };

  const handleDateClick = ({ date }: { date: Date }) => {
    const slotTime = floorToHour(date);
    const existing = slots.find(
      (s) => new Date(s.start_time).getTime() === slotTime.getTime()
    );
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

    const { data: inserted, error: insertError } = await supabase
      .from("availability_slots")
      .insert({
        teacher_id: profile!.id,
        start_time: pendingSlotTime.toISOString(),
        reserved_for_student_id: reserveFor?.id ?? null,
      })
      .select()
      .single();

    if (insertError) {
      setSaving(false);
      setError(_("avail_error_save"));
      return;
    }

    if (inserted?.reserved_for_student_id) {
      supabase.functions
        .invoke("send-email", {
          body: { type: "slot_reserved_student", slot_id: inserted.id },
        })
        .catch((e) => console.error("Failed to send reservation email:", e));
    }

    setSaving(false);
    setDialogOpen(false);
    setReserveFor(null);
    invalidate();
  };

  const handleRemove = async () => {
    if (!selectedSlot) return;

    if (selectedSlot.booking_id) {
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
    const isBooked = !!s.booking_id;
    const reservedStudent = !isBooked ? studentById(s.reserved_for_student_id) : null;
    const isReserved = !!reservedStudent;

    let title: string;
    let className: string;
    if (isBooked) {
      title =
        s.student_first_name || s.student_last_name
          ? fullName({
              first_name: s.student_first_name ?? "",
              last_name: s.student_last_name ?? "",
            })
          : _("avail_booking");
      className =
        s.booking_status === "confirmed"
          ? "js-slot--teacher-confirmed"
          : "js-slot--teacher-pending";
    } else if (isReserved) {
      title = `${_("avail_reserved_for")} ${fullName(reservedStudent)}`;
      className = "js-slot--reserved";
    } else {
      title = _("avail_available");
      className = "js-slot--available";
    }

    return {
      id: s.id,
      title,
      start: s.start_time,
      end: slotEnd(s.start_time),
      classNames: [className],
      extendedProps: { type: isBooked ? "booking" : "availability" },
    };
  });

  const dialogSlotTime = selectedSlot
    ? new Date(selectedSlot.start_time)
    : pendingSlotTime;

  return (
    <Box>
      <PageTitle
        kicker={_("avail_kicker")}
        title={_("avail_title")}
        subtitle={_("avail_subtitle")}
      />

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              bgcolor: palette.ivory,
              border: `1px solid ${palette.hairline}`,
              borderRadius: 2.5,
              p: { xs: 1, sm: 2 },
              overflowX: "auto",
              maxWidth: 1180,
            }}
          >
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={bigScreen ? "timeGridWeek" : "timeGridDay"}
              headerToolbar={
                bigScreen
                  ? {
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay",
                    }
                  : {
                      left: "prev,next",
                      center: "title",
                      right: "timeGridDay,timeGridWeek",
                    }
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

          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth="xs"
            fullWidth
          >
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
                <Typography sx={{ mt: 1, color: palette.inkSoft }}>
                  {format(dialogSlotTime, "PPPp", { locale })}
                  {" — "}
                  {format(
                    new Date(dialogSlotTime.getTime() + 60 * 60 * 1000),
                    "p",
                    { locale }
                  )}
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
              <Button variant="outlined" onClick={() => setDialogOpen(false)}>
                {_("cancel")}
              </Button>
              {selectedSlot ? (
                <Button
                  onClick={handleRemove}
                  color="error"
                  variant="contained"
                  disabled={saving}
                >
                  {saving ? _("loading") : _("avail_delete")}
                </Button>
              ) : (
                <Button
                  onClick={handleAdd}
                  variant="contained"
                  disabled={saving}
                >
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
