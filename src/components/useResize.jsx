import { useEffect } from "react";
import { useTheme, useMediaQuery } from "@mui/material";

const useResize = (id) => {
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  useEffect(() => {
    document.getElementById(id).style.height = window.innerHeight + "px";
  }, [bigScreen, id]);
};

export default useResize;
