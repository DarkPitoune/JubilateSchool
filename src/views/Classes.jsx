import { forwardRef, useEffect } from "react";
import $ from "jquery";

import { Grid, Typography, useMediaQuery, useTheme } from "@mui/material";

import { Card, useTranslator } from "../components";

const ClassGrid = () => {
  const _ = useTranslator();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));

  useEffect(() => {
    // Make all of the classes the same size
    let maxSize = 0;
    $(".course").each((i, obj) => {
      if (maxSize <= obj.clientHeight) {
        maxSize = obj.clientHeight;
      }
    });
    $(".course").outerHeight(maxSize);
  }, []);

  return (
    <Grid container spacing={bigScreen ? 2 : 1} mb={4}>
      <Grid item xs={12} sm={6}>
        <Card
          className="course"
          title={_("class_1_title")}
          description={_("class_1_description")}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card
          className="course"
          title={_("class_2_title")}
          description={_("class_2_description")}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card
          className="course"
          title={_("class_3_title")}
          description={_("class_3_description")}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card
          className="course"
          title={_("class_4_title")}
          description={_("class_4_description")}
        />
      </Grid>
    </Grid>
  );
};

const Classes = forwardRef((props, ref) => {
  const _ = useTranslator();
  return (
    <section id={props.id} ref={ref} className="scroll-child">
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
