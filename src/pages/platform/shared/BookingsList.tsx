import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import { PageTitle, Section, StatusChip } from "../../../components/platform";
import { palette } from "../../../components/platformTheme";
import { useLang } from "../../../hooks/useLang";
import {
  useBookingsList,
  useBookingAction,
  useCancelBooking,
} from "../../../hooks/useQueries";
import { useCounterpartTz } from "../../../hooks/useCounterpartTz";
import { formatCounterpartHint } from "../../../lib/timezone";
import { fullName } from "../../../types";
import type { Booking } from "../../../types";

const CalendarFeedSection = ({ token }: { token: string }) => {
  const _ = useTranslator();
  const [copied, setCopied] = useState(false);

  const feedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?token=${token}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Accordion
      disableGutters
      sx={{
        mt: 5,
        maxWidth: 1100,
        "&::before": { display: "none" },
        boxShadow: "none",
        border: `1px solid ${palette.hairline}`,
        borderRadius: "10px !important",
        backgroundColor: palette.ivory,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography
          sx={{
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: palette.inkMute,
            fontWeight: 500,
          }}
        >
          {_("cal_feed_title")}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ color: palette.inkMute, mb: 2 }}>
          {_("cal_feed_description")}
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={feedUrl}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleCopy}
                  edge="end"
                  size="small"
                  title={_("cal_feed_copy")}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiInputBase-input": {
              fontSize: "0.8rem",
              fontFamily: "monospace",
            },
          }}
        />
        {copied && (
          <Typography
            variant="caption"
            sx={{ color: palette.sage, mt: 0.5, display: "block" }}
          >
            {_("cal_feed_copied")}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

type DialogAction = "confirm" | "reject" | "cancel";
type SectionKind = "needs_action" | "upcoming" | "awaiting" | "past";

interface RowContext {
  isTeacher: boolean;
  counterpartTz: string | null;
  lang: "fr" | "en";
  locale: typeof fr | typeof enUS;
  processing: string | null;
  kind: SectionKind;
  canCancel: (b: Booking) => boolean;
  openDialog: (b: Booking, a: DialogAction) => void;
  _: (k: string) => string;
}

const hasRowActions = (
  b: Booking,
  ctx: Pick<RowContext, "isTeacher" | "kind" | "canCancel">,
) => {
  if (ctx.kind === "needs_action") return ctx.isTeacher;
  if (ctx.kind === "upcoming")
    return !!b.zoom_meeting_link || ctx.canCancel(b);
  if (ctx.kind === "awaiting") return ctx.canCancel(b);
  return false;
};

const sectionFlags = (
  bookings: Booking[],
  ctx: Pick<RowContext, "isTeacher" | "kind" | "canCancel">,
) => {
  const showStudent = ctx.isTeacher;
  const showZoom =
    ctx.kind === "upcoming" && bookings.some((b) => b.zoom_meeting_link);
  const showActions =
    ctx.kind !== "past" && bookings.some((b) => hasRowActions(b, ctx));
  const showStatus = ctx.kind === "past" || ctx.kind === "awaiting";
  return { showStudent, showZoom, showActions, showStatus };
};

const BookingActions = ({
  b,
  ctx,
  size,
}: {
  b: Booking;
  ctx: RowContext;
  size: "small";
}) => {
  const { kind, processing, _, canCancel, openDialog, isTeacher } = ctx;
  const pending = processing === b.id;

  if (kind === "needs_action" && isTeacher) {
    return (
      <>
        <Button
          size={size}
          variant="contained"
          color="success"
          disabled={pending}
          onClick={() => openDialog(b, "confirm")}
        >
          {pending ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            _("bookings_confirm")
          )}
        </Button>
        <Button
          size={size}
          variant="contained"
          color="error"
          disabled={pending}
          onClick={() => openDialog(b, "reject")}
        >
          {pending ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            _("bookings_reject")
          )}
        </Button>
      </>
    );
  }

  if (kind === "upcoming" || kind === "awaiting") {
    return (
      <>
        {kind === "upcoming" && b.zoom_meeting_link && (
          <Button
            size={size}
            variant="contained"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            href={b.zoom_meeting_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {_("bookings_join_zoom")}
          </Button>
        )}
        {canCancel(b) && (
          <Button
            size={size}
            variant="outlined"
            disabled={pending}
            onClick={() => openDialog(b, "cancel")}
            sx={{
              borderColor: palette.brick,
              color: palette.brick,
              "&:hover": {
                borderColor: palette.brick,
                backgroundColor: palette.brickSoft,
              },
            }}
          >
            {pending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              _("bookings_cancel")
            )}
          </Button>
        )}
      </>
    );
  }

  return null;
};

