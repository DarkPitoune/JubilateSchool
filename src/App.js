import { Button, ButtonGroup, ThemeProvider, Typography } from "@mui/material";
import { theme, ClassGrid, TranslatorContextProvider, useTranslator } from "./components";

import "./App.css";

const App = () => {
  const translator = useTranslator();
  return (
    <div className="App">
      <TranslatorContextProvider>
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
          <Typography variant="h1" sx={{ textTransform: "uppercase", fontSize:"2.5rem" }}>
            {translator("classes")}
          </Typography>
          <ClassGrid />
        </ThemeProvider>
      </TranslatorContextProvider>
    </div>
  );
};

export default App;
