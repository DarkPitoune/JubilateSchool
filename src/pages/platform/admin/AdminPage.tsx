import { Box, Typography } from "@mui/material";
import { useTranslator } from "../../../components";
import AdminOverview from "./AdminOverview";

const AdminPage = () => {
  const _ = useTranslator();
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: "#030340", fontFamily: "'Kalam', cursive" }}>
        {_("admin_title")}
      </Typography>
      <AdminOverview />
    </Box>
  );
};

export default AdminPage;
