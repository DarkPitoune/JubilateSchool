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
        marginLeft: "1rem",
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 830,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
  })
);

export default theme;
