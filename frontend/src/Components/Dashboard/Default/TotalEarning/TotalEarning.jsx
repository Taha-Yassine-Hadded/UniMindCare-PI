import { Card, CardBody, Col } from "reactstrap";
import TotalEarningCardHeader from "./TotalEarningCardHeader";
import Chart from "react-apexcharts";
import { apexMixedCharts } from "../ChartsData/ApexChart";
import TotalEarningCardFooter from "./TotalEarningCardFooter";

const TotalEarning = () => {
  return (
    <Col xl="16" lg="16" className="box-col-90 xl-160">
      <Card className="our-earning">
        <TotalEarningCardHeader />
        <CardBody className="p-0">
        </CardBody>
        <TotalEarningCardFooter />
      </Card>
    </Col>
  );
};

export default TotalEarning;