const BookingsTable = ({
  bookings,
  ctx,
}: {
  bookings: Booking[];
  ctx: RowContext;
}) => {
  const { showStudent, showZoom, showActions, showStatus } = sectionFlags(
    bookings,
    ctx,
  );
  const { _, locale, lang, counterpartTz } = ctx;

  return (
    <TableContainer sx={{ overflowX: "auto", maxWidth: 1180 }}>
      <Table sx={{ minWidth: 500 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ whiteSpace: "nowrap" }}>
              {_("bookings_date")}
            </TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>
              {_("bookings_time")}
            </TableCell>
            {showStudent && <TableCell>{_("bookings_student")}</TableCell>}
            <TableCell align="right">{_("bookings_price")}</TableCell>
            {showStatus && (
              <TableCell align="right">{_("bookings_status")}</TableCell>
            )}
            {showZoom && <TableCell align="center">Zoom</TableCell>}
            {showActions && (
              <TableCell align="right">{_("bookings_actions")}</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.id} hover>
              <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                {format(new Date(b.start_time), "PPP", { locale })}
              </TableCell>
              <TableCell
                sx={{
                  whiteSpace: "nowrap",
                  color: palette.inkMute,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {format(new Date(b.start_time), "p", { locale })} —{" "}
                {format(new Date(b.end_time), "p", { locale })}
                {counterpartTz && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", color: palette.inkFaint }}
                  >
                    {formatCounterpartHint(
                      b.start_time,
                      counterpartTz,
                      lang,
                      locale,
                    )}
                  </Typography>
                )}
              </TableCell>
              {showStudent && <TableCell>{fullName(b.profiles)}</TableCell>}
              <TableCell
                align="right"
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
              >
                {new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
                  style: "currency",
                  currency: "eur",
                }).format(b.price_cents / 100)}
              </TableCell>
              {showStatus && (
                <TableCell align="right">
                  <StatusChip status={b.status} />
                </TableCell>
              )}
              {showZoom && (
                <TableCell align="center">
                  {b.status === "confirmed" && b.zoom_meeting_link && (
                    <Button
                      size="small"
                      variant="contained"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                      href={b.zoom_meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {_("bookings_join_zoom")}
                    </Button>
                  )}
                </TableCell>
              )}
              {showActions && (
                <TableCell align="right">
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.75,
                      justifyContent: "flex-end",
                    }}
                  >
                    <BookingActions b={b} ctx={ctx} size="small" />
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const BookingsCards = ({
  bookings,
  ctx,
}: {
  bookings: Booking[];
  ctx: RowContext;
}) => {
  const { _, locale, lang, counterpartTz, isTeacher, kind } = ctx;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {bookings.map((b) => {
        const showInlineStatus = kind === "past" || kind === "awaiting";
        return (
          <Card key={b.id}>
            <CardContent sx={{ pb: 1.75, "&:last-child": { pb: 1.75 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 500, color: palette.ink }}
                >
                  {format(new Date(b.start_time), "PPP", { locale })}
                </Typography>
                {showInlineStatus && <StatusChip status={b.status} />}
              </Box>
              <Typography variant="body2" sx={{ color: palette.inkMute }}>
                {format(new Date(b.start_time), "p", { locale })} —{" "}
                {format(new Date(b.end_time), "p", { locale })}
              </Typography>
              {counterpartTz && (
                <Typography
                  variant="caption"
                  sx={{ color: palette.inkFaint }}
                >
                  {formatCounterpartHint(
                    b.start_time,
                    counterpartTz,
                    lang,
                    locale,
                  )}
                </Typography>
              )}
              {isTeacher && (
                <Typography
                  variant="body2"
                  sx={{ color: palette.inkMute, mt: 0.5 }}
                >
                  {_("bookings_student")}: {fullName(b.profiles)}
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: palette.ink,
                }}
              >
                {new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
                  style: "currency",
                  currency: "eur",
                }).format(b.price_cents / 100)}
              </Typography>
              {hasRowActions(b, ctx) && (
                <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                  <BookingActions b={b} ctx={ctx} size="small" />
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

const BookingsList = () => {
  const _ = useTranslator();
  const lang = useLang();
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<DialogAction>("confirm");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTeacher = profile?.role === "teacher";
  const locale = lang === "en" ? enUS : fr;
  const counterpartTz = useCounterpartTz();

  const { data: bookings = [], isLoading: loading } = useBookingsList(
    profile?.role,
    profile?.id,
  );

  const actionMutation = useBookingAction();
  const cancelMutation = useCancelBooking();

  const canCancel = (b: Booking) => {
    if (!["pending_confirmation", "confirmed"].includes(b.status)) return false;
    if (isTeacher) return true;
    const hoursUntil =
      (new Date(b.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil >= 48;
  };

  const openDialog = (booking: Booking, action: DialogAction) => {
    setSelectedBooking(booking);
    setDialogAction(action);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleAction = async () => {
    if (!selectedBooking) return;

    closeDialog();

    if (dialogAction === "cancel") {
      cancelMutation.mutate(
        {
          bookingId: selectedBooking.id,
          priceCents: selectedBooking.price_cents,
          wasConfirmed: selectedBooking.status === "confirmed",
        },
        { onError: () => setError(_("bookings_action_error")) },
      );
    } else {
      actionMutation.mutate(
        { booking: selectedBooking, action: dialogAction as "confirm" | "reject" },
        { onError: () => setError(_("bookings_action_error")) },
      );
    }
  };

  const processing = actionMutation.isPending
    ? actionMutation.variables?.booking.id ?? null
    : cancelMutation.isPending
      ? cancelMutation.variables?.bookingId ?? null
      : null;

  const { needsAction, upcoming, awaiting, past } = useMemo(() => {
    const now = Date.now();
    const isUpcomingConfirmed = (b: Booking) =>
      b.status === "confirmed" && new Date(b.end_time).getTime() >= now;

    const needsAction = isTeacher
      ? bookings
          .filter((b) => b.status === "pending_confirmation")
          .sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime(),
          )
      : [];
    const awaiting = !isTeacher
      ? bookings
          .filter((b) => b.status === "pending_confirmation")
          .sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime(),
          )
      : [];
    const upcoming = bookings
      .filter(isUpcomingConfirmed)
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() -
          new Date(b.start_time).getTime(),
      );
    const past = bookings.filter(
      (b) =>
        b.status !== "pending_confirmation" && !isUpcomingConfirmed(b),
    );

    return { needsAction, upcoming, awaiting, past };
  }, [bookings, isTeacher]);

  const buildCtx = (kind: SectionKind): RowContext => ({
    isTeacher,
    counterpartTz,
    lang,
    locale,
    processing,
    kind,
    canCancel,
    openDialog,
    _,
  });

  const renderSection = (items: Booking[], ctx: RowContext) =>
    isMobile ? (
      <BookingsCards bookings={items} ctx={ctx} />
    ) : (
      <BookingsTable bookings={items} ctx={ctx} />
    );

  return (
    <Box>
      <PageTitle
        kicker={_("bookings_kicker")}
        title={_("bookings_title")}
        subtitle={_("bookings_subtitle")}
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : bookings.length === 0 ? (
        <Typography sx={{ color: palette.inkMute, fontStyle: "italic" }}>
          {_("bookings_empty")}
        </Typography>
      ) : (
        <>
          {needsAction.length > 0 && (
            <Section
              title={_("bookings_section_needs_action")}
              count={needsAction.length}
              collapsible={false}
            >
              {renderSection(needsAction, buildCtx("needs_action"))}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section
              title={_("bookings_section_upcoming")}
              count={upcoming.length}
            >
              {renderSection(upcoming, buildCtx("upcoming"))}
            </Section>
          )}
          {awaiting.length > 0 && (
            <Section
              title={_("bookings_section_awaiting")}
              count={awaiting.length}
            >
              {renderSection(awaiting, buildCtx("awaiting"))}
            </Section>
          )}
          {past.length > 0 && (
            <Section
              title={_("bookings_section_past")}
              count={past.length}
              defaultExpanded={false}
            >
              {renderSection(past, buildCtx("past"))}
            </Section>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogTitle>
          {dialogAction === "confirm"
            ? _("bookings_confirm_dialog_title")
            : dialogAction === "reject"
              ? _("bookings_reject_dialog_title")
              : isTeacher
                ? _("bookings_cancel_teacher_dialog_title")
                : _("bookings_cancel_dialog_title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogAction === "confirm"
              ? _("bookings_confirm_dialog_text")
              : dialogAction === "reject"
                ? _("bookings_reject_dialog_text")
                : isTeacher
                  ? _("bookings_cancel_teacher_dialog_text")
                  : _("bookings_cancel_dialog_text")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={closeDialog}>
            {_("cancel")}
          </Button>
          <Button
            onClick={handleAction}
            color={dialogAction === "confirm" ? "success" : "error"}
            variant="contained"
          >
            {dialogAction === "confirm"
              ? _("bookings_confirm")
              : dialogAction === "reject"
                ? _("bookings_reject")
                : _("bookings_cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      {profile?.personal_access_token && (
        <CalendarFeedSection token={profile.personal_access_token} />
      )}
    </Box>
  );
};

export default BookingsList;
