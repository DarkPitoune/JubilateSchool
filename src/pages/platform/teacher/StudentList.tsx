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
} from "@mui/material";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import type { Booking } from "../../../types";

interface StudentSummary {
  id: string;
  full_name: string;
  email: string;
  bookings: Booking[];
  totalConfirmed: number;
  totalMinutes: number;
}

const StudentList = () => {
  const _ = useTranslator();
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const locale = profile?.preferred_lang === "en" ? enUS : fr;

  useEffect(() => {
    const fetchStudents = async () => {
      // Get all bookings with student profiles
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, profiles!bookings_student_id_fkey(id, full_name, email)")
        .in("status", ["confirmed", "pending_confirmation"])
        .order("start_time", { ascending: false });

      if (!bookingsData) {
        setLoading(false);
        return;
      }

      // Group by student
      const studentMap = new Map<string, StudentSummary>();
      for (const booking of bookingsData as unknown as Booking[]) {
        const sid = booking.student_id;
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            id: sid,
            full_name: booking.profiles?.full_name || "",
            email: booking.profiles?.email || "",
            bookings: [],
            totalConfirmed: 0,
            totalMinutes: 0,
          });
        }
        const s = studentMap.get(sid)!;
        s.bookings.push(booking);
        if (booking.status === "confirmed") {
          s.totalConfirmed++;
          s.totalMinutes += booking.duration_minutes;
        }
      }

      setStudents(Array.from(studentMap.values()));
      setLoading(false);
    };

    fetchStudents();
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
        {_("students_title")}
      </Typography>

      {students.length === 0 ? (
        <Typography variant="body1" sx={{ color: "#888" }}>
          {_("students_empty")}
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#030340" }}>
                <TableCell sx={{ color: "white" }}>{_("students_name")}</TableCell>
                <TableCell sx={{ color: "white" }}>{_("students_email")}</TableCell>
                <TableCell sx={{ color: "white" }} align="center">
                  {_("students_sessions")}
                </TableCell>
                <TableCell sx={{ color: "white" }} align="center">
                  {_("students_total_hours")}
                </TableCell>
                <TableCell sx={{ color: "white" }}>{_("students_last_booking")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => {
                const lastBooking = student.bookings[0];
                return (
                  <TableRow key={student.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{student.full_name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell align="center">
                      <Chip label={student.totalConfirmed} size="small" color="primary" />
                    </TableCell>
                    <TableCell align="center">
                      {(student.totalMinutes / 60).toFixed(1)}h
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {lastBooking
                        ? format(new Date(lastBooking.start_time), "PPP", { locale })
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StudentList;
