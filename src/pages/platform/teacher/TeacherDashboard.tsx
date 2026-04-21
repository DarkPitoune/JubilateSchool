import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Button,
  TextField,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import EventIcon from "@mui/icons-material/EventOutlined";
import PendingActionsIcon from "@mui/icons-material/PendingOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutline";
import EuroIcon from "@mui/icons-material/EuroOutlined";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslator } from "../../../components";
import { PageTitle, StatCard, StatusChip } from "../../../components/platform";
import { palette } from "../../../components/platformTheme";
import { useLang } from "../../../hooks/useLang";
import {
  useDashboard,
  usePricing,
  useUpdatePricing,
} from "../../../hooks/useQueries";
import { formatCounterpartHint } from "../../../lib/timezone";
import { fullName } from "../../../types";

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
      <PageTitle
        kicker={_("dashboard_kicker")}
        title={_("dashboard_title")}
        subtitle={_("dashboard_subtitle")}
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 5, maxWidth: 1100 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={_("dashboard_upcoming")}
                value={upcomingBookings.length}
                icon={<EventIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={_("dashboard_pending")}
                value={pendingBookings.length}
                icon={<PendingActionsIcon />}
                pulse={pendingBookings.length > 0}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={_("dashboard_students")}
                value={studentCount}
                icon={<PeopleIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <RateCard
                currentRate={currentRate}
                editing={editingRate}
                rateInput={rateInput}
                setRateInput={setRateInput}
                onEdit={handleEditRate}
                onSave={handleSaveRate}
                onCancel={() => setEditingRate(false)}
                saving={updatePricing.isPending}
                label={_("dashboard_default_rate")}
              />
            </Grid>
          </Grid>

          <Snackbar
            open={snackOpen}
            autoHideDuration={3000}
            onClose={() => setSnackOpen(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert
              icon={<HandDrawnCheck />}
              severity="success"
              onClose={() => setSnackOpen(false)}
              sx={{
                alignItems: "center",
                borderLeft: `3px solid ${palette.sage}`,
              }}
            >
              {_("dashboard_rate_saved")}
            </Alert>
          </Snackbar>

          {pendingBookings.length > 0 && (
            <Box sx={{ mb: 5, maxWidth: 1100 }}>
              <SectionHeading title={_("dashboard_pending_requests")} />
              {pendingBookings.map((booking) => (
                <Card key={booking.id} sx={{ mb: 1 }}>
                  <CardContent
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.5,
                      "&:last-child": { pb: 1.5 },
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{ fontWeight: 500, color: palette.ink }}
                        noWrap
                      >
                        {fullName(booking.profiles)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: palette.inkMute }}
                        noWrap
                      >
                        {format(new Date(booking.start_time), "PPPp", { locale })}{" "}
                        — 1h
                      </Typography>
                      {booking.profiles?.timezone && (
                        <Typography
                          variant="caption"
                          sx={{ color: palette.inkFaint }}
                        >
                          {formatCounterpartHint(
                            booking.start_time,
                            booking.profiles.timezone,
                            lang,
                            locale
                          )}
                        </Typography>
                      )}
                      {booking.note && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: palette.inkMute,
                            fontStyle: "italic",
                            mt: 0.5,
                          }}
                        >
                          {booking.note}
                        </Typography>
                      )}
                    </Box>
                    <StatusChip status="pending_confirmation" />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          <Box sx={{ maxWidth: 1100 }}>
            <SectionHeading title={_("dashboard_upcoming_bookings")} />
            {upcomingBookings.length === 0 ? (
              <Typography sx={{ color: palette.inkMute, fontStyle: "italic" }}>
                {_("dashboard_no_upcoming")}
              </Typography>
            ) : (
              upcomingBookings.map((booking) => (
                <Card key={booking.id} sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          sx={{ fontWeight: 500, color: palette.ink }}
                          noWrap
                        >
                          {fullName(booking.profiles)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: palette.inkMute }}
                          noWrap
                        >
                          {format(new Date(booking.start_time), "PPPp", {
                            locale,
                          })}{" "}
                          — 1h
                        </Typography>
                        {booking.profiles?.timezone && (
                          <Typography
                            variant="caption"
                            sx={{ color: palette.inkFaint }}
                          >
                            {formatCounterpartHint(
                              booking.start_time,
                              booking.profiles.timezone,
                              lang,
                              locale
                            )}
                          </Typography>
                        )}
                      </Box>
                      <StatusChip status="confirmed" sx={{ flexShrink: 0 }} />
                    </Box>
                    {booking.zoom_meeting_link && (
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                        href={booking.zoom_meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 1.25 }}
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

const SectionHeading = ({ title }: { title: string }) => (
  <Typography
    variant="h5"
    sx={{
      mb: 2,
      fontFamily: "'Fraunces', Georgia, serif",
      fontVariationSettings: "'opsz' 72",
      fontSize: "1.35rem",
      color: palette.ink,
    }}
  >
    {title}
  </Typography>
);

const HandDrawnCheck = () => (
  <Box
    component="svg"
    className="js-check-draw"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    aria-hidden="true"
    sx={{ display: "block" }}
  >
    <path d="M4 12.5 L10 18 L20 6" />
  </Box>
);

interface RateCardProps {
  currentRate: number | null;
  editing: boolean;
  rateInput: string;
  setRateInput: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  label: string;
}

const RateCard = ({
  currentRate,
  editing,
  rateInput,
  setRateInput,
  onEdit,
  onSave,
  onCancel,
  saving,
  label,
}: RateCardProps) => (
  <Card
    sx={{
      p: { xs: 2, sm: 2.5 },
      position: "relative",
      cursor: "default",
      "&:hover": {
        transform: "translateY(-1px)",
        borderColor: palette.hairlineStrong,
        boxShadow: "0 1px 0 rgba(26, 31, 62, 0.04)",
      },
    }}
  >
    <Box
      sx={{
        position: "absolute",
        top: 14,
        right: 14,
        color: palette.inkFaint,
        "& svg": { width: 18, height: 18 },
      }}
    >
      <EuroIcon />
    </Box>
    <Box
      sx={{
        fontSize: "0.66rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: palette.inkMute,
        fontWeight: 500,
        mb: 1.4,
      }}
    >
      {label}
    </Box>
    {editing ? (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <TextField
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          type="number"
          size="small"
          inputProps={{ step: "0.01", min: "0" }}
          sx={{ width: 100 }}
          autoFocus
        />
        <IconButton
          size="small"
          onClick={onSave}
          disabled={saving}
          sx={{ color: palette.sage }}
        >
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onCancel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    ) : (
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
        <Box
          sx={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontVariationSettings: "'opsz' 144",
            fontWeight: 400,
            fontSize: "2.5rem",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: palette.ink,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {currentRate != null ? currentRate.toFixed(0) : "—"}
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "1.25rem",
            color: palette.inkMute,
            fontWeight: 300,
          }}
        >
          €/h
        </Box>
        <IconButton
          size="small"
          onClick={onEdit}
          sx={{ ml: "auto", color: palette.inkMute }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>
    )}
  </Card>
);

export default TeacherDashboard;
