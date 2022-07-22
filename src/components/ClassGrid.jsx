import { Grid } from "@mui/material";
import Card from "./Card";

const ClassGrid = () => (
  <Grid container spacing={3} mb={4}>
    <Grid item xs={12} sm={6}>
      <Card title="TITRE" description="Un cours vraiment super intéressant" />
    </Grid>
    <Grid item xs={12} sm={6}>
      <Card title="ZBRa" description="Un autre cours vraiment cool alors" />
    </Grid>
    <Grid item xs={12} sm={6}>
      <Card title="TITRE" description="Un cours vraiment super intéressant" />
    </Grid>
    <Grid item xs={12} sm={6}>
      <Card title="ZBRa" description="Un autre cours vraiment cool alors" />
    </Grid>
  </Grid>
);

export default ClassGrid;
