import { useState, useMemo } from "react";
import {
  Box,
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
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import { PageTitle } from "../../../components/platform";
import { palette } from "../../../components/platformTheme";
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
      .map((s) => {
        const isReservedForMe = s.reserved_for_student_id === profile?.id;
        return {
          id: `slot-${s.id}`,
          title: isReservedForMe
            ? _("booking_reserved_for_you")
            : _("booking_available"),
          start: s.start_time,
          end: slotEnd(s.start_time),
          classNames: [isReservedForMe ? "js-slot--reserved" : "js-slot--available"],
          extendedProps: { type: "available", slotId: s.id },
        };
      }),
    ...availableSlots
      .filter((s) => s.is_booked)
      .map((s) => ({
        id: `taken-${s.id}`,
        title: _("booking_taken"),
        start: s.start_time,
        end: slotEnd(s.start_time),
        classNames: ["js-slot--booked"],
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
      classNames: [
        b.status === "confirmed"
          ? "js-slot--mine-confirmed"
          : "js-slot--mine-pending",
      ],
      extendedProps: { type: "my_booking" },
    })),
  ];

  return (
    <Box>
      <PageTitle
        kicker={_("calendar_kicker")}
        title={_("booking_calendar_title")}
        subtitle={_("booking_calendar_instructions")}
      />

      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: palette.accentSofter,
          border: `1px solid rgba(200, 106, 77, 0.25)`,
          borderRadius: 2,
          maxWidth: 1180,
          display: "flex",
          gap: 1.5,
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            width: 4,
            alignSelf: "stretch",
            backgroundColor: palette.accent,
            borderRadius: 4,
            flexShrink: 0,
          }}
        />
        <Box
          sx={{
            color: palette.inkSoft,
            fontSize: "0.88rem",
            lineHeight: 1.55,
          }}
        >
          {_("booking_charity_disclaimer")}
        </Box>
      </Box>

      {loading ? (
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
              couponUsed={profile?.coupon_used ?? false}
              onBooked={handleBooked}
            />
          )}
        </>
      )}
    </Box>
  );
};

export default StudentCalendar;
