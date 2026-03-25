import { useState } from "react";
import { fullName } from "../../../types";
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
  IconButton,
  TextField,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import { useStudentList, useUpdateStudentRate } from "../../../hooks/useQueries";

const StudentList = () => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data: students = [], isLoading: loading } = useStudentList();
  const updateRate = useUpdateStudentRate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const rateLabel = (rateCents: number | null) => {
    if (rateCents === null) return _("students_rate_default");
    if (rateCents === 0) return _("students_rate_free");
    return `${rateCents / 100} €/h`;
  };

  const handleSave = (studentId: string) => {
    const trimmed = editValue.trim();
    let rateCents: number | null;
    if (trimmed === "" || isNaN(Number(trimmed))) {
      rateCents = null;
    } else {
      rateCents = Math.round(Number(trimmed) * 100);
    }
    updateRate.mutate({ studentId, rateCents });
    setEditingId(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const startEdit = (studentId: string, rateCents: number | null) => {
    setEditingId(studentId);
    setEditValue(rateCents === null ? "" : String(rateCents / 100));
  };

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
            const isEditing = editingId === student.id;
            return (
              <Card key={student.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {fullName(student)}
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
                  <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {_("students_hourly_rate")}:
                    </Typography>
                    {isEditing ? (
                      <>
                        <TextField
                          type="number"
                          size="small"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          sx={{ width: 90 }}
                          inputProps={{ min: 0, step: 1 }}
                          autoFocus
                        />
                        <IconButton size="small" onClick={() => handleSave(student.id)} color="success">
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={handleCancel}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {rateLabel(student.custom_hourly_rate_cents)}
                        </Typography>
                        <IconButton size="small" onClick={() => startEdit(student.id, student.custom_hourly_rate_cents)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
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
                <TableCell sx={{ color: "white" }}>{_("students_hourly_rate")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => {
                const lastBooking = student.bookings[0];
                const isEditing = editingId === student.id;
                return (
                  <TableRow key={student.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{fullName(student)}</TableCell>
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
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {isEditing ? (
                          <>
                            <TextField
                              type="number"
                              size="small"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              sx={{ width: 90 }}
                              inputProps={{ min: 0, step: 1 }}
                              autoFocus
                            />
                            <IconButton size="small" onClick={() => handleSave(student.id)} color="success">
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={handleCancel}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                              {rateLabel(student.custom_hourly_rate_cents)}
                            </Typography>
                            <IconButton size="small" onClick={() => startEdit(student.id, student.custom_hourly_rate_cents)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
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
