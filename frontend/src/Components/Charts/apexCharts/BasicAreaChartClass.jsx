import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { Card, CardBody, Col } from "reactstrap";
import { UserRegistrationTrends, UserPredictions } from "../../../Constant/index";
import HeadingCommon from "../../../Common/Component/HeadingCommon";
import { fetchUsers } from "../../../utils/api";
import { processUserData } from "../../../utils/processData";
import axios from "axios";
import { Spinner } from "../../../AbstractElements";

const BasicAreaChartClass = ({ refreshTrigger }) => {
  const [series, setSeries] = useState([{ name: "Users", data: [] }]);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const [options, setOptions] = useState({
    chart: {
      type: "area",
      height: 350,
      zoom: {
        enabled: true,
      },
      toolbar: {
        show: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    colors: ["#6f42c1"],
    fill: {
      type: "solid",
      opacity: 0.3,
      colors: ["#6f42c1"],
    },
    stroke: {
      curve: "straight",
      width: 2,
      colors: ["#6f42c1"],
    },
    xaxis: {
      type: "datetime",
      labels: {
        format: "dd MMM",
      },
    },
    yaxis: {
      title: {
        text: "Number of Users",
      },
      labels: {
        formatter: (value) => Math.floor(value),
      },
      min: 0,
      max: undefined,
      tickAmount: 5,
    },
    tooltip: {
      x: {
        format: "dd MMM yyyy",
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
  });

  const fetchData = async () => {
    try {
      const users = await fetchUsers();
      console.log("Fetched Users:", users);
      if (users.length > 0) {
        const processedData = processUserData(users);
        console.log("Processed Data:", processedData);

        const total = processedData.reduce((sum, dataPoint) => sum + dataPoint.y, 0);
        setTotalUsers(total);

        const maxUsers = processedData.length > 0 ? Math.max(...processedData.map((dataPoint) => dataPoint.y)) : 0;
        console.log("Calculated Max Users:", maxUsers);

        setSeries([{ name: "Users", data: processedData }]);

        setOptions((prevOptions) => {
          const newMax = maxUsers > 0 ? maxUsers + Math.ceil(maxUsers * 0.1) : 10;
          const newTickAmount = Math.max(5, Math.ceil(maxUsers / 5));
          console.log("New Y-axis Max:", newMax, "New Tick Amount:", newTickAmount);

          return {
            ...prevOptions,
            yaxis: {
              ...prevOptions.yaxis,
              max: newMax,
              tickAmount: newTickAmount,
            },
          };
        });
      }

      const predictionResponse = await axios.get("http://localhost:5000/predictions");
      setPredictions(predictionResponse.data);
    } catch (error) {
      console.error("Error fetching or processing data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]); // Re-run fetchData when refreshTrigger changes

  useEffect(() => {
    console.log("Current Options:", options);
  }, [options]);

  return (
    <Col sm="12" xl="12" className="box-col-12">
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 0 20px" }}>
          <HeadingCommon Heading={UserRegistrationTrends} />
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>Total Users: {totalUsers}</div>
        </div>
        <CardBody className="pt-0">
          <div id="basic-apex">
            {loading ? (
              <div className="text-center">
                <div className="loader-box">
                  <Spinner attrSpinner={{ className: "loader-7" }} />
                </div>
              </div>
            ) : error ? (
              <div>{error}</div>
            ) : (
              <Chart options={options} series={series} type="area" height={350} />
            )}
          </div>

          <div style={{ marginTop: "20px" }}>
            {loading ? (
              <div className="text-center">
                <div className="loader-box">
                  <Spinner attrSpinner={{ className: "loader-7" }} />
                </div>
              </div>
            ) : error ? (
              <div>{error}</div>
            ) : predictions ? (
              <div>
                <HeadingCommon Heading={UserPredictions} style={{ paddingLeft: "0px" }} />
                <div className="ps-5">
                  <p>
                    Next Day ({predictions.next_day.date}): {predictions.next_day.predicted_users}{" "}
                    {predictions.next_day.uncertainty !== undefined && (
                      <span style={{ color: "#666", fontStyle: "italic" }}>
                        ± {predictions.next_day.uncertainty}
                      </span>
                    )}{" "}
                    <i className="fa fa-users"></i>
                  </p>
                  <p>
                    Next Week ({predictions.next_week.date}): {predictions.next_week.predicted_users}{" "}
                    {predictions.next_week.uncertainty !== undefined && (
                      <span style={{ color: "#666", fontStyle: "italic" }}>
                        ± {predictions.next_week.uncertainty}
                      </span>
                    )}{" "}
                    <i className="fa fa-users"></i>
                  </p>
                  <p>
                    Next Month ({predictions.next_month.date}): {predictions.next_month.predicted_users}{" "}
                    {predictions.next_month.uncertainty !== undefined && (
                      <span style={{ color: "#666", fontStyle: "italic" }}>
                        ± {predictions.next_month.uncertainty}
                      </span>
                    )}{" "}
                    <i className="fa fa-users"></i>
                  </p>
                </div>
              </div>
            ) : (
              <div>No predictions available</div>
            )}
          </div>
        </CardBody>
      </Card>
    </Col>
  );
};

export default BasicAreaChartClass;