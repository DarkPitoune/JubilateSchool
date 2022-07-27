import { useState } from "react";
import {
  useTheme,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  SwipeableDrawer,
  useMediaQuery,
} from "@mui/material";
import ExpandCircleDownIcon from "@mui/icons-material/ExpandCircleDown";
import MenuIcon from "@mui/icons-material/Menu";
import { LangSwitch, useTranslator } from "../components";

const Welcome = ({ refs }) => {
  const _ = useTranslator();

  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));

  const [openMenu, setOpenMenu] = useState(false);
  const titles = [_("classes"), _("who_am_i"), _("witnesses"), _("contact")];

  const handleMenuClick = (index) => {
    setOpenMenu(false);
    refs.current[index].scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  };

  return (
    <Box
      sx={{
        height: "100vh",
        background:
          "-webkit-linear-gradient(top, rgba(120, 141, 171, .2) 64%, rgb(120, 141, 171) 98%)",
        position: "relative",
      }}
      element="section"
    >
      <nav style={{ paddingTop: bigScreen ? "1em" : "2.5em" }}>
        <img src="/logo.png" alt="logo" style={{ height: "3.8em" }} />
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
      <img
        src="/welcome.jpg"
        alt="welcome"
        style={{
          height: "100vh",
          width: "100vw",
          opacity: ".3",
          position: "absolute",
          top: "0",
          zIndex: "-1",
          objectFit: "cover",
        }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          height: "100vh",
          textAlign: "center",
          marginX: "2em",
        }}
      >
        <Typography variant="h1">{_("main_title")}</Typography>
        <Typography variant="h3" sx={{ textAlign: "left" }}>
          {_("sub_title")}
        </Typography>
        <ExpandCircleDownIcon
          fontSize="large"
          className="scroll-arrow"
          sx={{ cursor: "pointer" }}
          color="primary"
          onClick={() => handleMenuClick(0)}
        />
      </Box>
    </Box>
  );
};

export default Welcome;
