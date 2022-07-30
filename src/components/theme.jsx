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
        fontFamily: "'Kalam', cursive",
        textShadow: "0 0 10px #030340",
        color: "#ffffff",
      },
      h3: {
        marginBotton: "2em",
        fontFamily: "'Kalam', cursive",
        textShadow: "0 0 10px #030340",
        color: "#ffffff",
      },
      h4: {
        fontFamily: "'Kalam', cursive",
        color: "#030340",
      },
      subtitle2: {
        color: "#888888",
        fontStyle: "italic",
      },
      body1: {
        fontSize: "1.3rem",
        lineHeight: "1.2",
      },
    },
    breakpoints: {
      values: {
        xs: 600,
        sm: 830,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
  })
);

export default theme;
