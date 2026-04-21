import {
  Box,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/PeopleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutline";
import EuroIcon from "@mui/icons-material/EuroOutlined";
import PendingActionsIcon from "@mui/icons-material/PendingOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslator } from "../../../components";
import { StatCard, StatusChip } from "../../../components/platform";
import { palette } from "../../../components/platformTheme";
import { useLang } from "../../../hooks/useLang";
import { useAdminDashboard } from "../../../hooks/useQueries";
import { useAuth } from "../../../contexts/AuthContext";
import { fullName } from "../../../types";

const AdminOverview = () => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;
  const navigate = useNavigate();
  const { impersonate } = useAuth();
  const { data, isLoading } = useAdminDashboard();

  const handleImpersonate = (
    profile: NonNullable<typeof data>["profiles"][number]
  ) => {
    impersonate(profile);
    const dest = profile.role === "teacher" ? "/app/dashboard" : "/app/calendar";
    navigate(dest);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const pendingCount = data?.pendingCount ?? 0;

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 5, maxWidth: 1100 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={_("admin_total_students")}
            value={data?.studentCount ?? 0}
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={_("admin_confirmed_bookings")}
            value={data?.confirmedCount ?? 0}
            icon={<CheckCircleIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={_("admin_revenue")}
            value={Math.round((data?.revenueCents ?? 0) / 100).toLocaleString(
              lang === "fr" ? "fr-FR" : "en-US"
            )}
            unit="€"
            icon={<EuroIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label={_("admin_pending")}
            value={pendingCount}
            icon={<PendingActionsIcon />}
            pulse={pendingCount > 0}
          />
        </Grid>
      </Grid>

      <SectionHeading title={_("admin_recent_bookings")} />
      <TableContainer sx={{ mb: 5, maxWidth: 1100 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{_("bookings_student")}</TableCell>
              <TableCell>{_("bookings_date")}</TableCell>
              <TableCell>{_("bookings_duration_col")}</TableCell>
              <TableCell align="right">{_("bookings_price")}</TableCell>
              <TableCell align="right">{_("bookings_status")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.recentBookings ?? []).map((booking) => (
              <TableRow key={booking.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>
                  {fullName(booking.profiles)}
                </TableCell>
                <TableCell sx={{ color: palette.inkMute }}>
                  {format(new Date(booking.start_time), "PPp", { locale })}
                </TableCell>
                <TableCell sx={{ color: palette.inkMute }}>1h</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                  }}
                >
                  {(booking.price_cents / 100).toFixed(2)}&nbsp;€
                </TableCell>
                <TableCell align="right">
                  <StatusChip status={booking.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <SectionHeading title={_("admin_users")} />
      <TableContainer sx={{ maxWidth: 1100 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                {_("first_name")} {_("last_name")}
              </TableCell>
              <TableCell>{_("email")}</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">{_("bookings_actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.profiles ?? [])
              .filter((p) => p.role !== "admin")
              .sort((a, b) => {
                if (a.role !== b.role) return a.role === "teacher" ? -1 : 1;
                return (a.last_name ?? "").localeCompare(b.last_name ?? "");
              })
              .map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{fullName(p)}</TableCell>
                  <TableCell
                    sx={{ color: palette.inkSoft, fontSize: "0.82rem" }}
                  >
                    {p.email}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={p.role}
                      variant="outlined"
                      size="small"
                      sx={{
                        fontFamily: "'Fraunces', Georgia, serif",
                        fontSize: "0.72rem",
                        letterSpacing: "0.06em",
                        fontStyle: "normal",
                        color:
                          p.role === "teacher" ? palette.ink : palette.inkMute,
                        borderColor:
                          p.role === "teacher"
                            ? palette.ink
                            : palette.hairlineStrong,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                      onClick={() => handleImpersonate(p)}
                    >
                      {_("admin_impersonate")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

const SectionHeading = ({ title }: { title: string }) => (
  <Typography
    variant="h5"
    sx={{
      mb: 2,
      maxWidth: 1100,
      fontFamily: "'Fraunces', Georgia, serif",
      fontVariationSettings: "'opsz' 72",
      fontSize: "1.35rem",
      color: palette.ink,
    }}
  >
    {title}
  </Typography>
);

export default AdminOverview;
