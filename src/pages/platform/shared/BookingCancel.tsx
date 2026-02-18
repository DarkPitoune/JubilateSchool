import { Link as RouterLink } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { useTranslator } from "../../../components";

const BookingCancel = () => {
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
          <CancelOutlinedIcon
            sx={{ fontSize: 64, color: "#ed6c02", mb: 2 }}
          />
          <Typography variant="h4" sx={{ mb: 2, color: "#030340" }}>
            {_("booking_cancel_title")}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: "#666" }}>
            {_("booking_cancel_description")}
          </Typography>
          <Button
            component={RouterLink}
            to="/app/calendar"
            variant="contained"
          >
            {_("booking_back_to_calendar")}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BookingCancel;
