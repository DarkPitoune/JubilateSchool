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
import DownloadIcon from "@mui/icons-material/DownloadOutlined";
import AddIcon from "@mui/icons-material/Add";
import { useTranslator } from "../../../components";
import { PageTitle } from "../../../components/platform";
import { palette } from "../../../components/platformTheme";
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
        <PageTitle kicker={_("accounting_kicker")} title={_("nav_accounting")} />
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
      <PageTitle
        kicker={_("accounting_kicker")}
        title={_("nav_accounting")}
        subtitle={_("accounting_subtitle")}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
          maxWidth: 1100,
        }}
      >
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
          >
            {_("accounting_download_lifetime")}
          </Button>
        </Stack>
      </Box>

      {!hasAnything ? (
        <Alert severity="info" sx={{ mb: 3, maxWidth: 1100 }}>
          {_("accounting_empty")}
        </Alert>
      ) : (
        <TableContainer sx={{ mb: 5, maxWidth: 1100 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{_("accounting_col_month")}</TableCell>
                <TableCell align="right">{_("accounting_col_bookings")}</TableCell>
                <TableCell align="right">{_("accounting_col_gross")}</TableCell>
                <TableCell align="right">{_("accounting_col_fees")}</TableCell>
                <TableCell align="right">
                  {_("accounting_col_maintenance")}
                </TableCell>
                <TableCell align="right">
                  {_("accounting_col_extraordinary")}
                </TableCell>
                <TableCell align="right">{_("accounting_col_net")}</TableCell>
                <TableCell align="right">{_("accounting_col_action")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow
                sx={{
                  "& td": {
                    fontWeight: 600,
                    backgroundColor: palette.creamDeep,
                    color: palette.ink,
                    fontVariantNumeric: "tabular-nums",
                  },
                }}
              >
                <TableCell>{_("accounting_lifetime_row")}</TableCell>
                <TableCell align="right">{data.lifetime.bookings.length}</TableCell>
                <TableCell align="right">{eur(data.lifetime.gross_cents)}</TableCell>
                <TableCell align="right">
                  {eur(data.lifetime.stripe_fees_cents)}
                </TableCell>
                <TableCell align="right">
                  {eur(data.lifetime.maintenance_cents)}
                </TableCell>
                <TableCell align="right">
                  {eur(data.lifetime.extraordinary_cents)}
                </TableCell>
                <TableCell align="right">{eur(data.lifetime.net_cents)}</TableCell>
                <TableCell align="right" />
              </TableRow>
              {data.months.map((m) => (
                <TableRow key={m.key} hover sx={{ "& td": { fontVariantNumeric: "tabular-nums" } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{m.label}</TableCell>
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
                      variant="outlined"
                      startIcon={
                        downloading === m.key ? (
                          <CircularProgress size={12} />
                        ) : (
                          <DownloadIcon sx={{ fontSize: 14 }} />
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
        {_("accounting_expenses_title")}
      </Typography>
      {expenses.length === 0 ? (
        <Alert severity="info" sx={{ maxWidth: 1100 }}>
          {_("accounting_expenses_empty")}
        </Alert>
      ) : (
        <TableContainer sx={{ maxWidth: 1100 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{_("accounting_expense_date")}</TableCell>
                <TableCell>{_("accounting_expense_label")}</TableCell>
                <TableCell align="right">
                  {_("accounting_expense_amount")}
                </TableCell>
                <TableCell align="right">{_("accounting_col_action")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell sx={{ color: palette.inkMute }}>
                    {dateFmtFr.format(new Date(`${e.incurred_on}T12:00:00`))}
                  </TableCell>
                  <TableCell>{e.label}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
                  >
                    {eur(e.amount_cents)}
                  </TableCell>
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

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{_("accounting_add_expense")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={_("accounting_expense_label")}
              value={label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLabel(e.target.value)
              }
              placeholder="Achat d'un nouveau disque dur"
              fullWidth
              autoFocus
            />
            <TextField
              label={_("accounting_expense_amount_eur")}
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmount(e.target.value)
              }
              placeholder="49,90"
              inputProps={{ inputMode: "decimal" }}
              fullWidth
            />
            <TextField
              label={_("accounting_expense_date")}
              type="date"
              value={incurredOn}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setIncurredOn(e.target.value)
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setDialogOpen(false)}
          >
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
          >
            {_("accounting_expense_save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAccounting;
