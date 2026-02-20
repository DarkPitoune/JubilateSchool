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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PeopleIcon from "@mui/icons-material/People";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslator } from "../../components";
import CounterpartClock from "../../components/CounterpartClock";
import { usePushSubscription } from "../../hooks/usePushSubscription";
import { supabase } from "../../lib/supabase";

const DRAWER_WIDTH = 240;

const PlatformLayout = () => {
  const _ = useTranslator();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const isTeacher = profile?.role === "teacher";
  usePushSubscription(profile?.id);

  // Fetch counterpart timezone
  const [counterpartTz, setCounterpartTz] = useState<string | null>(null);
  useEffect(() => {
    if (!profile) return;
    if (isTeacher) {
      // Teacher sees France time (most students are there)
      setCounterpartTz("Europe/Paris");
    } else {
      // Student fetches the teacher's timezone
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
  }, [profile, isTeacher]);

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

  const navLinks = isTeacher ? teacherLinks : studentLinks;

  const handleNav = (path: string) => {
    navigate(path);
    if (!bigScreen) setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
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

        <Box sx={{ flex: 1, p: { xs: 2.5, sm: 3 }, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default PlatformLayout;
