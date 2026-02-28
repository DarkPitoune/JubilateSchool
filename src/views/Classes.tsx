import { forwardRef, useLayoutEffect, useRef, useCallback } from "react";

import { Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Card, useTranslator } from "../components";

const ClassGrid = () => {
  const _ = useTranslator();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const equalizeHeights = useCallback(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    // Reset heights first so we can measure natural sizes
    cards.forEach((el) => (el.style.height = "auto"));
    let maxHeight = 0;
    cards.forEach((el) => {
      if (el.clientHeight > maxHeight) {
        maxHeight = el.clientHeight;
      }
    });
    cards.forEach((el) => (el.style.height = `${maxHeight}px`));
  }, []);

  useLayoutEffect(() => {
    equalizeHeights();
    window.addEventListener("resize", equalizeHeights);
    return () => window.removeEventListener("resize", equalizeHeights);
  }, [equalizeHeights]);

  return (
    <Grid container spacing={bigScreen ? 2 : 1} mb={4}>
      <Grid item xs={12} sm={6}>
        <Card
          ref={(el) => { cardRefs.current[0] = el; }}
          className="course"
          title={_("class_1_title")}
          description={_("class_1_description")}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card
          ref={(el) => { cardRefs.current[1] = el; }}
          className="course"
          title={_("class_2_title")}
          description={_("class_2_description")}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card
          ref={(el) => { cardRefs.current[2] = el; }}
          className="course"
          title={_("class_3_title")}
          description={_("class_3_description")}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card
          ref={(el) => { cardRefs.current[3] = el; }}
          className="course"
          title={_("class_4_title")}
          description={_("class_4_description")}
        />
      </Grid>
    </Grid>
  );
};

const Classes = forwardRef<HTMLElement, { id: string }>((props, ref) => {
  const _ = useTranslator();
  return (
    <section id={props.id} ref={ref}>
      <Typography
        variant="h3"
        sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
      >
        {_("classes")}
      </Typography>
      <ClassGrid />
    </section>
  );
});

export default Classes;
