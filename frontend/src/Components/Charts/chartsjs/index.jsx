// src/Components/Pages/Chartsjs/index.jsx
import { Fragment } from "react";
import { Container, Row } from "reactstrap";
import { Breadcrumbs } from "../../../AbstractElements";
import BarChartClass from "./BarChart";
import DoughnutChartClass from "./DoughnutChart";
import LineChartClass from "./LineChart";
import LineChart2Class from "./LineChart2";
import PolarChartClass from "./PolarChart";
import RadarChartClass from "./RadarChart";
import UserStatistics from "./UserStatistics"; // Assurez-vous que le chemin est correct

const ChartJsContain = () => {
  return (
    <Fragment>
      <Breadcrumbs mainTitle="Chart Js" parent="Charts" title="ChartJs" />
      <Container fluid={true}>
        <Row>
          {/* Section Statistiques Utilisateurs */}
          <UserStatistics />
        </Row>
      </Container>
    </Fragment>
  );
};

export default ChartJsContain;