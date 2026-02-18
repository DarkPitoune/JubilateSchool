import { Link as RouterLink } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useTranslator } from "../../../components";

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
          <CheckCircleOutlineIcon
            sx={{ fontSize: 64, color: "#4caf50", mb: 2 }}
          />
          <Typography variant="h4" sx={{ mb: 2, color: "#030340" }}>
            {_("booking_success_title")}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: "#666" }}>
            {_("booking_success_description")}
          </Typography>
          <Button
            component={RouterLink}
            to="/app/bookings"
            variant="contained"
          >
            {_("booking_view_bookings")}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookingSuccess;
