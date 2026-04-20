import { Box } from "@mui/material";
import { useTranslator } from "../../../components";
import { PageTitle } from "../../../components/platform";
import AdminOverview from "./AdminOverview";

const AdminPage = () => {
  const _ = useTranslator();
  return (
    <Box>
      <PageTitle
        kicker={_("admin_kicker") || _("nav_dashboard")}
        title={_("admin_title")}
        subtitle={_("admin_subtitle")}
      />
      <AdminOverview />
    </Box>
  );
};

export default AdminPage;
