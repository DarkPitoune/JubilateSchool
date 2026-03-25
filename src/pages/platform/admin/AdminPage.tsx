import {
  Box,
  Card,
  CardContent,
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
  Paper,
  Button,
  type ChipProps,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EuroIcon from "@mui/icons-material/Euro";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import { useAdminDashboard } from "../../../hooks/useQueries";
import { useAuth } from "../../../contexts/AuthContext";
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

const AdminPage = () => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;
  const navigate = useNavigate();
  const { impersonate } = useAuth();
  const { data, isLoading } = useAdminDashboard();

  const handleImpersonate = (profile: NonNullable<typeof data>["profiles"][number]) => {
    impersonate(profile);
    const dest = profile.role === "teacher" ? "/app/dashboard" : "/app/calendar";
    navigate(dest);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("admin_title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: "#030340" }} />
                  <Box>
                    <Typography variant="h4" sx={{ color: "#030340" }}>
                      {data?.studentCount ?? 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {_("admin_total_students")}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: "#2e7d32" }} />
                  <Box>
                    <Typography variant="h4" sx={{ color: "#030340" }}>
                      {data?.confirmedCount ?? 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {_("admin_confirmed_bookings")}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <EuroIcon sx={{ fontSize: 40, color: "#030340" }} />
                  <Box>
                    <Typography variant="h4" sx={{ color: "#030340" }}>
                      {((data?.revenueCents ?? 0) / 100).toFixed(0)}€
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {_("admin_revenue")}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <PendingActionsIcon sx={{ fontSize: 40, color: "#ed6c02" }} />
                  <Box>
                    <Typography variant="h4" sx={{ color: "#030340" }}>
                      {data?.pendingCount ?? 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      {_("admin_pending")}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent bookings */}
          <Typography variant="h5" sx={{ mb: 2, color: "#030340" }}>
            {_("admin_recent_bookings")}
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{_("bookings_student")}</TableCell>
                  <TableCell>{_("bookings_date")}</TableCell>
                  <TableCell>{_("bookings_duration_col")}</TableCell>
                  <TableCell>{_("bookings_price")}</TableCell>
                  <TableCell>{_("bookings_status")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.recentBookings ?? []).map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{fullName(booking.profiles)}</TableCell>
                    <TableCell>
                      {format(new Date(booking.start_time), "PPp", { locale })}
                    </TableCell>
                    <TableCell>1h</TableCell>
                    <TableCell>{(booking.price_cents / 100).toFixed(2)}€</TableCell>
                    <TableCell>
                      <Chip
                        label={_(`status_${booking.status}`)}
                        color={statusColors[booking.status]}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Users list */}
          <Typography variant="h5" sx={{ mb: 2, color: "#030340" }}>
            {_("admin_users")}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{_("first_name")} {_("last_name")}</TableCell>
                  <TableCell>{_("email")}</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>{_("bookings_actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.profiles ?? [])
                  .filter((p) => p.role !== "admin")
                  .map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{fullName(p)}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={p.role}
                          size="small"
                          color={p.role === "teacher" ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
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
      )}
    </Box>
  );
};

export default AdminPage;
