import { Card, CardBody, Col, Row, Input, Badge } from "reactstrap";
import TotalGrowthCardHeader from "./TotalGrowthCardHeader";
import { useEffect, useState } from "react";
import axios from "axios";
import { FaCheckCircle, FaClock, FaTimesCircle, FaCalendarAlt } from "react-icons/fa";

const TotalGrowthCard = () => {
  const [stats, setStats] = useState({ total: 0, confirmed: 0, cancelled: 0, pending: 0 });
  const [period, setPeriod] = useState("month");

  // Récupère l'utilisateur depuis le localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const psychologistId = user.userId || user._id;
  const userRole = user.Role || user.role || []; // Prend le tableau Role ou role

  const getPeriodRange = () => {
    const now = new Date();
    let start, end;
    switch (period) {
      case "day":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case "week":
        const firstDay = now.getDate() - now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), firstDay);
        end = new Date(now.getFullYear(), now.getMonth(), firstDay + 7);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
        break;
      case "month":
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!psychologistId) return;
      const { start, end } = getPeriodRange();
      try {
        const res = await axios.get(
          `http://localhost:5000/api/appointments/stats/${psychologistId}?start=${start}&end=${end}`
        );
        setStats(res.data);
      } catch (err) {
        setStats({ total: 0, confirmed: 0, cancelled: 0, pending: 0 });
      }
    };
    fetchStats();
    // eslint-disable-next-line
  }, [psychologistId, period]);

  // Vérifie si l'utilisateur est un psychiatre
  if (!Array.isArray(userRole) || (!userRole.includes("psychiatre") && !userRole.includes("psychologue"))) {
    return null; // Ne rend rien si l'utilisateur n'est pas un psychiatre
  }

  // Styles avancés
  const cardStyle = {
    background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)",
    border: "none",
    borderRadius: 18,
    boxShadow: "0 4px 24px rgba(80, 112, 255, 0.10)",
    padding: "1.5rem"
  };

  const statBox = {
    borderRadius: 12,
    padding: "1.2rem",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(80,112,255,0.07)",
    display: "flex",
    alignItems: "center",
    marginBottom: 18,
    minHeight: 80
  };

  const iconStyle = {
    fontSize: 32,
    marginRight: 18
  };

  return (
    <Col xl="12" className="box-col-12">
      <Card style={cardStyle} className="total-growth">
        <TotalGrowthCardHeader stats={stats} />
        <CardBody>
          <Row className="mb-4 align-items-center">
            <Col xs="12" md="6">
              <label htmlFor="period-select" style={{ fontWeight: 600, color: "#4a6fdc" }}>
                <FaCalendarAlt style={{ marginRight: 8 }} />
                Période :
              </label>
              <Input
                type="select"
                id="period-select"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                style={{
                  width: 180,
                  display: "inline-block",
                  marginLeft: 10,
                  borderRadius: 8,
                  border: "1px solid #c7d2fe",
                  fontWeight: 500
                }}
              >
                <option value="day">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
              </Input>
            </Col>
          </Row>
          <Row>
            <Col md="3" xs="12">
              <div style={statBox}>
                <FaCalendarAlt style={{ ...iconStyle, color: "#6366f1" }} />
                <div>
                  <div style={{ fontSize: 15, color: "#6366f1", fontWeight: 600 }}>Total</div>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{stats.total}</div>
                </div>
              </div>
            </Col>
            <Col md="3" xs="12">
              <div style={statBox}>
                <FaCheckCircle style={{ ...iconStyle, color: "#22c55e" }} />
                <div>
                  <div style={{ fontSize: 15, color: "#22c55e", fontWeight: 600 }}>Confirmés</div>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>
                    {stats.confirmed}{" "}
                    <Badge color="success" pill style={{ fontSize: 12, marginLeft: 6 }}>
                      {stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
            <Col md="3" xs="12">
              <div style={statBox}>
                <FaClock style={{ ...iconStyle, color: "#fbbf24" }} />
                <div>
                  <div style={{ fontSize: 15, color: "#fbbf24", fontWeight: 600 }}>En attente</div>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>
                    {stats.pending}{" "}
                    <Badge color="warning" pill style={{ fontSize: 12, marginLeft: 6 }}>
                      {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
            <Col md="3" xs="12">
              <div style={statBox}>
                <FaTimesCircle style={{ ...iconStyle, color: "#ef4444" }} />
                <div>
                  <div style={{ fontSize: 15, color: "#ef4444", fontWeight: 600 }}>Annulés</div>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>
                    {stats.cancelled}{" "}
                    <Badge color="danger" pill style={{ fontSize: 12, marginLeft: 6 }}>
                      {stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </Col>
  );
};

export default TotalGrowthCard;