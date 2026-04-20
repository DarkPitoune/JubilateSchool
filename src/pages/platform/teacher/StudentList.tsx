import { useMemo, useState } from "react";
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
import { PageTitle, Section } from "../../../components/platform";
import { palette } from "../../../components/platformTheme";
import { useLang } from "../../../hooks/useLang";
import { useStudentList, useUpdateStudentRate } from "../../../hooks/useQueries";

interface StudentRowProps {
  student: ReturnType<typeof useStudentList>["data"] extends
    | readonly (infer T)[]
    | undefined
    ? T
    : never;
  isEditing: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  startEdit: (studentId: string, rateCents: number | null) => void;
  handleSave: (studentId: string) => void;
  handleCancel: () => void;
  rateLabel: (rateCents: number | null) => string;
  _: (k: string) => string;
  locale: typeof fr | typeof enUS;
}

const StudentCard = ({
  student,
  isEditing,
  editValue,
  setEditValue,
  startEdit,
  handleSave,
  handleCancel,
  rateLabel,
  _,
  locale,
}: StudentRowProps) => {
  const lastBooking = student.bookings[0];
  return (
    <Card>
      <CardContent sx={{ pb: 1.75, "&:last-child": { pb: 1.75 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 500, color: palette.ink }}
          >
            {fullName(student)}
          </Typography>
          <Chip
            label={`${student.totalConfirmed} ${_(
              "students_sessions",
            ).toLowerCase()}`}
            variant="outlined"
            size="small"
            sx={{
              color: palette.ink,
              borderColor: palette.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{ color: palette.inkSoft, fontSize: "0.82rem" }}
        >
          {student.email}
        </Typography>
        <Typography variant="body2" sx={{ color: palette.inkMute, mt: 0.5 }}>
          {_("students_total_hours")}:{" "}
          <Box
            component="span"
            sx={{ color: palette.ink, fontVariantNumeric: "tabular-nums" }}
          >
            {(student.totalMinutes / 60).toFixed(1)}h
          </Box>
        </Typography>
        <Typography variant="body2" sx={{ color: palette.inkMute, mt: 0.5 }}>
          {_("students_last_booking")}:{" "}
          {lastBooking
            ? format(new Date(lastBooking.start_time), "PPP", { locale })
            : "—"}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mt: 0.75,
            gap: 0.5,
          }}
        >
          <Typography variant="body2" sx={{ color: palette.inkMute }}>
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
              <IconButton
                size="small"
                onClick={() => handleSave(student.id)}
                sx={{ color: palette.sage }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleCancel}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: palette.ink }}>
                {rateLabel(student.custom_hourly_rate_cents)}
              </Typography>
              <IconButton
                size="small"
                onClick={() =>
                  startEdit(student.id, student.custom_hourly_rate_cents)
                }
                sx={{ color: palette.inkMute }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const StudentTableRow = ({
  student,
  isEditing,
  editValue,
  setEditValue,
  startEdit,
  handleSave,
  handleCancel,
  rateLabel,
  locale,
}: StudentRowProps) => {
  const lastBooking = student.bookings[0];
  return (
    <TableRow hover>
      <TableCell sx={{ fontWeight: 500 }}>{fullName(student)}</TableCell>
      <TableCell sx={{ color: palette.inkSoft, fontSize: "0.82rem" }}>
        {student.email}
      </TableCell>
      <TableCell
        align="center"
        sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
      >
        {student.totalConfirmed}
      </TableCell>
      <TableCell
        align="center"
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {(student.totalMinutes / 60).toFixed(1)}h
      </TableCell>
      <TableCell sx={{ whiteSpace: "nowrap", color: palette.inkMute }}>
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
              <IconButton
                size="small"
                onClick={() => handleSave(student.id)}
                sx={{ color: palette.sage }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleCancel}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "nowrap", color: palette.ink }}
              >
                {rateLabel(student.custom_hourly_rate_cents)}
              </Typography>
              <IconButton
                size="small"
                onClick={() =>
                  startEdit(student.id, student.custom_hourly_rate_cents)
                }
                sx={{ color: palette.inkMute }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
};

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

  const { active, dormant } = useMemo(() => {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const active: typeof students = [];
    const dormant: typeof students = [];
    for (const s of students) {
      const hasRecent = s.bookings.some(
        (b) => new Date(b.start_time).getTime() >= cutoff,
      );
      (hasRecent ? active : dormant).push(s);
    }
    return { active, dormant };
  }, [students]);

  const renderGroup = (group: typeof students) =>
    isMobile ? (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {group.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            isEditing={editingId === student.id}
            editValue={editValue}
            setEditValue={setEditValue}
            startEdit={startEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            rateLabel={rateLabel}
            _={_}
            locale={locale}
          />
        ))}
      </Box>
    ) : (
      <TableContainer sx={{ maxWidth: 1100 }}>
        <Table sx={{ minWidth: 500 }}>
          <TableHead>
            <TableRow>
              <TableCell>{_("students_name")}</TableCell>
              <TableCell>{_("students_email")}</TableCell>
              <TableCell align="center">{_("students_sessions")}</TableCell>
              <TableCell align="center">{_("students_total_hours")}</TableCell>
              <TableCell>{_("students_last_booking")}</TableCell>
              <TableCell>{_("students_hourly_rate")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {group.map((student) => (
              <StudentTableRow
                key={student.id}
                student={student}
                isEditing={editingId === student.id}
                editValue={editValue}
                setEditValue={setEditValue}
                startEdit={startEdit}
                handleSave={handleSave}
                handleCancel={handleCancel}
                rateLabel={rateLabel}
                _={_}
                locale={locale}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );

  return (
    <Box>
      <PageTitle
        kicker={_("students_kicker")}
        title={_("students_title")}
        subtitle={_("students_subtitle")}
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : students.length === 0 ? (
        <Typography sx={{ color: palette.inkMute, fontStyle: "italic" }}>
          {_("students_empty")}
        </Typography>
      ) : (
        <>
          {active.length > 0 && (
            <Section
              title={_("students_section_active")}
              count={active.length}
            >
              {renderGroup(active)}
            </Section>
          )}
          {dormant.length > 0 && (
            <Section
              title={_("students_section_dormant")}
              count={dormant.length}
              defaultExpanded={false}
            >
              {renderGroup(dormant)}
            </Section>
          )}
        </>
      )}
    </Box>
  );
};

export default StudentList;
