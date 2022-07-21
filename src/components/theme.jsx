import { responsiveFontSizes, createTheme } from "@mui/material";

const theme = responsiveFontSizes(
  createTheme({
    palette: {
      primary: {
        main: "#ffffff",
      },
      secondary: {
        main: "#030340",
      },
      error: {
        main: "#ff0000",
      },
    },
    typography: {
      h1: {
        fontSize: "2.5rem",
      },
    },
  })
);

export default theme;
