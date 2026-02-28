import { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Chip,
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
  type ChipProps,
} from "@mui/material";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import { useBookingsList, useBookingAction, useCancelBooking } from "../../../hooks/useQueries";
import { useCounterpartTz } from "../../../hooks/useCounterpartTz";
import { formatCounterpartHint } from "../../../lib/timezone";
import type { Booking, BookingStatus } from "../../../types";

const statusColors: Record<BookingStatus, ChipProps["color"]> = {
  pending_confirmation: "warning",
  confirmed: "success",
  rejected: "error",
  expired: "default",
  payment_failed: "error",
  cancelled_by_student: "default",
  cancelled_by_teacher: "default",
};

type DialogAction = "confirm" | "reject" | "cancel";

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

  const { data: bookings = [], isLoading: loading } = useBookingsList(profile?.role, profile?.id);

  const actionMutation = useBookingAction();
  const cancelMutation = useCancelBooking();

  const statusLabel = (status: BookingStatus) => {
    const key = `status_${status}`;
    return _(key) || status;
  };

  const canCancel = (b: Booking) => {
    if (!["pending_confirmation", "confirmed"].includes(b.status)) return false;
    if (isTeacher) return true;
    // Student: 48h+ before class
    const hoursUntil = (new Date(b.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
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
        { bookingId: selectedBooking.id },
        { onError: () => setError(_("bookings_action_error")) }
      );
    } else {
      actionMutation.mutate(
        { booking: selectedBooking, action: dialogAction as "confirm" | "reject" },
        { onError: () => setError(_("bookings_action_error")) }
      );
    }
  };

  const processing = actionMutation.isPending
    ? actionMutation.variables?.booking.id ?? null
    : cancelMutation.isPending
      ? cancelMutation.variables?.bookingId ?? null
      : null;
  const hasPendingBookings = isTeacher && bookings.some((b) => b.status === "pending_confirmation");
  const hasActions = hasPendingBookings || bookings.some((b) => canCancel(b));
  const hasZoomLinks = bookings.some((b) => b.zoom_meeting_link);

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}
      >
        {_("bookings_title")}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : bookings.length === 0 ? (
        <Typography variant="body1" sx={{ color: "#888" }}>
          {_("bookings_empty")}
        </Typography>
      ) : isMobile ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {bookings.map((b) => (
              <Card key={b.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {format(new Date(b.start_time), "PPP", { locale })}
                    </Typography>
                    <Chip
                      label={statusLabel(b.status)}
                      color={statusColors[b.status] || "default"}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(b.start_time), "p", { locale })} —{" "}
                    {format(new Date(b.end_time), "p", { locale })}
                  </Typography>
                  {counterpartTz && (
                    <Typography variant="caption" sx={{ color: "#999" }}>
                      {formatCounterpartHint(b.start_time, counterpartTz, lang, locale)}
                    </Typography>
                  )}
                  {isTeacher && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {_("bookings_student")}: {b.profiles?.full_name || "—"}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {new Intl.NumberFormat(
                      lang === "fr" ? "fr-FR" : "en-US",
                      { style: "currency", currency: "eur" }
                    ).format(b.price_cents / 100)}
                  </Typography>
                  {b.status === "confirmed" && b.zoom_meeting_link && (
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      href={b.zoom_meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ mt: 1, bgcolor: "#2D8CFF", "&:hover": { bgcolor: "#1a7ae6" } }}
                    >
                      {_("bookings_join_zoom")}
                    </Button>
                  )}
                  {(b.status === "pending_confirmation" && isTeacher || canCancel(b)) && (
                    <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                      {b.status === "pending_confirmation" && isTeacher && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            fullWidth
                            disabled={processing === b.id}
                            onClick={() => openDialog(b, "confirm")}
                          >
                            {processing === b.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              _("bookings_confirm")
                            )}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            fullWidth
                            disabled={processing === b.id}
                            onClick={() => openDialog(b, "reject")}
                          >
                            {processing === b.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              _("bookings_reject")
                            )}
                          </Button>
                        </>
                      )}
                      {canCancel(b) && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          fullWidth
                          disabled={processing === b.id}
                          onClick={() => openDialog(b, "cancel")}
                        >
                          {processing === b.id ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            _("bookings_cancel")
                          )}
                        </Button>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 500 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#030340" }}>
                  <TableCell sx={{ color: "white", whiteSpace: "nowrap" }}>{_("bookings_date")}</TableCell>
                  <TableCell sx={{ color: "white", whiteSpace: "nowrap" }}>{_("bookings_time")}</TableCell>
                  {isTeacher && (
                    <TableCell sx={{ color: "white" }}>{_("bookings_student")}</TableCell>
                  )}
                  <TableCell sx={{ color: "white" }} align="center">
                    {_("bookings_price")}
                  </TableCell>
                  <TableCell sx={{ color: "white" }} align="center">
                    {_("bookings_status")}
                  </TableCell>
                  {hasZoomLinks && (
                    <TableCell sx={{ color: "white" }} align="center">
                      Zoom
                    </TableCell>
                  )}
                  {hasActions && (
                    <TableCell sx={{ color: "white" }} align="center">
                      {_("bookings_actions")}
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {format(new Date(b.start_time), "PPP", { locale })}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {format(new Date(b.start_time), "p", { locale })} —{" "}
                      {format(new Date(b.end_time), "p", { locale })}
                      {counterpartTz && (
                        <Typography variant="caption" sx={{ display: "block", color: "#999" }}>
                          {formatCounterpartHint(b.start_time, counterpartTz, lang, locale)}
                        </Typography>
                      )}
                    </TableCell>
                    {isTeacher && (
                      <TableCell>{b.profiles?.full_name || "—"}</TableCell>
                    )}
                    <TableCell align="center">
                      {new Intl.NumberFormat(
                        lang === "fr" ? "fr-FR" : "en-US",
                        { style: "currency", currency: "eur" }
                      ).format(b.price_cents / 100)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={statusLabel(b.status)}
                        color={statusColors[b.status] || "default"}
                        size="small"
                      />
                    </TableCell>
                    {hasZoomLinks && (
                      <TableCell align="center">
                        {b.status === "confirmed" && b.zoom_meeting_link && (
                          <Button
                            size="small"
                            variant="contained"
                            href={b.zoom_meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ bgcolor: "#2D8CFF", "&:hover": { bgcolor: "#1a7ae6" }, textTransform: "none" }}
                          >
                            {_("bookings_join_zoom")}
                          </Button>
                        )}
                      </TableCell>
                    )}
                    {hasActions && (
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                          {b.status === "pending_confirmation" && isTeacher && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                disabled={processing === b.id}
                                onClick={() => openDialog(b, "confirm")}
                              >
                                {processing === b.id ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  _("bookings_confirm")
                                )}
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                disabled={processing === b.id}
                                onClick={() => openDialog(b, "reject")}
                              >
                                {processing === b.id ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  _("bookings_reject")
                                )}
                              </Button>
                            </>
                          )}
                          {canCancel(b) && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={processing === b.id}
                              onClick={() => openDialog(b, "cancel")}
                            >
                              {processing === b.id ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                _("bookings_cancel")
                              )}
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
          <Button onClick={closeDialog}>{_("cancel")}</Button>
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
    </Box>
  );
};

export default BookingsList;
