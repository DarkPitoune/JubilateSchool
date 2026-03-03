import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AuthCallbackHandler = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const wasAuthCallback = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));

    if (params.get("error")) {
      const errorCode = params.get("error_code") || "unknown";
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/login", { state: { authError: errorCode }, replace: true });
      return;
    }

    if (params.get("access_token")) {
      wasAuthCallback.current = true;
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [navigate]);

  useEffect(() => {
    if (wasAuthCallback.current && !loading && session) {
      wasAuthCallback.current = false;
      navigate("/app", { replace: true });
    }
  }, [session, loading, navigate]);

  return null;
};

export default AuthCallbackHandler;
