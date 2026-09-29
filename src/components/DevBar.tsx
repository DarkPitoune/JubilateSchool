import { useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Profile } from "../types";

const STORAGE_KEY = "devbar:last";

const DevBar = () => {
  const { impersonate, realProfile, session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const go = async (role: "teacher" | "student") => {
    setBusy(role);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", role)
      .limit(1)
      .single();
    setBusy(null);
    if (!data) return;
    impersonate(data as Profile);
    localStorage.setItem(STORAGE_KEY, role);
    navigate(role === "teacher" ? "/app/dashboard" : "/app/calendar");
  };

  const btn = { minWidth: 0, px: 1, py: 0.25, fontSize: 11, lineHeight: 1.4 };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 9999,
        display: "flex",
        gap: 0.5,
        bgcolor: "rgba(0,0,0,0.75)",
        borderRadius: 1,
        p: 0.5,
        opacity: 0.35,
        transition: "opacity .15s",
        "&:hover": { opacity: 1 },
      }}
    >
      <Button size="small" sx={{ ...btn, color: "#fff" }} onClick={() => navigate("/?landing=1")}>
        landing
      </Button>
      <Button size="small" sx={{ ...btn, color: "#7fd" }} onClick={() => go("teacher")}>
        {busy === "teacher" ? <CircularProgress size={11} /> : "teacher"}
      </Button>
      <Button size="small" sx={{ ...btn, color: "#fd7" }} onClick={() => go("student")}>
        {busy === "student" ? <CircularProgress size={11} /> : "student"}
      </Button>
      {realProfile?.role === "admin" && (
        <Button
          size="small"
          sx={{ ...btn, color: "#f9f" }}
          onClick={() => {
            impersonate(null);
            navigate("/app/admin");
          }}
        >
          admin
        </Button>
      )}
      {!session && (
        <Button size="small" sx={{ ...btn, color: "#f88" }} onClick={() => navigate("/login")}>
          login
        </Button>
      )}
    </Box>
  );
};

export default DevBar;
