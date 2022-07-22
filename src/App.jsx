import { useState, useRef } from "react";
import {
  Button,
  ButtonGroup,
  Box,
  Typography,
  IconButton,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { ClassGrid, useTranslator, LangSwitch, Card } from "./components";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import "./App.css";

const App = () => {
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));

  const _ = useTranslator();

  const [openMenu, setOpenMenu] = useState(false);
  const titles = [
    _("classes"),
    _("who_am_i"),
    _("witnesses"),
    _("cost"),
    _("contact"),
  ];
  const titlesRef = useRef([]);
  const handleMenuClick = (index) => {
    setOpenMenu(false);
    titlesRef.current[index].scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  };

  return (
    <div className="App">
      <nav>
        <img src="/logo.png" alt="logo" style={{ height: "3em" }} />
        <ButtonGroup
          sx={{ display: bigScreen ? "block" : "none" }}
          variant="text"
          aria-label="text button group"
          size="large"
        >
          {titles.map((title, index) => (
            <Button key={title} onClick={() => handleMenuClick(index)}>
              {title}
            </Button>
          ))}
          <LangSwitch />
        </ButtonGroup>
        <IconButton
          sx={{ color: "white", display: bigScreen ? "none" : "block" }}
          onClick={() => setOpenMenu(true)}
        >
          <MenuIcon />
        </IconButton>
        <SwipeableDrawer
          anchor="right"
          open={openMenu}
          onClose={() => setOpenMenu(false)}
          onOpen={() => setOpenMenu(true)}
          PaperProps={{ bgcolor: "theme.palette.secondary" }}
        >
          <List sx={{ bgcolor: "background.paper" }}>
            {titles.map((title, index) => (
              <ListItem key={title} disablePadding>
                <ListItemButton onClick={() => handleMenuClick(index)}>
                  <ListItemText primary={title} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem>
              <LangSwitch />
            </ListItem>
          </List>
        </SwipeableDrawer>
      </nav>
      <Box sx={{ maxWidth: "70em", margin: "1em auto", padding: "1em" }}>
        <Typography
          ref={(el) => (titlesRef.current[0] = el)}
          variant="h1"
          sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
        >
          {_("classes")}
        </Typography>
        <ClassGrid />
        <Typography
          ref={(el) => (titlesRef.current[1] = el)}
          variant="h1"
          sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
        >
          {_("who_am_i")}
        </Typography>
        <Card description={_("who_am_i_description")} image="/me.jpg" />
        <Typography
          ref={(el) => (titlesRef.current[2] = el)}
          variant="h1"
          sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
        >
          {_("witnesses")}
        </Typography>
        <Card description={_("who_am_i_description")} image="/me.jpg" />
        <Typography
          ref={(el) => (titlesRef.current[3] = el)}
          variant="h1"
          sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
        >
          {_("cost")}
        </Typography>
        <Card description={_("who_am_i_description")} image="/me.jpg" />
        <Typography
          ref={(el) => (titlesRef.current[4] = el)}
          variant="h1"
          sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
        >
          {_("contact")}
        </Typography>
        <Card description={_("who_am_i_description")} image="/me.jpg" />
      </Box>
    </div>
  );
};

export default App;
