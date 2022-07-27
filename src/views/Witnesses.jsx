import { forwardRef } from "react";
import {
  Card,
  Typography,
  Avatar,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useTranslator } from "../components";

const Testimony = (name, image, text) => {
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  return (
    <Card
      className="scroll-child"
      sx={{
        minWidth: "min(60%, 60em)",
        margin: "1em",
        borderRadius: "1em",
        padding: bigScreen ? "1em" : "0.7em",
        display: "inline",
      }}
    >
      <Avatar src="/me.jpg" sx={{ display: "inline" }} />
      <Typography variant="body1">
        Alors ce que j'ai bien aimé dans ce cours c'est qu'il était vraiment
        super
      </Typography>
    </Card>
  );
};

const Witnesses = forwardRef((props, ref) => {
  const _ = useTranslator();
  return (
    <section id={props.id} ref={ref} className="scroll-child">
      <Typography
        variant="h3"
        mt={3}
        sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
      >
        {_("witnesses")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          scrollSnapType: "x mandatory",
          overflow: "auto",
        }}
      >
        {/* <Testimony />
        <Testimony />
        <Testimony /> */}
      </Box>
    </section>
  );
});

export default Witnesses;
