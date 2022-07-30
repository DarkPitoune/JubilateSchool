import { forwardRef } from "react";
import { Typography } from "@mui/material";
import { useTranslator, Card } from "../components";

const WhoAmI = forwardRef((props, ref) => {
  const _ = useTranslator();
  return (
    <section id={props.id} ref={ref} className="scroll-child">
      <Typography
        variant="h3"
        sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
      >
        {_("who_am_i")}
      </Typography>
      <Card
        title="Emmanuelle d 'Hébrail"
        description={_("who_am_i_description")}
        image="/me.jpg"
      />
    </section>
  );
});

export default WhoAmI;
