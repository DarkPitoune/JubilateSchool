import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import { useTranslator } from "../../../components";
import {
  useAccountingData,
  useAddExtraordinaryExpense,
  useDeleteExtraordinaryExpense,
  type AccountingMonth,
} from "../../../hooks/useQueries";
import type { ExtraordinaryExpense } from "../../../types";
import {
  generateLifetimeReport,
  generateMonthlyReport,
} from "../../../lib/accountingPdf";

const euroFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const eur = (cents: number) => euroFmt.format(cents / 100);

const dateFmtFr = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const AdminAccounting = () => {
  const _ = useTranslator();
  const { data, isLoading } = useAccountingData();
  const addExpense = useAddExtraordinaryExpense();
  const deleteExpense = useDeleteExtraordinaryExpense();
  const [downloading, setDownloading] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [incurredOn, setIncurredOn] = useState(todayIso);

  const resetForm = () => {
    setLabel("");
    setAmount("");
    setIncurredOn(todayIso());
  };

  const handleSave = async () => {
    const amountCents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!label.trim() || !Number.isFinite(amountCents) || amountCents < 0) return;
    await addExpense.mutateAsync({
      label: label.trim(),
      amount_cents: amountCents,
      incurred_on: incurredOn,
    });
    resetForm();
    setDialogOpen(false);
  };

  const handleMonthly = async (row: AccountingMonth) => {
    setDownloading(row.key);
    try {
      await generateMonthlyReport(row);
    } finally {
      setDownloading(null);
    }
  };

  const handleLifetime = async () => {
    if (!data) return;
    setDownloading("lifetime");
    try {
      await generateLifetimeReport(data.months, data.lifetime);
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading || !data) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
          {_("nav_accounting")}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  const hasAnything = data.months.length > 0;
  const expenses: ExtraordinaryExpense[] = data.lifetime.expenses;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("nav_accounting")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ color: "#030340" }}>
          {_("accounting_subtitle")}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            {_("accounting_add_expense")}
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleLifetime}
            disabled={downloading !== null || !hasAnything}
            sx={{ bgcolor: "#030340", "&:hover": { bgcolor: "#1a1a5c" } }}
          >
            {_("accounting_download_lifetime")}
          </Button>
        </Stack>
      </Box>

      {!hasAnything ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {_("accounting_empty")}
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{_("accounting_col_month")}</TableCell>
                <TableCell align="right">{_("accounting_col_bookings")}</TableCell>
                <TableCell align="right">{_("accounting_col_gross")}</TableCell>
                <TableCell align="right">{_("accounting_col_fees")}</TableCell>
                <TableCell align="right">{_("accounting_col_maintenance")}</TableCell>
                <TableCell align="right">{_("accounting_col_extraordinary")}</TableCell>
                <TableCell align="right">{_("accounting_col_net")}</TableCell>
                <TableCell align="right">{_("accounting_col_action")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow
                sx={{
                  "& td": { fontWeight: 700, bgcolor: "#f5f5fa", color: "#030340" },
                }}
              >
                <TableCell>{_("accounting_lifetime_row")}</TableCell>
                <TableCell align="right">{data.lifetime.bookings.length}</TableCell>
                <TableCell align="right">{eur(data.lifetime.gross_cents)}</TableCell>
                <TableCell align="right">{eur(data.lifetime.stripe_fees_cents)}</TableCell>
                <TableCell align="right">{eur(data.lifetime.maintenance_cents)}</TableCell>
                <TableCell align="right">{eur(data.lifetime.extraordinary_cents)}</TableCell>
                <TableCell align="right">{eur(data.lifetime.net_cents)}</TableCell>
                <TableCell align="right" />
              </TableRow>
              {data.months.map((m) => (
                <TableRow key={m.key} hover>
                  <TableCell>{m.label}</TableCell>
                  <TableCell align="right">{m.bookings.length}</TableCell>
                  <TableCell align="right">{eur(m.gross_cents)}</TableCell>
                  <TableCell align="right">{eur(m.stripe_fees_cents)}</TableCell>
                  <TableCell align="right">{eur(m.maintenance_cents)}</TableCell>
                  <TableCell align="right">{eur(m.extraordinary_cents)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {eur(m.net_cents)}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={
                        downloading === m.key ? (
                          <CircularProgress size={14} />
                        ) : (
                          <DownloadIcon />
                        )
                      }
                      onClick={() => handleMonthly(m)}
                      disabled={downloading !== null}
                    >
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="h6" sx={{ color: "#030340", mb: 1 }}>
        {_("accounting_expenses_title")}
      </Typography>
      {expenses.length === 0 ? (
        <Alert severity="info">{_("accounting_expenses_empty")}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{_("accounting_expense_date")}</TableCell>
                <TableCell>{_("accounting_expense_label")}</TableCell>
                <TableCell align="right">{_("accounting_expense_amount")}</TableCell>
                <TableCell align="right">{_("accounting_col_action")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    {dateFmtFr.format(new Date(`${e.incurred_on}T12:00:00`))}
                  </TableCell>
                  <TableCell>{e.label}</TableCell>
                  <TableCell align="right">{eur(e.amount_cents)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => deleteExpense.mutate(e.id)}
                      disabled={deleteExpense.isPending}
                      aria-label="delete"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{_("accounting_add_expense")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={_("accounting_expense_label")}
              value={label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              placeholder="Achat d'un nouveau disque dur"
              fullWidth
              autoFocus
            />
            <TextField
              label={_("accounting_expense_amount_eur")}
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              placeholder="49,90"
              inputProps={{ inputMode: "decimal" }}
              fullWidth
            />
            <TextField
              label={_("accounting_expense_date")}
              type="date"
              value={incurredOn}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncurredOn(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {_("accounting_expense_cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              addExpense.isPending ||
              !label.trim() ||
              !amount.trim() ||
              !incurredOn
            }
            sx={{ bgcolor: "#030340", "&:hover": { bgcolor: "#1a1a5c" } }}
          >
            {_("accounting_expense_save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAccounting;
