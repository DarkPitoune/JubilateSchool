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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import { useStudentList } from "../../../hooks/useQueries";

const StudentList = () => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data: students = [], isLoading: loading } = useStudentList();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("students_title")}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : students.length === 0 ? (
        <Typography variant="body1" sx={{ color: "#888" }}>
          {_("students_empty")}
        </Typography>
      ) : isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {students.map((student) => {
            const lastBooking = student.bookings[0];
            return (
              <Card key={student.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {student.full_name}
                    </Typography>
                    <Chip label={`${student.totalConfirmed} ${_("students_sessions").toLowerCase()}`} size="small" color="primary" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {student.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {_("students_total_hours")}: {(student.totalMinutes / 60).toFixed(1)}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {_("students_last_booking")}: {lastBooking
                      ? format(new Date(lastBooking.start_time), "PPP", { locale })
                      : "—"}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
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
