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
        <p style={{ marginTop: "10px", fontSize: "18px", color: "#555" }}>Chargement des statistiques...</p>
      </div>
    );

  const chartData = {
    labels: stats.map(stat => stat._id),
    datasets: [
      {
        label: "Évaluations totales",
        data: stats.map(stat => stat.totalEvaluations),
        backgroundColor: "#FFD700",
        borderRadius: 5,
      },
      {
        label: "Concentration moyenne",
        data: stats.map(stat => stat.avgConcentration),
        backgroundColor: "#4B9CD3",
        borderRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#333",
          font: { size: 14, weight: "bold" },
        },
      },
      title: {
        display: true,
        text: "Statistiques des Évaluations par Classe",
        color: "#333",
        font: { size: 20 },
        padding: { top: 10, bottom: 20 },
      },
    },
    scales: {
      x: {
        ticks: { color: "#444" },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#444" },
        grid: {
          color: "#e0e0e0",
          borderDash: [4, 4],
        },
      },
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 Statistiques  par Classe</h2>
      <div style={styles.chartCard}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

// 🎨 Style intelligent et épuré
const styles = {
  container: {
    padding: "30px 20px",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  title: {
    color: "#1E90FF",
    textAlign: "center",
    marginBottom: "30px",
    fontSize: "26px",
    fontWeight: "600",
  },
  chartCard: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.3s ease",
  },
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "100px",
  },
  loader: {
    width: "50px",
    height: "50px",
    border: "6px solid #f3f3f3",
    borderTop: "6px solid #1E90FF",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

export default Statistics;
