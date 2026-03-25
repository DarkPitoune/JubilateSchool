import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { supabase } from "../../lib/supabase";
import { useTranslator } from "../../components";

const RegisterPage = () => {
  const _ = useTranslator();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLang, setPreferredLang] = useState("fr");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          preferred_lang: preferredLang,
        },
      },
    });

    if (error) {
      setError(_("register_error"));
      setLoading(false);
    } else {
      // Notify teacher of new student (fire-and-forget)
      supabase.functions.invoke("notify-new-student", {
        body: { student_name: `${firstName} ${lastName}`.trim(), student_email: email },
      });
      navigate("/auth/verify");
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
            {_("register_title")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                label={_("first_name")}
                fullWidth
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <TextField
                label={_("last_name")}
                fullWidth
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Box>
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
              inputProps={{ minLength: 6 }}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>{_("preferred_language")}</InputLabel>
              <Select
                value={preferredLang}
                label={_("preferred_language")}
                onChange={(e) => setPreferredLang(e.target.value)}
              >
                <MenuItem value="fr">Français</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? _("loading") : _("register_button")}
            </Button>
          </form>

          <Typography variant="body2" sx={{ textAlign: "center", color: "#666" }}>
            {_("has_account")}{" "}
            <Link component={RouterLink} to="/login" sx={{ color: "#030340" }}>
              {_("login_link")}
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

export default RegisterPage;
