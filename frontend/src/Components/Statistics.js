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
  const [activeTab, setActiveTab] = useState("bar");

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

    // Insertion des animations CSS dans le document
    const injectStyles = () => {
      const styleEl = document.createElement('style');
      document.head.appendChild(styleEl);
      const styleSheet = styleEl.sheet;

      const keyframes = {
        fadeIn: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `,
        slideUp: `
          @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `,
        pulse: `
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.5; }
          }
        `,
      };

      Object.values(keyframes).forEach(rule => {
        styleSheet.insertRule(rule, styleSheet.cssRules.length);
      });

      // Ajouter la police Poppins
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(fontLink);
    };

    injectStyles();
  }, []);

  if (loading)
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.pulseLoader}>
          <div style={styles.pulse1}></div>
          <div style={styles.pulse2}></div>
          <div style={styles.pulse3}></div>
        </div>
        <p style={styles.loaderText}>Chargement des statistiques...</p>
      </div>
    );

  // Le reste du code reste identique...
  const chartData = {
    labels: stats.map((stat) => stat._id),
    datasets: [
      {
        label: "Évaluations totales",
        data: stats.map((stat) => stat.totalEvaluations),
        backgroundColor: "rgba(75, 192, 192, 0.8)",
        hoverBackgroundColor: "rgba(75, 192, 192, 1)",
        borderWidth: 0,
        borderRadius: 6,
        barPercentage: 0.7,
      },
      {
        label: "Concentration moyenne",
        data: stats.map((stat) => stat.avgConcentration),
        backgroundColor: "rgba(54, 162, 235, 0.8)",
        hoverBackgroundColor: "rgba(54, 162, 235, 1)",
        borderWidth: 0,
        borderRadius: 6,
        barPercentage: 0.7,
      },
    ],
  };

  const options = {
    animation: {
      duration: 1800,
      easing: "easeInOutQuint",
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { 
            size: 12,
            family: "'Poppins', sans-serif" 
          }
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleFont: { 
          size: 14, 
          family: "'Poppins', sans-serif",
          weight: "bold" 
        },
        bodyFont: { 
          size: 13, 
          family: "'Poppins', sans-serif" 
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw !== null ? context.raw : 'N/A';
            return `${label}: ${value}`;
          }
        }
      },
      title: {
        display: true,
        text: "Statistiques des Évaluations par Classe",
        font: { 
          size: 20, 
          weight: "600", 
          family: "'Poppins', sans-serif" 
        },
        padding: { bottom: 20 },
        color: "#333",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 11, family: "'Poppins', sans-serif" },
          color: "#555",
          padding: 8,
        },
        grid: {
          color: "rgba(200,200,200,0.15)",
          borderDash: [5, 5],
        },
      },
      x: {
        ticks: {
          font: { size: 11, family: "'Poppins', sans-serif" },
          color: "#555",
          padding: 8,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const renderStatsCards = () => {
    if (!stats || stats.length === 0) return null;
    
    // Calcul des moyennes globales
    const totalEvals = stats.reduce((acc, curr) => acc + curr.totalEvaluations, 0);
    const avgConcentration = stats.reduce((acc, curr) => acc + curr.avgConcentration, 0) / stats.length;
    
    return (
      <div style={styles.statsCardsContainer}>
        <div style={styles.statsCard}>
          <div style={styles.statsCardIcon}>📊</div>
          <div style={styles.statsCardContent}>
            <h3 style={styles.statsCardValue}>{totalEvals}</h3>
            <p style={styles.statsCardLabel}>Évaluations totales</p>
          </div>
        </div>
        
        <div style={styles.statsCard}>
          <div style={styles.statsCardIcon}>🧠</div>
          <div style={styles.statsCardContent}>
            <h3 style={styles.statsCardValue}>{avgConcentration.toFixed(1)}</h3>
            <p style={styles.statsCardLabel}>Concentration moyenne</p>
          </div>
        </div>
        
        <div style={styles.statsCard}>
          <div style={styles.statsCardIcon}>👥</div>
          <div style={styles.statsCardContent}>
            <h3 style={styles.statsCardValue}>{stats.length}</h3>
            <p style={styles.statsCardLabel}>Classes évaluées</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>Tableau de bord des statistiques</h1>
        <p style={styles.pageSubtitle}>Vue d'ensemble des performances des classes</p>
        
        {renderStatsCards()}
        
        <div style={styles.tabsContainer}>
          <button 
            style={{...styles.tabButton, ...(activeTab === 'bar' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('bar')}
          >
            Graphique à barres
          </button>
        
        </div>
        
        {activeTab === 'bar' ? (
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>📊 Distribution par classe</h2>
            <div style={styles.chartContainer}>
              <Bar data={chartData} options={options} />
            </div>
          </div>
        ) : (
          <div style={styles.tableCard}>
            <h2 style={styles.chartTitle}>📋 Données détaillées</h2>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Classe</th>
                    <th style={styles.tableHeader}>Évaluations</th>
                    <th style={styles.tableHeader}>Concentration</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => (
                    <tr key={index} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                      <td style={styles.tableCell}>{stat._id}</td>
                      <td style={styles.tableCell}>{stat.totalEvaluations}</td>
                      <td style={styles.tableCell}>{stat.avgConcentration.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  // Styles inchangés...
  pageWrapper: {
    background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)",
    minHeight: "100vh",
    padding: "30px 15px",
    fontFamily: "'Poppins', 'Helvetica Neue', Arial, sans-serif",
  },
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    animation: "fadeIn 1s ease-in-out",
  },
  pageTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: "8px",
    textAlign: "center",
  },
  pageSubtitle: {
    fontSize: "16px",
    color: "#7f8c8d",
    marginBottom: "30px",
    textAlign: "center",
  },
  statsCardsContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "30px",
  },
  statsCard: {
    flex: "1 0 250px",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    cursor: "default",
    border: "1px solid rgba(0,0,0,0.05)",
    animation: "slideUp 0.8s ease-out forwards",
    opacity: 0,
    animationDelay: "0.3s",
  },
  statsCardIcon: {
    fontSize: "28px",
    marginRight: "15px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(75, 192, 192, 0.15)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  statsCardContent: {
    flex: 1,
  },
  statsCardValue: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#333",
    margin: 0,
    marginBottom: "4px",
  },
  statsCardLabel: {
    fontSize: "14px",
    color: "#7f8c8d",
    margin: 0,
  },
  tabsContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  tabButton: {
    padding: "12px 20px",
    border: "none",
    background: "transparent",
    borderRadius: "6px",
    margin: "0 5px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s ease",
    color: "#7f8c8d",
    fontFamily: "'Poppins', sans-serif",
  },
  activeTab: {
    background: "white",
    color: "#2c3e50",
    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
  },
  chartCard: {
    background: "white",
    borderRadius: "12px",
    padding: "25px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    animation: "slideUp 0.8s ease-out forwards",
    opacity: 0,
    animationDelay: "0.5s",
  },
  chartTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: "20px",
  },
  chartContainer: {
    height: "400px",
    position: "relative",
  },
  tableCard: {
    background: "white",
    borderRadius: "12px",
    padding: "25px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    animation: "slideUp 0.8s ease-out forwards",
    opacity: 0,
    animationDelay: "0.5s",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  tableHeader: {
    padding: "12px 15px",
    borderBottom: "2px solid #f1f1f1",
    color: "#333",
    fontWeight: "600",
    fontSize: "14px",
  },
  tableRowEven: {
    background: "#ffffff",
  },
  tableRowOdd: {
    background: "#f9fafb",
  },
  tableCell: {
    padding: "12px 15px",
    borderBottom: "1px solid #f1f1f1",
    color: "#2c3e50",
    fontSize: "14px",
  },
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
  },
  pulseLoader: {
    display: "flex",
    alignItems: "center",
  },
  pulse1: {
    width: "12px",
    height: "12px",
    background: "rgba(75, 192, 192, 0.8)",
    borderRadius: "50%",
    marginRight: "6px",
    animation: "pulse 1.5s infinite ease-in-out",
  },
  pulse2: {
    width: "12px",
    height: "12px",
    background: "rgba(75, 192, 192, 0.8)",
    borderRadius: "50%",
    marginRight: "6px",
    animation: "pulse 1.5s infinite ease-in-out 0.3s",
  },
  pulse3: {
    width: "12px",
    height: "12px",
    background: "rgba(75, 192, 192, 0.8)",
    borderRadius: "50%",
    animation: "pulse 1.5s infinite ease-in-out 0.6s",
  },
  loaderText: {
    marginTop: "15px",
    fontSize: "15px",
    color: "#7f8c8d",
    fontWeight: "500",
  },
};

export default Statistics;