import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Box, CircularProgress } from "@mui/material";

interface RoleGateProps {
  role: string;
  children: ReactNode;
}

const RoleGate = ({ role, children }: RoleGateProps) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile || profile.role !== role) {
    const redirect = profile?.role === "teacher" ? "/app/dashboard" : "/app/calendar";
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
};

export default RoleGate;
