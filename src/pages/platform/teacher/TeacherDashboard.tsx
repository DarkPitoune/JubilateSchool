import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Button,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  type ChipProps,
} from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PeopleIcon from "@mui/icons-material/People";
import EuroIcon from "@mui/icons-material/Euro";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import { useDashboard, usePricing, useUpdatePricing } from "../../../hooks/useQueries";
import { formatCounterpartHint } from "../../../lib/timezone";
import { fullName } from "../../../types";
import type { BookingStatus } from "../../../types";

const statusColors: Record<BookingStatus, ChipProps["color"]> = {
  pending_confirmation: "warning",
  confirmed: "success",
  rejected: "error",
  expired: "default",
  payment_failed: "error",
  cancelled_by_student: "default",
  cancelled_by_teacher: "default",
};

const TeacherDashboard = () => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;

  const { data, isLoading: loading } = useDashboard();
  const { data: pricing } = usePricing();
  const updatePricing = useUpdatePricing();
  const upcomingBookings = data?.upcomingBookings ?? [];
  const pendingBookings = data?.pendingBookings ?? [];
  const studentCount = data?.studentCount ?? 0;

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);

  const currentRate = pricing ? pricing.hourly_rate_cents / 100 : null;

  const handleEditRate = () => {
    setRateInput(currentRate != null ? currentRate.toFixed(2) : "");
    setEditingRate(true);
  };

  const handleSaveRate = () => {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val < 0) return;
    updatePricing.mutate(
      { hourlyRateCents: Math.round(val * 100) },
      {
        onSuccess: () => {
          setEditingRate(false);
          setSnackOpen(true);
        },
      }
    );
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("dashboard_title")}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
      <>
      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <EventIcon sx={{ fontSize: 40, color: "#030340" }} />
              <Box>
                <Typography variant="h4" sx={{ color: "#030340" }}>
                  {upcomingBookings.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  {_("dashboard_upcoming")}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <PendingActionsIcon sx={{ fontSize: 40, color: "#ed6c02" }} />
              <Box>
                <Typography variant="h4" sx={{ color: "#030340" }}>
                  {pendingBookings.length}
                </Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  {_("dashboard_pending")}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <PeopleIcon sx={{ fontSize: 40, color: "#030340" }} />
              <Box>
                <Typography variant="h4" sx={{ color: "#030340" }}>
                  {studentCount}
                </Typography>
                <Typography variant="body2" sx={{ color: "#666" }}>
                  {_("dashboard_students")}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <EuroIcon sx={{ fontSize: 40, color: "#030340" }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {editingRate ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TextField
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      type="number"
                      size="small"
                      inputProps={{ step: "0.01", min: "0" }}
                      sx={{ width: 90 }}
                      autoFocus
                    />
                    <IconButton size="small" onClick={handleSaveRate} disabled={updatePricing.isPending} color="success">
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setEditingRate(false)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="h4" sx={{ color: "#030340" }}>
                      {currentRate != null ? `€${currentRate.toFixed(2)}` : "—"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>/h</Typography>
                    <IconButton size="small" onClick={handleEditRate} sx={{ ml: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Typography variant="body2" sx={{ color: "#666" }}>
                  {_("dashboard_default_rate")}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)}>
        <Alert severity="success" onClose={() => setSnackOpen(false)}>
          {_("dashboard_rate_saved")}
        </Alert>
      </Snackbar>

      {/* Pending requests */}
      {pendingBookings.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, color: "#030340" }}>
            {_("dashboard_pending_requests")}
          </Typography>
          {pendingBookings.map((booking) => (
            <Card key={booking.id} sx={{ mb: 1 }}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, "&:last-child": { pb: 1.5 }, gap: 1, flexWrap: "wrap" }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                    {fullName(booking.profiles)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666" }} noWrap>
                    {format(new Date(booking.start_time), "PPPp", { locale })} — 1h
                  </Typography>
                  {booking.profiles?.timezone && (
                    <Typography variant="caption" sx={{ color: "#999" }}>
                      {formatCounterpartHint(booking.start_time, booking.profiles.timezone, lang, locale)}
                    </Typography>
                  )}
                  {booking.note && (
                    <Typography variant="body2" sx={{ color: "#888", fontStyle: "italic", mt: 0.5 }}>
                      {booking.note}
                    </Typography>
                  )}
                </Box>
                <Chip label={_("status_pending_confirmation")} color="warning" size="small" />
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Upcoming bookings */}
      <Box>
        <Typography variant="h5" sx={{ mb: 2, color: "#030340" }}>
          {_("dashboard_upcoming_bookings")}
        </Typography>
        {upcomingBookings.length === 0 ? (
          <Typography variant="body1" sx={{ color: "#888" }}>
            {_("dashboard_no_upcoming")}
          </Typography>
        ) : (
          upcomingBookings.map((booking) => (
            <Card key={booking.id} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                      {fullName(booking.profiles)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }} noWrap>
                      {format(new Date(booking.start_time), "PPPp", { locale })} — 1h
                    </Typography>
                    {booking.profiles?.timezone && (
                      <Typography variant="caption" sx={{ color: "#999" }}>
                        {formatCounterpartHint(booking.start_time, booking.profiles.timezone, lang, locale)}
                      </Typography>
                    )}
                  </Box>
                  <Chip label={_("status_confirmed")} color={statusColors.confirmed} size="small" sx={{ flexShrink: 0 }} />
                </Box>
                {booking.zoom_meeting_link && (
                  <Button
                    size="small"
                    variant="contained"
                    fullWidth
                    href={booking.zoom_meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mt: 1, bgcolor: "#2D8CFF", "&:hover": { bgcolor: "#1a7ae6" }, textTransform: "none" }}
                  >
                    {_("bookings_join_zoom")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
      </>
      )}
    </Box>
  );
};

export default TeacherDashboard;
