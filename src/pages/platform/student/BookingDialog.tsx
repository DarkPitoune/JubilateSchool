import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslator } from "../../../components";
import type { FreeWindow, Pricing } from "../../../types";

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  window: FreeWindow;
  pricing: Pricing;
  onBooked: () => void;
}

const BookingDialog = ({ open, onClose, window: freeWindow, pricing, onBooked }: BookingDialogProps) => {
  const _ = useTranslator();
  const { profile } = useAuth();
  const locale = profile?.preferred_lang === "en" ? enUS : fr;

  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Generate available start times (15-min steps within the free window)
  const startOptions = useMemo(() => {
    if (!freeWindow) return [];
    const opts: string[] = [];
    const windowStart = new Date(freeWindow.start).getTime();
    const windowEnd = new Date(freeWindow.end).getTime();
    const step = 15 * 60 * 1000; // 15 min

    for (let t = windowStart; t < windowEnd - step; t += step) {
      opts.push(new Date(t).toISOString());
    }
    return opts;
  }, [freeWindow]);

  // Available durations based on selected start time and remaining window space
  const durationOptions = useMemo(() => {
    if (!startTime || !freeWindow) return [];
    const start = new Date(startTime).getTime();
    const windowEnd = new Date(freeWindow.end).getTime();
    const maxMinutes = Math.floor((windowEnd - start) / 60000);
    const opts: number[] = [];
    for (let d = 15; d <= Math.min(120, maxMinutes); d += 15) {
      opts.push(d);
    }
    return opts;
  }, [startTime, freeWindow]);

  // Price calculation
  const priceCents = useMemo(() => {
    if (!pricing || !duration) return 0;
    return Math.round((duration / 60) * pricing.hourly_rate_cents);
  }, [pricing, duration]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat(profile?.preferred_lang === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: pricing?.currency || "eur",
    }).format(cents / 100);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (!startTime || !duration) {
      setError(_("booking_error_select_time"));
      setLoading(false);
      return;
    }

    const endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString();

    // Call the Edge Function to create checkout session
    const { data, error: fnError } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: {
          availability_range_id: freeWindow.rangeId,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          note: note.trim(),
        },
      }
    );

    if (fnError || data?.error) {
      setError(data?.error || _("booking_error_generic"));
      setLoading(false);
      return;
    }

    // Redirect to Stripe Checkout
    if (data?.url) {
      globalThis.location.href = data.url;
    }
  };

  const handleClose = () => {
    setStartTime("");
    setDuration(60);
    setNote("");
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

        <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
          {_("booking_window_label")}:{" "}
          {freeWindow &&
            `${format(new Date(freeWindow.start), "PPPp", { locale })} — ${format(new Date(freeWindow.end), "p", { locale })}`}
        </Typography>

        <TextField
          select
          label={_("booking_start_time")}
          fullWidth
          value={startTime}
          onChange={(e) => {
            setStartTime(e.target.value);
            // Reset duration if it no longer fits
            const start = new Date(e.target.value).getTime();
            const windowEnd = new Date(freeWindow.end).getTime();
            const maxMin = Math.floor((windowEnd - start) / 60000);
            if (duration > maxMin) setDuration(Math.min(60, maxMin));
          }}
          sx={{ mb: 2, mt: 1 }}
        >
          {startOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {format(new Date(opt), "p", { locale })}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label={_("booking_duration")}
          fullWidth
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          sx={{ mb: 2 }}
          disabled={!startTime}
        >
          {durationOptions.map((d) => (
            <MenuItem key={d} value={d}>
              {d < 60
                ? `${d} min`
                : d === 60
                  ? `1h`
                  : `${Math.floor(d / 60)}h${d % 60 > 0 ? `${d % 60}` : ""}`}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label={_("booking_note")}
          fullWidth
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mb: 2 }}
          placeholder={_("booking_note_placeholder")}
        />

        <Box
          sx={{
            bgcolor: "#f5f5f5",
            borderRadius: 1,
            p: 2,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" sx={{ color: "#030340" }}>
            {formatPrice(priceCents)}
          </Typography>
          <Typography variant="body2" sx={{ color: "#666" }}>
            {formatPrice(pricing?.hourly_rate_cents || 0)} / h
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{_("cancel")}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !startTime || !duration}
        >
          {loading ? _("loading") : _("booking_proceed_payment")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingDialog;
