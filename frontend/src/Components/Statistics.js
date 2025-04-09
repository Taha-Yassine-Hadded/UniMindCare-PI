import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import axios from "axios";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Statistics = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/statistics");
        setStats(response.data.statistics);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loader}></div>
        <p style={styles.loaderText}>Chargement...</p>
      </div>
    );

  const chartData = {
    labels: stats.map((stat) => stat._id),
    datasets: [
      {
        label: "Évaluations totales",
        data: stats.map((stat) => stat.totalEvaluations),
        backgroundColor: "#FFD700",
        borderRadius: 4,
      },
      {
        label: "Concentration moyenne",
        data: stats.map((stat) => stat.avgConcentration),
        backgroundColor: "#1E90FF",
        borderRadius: 4,
      },
    ],
  };

  const options = {
    animation: {
      duration: 1500,
      easing: "easeInOutQuart",
    },
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: "Statistiques des Évaluations par Classe",
        font: { size: 18, weight: "600" },
        color: "#333",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 10 },
          color: "#555",
        },
        grid: {
          color: "rgba(200,200,200,0.2)",
          borderDash: [5, 5],
        },
      },
      x: {
        ticks: {
          font: { size: 10 },
          color: "#555",
        },
      },
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 Statistiques Modernes par Classe</h2>
      <div style={styles.chartContainer}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "600px",
    margin: "20px auto",
    padding: "20px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    animation: "fadeIn 1.5s ease-in-out",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  title: {
    textAlign: "center",
    color: "#1E90FF",
    marginBottom: "15px",
    fontSize: "22px",
    fontWeight: "700",
  },
  chartContainer: {
    padding: "10px",
    animation: "slideUp 1s ease-out",
  },
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "300px",
  },
  loader: {
    width: "50px",
    height: "50px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid #1E90FF",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loaderText: {
    marginTop: "10px",
    fontSize: "16px",
    color: "#333",
  },
};

// Injection des animations CSS dans le document
const styleSheet = document.styleSheets[0];
const keyframesSpin = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
const keyframesFadeIn = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`;
const keyframesSlideUp = `
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`;

if (styleSheet) {
  styleSheet.insertRule(keyframesSpin, styleSheet.cssRules.length);
  styleSheet.insertRule(keyframesFadeIn, styleSheet.cssRules.length);
  styleSheet.insertRule(keyframesSlideUp, styleSheet.cssRules.length);
}

export default Statistics;