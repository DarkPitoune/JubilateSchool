import { Link as RouterLink } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTranslator } from "../../../components";
import { palette } from "../../../components/platformTheme";

const BookingSuccess = () => {
  const _ = useTranslator();

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
            component="svg"
            className="js-check-draw"
            width={48}
            height={48}
            viewBox="0 0 24 24"
            sx={{ display: "block", mx: "auto", mb: 2 }}
          >
            <path d="M4 12.5 L10 18 L20 6" />
          </Box>
          <Typography
            variant="h4"
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
            {_("booking_success_title")}
          </Typography>
          <Typography sx={{ mb: 3, color: palette.inkMute }}>
            {_("booking_success_description")}
          </Typography>
          <Button
            component={RouterLink}
            to="/app/bookings"
            variant="contained"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          >
            {_("booking_view_bookings")}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookingSuccess;
