import { CardBody } from "reactstrap";
import Chart from "react-apexcharts";
import { apexDonutCharts } from "../ChartsData/ApexChart";
import { ArrowUpCircle } from "react-feather";
import DeviceList from "./DeviceList";

const UserCardBody = () => {
  return (
    <CardBody>
     
      <DeviceList />
    </CardBody>
  );
};

export default UserCardBody;