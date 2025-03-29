import { useState, useEffect } from "react";
import { H4, H5, P } from "../../../../AbstractElements";
import { Card, CardBody, Col, Row } from "reactstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import { Cloud, CloudRain, Droplet, Sun, Sunset, Thermometer } from "react-feather";
import WeatherDashboard from '../../../Weather/WeatherDashboard';

// Composant d'horloge
const ClockIcon = ({ curHr, curMi, meridiem }) => {
  // Formater l'heure pour afficher toujours 2 chiffres
  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };

  // Définir les styles pour l'horloge
  const clockStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(45deg, #7366ff, #a927f9)',
    borderRadius: '50%',
    width: '70px',
    height: '70px',
    padding: '10px',
    boxShadow: '0 4px 10px rgba(115, 102, 255, 0.3)',
    color: 'white',
  };

  const timeStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    lineHeight: 1,
    margin: 0,
  };

  const meridiemStyle = {
    fontSize: '12px',
    marginTop: '2px',
    opacity: 0.8,
  };

  return (
    <div style={clockStyle}>
      <div style={timeStyle}>{formatTime(curHr)}:{formatTime(curMi)}</div>
      <div style={meridiemStyle}>{meridiem}</div>
    </div>
  );
};

const Greetingcard = () => {
  const today = new Date();
  const curHr = today.getHours();
  const curMi = today.getMinutes();
  const [meridiem, setMeridiem] = useState("AM");
  const [username, setUsername] = useState("Étudiant");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  // Styles CSS intégrés
  const styles = {
    profileGreeting: {
      borderRadius: '15px',
      overflow: 'hidden',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.3s ease',
    },
    weatherIcon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weatherCard: {
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
    },
    recommendationBox: {
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.08)',
      background: '#fffbea',  // Fond légèrement crème
      padding: '16px',        // Padding intégré
      borderLeft: '4px solid #ffc107', // Bordure latérale jaune
    },
    recommendationTitle: {
      fontWeight: 700,        // Plus gras
      color: '#000000',       // Noir
      fontSize: '17px',       // Taille augmentée
      marginBottom: '10px',   // Marge inférieure
    },
    recommendationText: {
      fontSize: '15px',       // Taille augmentée
      lineHeight: 1.6,        // Interligne plus grand
      color: '#000000',       // Noir
      fontWeight: 400,        // Normal
    },
    spinner: {
      display: 'flex',
      justifyContent: 'center',
      padding: '2rem 0',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: '#ffc107',
      color: '#212529',
      padding: '0.35em 0.65em',
      fontSize: '0.75em',
      fontWeight: 700,
      lineHeight: 1,
      textAlign: 'center',
      whiteSpace: 'nowrap',
      verticalAlign: 'baseline',
      borderRadius: '0.25rem',
      marginRight: '0.5rem',
    },
    timeSlotText: {
      fontSize: '0.8rem',
      color: '#6c757d',
    },
  };

  // Récupérer le nom d'utilisateur depuis le stockage local
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.Name) {
      setUsername(user.Name.split(" ")[0]); // Prend seulement le prénom
    }
  }, []);

  // Déterminer AM/PM
  useEffect(() => {
    setMeridiem(curHr >= 12 ? "PM" : "AM");
  }, [curHr]);

  // Déterminer le créneau horaire (matin, après-midi, soir)
  const getTimeSlot = () => {
    if (curHr >= 5 && curHr < 12) return "matin";
    if (curHr >= 12 && curHr < 18) return "après-midi";
    return "soir";
  };

  // Formater la date pour l'API
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Charger les données météo et recommandations
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        const formattedDate = formatDate(today);
        const timeSlot = getTimeSlot();
        
        // Appel à l'API pour récupérer les dernières données météo avec recommandations
        const response = await axios.get(`http://localhost:5000/api/weather/latest?date=${formattedDate}&timeSlot=${timeSlot}`);
        
        if (response.data) {
          setWeather(response.data);
          console.log("Données météo récupérées:", response.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données météo:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, []);

  // Fonction pour déterminer l'icône météo selon la température et l'humidité
  const getWeatherIcon = () => {
    if (!weather || !weather.mesures) return <Sun size={38} color="#ffc107" />;
    
    const { temperature, humidity } = weather.mesures;
    
    if (humidity > 80) return <CloudRain size={38} color="#0d6efd" />;
    if (humidity > 60) return <Cloud size={38} color="#6c757d" />;
    if (temperature > 25) return <Thermometer size={38} color="#fd7e14" />;
    return <Sun size={38} color="#ffc107" />;
  };

  // Fonction pour obtenir un message de salutation selon l'heure
  const getGreeting = () => {
    if (curHr < 12) return "Bonjour";
    if (curHr < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <Col xxl="6" xl="6" lg="6" className="dash-45 box-col-40">
      <Card style={styles.profileGreeting} className="profile-greeting">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center">
              <div style={styles.weatherIcon} className="weather-icon me-3">
                {getWeatherIcon()}
              </div>
              <div>
                <h6 className="mb-0 text-muted">
                  {weather ? new Date(weather.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : formatDate(today)}
                </h6>
                <H4 className="mb-0">
                  {getGreeting()}, <span className="text-primary f-w-500">{username}</span>
                  <span className="right-circle">
                    <i className="fa fa-check-circle font-primary f-14 middle"></i>
                  </span>
                </H4>
              </div>
            </div>
            <ClockIcon curHr={curHr} curMi={curMi} meridiem={meridiem} />
          </div>

          {loading ? (
            <div style={styles.spinner}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : weather ? (
            <>
              <Card style={styles.weatherCard} className="border-0 bg-light-primary my-3">
                <CardBody className="py-3">
                  <Row className="align-items-center">
                    <Col xs="6">
                      <div className="d-flex align-items-center">
                        <Thermometer size={24} className="me-2 text-primary" />
                        <div>
                          <span className="text-muted d-block">Température</span>
                          <H5 className="mb-0">{weather.mesures.temperature.toFixed(1)}°C</H5>
                        </div>
                      </div>
                    </Col>
                    <Col xs="6">
                      <div className="d-flex align-items-center">
                        <Droplet size={24} className="me-2 text-primary" />
                        <div>
                          <span className="text-muted d-block">Humidité</span>
                          <H5 className="mb-0">{weather.mesures.humidity.toFixed(0)}%</H5>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {weather.recommandation && (
                <div style={styles.recommendationBox}>
                  <H5 style={styles.recommendationTitle}>
                    {weather.recommandation.title}
                  </H5>
                  <P style={styles.recommendationText}>
                    {weather.recommandation.description}
                  </P>
                  
                  <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      ...styles.badge,
                      backgroundColor: '#ffc107',
                      color: '#000000',
                      fontWeight: 600
                    }}>
                      <Sunset size={14} style={{marginRight: '4px'}} />
                      {weather.time_slot}
                    </div>
                    <span style={{
                      ...styles.timeSlotText,
                      color: '#333333'
                    }}>
                      Idéal pour ce moment de la journée
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="alert alert-info" style={{borderRadius: '10px'}}>
              Aucune donnée météo disponible pour le moment.
            </div>
          )}
          
          <div className="mt-3 text-end">
  <Link 
    to="/tivo/dashboard/weather-dashboard" 
    className="btn btn-sm btn-outline-primary"
    style={{
      borderRadius: '8px',
      padding: '0.375rem 0.75rem',
      transition: 'all 0.2s ease' ,
      color: '#000000', 
      fontWeight: 500   
    }}
  >
    Voir prévisions complètes
  </Link>
</div>
        </CardBody>
      </Card>
    </Col>
  );
};

export default Greetingcard;
