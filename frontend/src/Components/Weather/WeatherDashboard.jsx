import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody, Button, Spinner } from 'reactstrap';
import { Line } from 'react-chartjs-2';
import { H3, H4, H5, P } from '../../AbstractElements';
import { Cloud, CloudRain, Droplet, Sun, ThumbsUp, Clock, Calendar, Thermometer, Wind, Zap } from 'react-feather';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import axios from 'axios';
import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import 'aos/dist/aos.css';

// Enregistrement des composants Chart.js nécessaires
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Fonction utilitaire pour déterminer l'icône météo en fonction de la température et de l'humidité
const getWeatherIcon = (temperature, humidity) => {
  if (temperature > 28) return <Sun className="weather-icon sun" size={40} />;
  if (humidity > 70) return <CloudRain className="weather-icon rain" size={40} />;
  if (humidity > 50) return <Cloud className="weather-icon cloud" size={40} />;
  return <Sun className="weather-icon sun" size={40} />;
};

// Fonction pour déterminer la couleur de gradient en fonction de la température
const getTempGradient = (temp) => {
  if (temp > 30) return 'linear-gradient(135deg, #FF9D6C, #FF5A5F)'; // Chaud
  if (temp > 20) return 'linear-gradient(135deg, #FFD36E, #FF9D6C)'; // Tiède
  if (temp > 10) return 'linear-gradient(135deg, #B4E1FF, #86CEFA)'; // Tempéré
  return 'linear-gradient(135deg, #86CEFA, #6AAFE6)'; // Frais
};

