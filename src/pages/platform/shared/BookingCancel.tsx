import { useEffect } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslator } from "../../../components";
import { palette } from "../../../components/platformTheme";
import { supabase } from "../../../lib/supabase";

const BookingCancel = () => {
  const _ = useTranslator();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const bookingId = searchParams.get("booking_id");
    if (!bookingId) return;

    supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId)
      .eq("status", "pending_confirmation")
      .then(({ error }) => {
        if (error) {
          console.error("Failed to cancel booking:", error);
        } else {
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }
      });
  }, [searchParams, queryClient]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Card sx={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              mx: "auto",
              mb: 2,
              borderRadius: "50%",
              border: `1.5px dashed ${palette.hairlineStrong}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: palette.inkMute,
              fontSize: "1.5rem",
            }}
          >
            ×
          </Box>
          <Typography
            sx={{
              mb: 2,
              color: palette.ink,
              fontFamily: "'Fraunces', Georgia, serif",
              fontVariationSettings: "'opsz' 96",
              fontWeight: 400,
              fontSize: "1.75rem",
              letterSpacing: "-0.01em",
            }}
          >
            {_("booking_cancel_title")}
          </Typography>
          <Typography sx={{ mb: 3, color: palette.inkMute }}>
            {_("booking_cancel_description")}
          </Typography>
          <Button
            component={RouterLink}
            to="/app/calendar"
            variant="outlined"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          >
            {_("booking_back_to_calendar")}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookingCancel;
