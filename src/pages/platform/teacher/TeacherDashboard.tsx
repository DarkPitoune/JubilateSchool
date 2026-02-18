import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  type ChipProps,
} from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PeopleIcon from "@mui/icons-material/People";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useTranslator } from "../../../components";
import { useAuth } from "../../../contexts/AuthContext";
import type { Booking, BookingStatus } from "../../../types";

const statusColors: Record<BookingStatus, ChipProps["color"]> = {
  pending_confirmation: "warning",
  confirmed: "success",
  rejected: "error",
  expired: "default",
  payment_failed: "error",
};

const TeacherDashboard = () => {
  const _ = useTranslator();
  const { profile } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const locale = profile?.preferred_lang === "en" ? enUS : fr;

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date().toISOString();
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Upcoming confirmed bookings (next 7 days)
      const { data: upcoming } = await supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(full_name)")
        .eq("status", "confirmed")
        .gte("start_time", now)
        .lte("start_time", weekFromNow)
        .order("start_time", { ascending: true });

      // Pending bookings awaiting confirmation
      const { data: pending } = await supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(full_name)")
        .eq("status", "pending_confirmation")
        .order("created_at", { ascending: false });

      // Unique student count
      const { data: students } = await supabase
        .from("bookings")
        .select("student_id")
        .in("status", ["confirmed", "pending_confirmation"]);

      const uniqueStudents = new Set(students?.map((b) => b.student_id) || []);

      setUpcomingBookings((upcoming || []) as Booking[]);
      setPendingBookings((pending || []) as Booking[]);
      setStudentCount(uniqueStudents.size);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("dashboard_title")}
      </Typography>

      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
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
        <Grid item xs={12} sm={4}>
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
        <Grid item xs={12} sm={4}>
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
      </Grid>

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
                    {booking.profiles?.full_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666" }} noWrap>
                    {format(new Date(booking.start_time), "PPPp", { locale })} — {booking.duration_minutes} min
                  </Typography>
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
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, "&:last-child": { pb: 1.5 }, gap: 1, flexWrap: "wrap" }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                    {booking.profiles?.full_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666" }} noWrap>
                    {format(new Date(booking.start_time), "PPPp", { locale })} — {booking.duration_minutes} min
                  </Typography>
                </Box>
                <Chip label={_("status_confirmed")} color={statusColors.confirmed} size="small" />
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default TeacherDashboard;
