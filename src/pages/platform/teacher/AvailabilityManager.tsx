import { useMemo, useState } from "react";
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
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Snackbar,
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
import { format, addWeeks, addMonths, parseISO, isValid } from "date-fns";
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

type RepeatMode = "none" | "weekly" | "biweekly";
type DeleteScope = "single" | "following";

const HOUR_MS = 60 * 60 * 1000;
const MAX_OCCURRENCES = 104;

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
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [deleteScope, setDeleteScope] = useState<DeleteScope>("single");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState("");

  const { data, isLoading } = useTeacherAvailability(profile?.id);
  const slots = data ?? [];
  const { data: students = [] } = useStudentsForPicker();

  const studentById = (id: string | null | undefined) =>
    id ? students.find((s) => s.id === id) ?? null : null;

  const fill = (key: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, String(value)),
      _(key)
    );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
  };

  const floorToHour = (date: Date): Date => {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d;
  };

  const takenTimes = useMemo(
    () => new Set(slots.map((s) => new Date(s.start_time).getTime())),
    [slots]
  );

  // Occurrences are stepped on local calendar fields, so a 16:00 slot stays at
  // 16:00 for the teacher even across a daylight-saving change.
  const occurrences = useMemo(() => {
    if (!pendingSlotTime) return [];
    if (repeatMode === "none") return [pendingSlotTime];

    const until = parseISO(repeatUntil);
    if (!isValid(until)) return [];
    until.setHours(23, 59, 59, 999);

    const step = repeatMode === "weekly" ? 1 : 2;
    const dates: Date[] = [];
    let cursor = pendingSlotTime;
    while (cursor <= until && dates.length < MAX_OCCURRENCES) {
      dates.push(cursor);
      cursor = addWeeks(cursor, step);
    }
    return dates;
  }, [pendingSlotTime, repeatMode, repeatUntil]);

  const newOccurrences = occurrences.filter(
    (d) => !takenTimes.has(d.getTime())
  );
  const skippedCount = occurrences.length - newOccurrences.length;

  const seriesSlots = useMemo(() => {
    if (!selectedSlot?.recurrence_group_id) return [];
    return slots.filter(
      (s) => s.recurrence_group_id === selectedSlot.recurrence_group_id
    );
  }, [slots, selectedSlot]);

  const followingSlots = useMemo(() => {
    if (!selectedSlot) return [];
    const from = new Date(selectedSlot.start_time).getTime();
    return seriesSlots.filter((s) => new Date(s.start_time).getTime() >= from);
  }, [seriesSlots, selectedSlot]);

  const isSeries = followingSlots.length > 1;

  const seriesLabel = () => {
    if (seriesSlots.length < 2) return "";
    const times = seriesSlots
      .map((s) => new Date(s.start_time).getTime())
      .sort((a, b) => a - b);
    const gapDays = (times[1] - times[0]) / (24 * HOUR_MS);
    return gapDays >= 13 ? _("avail_series_biweekly") : _("avail_series_weekly");
  };

  const handleDateClick = ({ date }: { date: Date }) => {
    const slotTime = floorToHour(date);
    const existing = slots.find(
      (s) => new Date(s.start_time).getTime() === slotTime.getTime()
    );
    if (existing) {
      setSelectedSlot(existing);
      setPendingSlotTime(null);
      setDeleteScope("single");
    } else {
      setSelectedSlot(null);
      setPendingSlotTime(slotTime);
      setReserveFor(null);
      setRepeatMode("none");
      setRepeatUntil(format(addMonths(slotTime, 3), "yyyy-MM-dd"));
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
    setDeleteScope("single");
    setError("");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (newOccurrences.length === 0) return;
    setError("");
    setSaving(true);

    const groupId =
      repeatMode === "none" || occurrences.length < 2
        ? null
        : crypto.randomUUID();

    const { data: inserted, error: insertError } = await supabase
      .from("availability_slots")
      .upsert(
        newOccurrences.map((d) => ({
          teacher_id: profile!.id,
          start_time: d.toISOString(),
          reserved_for_student_id: reserveFor?.id ?? null,
          recurrence_group_id: groupId,
        })),
        { onConflict: "teacher_id,start_time", ignoreDuplicates: true }
      )
      .select();

    if (insertError) {
      setSaving(false);
      setError(_("avail_error_save"));
      return;
    }

    const addedCount = inserted?.length ?? 0;

    // One email for the whole series, not one per occurrence.
    if (inserted?.[0]?.reserved_for_student_id) {
      supabase.functions
        .invoke("send-email", {
          body: {
            type: "slot_reserved_student",
            slot_id: inserted[0].id,
            series_count: addedCount,
            series_interval_weeks: repeatMode === "biweekly" ? 2 : 1,
            series_last_start: inserted[addedCount - 1].start_time,
          },
        })
        .catch((e) => console.error("Failed to send reservation email:", e));
    }

    setSaving(false);
    setDialogOpen(false);
    setReserveFor(null);
    setSnack(
      addedCount === 1
        ? _("avail_added_one")
        : fill("avail_added", { n: addedCount })
    );
    invalidate();
  };

  const handleRemove = async () => {
    if (!selectedSlot) return;

    if (selectedSlot.booking_id) {
      setError(_("avail_error_delete_has_bookings"));
      return;
    }

    const targets =
      isSeries && deleteScope === "following" ? followingSlots : [selectedSlot];
    const deletable = targets.filter((s) => !s.booking_id);
    const keptCount = targets.length - deletable.length;

    setError("");
    setSaving(true);

    const { error: deleteError } = await supabase
      .from("availability_slots")
      .delete()
      .in(
        "id",
        deletable.map((s) => s.id)
      );

    setSaving(false);
    if (deleteError) {
      setError(_("avail_error_delete"));
      return;
    }

    const removed =
      deletable.length === 1
        ? _("avail_deleted_one")
        : fill("avail_deleted", { n: deletable.length });
    setSnack(
      keptCount > 0
        ? `${removed} ${fill("avail_deleted_kept", { n: keptCount })}`
        : removed
    );
    setDialogOpen(false);
    invalidate();
  };

  const slotEnd = (startIso: string) =>
    new Date(new Date(startIso).getTime() + HOUR_MS).toISOString();

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
      title: s.recurrence_group_id && !isBooked ? `${title} ⟳` : title,
      start: s.start_time,
      end: slotEnd(s.start_time),
      classNames: [className],
      extendedProps: { type: isBooked ? "booking" : "availability" },
    };
  });

  const dialogSlotTime = selectedSlot
    ? new Date(selectedSlot.start_time)
    : pendingSlotTime;

  const dayName = pendingSlotTime
    ? format(pendingSlotTime, "EEEE", { locale })
    : "";

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
                  {format(new Date(dialogSlotTime.getTime() + HOUR_MS), "p", {
                    locale,
                  })}
                </Typography>
              )}
              {!selectedSlot && (
                <>
                  <TextField
                    select
                    label={_("avail_repeat_label")}
                    value={repeatMode}
                    onChange={(e) => setRepeatMode(e.target.value as RepeatMode)}
                    size="small"
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    <MenuItem value="none">{_("avail_repeat_none")}</MenuItem>
                    <MenuItem value="weekly">
                      {fill("avail_repeat_weekly", { day: dayName })}
                    </MenuItem>
                    <MenuItem value="biweekly">
                      {fill("avail_repeat_biweekly", { day: dayName })}
                    </MenuItem>
                  </TextField>
                  {repeatMode !== "none" && (
                    <>
                      <TextField
                        label={_("avail_repeat_until")}
                        type="date"
                        value={repeatUntil}
                        onChange={(e) => setRepeatUntil(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ mt: 2 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ mt: 1.5, color: palette.inkSoft }}
                      >
                        {newOccurrences.length === 1
                          ? _("avail_repeat_count_one")
                          : fill("avail_repeat_count", {
                              n: newOccurrences.length,
                            })}
                        {skippedCount > 0 &&
                          ` ${fill("avail_repeat_skipped", {
                            n: skippedCount,
                          })}`}
                      </Typography>
                    </>
                  )}
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
                  {reserveFor && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {fill(
                        newOccurrences.length > 1
                          ? "avail_repeat_reserved_notice"
                          : "avail_reserved_notice_single",
                        { name: fullName(reserveFor) }
                      )}
                    </Alert>
                  )}
                </>
              )}
              {selectedSlot?.reserved_for_student_id && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {_("avail_reserved_for")}{" "}
                  {fullName(studentById(selectedSlot.reserved_for_student_id))}
                </Alert>
              )}
              {selectedSlot && isSeries && (
                <>
                  <Typography
                    variant="body2"
                    sx={{ mt: 2, color: palette.inkSoft }}
                  >
                    ⟳ {seriesLabel()}
                  </Typography>
                  <RadioGroup
                    value={deleteScope}
                    onChange={(e) =>
                      setDeleteScope(e.target.value as DeleteScope)
                    }
                  >
                    <FormControlLabel
                      value="single"
                      control={<Radio size="small" />}
                      label={_("avail_scope_single")}
                    />
                    <FormControlLabel
                      value="following"
                      control={<Radio size="small" />}
                      label={_("avail_scope_following")}
                    />
                  </RadioGroup>
                </>
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
                  disabled={saving || newOccurrences.length === 0}
                >
                  {saving ? _("loading") : _("avail_add_confirm")}
                </Button>
              )}
            </DialogActions>
          </Dialog>

          <Snackbar
            open={!!snack}
            autoHideDuration={4000}
            onClose={() => setSnack("")}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert
              severity="success"
              onClose={() => setSnack("")}
              sx={{
                alignItems: "center",
                borderLeft: `3px solid ${palette.sage}`,
              }}
            >
              {snack}
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
};

export default AvailabilityManager;
