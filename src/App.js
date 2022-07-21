import { Button, ButtonGroup, ThemeProvider, Typography } from "@mui/material";
import { theme, ClassGrid, useTranslator } from "./components";

import "./App.css";

const App = () => {
  const translator = useTranslator();
  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <nav>
          Jubilate School
          <ButtonGroup
            variant="text"
            aria-label="text button group"
            size="large"
          >
            <Button>{translator("classes")}</Button>
            <Button>{translator("who_am_i")}</Button>
            <Button>{translator("witnesses")}</Button>
            <Button>{translator("cost")}</Button>
            <Button>{translator("contact")}</Button>
          </ButtonGroup>
        </nav>
        <Typography
          variant="h1"
          sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
        >
          {translator("classes")}
        </Typography>
        <ClassGrid />
      </ThemeProvider>
    </div>
  );
};

export default App;
