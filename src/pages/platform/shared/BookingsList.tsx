import { useEffect, useState } from "react";
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
  Chip,
  CircularProgress,
  type ChipProps,
} from "@mui/material";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import type { Booking, BookingStatus } from "../../../types";

const statusColors: Record<BookingStatus, ChipProps["color"]> = {
  pending_confirmation: "warning",
  confirmed: "success",
  rejected: "error",
  expired: "default",
  payment_failed: "error",
};

const BookingsList = () => {
  const _ = useTranslator();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const isTeacher = profile?.role === "teacher";
  const locale = profile?.preferred_lang === "en" ? enUS : fr;

  useEffect(() => {
    const fetchBookings = async () => {
      let query = supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(full_name)")
        .order("start_time", { ascending: false });

      if (!isTeacher) {
        query = query.eq("student_id", profile!.id);
      }

      const { data } = await query;
      setBookings((data || []) as Booking[]);
      setLoading(false);
    };

    fetchBookings();
  }, [profile, isTeacher]);

  const statusLabel = (status: BookingStatus) => {
    const key = `status_${status}`;
    return _(key) || status;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}
      >
        {_("bookings_title")}
      </Typography>

      {bookings.length === 0 ? (
        <Typography variant="body1" sx={{ color: "#888" }}>
          {_("bookings_empty")}
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#030340" }}>
                <TableCell sx={{ color: "white", whiteSpace: "nowrap" }}>{_("bookings_date")}</TableCell>
                <TableCell sx={{ color: "white", whiteSpace: "nowrap" }}>{_("bookings_time")}</TableCell>
                <TableCell sx={{ color: "white" }} align="center">
                  {_("bookings_duration_col")}
                </TableCell>
                {isTeacher && (
                  <TableCell sx={{ color: "white" }}>{_("bookings_student")}</TableCell>
                )}
                <TableCell sx={{ color: "white" }} align="center">
                  {_("bookings_price")}
                </TableCell>
                <TableCell sx={{ color: "white" }} align="center">
                  {_("bookings_status")}
                </TableCell>
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
                  </TableCell>
                  <TableCell align="center">{b.duration_minutes} min</TableCell>
                  {isTeacher && (
                    <TableCell>{b.profiles?.full_name || "—"}</TableCell>
                  )}
                  <TableCell align="center">
                    {new Intl.NumberFormat(
                      profile?.preferred_lang === "fr" ? "fr-FR" : "en-US",
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default BookingsList;