const WeatherDashboard = () => {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('week');
  const [animateCharts, setAnimateCharts] = useState(false);
  const chartRef = useRef(null);
  
  // Fonction pour formater la date
  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    return format(date, 'd MMM', { locale: fr });
  };
  
  // Récupération des données météo
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        setSelectedRecommendation(null);
        
        const today = new Date();
        let startDate;
        
        if (periodFilter === 'week') {
          startDate = format(subDays(today, 7), 'yyyy-MM-dd');
        } else if (periodFilter === 'month') {
          startDate = format(subDays(today, 30), 'yyyy-MM-dd');
        } else {
          startDate = null;
        }
        
        let url = `${process.env.REACT_APP_API_URL}/api/weather/period`;
        if (startDate) {
          url += `?startDate=${startDate}`;
        }
        
        const response = await axios.get(url);
        
        if (response.data && Array.isArray(response.data)) {
          const sortedData = response.data.sort((a, b) => new Date(a.day) - new Date(b.day));
          setWeatherData(sortedData);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données météo:", error);
      } finally {
        setLoading(false);
        setTimeout(() => setAnimateCharts(true), 300);
      }
    };
    
    fetchWeatherData();
  }, [periodFilter]);
  
  // Préparation des données pour les graphiques
  const prepareChartData = () => {
    const groupedByDay = {};
    
    weatherData.forEach(item => {
      const day = item.day;
      if (!groupedByDay[day]) {
        groupedByDay[day] = {
          temperature: [],
          humidity: []
        };
      }
      
      groupedByDay[day].temperature.push(item.mesures.temperature);
      groupedByDay[day].humidity.push(item.mesures.humidity);
    });
    
    const days = Object.keys(groupedByDay).sort();
    const temperatures = days.map(day => {
      const temps = groupedByDay[day].temperature;
      return temps.reduce((sum, val) => sum + val, 0) / temps.length;
    });
    
    const humidity = days.map(day => {
      const hum = groupedByDay[day].humidity;
      return hum.reduce((sum, val) => sum + val, 0) / hum.length;
    });
    
    const labels = days.map(day => formatDate(day));
    
    return {
      labels,
      originalDays: days,
      temperatures,
      humidity
    };
  };
  
  // Sélectionner une recommandation lorsqu'on clique sur un point
  const handlePointClick = (event, elements) => {
    if (elements && elements.length > 0) {
      const index = elements[0].index;
      const { originalDays } = prepareChartData();
      const selectedDay = originalDays[index];
      
      const dayData = weatherData.find(item => item.day === selectedDay);
      
      if (dayData && dayData.recommandation) {
        setSelectedRecommendation({
          ...dayData.recommandation,
          day: selectedDay,
          timeSlot: dayData.time_slot,
          temperature: dayData.mesures.temperature,
          humidity: dayData.mesures.humidity
        });
        
        // Scroll vers la recommandation
        setTimeout(() => {
          document.getElementById('recommendation-card')?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }, 100);
      }
    }
  };
  
  // Configuration du graphique
  const chartData = prepareChartData();
  
  const generateGradient = (ctx, color1, color2) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };
  
  const temperatureChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Température (°C)',
        data: chartData.temperatures,
        borderColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return '#fd7e14';
          return generateGradient(ctx, 'rgba(255, 122, 0, 1)', 'rgba(255, 159, 51, 1)');
        },
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(253, 126, 20, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(253, 126, 20, 0)');
          gradient.addColorStop(0.5, 'rgba(253, 126, 20, 0.1)');
          gradient.addColorStop(1, 'rgba(253, 126, 20, 0.2)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#fd7e14',
        pointBorderColor: '#ffffff',
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBorderWidth: 3,
        borderWidth: 4,
      }
    ]
  };
  
  const humidityChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Humidité (%)',
        data: chartData.humidity,
        borderColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return '#0d6efd';
          return generateGradient(ctx, 'rgba(13, 110, 253, 1)', 'rgba(32, 156, 238, 1)');
        },
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(13, 110, 253, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(13, 110, 253, 0)');
          gradient.addColorStop(0.5, 'rgba(13, 110, 253, 0.1)');
          gradient.addColorStop(1, 'rgba(13, 110, 253, 0.2)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0d6efd',
        pointBorderColor: '#ffffff',
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBorderWidth: 3,
        borderWidth: 4,
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: animateCharts ? 2000 : 0,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14,
            family: "'Poppins', sans-serif",
            weight: 500
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#333',
        bodyColor: '#666',
        titleFont: {
          size: 14,
          weight: 600,
          family: "'Poppins', sans-serif",
        },
        bodyFont: {
          size: 13,
          family: "'Poppins', sans-serif",
        },
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
            size: 12
          },
          color: '#999'
        }
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
            size: 12
          },
          color: '#999'
        }
      }
    },
    onClick: handlePointClick,
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  // Classes pour les animations
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };
  
  const getCardGradient = () => {
    if (!selectedRecommendation) return 'linear-gradient(135deg, #f8f9fa, #e9ecef)';
    const temp = selectedRecommendation.temperature;
    if (temp > 30) return 'linear-gradient(135deg, #fff0ec, #fff6ec)'; // Chaud
    if (temp > 20) return 'linear-gradient(135deg, #fff8e1, #fff9c4)'; // Tiède
    if (temp > 10) return 'linear-gradient(135deg, #e3f2fd, #e8f5e9)'; // Tempéré
    return 'linear-gradient(135deg, #e1f5fe, #e0f7fa)'; // Frais
  };
  
  const getBorderColor = () => {
    if (!selectedRecommendation) return '#6c757d';
    const temp = selectedRecommendation.temperature;
    if (temp > 30) return '#ff5722'; // Chaud
    if (temp > 20) return '#ffc107'; // Tiède
    if (temp > 10) return '#4caf50'; // Tempéré
    return '#03a9f4'; // Frais
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <Container fluid>
        <Row className="mb-4">
          <Col sm="12">
            <Card className="shadow-sm border-0" style={{ 
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)' 
            }}>
              <CardHeader className="py-4 bg-white">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div className="mb-3 mb-md-0">
                    <div className="d-flex align-items-center">
                      <div className="weather-icon-container me-3" style={{ 
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6a11cb, #2575fc)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Cloud size={28} color="#fff" />
                      </div>
                      <div>
                        <H3 className="m-0" style={{ fontWeight: '700' }}>Prévisions et Tendances Météo</H3>
                        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                          Visualisez les conditions météorologiques pour adapter votre rythme d'étude
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="btn-group filter-buttons" style={{ 
                    padding: '4px',
                    borderRadius: '12px',
                    background: '#f8f9fa'
                  }}>
                    <Button 
                      color={periodFilter === 'week' ? 'primary' : 'light'} 
                      onClick={() => setPeriodFilter('week')}
                      outline={periodFilter !== 'week'}
                      size="sm"
                      className="px-3 py-2"
                      style={{ 
                        borderRadius: '10px',
                        fontWeight: '600',
                        boxShadow: periodFilter === 'week' ? '0 4px 12px rgba(13, 110, 253, 0.15)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      7 jours
                    </Button>
                    <Button 
                      color={periodFilter === 'month' ? 'primary' : 'light'} 
                      onClick={() => setPeriodFilter('month')}
                      outline={periodFilter !== 'month'}
                      size="sm"
                      className="px-3 py-2 mx-1"
                      style={{ 
                        borderRadius: '10px',
                        fontWeight: '600',
                        boxShadow: periodFilter === 'month' ? '0 4px 12px rgba(13, 110, 253, 0.15)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      30 jours
                    </Button>
                    <Button 
                      color={periodFilter === 'all' ? 'primary' : 'light'} 
                      onClick={() => setPeriodFilter('all')}
                      outline={periodFilter !== 'all'}
                      size="sm"
                      className="px-3 py-2"
                      style={{ 
                        borderRadius: '10px',
                        fontWeight: '600',
                        boxShadow: periodFilter === 'all' ? '0 4px 12px rgba(13, 110, 253, 0.15)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Tout
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardBody className="py-4 px-4">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                    <p className="mt-4 text-muted">Chargement des données météorologiques...</p>
                  </div>
                ) : weatherData.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div 
                      className="mb-5"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <div className="chart-header d-flex align-items-center mb-3 px-2">
                        <div className="chart-icon-container me-3" style={{ 
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #ff9d6c, #ff5a5f)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Thermometer size={22} color="#fff" />
                        </div>
                        <h5 className="fw-bold m-0">Évolution de la température</h5>
                      </div>
                      <div className="chart-container" style={{ 
                        height: '320px', 
                        borderRadius: '12px',
                        padding: '20px',
                        background: 'white',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                      }}>
                        <Line data={temperatureChartData} options={chartOptions} />
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="mb-5"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <div className="chart-header d-flex align-items-center mb-3 px-2">
                        <div className="chart-icon-container me-3" style={{ 
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Droplet size={22} color="#fff" />
                        </div>
                        <h5 className="fw-bold m-0">Évolution de l'humidité</h5>
                      </div>
                      <div className="chart-container" style={{ 
                        height: '320px', 
                        borderRadius: '12px',
                        padding: '20px',
                        background: 'white',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
                      }}>
                        <Line data={humidityChartData} options={chartOptions} />
                      </div>
                    </motion.div>
                    
                    {selectedRecommendation ? (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        id="recommendation-card"
                      >
                        <Card className="mt-4 recommendation-card border-0" style={{
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
                          borderRadius: '16px',
                          background: getCardGradient(),
                          borderLeft: `5px solid ${getBorderColor()}`,
                          overflow: 'hidden'
                        }}>
                          <CardBody className="p-4">
                            <Row>
                              <Col md="8">
                                <div className="d-flex align-items-center mb-4">
                                  <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '15px',
                                    background: getBorderColor(),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '20px',
                                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)'
                                  }}>
                                    {getWeatherIcon(selectedRecommendation.temperature, selectedRecommendation.humidity)}
                                  </div>
                                  <div>
                                    <H4 style={{ margin: 0, fontWeight: 700, color: '#333' }}>
                                      {selectedRecommendation.title}
                                    </H4>
                                    <div className="text-muted d-flex align-items-center mt-1" style={{ fontSize: '14px' }}>
                                      <Calendar size={14} className="me-1" />
                                      <span style={{ fontWeight: '500' }}>
                                        {format(parseISO(selectedRecommendation.day), 'EEEE d MMMM yyyy', { locale: fr })}
                                      </span>
                                      <Clock size={14} className="ms-3 me-1" />
                                      <span style={{ fontWeight: '500' }}>
                                        {selectedRecommendation.timeSlot}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <P style={{ 
                                  fontSize: '16px', 
                                  lineHeight: 1.7,
                                  color: '#444',
                                  background: 'rgba(255, 255, 255, 0.5)',
                                  padding: '15px 20px',
                                  borderRadius: '12px',
                                  boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.03)'
                                }}>
                                  {selectedRecommendation.description}
                                </P>

                                {selectedRecommendation.url && (
                                  <Button 
                                    color="primary" 
                                    outline 
                                    className="mt-3"
                                    href={selectedRecommendation.url}
                                    target="_blank"
                                    style={{ 
                                      borderRadius: '10px',
                                      padding: '8px 20px',
                                      fontWeight: '600',
                                      boxShadow: '0 3px 10px rgba(13, 110, 253, 0.15)',
                                    }}
                                  >
                                    <Zap size={16} className="me-2" />
                                    En savoir plus
                                  </Button>
                                )}
                              </Col>
                              <Col md="4">
                                <div className="weather-stats p-4" style={{
                                  background: 'rgba(255, 255, 255, 0.6)',
                                  borderRadius: '15px',
                                  boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.03)'
                                }}>
                                  <H5 className="mb-4 text-center" style={{ fontWeight: '600', color: '#444' }}>
                                    Conditions météo
                                  </H5>
                                  
                                  <div className="stats-card mb-4 p-3" style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.04)'
                                  }}>
                                    <div className="d-flex align-items-center">
                                      <div className="stat-icon me-3" style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #ff9d6c, #ff5a5f)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}>
                                        <Thermometer size={22} color="#fff" />
                                      </div>
                                      <div>
                                        <div className="small text-muted">Température</div>
                                        <div className="h3 mb-0" style={{ fontWeight: '700' }}>
                                          {selectedRecommendation.temperature.toFixed(1)}°C
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="stats-card mb-4 p-3" style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.04)'
                                  }}>
                                    <div className="d-flex align-items-center">
                                      <div className="stat-icon me-3" style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}>
                                        <Droplet size={22} color="#fff" />
                                      </div>
                                      <div>
                                        <div className="small text-muted">Humidité</div>
                                        <div className="h3 mb-0" style={{ fontWeight: '700' }}>
                                          {selectedRecommendation.humidity.toFixed(0)}%
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <p className="text-center text-muted small mb-0" style={{ fontSize: '12px' }}>
                                    <Clock size={12} className="me-1" /> 
                                    Données mise à jour le {format(new Date(), 'dd/MM/yyyy')}
                                  </p>
                                </div>
                              </Col>
                            </Row>
                          </CardBody>
                        </Card>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                      >
                        <div className="alert text-center p-4 mt-4" style={{
                          borderRadius: '16px',
                          background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
                          border: 'none',
                          boxShadow: '0 5px 15px rgba(33, 150, 243, 0.1)'
                        }}>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 15px auto',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)'
                          }}>
                            <ThumbsUp size={24} color="#2196f3" />
                          </div>
                          <h5 style={{ fontWeight: '600', color: '#0d47a1' }}>Obtenez des recommandations personnalisées</h5>
                          <p className="mb-0" style={{ color: '#1565c0' }}>
                            Cliquez sur un point du graphique pour voir les recommandations détaillées pour cette journée.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="alert alert-warning text-center p-5" style={{
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #fff8e1, #fffde7)',
                      border: 'none',
                      boxShadow: '0 5px 15px rgba(255, 193, 7, 0.1)'
                    }}>
                      <div style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px auto',
                        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)'
                      }}>
                        <Cloud size={32} color="#ffc107" />
                      </div>
                      <h4 style={{ fontWeight: '600', color: '#ff8f00' }}>Aucune donnée météo disponible</h4>
                      <p className="mb-0" style={{ color: '#ff6f00' }}>
                        Nous n'avons pas trouvé de données météorologiques pour la période sélectionnée.
                      </p>
                    </div>
                  </motion.div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
        
        {/* CSS global pour animations météo */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
          
          .card {
            transition: all 0.3s ease;
          }
          
          .chart-container {
            transition: all 0.3s ease;
          }
          
          .chart-container:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          }
          
          .weather-icon {
            transition: all 0.3s ease;
          }
          
          .weather-icon.sun {
            color: #ff9800;
          }
          
          .weather-icon.rain {
            color: #2196f3;
          }
          
          .weather-icon.cloud {
            color: #78909c;
          }
          
          .weather-stats .stats-card {
            transition: all 0.3s ease;
          }
          
          .weather-stats .stats-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.08);
          }
          
          .filter-buttons button {
            transition: all 0.2s ease;
          }
          
          .filter-buttons button:hover {
            transform: translateY(-2px);
          }
          
          .chart-icon-container, .stat-icon {
            position: relative;
            overflow: hidden;
          }
          
          .chart-icon-container:after, .stat-icon:after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            animation: shine 3s infinite;
          }
          
          @keyframes shine {
            0% {
              left: -100%;
            }
            20% {
              left: 100%;
            }
            100% {
              left: 100%;
            }
          }
        `}</style>
      </Container>
    </motion.div>
  );
};

export default WeatherDashboard;
