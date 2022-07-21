import { Grid, Card, Typography } from "@mui/material";

const ClassCard = (props) => {
  return (
    <Card sx={{ borderRadius: "1em", padding: "1em" }}>
      <Typography variant="h5">{props.title}</Typography>
      <Typography variant="body1">{props.description}</Typography>
    </Card>
  );
};

const ClassGrid = () => (
  <Grid container spacing={3} padding={3}>
    <Grid item xs={12} sm={6}>
      <ClassCard
        title="TITRE"
        description="Un cours vraiment super intéressant"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <ClassCard
        title="ZBRa"
        description="Un autre cours vraiment cool alors"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <ClassCard
        title="TITRE"
        description="Un cours vraiment super intéressant"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <ClassCard
        title="ZBRa"
        description="Un autre cours vraiment cool alors"
      />
    </Grid>
  </Grid>
);

export default ClassGrid;
