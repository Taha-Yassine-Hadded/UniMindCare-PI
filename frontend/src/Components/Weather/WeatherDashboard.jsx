import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody, Button } from 'reactstrap';
import { Line } from 'react-chartjs-2';
import { H3, H4, H5, P } from '../../AbstractElements';
import { Cloud, CloudRain, Droplet, Sun, ThumbsUp, Clock, Calendar, Thermometer } from 'react-feather';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import axios from 'axios';
import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const WeatherDashboard = () => {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('week'); // 'week', 'month', 'all'
  
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
        
        // Calculer la date de début basée sur le filtre
        const today = new Date();
        let startDate;
        
        if (periodFilter === 'week') {
          startDate = format(subDays(today, 7), 'yyyy-MM-dd');
        } else if (periodFilter === 'month') {
          startDate = format(subDays(today, 30), 'yyyy-MM-dd');
        } else {
          // On ne fixe pas de startDate pour 'all'
          startDate = null;
        }
        
        // Construire l'URL de l'API avec les paramètres
        let url = 'http://localhost:5000/api/weather/period';
        if (startDate) {
          url += `?startDate=${startDate}`;
        }
        
        const response = await axios.get(url);
        
        if (response.data && Array.isArray(response.data)) {
          // Trier les données par date
          const sortedData = response.data.sort((a, b) => new Date(a.day) - new Date(b.day));
          setWeatherData(sortedData);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données météo:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeatherData();
  }, [periodFilter]);
  
  // Préparation des données pour les graphiques
  const prepareChartData = () => {
    // Regrouper les données par jour (en prenant la moyenne pour chaque jour)
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
    
    // Calculer les moyennes quotidiennes
    const days = Object.keys(groupedByDay).sort();
    const temperatures = days.map(day => {
      const temps = groupedByDay[day].temperature;
      return temps.reduce((sum, val) => sum + val, 0) / temps.length;
    });
    
    const humidity = days.map(day => {
      const hum = groupedByDay[day].humidity;
      return hum.reduce((sum, val) => sum + val, 0) / hum.length;
    });
    
    // Formater les labels de date
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
    if (elements.length > 0) {
      const index = elements[0].index;
      const { originalDays } = prepareChartData();
      const selectedDay = originalDays[index];
      
      // Trouver la recommandation pour ce jour
      const dayData = weatherData.find(item => item.day === selectedDay);
      
      if (dayData && dayData.recommandation) {
        setSelectedRecommendation({
          ...dayData.recommandation,
          day: selectedDay,
          timeSlot: dayData.time_slot,
          temperature: dayData.mesures.temperature,
          humidity: dayData.mesures.humidity
        });
      }
    }
  };
  
  // Configuration du graphique
  const chartData = prepareChartData();
  
  const temperatureChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Température (°C)',
        data: chartData.temperatures,
        borderColor: '#fd7e14',
        backgroundColor: 'rgba(253, 126, 20, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#fd7e14',
        pointBorderColor: '#ffffff',
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };
  
  const humidityChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Humidité (%)',
        data: chartData.humidity,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0d6efd',
        pointBorderColor: '#ffffff',
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14
          }
        }
      },
      tooltip: {
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
        }
      },
      y: {
        beginAtZero: false
      }
    },
    onClick: handlePointClick,
    interaction: {
      mode: 'index',
      intersect: false
    }
  };
  
  return (
    <Container fluid>
      <Row className="mb-4">
        <Col sm="12">
          <Card>
            <CardHeader className="py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <H3 className="m-0">Prévisions et Tendances Météo</H3>
                  <p className="text-muted mb-0">Visualisez les conditions météorologiques pour adapter votre rythme d'étude</p>
                </div>
                
                <div className="btn-group">
                  <Button 
                    color={periodFilter === 'week' ? 'primary' : 'light'} 
                    onClick={() => setPeriodFilter('week')}
                    outline={periodFilter !== 'week'}
                    size="sm"
                  >
                    7 jours
                  </Button>
                  <Button 
                    color={periodFilter === 'month' ? 'primary' : 'light'} 
                    onClick={() => setPeriodFilter('month')}
                    outline={periodFilter !== 'month'}
                    size="sm"
                  >
                    30 jours
                  </Button>
                  <Button 
                    color={periodFilter === 'all' ? 'primary' : 'light'} 
                    onClick={() => setPeriodFilter('all')}
                    outline={periodFilter !== 'all'}
                    size="sm"
                  >
                    Tout
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardBody>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="mt-3">Chargement des données météo...</p>
                </div>
              ) : weatherData.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <Thermometer size={18} className="me-2" />
                      Évolution de la température
                    </h5>
                    <div style={{ height: '300px' }}>
                      <Line data={temperatureChartData} options={chartOptions} />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <Droplet size={18} className="me-2" />
                      Évolution de l'humidité
                    </h5>
                    <div style={{ height: '300px' }}>
                      <Line data={humidityChartData} options={chartOptions} />
                    </div>
                  </div>
                  
                  {selectedRecommendation && (
                    <Card className="mt-4 recommendation-card border-0" style={{
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      borderRadius: '15px',
                      background: 'linear-gradient(to right, #fff8e1, #fffde7)',
                      borderLeft: '4px solid #ffc107'
                    }}>
                      <CardBody>
                        <Row>
                          <Col md="8">
                            <div className="d-flex align-items-center mb-3">
                              <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                background: '#ffc107',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '15px'
                              }}>
                                <ThumbsUp size={24} color="#000" />
                              </div>
                              <div>
                                <H4 style={{ margin: 0, fontWeight: 600 }}>{selectedRecommendation.title}</H4>
                                <div className="text-muted">
                                  <Calendar size={14} className="me-1" />
                                  {format(parseISO(selectedRecommendation.day), 'EEEE d MMMM yyyy', { locale: fr })}
                                  <Clock size={14} className="ms-3 me-1" />
                                  {selectedRecommendation.timeSlot}
                                </div>
                              </div>
                            </div>
                            
                            <P style={{ fontSize: '16px', lineHeight: 1.6 }}>
                              {selectedRecommendation.description}
                            </P>
                          </Col>
                          <Col md="4" className="border-start">
                            <div className="px-3">
                              <H5>Conditions météo</H5>
                              <div className="stats-item d-flex align-items-center mb-3">
                                <Thermometer size={20} className="me-2 text-warning" />
                                <div>
                                  <div className="small text-muted">Température</div>
                                  <div className="fw-bold">{selectedRecommendation.temperature.toFixed(1)}°C</div>
                                </div>
                              </div>
                              <div className="stats-item d-flex align-items-center">
                                <Droplet size={20} className="me-2 text-primary" />
                                <div>
                                  <div className="small text-muted">Humidité</div>
                                  <div className="fw-bold">{selectedRecommendation.humidity.toFixed(0)}%</div>
                                </div>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </CardBody>
                    </Card>
                  )}
                  
                  {!selectedRecommendation && (
                    <div className="alert alert-info text-center mt-4">
                      <i className="fa fa-info-circle me-2"></i>
                      Cliquez sur un point du graphique pour voir les recommandations détaillées pour cette journée.
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert alert-warning text-center">
                  <i className="fa fa-exclamation-triangle me-2"></i>
                  Aucune donnée météo disponible pour la période sélectionnée.
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default WeatherDashboard;