import { Link as RouterLink } from "react-router-dom";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import { useTranslator } from "../../components";

const VerifyEmailPage = () => {
  const _ = useTranslator();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #030340 0%, rgb(120, 141, 171) 100%)",
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: "100%" }}>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          <MarkEmailReadIcon sx={{ fontSize: 64, color: "#030340", mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 2, color: "#030340" }}>
            {_("verify_email_title")}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: "#666" }}>
            {_("verify_email_description")}
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
          >
            {_("back_to_login")}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VerifyEmailPage;
