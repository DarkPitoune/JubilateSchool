import React, { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
} from "@mui/material";
import { supabase } from "../../lib/supabase";
import { useTranslator } from "../../components";

const LoginPage = () => {
  const _ = useTranslator();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authError = location.state?.authError;
    if (authError === "otp_expired") {
      setError(_("auth_error_link_expired"));
    } else if (authError) {
      setError(_("auth_error_generic"));
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === "Email not confirmed") {
        setError(_("login_error_email_not_confirmed"));
      } else {
        setError(_("login_error"));
      }
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

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
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, textAlign: "center", color: "#030340" }}>
            {_("login_title")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label={_("email")}
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label={_("password")}
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? _("loading") : _("login_button")}
            </Button>
          </form>

          <Typography variant="body2" sx={{ textAlign: "center", color: "#666" }}>
            {_("no_account")}{" "}
            <Link component={RouterLink} to="/register" sx={{ color: "#030340" }}>
              {_("register_link")}
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ textAlign: "center", mt: 1 }}>
            <Link component={RouterLink} to="/" sx={{ color: "#888" }}>
              {_("back_to_home")}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
