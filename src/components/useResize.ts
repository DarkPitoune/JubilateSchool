import { useEffect } from "react";
import { useTheme, useMediaQuery } from "@mui/material";

const useResize = (id: string) => {
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  useEffect(() => {
    const el = document.getElementById(id);
    if (el) el.style.height = window.innerHeight + "px";
  }, [bigScreen, id]);
};

export default useResize;
