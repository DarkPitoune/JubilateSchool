import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useTranslator } from "../../../components";
import { useLang } from "../../../hooks/useLang";
import { useCounterpartTz } from "../../../hooks/useCounterpartTz";
import { formatCounterpartHint } from "../../../lib/timezone";
import type { AvailabilitySlot, Pricing } from "../../../types";

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  slot: AvailabilitySlot;
  pricing: Pricing;
  couponUsed: boolean;
  onBooked: () => void;
}

const BookingDialog = ({ open, onClose, slot, pricing, couponUsed, onBooked }: BookingDialogProps) => {
  const _ = useTranslator();
  const lang = useLang();
  const locale = lang === "en" ? enUS : fr;
  const teacherTz = useCounterpartTz();

  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const slotStart = slot.start_time;
  const slotEnd = useMemo(
    () => new Date(new Date(slotStart).getTime() + 60 * 60 * 1000).toISOString(),
    [slotStart]
  );

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: pricing?.currency || "eur",
    }).format(cents / 100);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    const { data, error: fnError } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: {
          slot_id: slot.id,
          note: note.trim(),
          site_url: window.location.origin,
          ...(couponCode.trim() && { coupon_code: couponCode.trim() }),
        },
      }
    );

    if (fnError || data?.error) {
      const errKey = data?.error;
      const translated = errKey === "coupon_invalid" || errKey === "coupon_already_used"
        ? _(errKey)
        : errKey || _("booking_error_generic");
      setError(translated);
      setLoading(false);
      return;
    }

    // Free session: no Stripe redirect
    if (data?.free) {
      onBooked();
      handleClose();
      return;
    }

    // Redirect to Stripe Checkout
    if (data?.url) {
      globalThis.location.href = data.url;
    }
  };

  const handleClose = () => {
    setNote("");
    setCouponCode("");
    setError("");
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{_("booking_dialog_title")}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {slot.reserved_for_student_id && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {_("booking_reserved_for_you")}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 0.5, color: "#666" }}>
          {format(new Date(slotStart), "PPPp", { locale })}
          {" — "}
          {format(new Date(slotEnd), "p", { locale })}
        </Typography>
        {teacherTz && (
          <Typography variant="caption" sx={{ mb: 2, display: "block", color: "#999" }}>
            {formatCounterpartHint(slotStart, teacherTz, lang, locale)}
            {" — "}
            {formatCounterpartHint(slotEnd, teacherTz, lang, locale)}
          </Typography>
        )}

        <TextField
          label={_("booking_note")}
          fullWidth
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          placeholder={_("booking_note_placeholder")}
        />

        {!couponUsed && (
          <TextField
            label={_("coupon_label")}
            fullWidth
            size="small"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        <Box
          sx={{
            bgcolor: "#f5f5f5",
            borderRadius: 1,
            p: 2,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" sx={{ color: "#030340" }}>
            {pricing.hourly_rate_cents === 0
              ? _("booking_free")
              : formatPrice(pricing.hourly_rate_cents)}
          </Typography>
          {pricing.hourly_rate_cents !== 0 && (
            <Typography variant="body2" sx={{ color: "#666" }}>
              {formatPrice(pricing.hourly_rate_cents)} / h
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 0.5 }}>
        {loading && pricing.hourly_rate_cents !== 0 && (
          <Typography variant="caption" sx={{ color: "#999", textAlign: "center" }}>
            {_("booking_redirecting_stripe")}
          </Typography>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={handleClose}>{_("cancel")}</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading
              ? _("loading")
              : pricing.hourly_rate_cents === 0
              ? _("booking_proceed_free")
              : _("booking_proceed_payment")}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default BookingDialog;
