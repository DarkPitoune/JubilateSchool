import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PeopleIcon from "@mui/icons-material/People";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslator } from "../../components";
import CounterpartClock from "../../components/CounterpartClock";
import { usePushSubscription } from "../../hooks/usePushSubscription";
import { supabase } from "../../lib/supabase";

const DRAWER_WIDTH = 240;

const PlatformLayout = () => {
  const _ = useTranslator();
  const { profile, realProfile, signOut, impersonate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = realProfile?.role === "admin";
  const isImpersonating = isAdmin && profile !== realProfile;
  const isTeacher = profile?.role === "teacher";
  usePushSubscription(isAdmin ? undefined : profile?.id);

  // Fetch counterpart timezone
  const [counterpartTz, setCounterpartTz] = useState<string | null>(null);
  useEffect(() => {
    if (!profile || isAdmin && !isImpersonating) return;
    if (isTeacher) {
      setCounterpartTz("Europe/Paris");
    } else {
      supabase
        .from("profiles")
        .select("timezone")
        .eq("role", "teacher")
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.timezone) setCounterpartTz(data.timezone);
        });
    }
  }, [profile, isTeacher, isAdmin, isImpersonating]);

  const teacherLinks = [
    {
      label: _("nav_dashboard"),
      path: "/app/dashboard",
      icon: <DashboardIcon />,
    },
    {
      label: _("nav_availability"),
      path: "/app/availability",
      icon: <EventAvailableIcon />,
    },
    { label: _("nav_students"), path: "/app/students", icon: <PeopleIcon /> },
    { label: _("nav_bookings"), path: "/app/bookings", icon: <ListAltIcon /> },
  ];

  const studentLinks = [
    {
      label: _("nav_calendar"),
      path: "/app/calendar",
      icon: <CalendarMonthIcon />,
    },
    { label: _("nav_bookings"), path: "/app/bookings", icon: <ListAltIcon /> },
  ];

  const adminLinks = [
    {
      label: _("admin_title"),
      path: "/app/admin",
      icon: <AdminPanelSettingsIcon />,
    },
  ];

  const navLinks = isImpersonating
    ? (isTeacher ? teacherLinks : studentLinks)
    : isAdmin
      ? adminLinks
      : isTeacher
        ? teacherLinks
        : studentLinks;

  const handleNav = (path: string) => {
    navigate(path);
    if (!bigScreen) setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleStopImpersonating = () => {
    impersonate(null);
    navigate("/app/admin");
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ bgcolor: "#030340" }}>
        <img
          src="/logo.png"
          alt="logo"
          style={{ height: "2.5em", cursor: "pointer" }}
          onClick={() => navigate("/")}
        />
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {navLinks.map((link) => (
          <ListItemButton
            key={link.path}
            selected={location.pathname === link.path}
            onClick={() => handleNav(link.path)}
          >
            <ListItemIcon>{link.icon}</ListItemIcon>
            <ListItemText primary={link.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={() => navigate("/")}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary={_("nav_home")} />
        </ListItemButton>
        <ListItemButton onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary={_("nav_sign_out")} />
        </ListItemButton>
      </List>
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="caption" sx={{ color: "#999", fontSize: "0.7rem" }}>
          Site développé et maintenu par Pitoune
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {bigScreen ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <AppBar
          position="sticky"
          sx={{
            bgcolor: "#030340",
            color: "white",
          }}
        >
          <Toolbar>
            {!bigScreen && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="h6"
              noWrap
              sx={{ flex: 1, fontFamily: "'Kalam', cursive" }}
            >
              Jubilate School
            </Typography>
            {counterpartTz && <CounterpartClock timezone={counterpartTz} />}
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {profile?.full_name?.split(" ")[0]}
            </Typography>
          </Toolbar>
        </AppBar>

        {isImpersonating && (
          <Box
            sx={{
              bgcolor: "#ed6c02",
              color: "white",
              px: 2,
              py: 0.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Typography variant="body2">
              {_("admin_viewing_as")} <strong>{profile?.full_name}</strong> ({profile?.role})
            </Typography>
            <Chip
              label={_("admin_stop_impersonation")}
              size="small"
              onClick={handleStopImpersonating}
              sx={{ bgcolor: "white", color: "#ed6c02", fontWeight: 600, cursor: "pointer" }}
            />
          </Box>
        )}

        <Box sx={{ flex: 1, p: { xs: 2.5, sm: 3 }, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default PlatformLayout;
