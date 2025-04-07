import { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, FormGroup, Label, Input, Button, Card, CardBody, CardTitle } from "reactstrap";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";

// Enregistrer les composants nécessaires de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StudentStats = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`http://localhost:5000/api/student-stats/${encodeURIComponent(searchTerm)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la récupération des statistiques");
      }

      setStats(data.statistics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        await fetch("http://localhost:5000/users/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      localStorage.clear();
      sessionStorage.clear();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Erreur lors de la déconnexion :", err);
      navigate("/login", { replace: true });
    }
  };

  // Fonction pour préparer les données pour les graphiques
  const prepareChartData = (distribution, labels, colors) => {
    return {
      labels: labels,
      datasets: [
        {
          label: "Répartition",
          data: labels.map((label) => distribution[label] || 0),
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.6", "1")),
          borderWidth: 1,
        },
      ],
    };
  };

  // Options pour les graphiques
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Répartition",
      },
    },
  };

  // Données pour les graphiques
  const presenceChartData = stats
    ? prepareChartData(
        stats.presenceDistribution,
        ["Toujours à l’heure", "Souvent en retard", "Absences fréquentes"],
        ["rgba(75, 192, 192, 0.6)", "rgba(255, 159, 64, 0.6)", "rgba(255, 99, 132, 0.6)"]
      )
    : null;

  const participationChartData = stats
    ? prepareChartData(
        stats.participationDistribution,
        ["Très active", "Moyenne", "Faible", "Nulle"],
        ["rgba(54, 162, 235, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(75, 192, 192, 0.6)", "rgba(153, 102, 255, 0.6)"]
      )
    : null;

  const stressChartData = stats
    ? prepareChartData(
        stats.stressDistribution,
        ["Calme", "Anxieux", "Très stressé"],
        ["rgba(54, 162, 235, 0.6)", "rgba(255, 159, 64, 0.6)", "rgba(255, 99, 132, 0.6)"]
      )
    : null;

  const engagementChartData = stats
    ? prepareChartData(
        stats.engagementDistribution,
        ["Très impliqué", "Moyennement impliqué", "Peu impliqué", "Pas du tout impliqué"],
        ["rgba(75, 192, 192, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(255, 159, 64, 0.6)", "rgba(255, 99, 132, 0.6)"]
      )
    : null;

  return (
    <Fragment>
      <Container fluid={true} className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Statistiques par Étudiant</h2>
          <Button color="secondary" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </div>

        <Form onSubmit={handleSearch}>
          <FormGroup>
            <Label for="studentSearch">Rechercher un étudiant</Label>
            <div className="d-flex">
              <Input
                id="studentSearch"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Entrez le nom de l'étudiant"
              />
              <Button type="submit" color="primary" className="ms-2" disabled={loading}>
                {loading ? "Recherche..." : "Rechercher"}
              </Button>
            </div>
          </FormGroup>
        </Form>

        {error && <div className="text-danger mt-3">{error}</div>}

        {stats && (
          <Card className="mt-4">
            <CardBody>
              <CardTitle tag="h5">Statistiques pour {stats._id}</CardTitle>
              <p>Total des évaluations : {stats.totalEvaluations}</p>
              <p>Concentration moyenne : {stats.avgConcentration || "Non disponible"}</p>

              <div className="mt-4">
                <h6>Répartition de la présence</h6>
                {presenceChartData && (
                  <Pie
                    data={presenceChartData}
                    options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: "Répartition de la présence" } } }}
                  />
                )}
              </div>

              <div className="mt-4">
                <h6>Répartition de la participation</h6>
                {participationChartData && (
                  <Bar
                    data={participationChartData}
                    options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: "Répartition de la participation" } } }}
                  />
                )}
              </div>

              <div className="mt-4">
                <h6>Répartition du stress</h6>
                {stressChartData && (
                  <Pie
                    data={stressChartData}
                    options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: "Répartition du stress" } } }}
                  />
                )}
              </div>

              <div className="mt-4">
                <h6>Répartition de l'engagement</h6>
                {engagementChartData && (
                  <Bar
                    data={engagementChartData}
                    options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: "Répartition de l'engagement" } } }}
                  />
                )}
              </div>

              <div className="mt-4">
                <h6>5 dernières évaluations</h6>
                <ul>
                  {stats.latestEvaluations.map((evaluation, index) => (
                    <li key={index}>
                      {new Date(eval.date).toLocaleDateString()} - {eval.matiere} - Réaction: {eval.reactionCorrection}
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        )}
      </Container>
    </Fragment>
  );
};

export default StudentStats;