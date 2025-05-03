import { useState, useEffect } from "react";
import { H4, H5, P } from "../../../../AbstractElements";
import { Card, CardBody, Col, Row } from "reactstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import { Cloud, CloudRain, CloudSnow, CloudLightning, Droplet, Sun, Sunset, Thermometer, Wind, Clock, AlertCircle, Shield, Award, User, Heart } from "react-feather";
import WeatherDashboard from '../../../Weather/WeatherDashboard';
import { motion, AnimatePresence } from "framer-motion"; // Vous devrez installer framer-motion: npm install framer-motion

// Composant d'horloge amélioré avec animation
const ClockIcon = ({ curHr, curMi, meridiem }) => {
  // Formater l'heure pour afficher toujours 2 chiffres
  const formatTime = (time) => {
    return time < 10 ? `0${time}` : time;
  };

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        borderRadius: '50%',
        width: '75px',
        height: '75px',
        padding: '10px',
        boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          lineHeight: 1,
          margin: 0,
          letterSpacing: '1px'
        }}
      >
        {formatTime(curHr)}:{formatTime(curMi)}
      </motion.div>
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{
          fontSize: '14px',
          marginTop: '2px',
          opacity: 0.9,
          fontWeight: '500'
        }}
      >
        {meridiem}
      </motion.div>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at top right, rgba(255,255,255,0.3) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
    </motion.div>
  );
};

// Animations pour les éléments météo
const containerVariants = {
  hidden: { opacity: 0 },
  show: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.3
    } 
  }
};

// Composant Badge de rôle 
const RoleBadge = ({ role }) => {
  // Fonction pour obtenir le nom complet du rôle
  const getRoleName = (role) => {
    const roleMap = {
      'admin': 'Administrateur',
      'teacher': 'Enseignant',
      'psychiatre': 'Psychiatre',
      'student': 'Étudiant'
    };
    
    return roleMap[role.toLowerCase()] || role;
  };

  // Fonction pour obtenir l'icône en fonction du rôle
  const getRoleIcon = (role) => {
    switch(role.toLowerCase()) {
      case 'admin':
        return <Shield size={12} />;
      case 'teacher':
        return <Award size={12} />;
      case 'psychiatre':
        return <Heart size={12} />;
      default:
        return <User size={12} />;
    }
  };
  
  // Fonction pour obtenir les couleurs en fonction du rôle
  const getRoleColors = (role) => {
    const colorMap = {
      'admin': {
        bg: '#4338CA',
        light: '#EEF2FF'
      },
      'teacher': {
        bg: '#0369A1',
        light: '#E0F2FE'
      },
      'psychiatre': {
        bg: '#15803D',
        light: '#DCFCE7'
      },
      'student': {
        bg: '#9333EA',
        light: '#F3E8FF'
      }
    };
    
    return colorMap[role.toLowerCase()] || { bg: '#6B7280', light: '#F3F4F6' };
  };

  const colors = getRoleColors(role);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: colors.light,
        color: colors.bg,
        padding: '5px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        margin: '0 4px 4px 0',
        boxShadow: `0 2px 5px ${colors.bg}20`,
        border: `1px solid ${colors.bg}20`,
      }}
    >
      <span style={{ marginRight: '5px' }}>
        {getRoleIcon(role)}
      </span>
      {getRoleName(role)}
    </motion.div>
  );
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5 } }
};


const RecommendationCard = ({ recommendation, timeSlot, palette }) => {
  // Sélectionner une icône en fonction du titre/contenu de la recommandation
  const getRecommendationIcon = () => {
    const title = recommendation?.title?.toLowerCase() || '';
    
    if (title.includes('chaleur') || title.includes('chaud'))
      return <Sun size={24} color="white" />;
    if (title.includes('froid') || title.includes('fraîch'))
      return <CloudSnow size={24} color="white" />;
    if (title.includes('humide') || title.includes('pluie'))
      return <CloudRain size={24} color="white" />;
    if (title.includes('vent'))
      return <Wind size={24} color="white" />;
    if (title.includes('orage'))
      return <CloudLightning size={24} color="white" />;
    if (title.includes('alerte') || title.includes('attention'))
      return <AlertCircle size={24} color="white" />;
      
    // Icône par défaut
    return <Sun size={24} color="white" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4 }}
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'white',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        marginTop: '16px',
        position: 'relative',
        border: `1px solid ${palette.secondary}30`
      }}
    >
      {/* Élément décoratif d'arrière-plan */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '120px',
        height: '120px',
        background: `radial-gradient(circle at bottom left, ${palette.primary}20 0%, transparent 70%)`,
        zIndex: 0,
        borderRadius: '0 0 0 120px'
      }} />
      
      <div style={{
        padding: '20px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div style={{
            background: palette.gradient,
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 20px ${palette.primary}30`,
            marginRight: '16px',
            flexShrink: 0
          }}>
            {getRecommendationIcon()}
          </div>
          
          <div>
            <motion.h4
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: '18px',
                fontWeight: '700',
                margin: '0 0 4px 0',
                color: '#111827',
              }}
            >
              {recommendation.title}
            </motion.h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: palette.primary,
                color: 'white',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '9999px'
              }}>
                <Sunset size={12} style={{marginRight: '4px'}} />
                {timeSlot}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6B7280',
                fontWeight: '500'
              }}>
                Recommandation actuelle
              </div>
            </div>
          </div>
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: '15px',
            lineHeight: 1.7,
            color: '#4B5563',
            marginBottom: recommendation.url ? '12px' : '0'
          }}
        >
          {recommendation.description}
        </motion.p>
        
        {/* Afficher l'URL si elle existe et n'est pas vide */}
        {recommendation.url && recommendation.url.trim() !== "" && (
          <motion.a
            href={recommendation.url}
            target="_blank" 
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '14px',
              color: palette.primary,
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            En savoir plus
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ marginLeft: '6px' }}
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </motion.a>
        )}
      </div>
    </motion.div>
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
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Palettes de couleurs dynamiques selon le moment de la journée
  const getColorPalette = () => {
    if (curHr >= 5 && curHr < 11) return {
      primary: '#3B82F6',  // Bleu matin
      secondary: '#93C5FD',
      gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
      accent: '#F59E0B'
    };
    if (curHr >= 11 && curHr < 17) return {
      primary: '#F59E0B',  // Jaune journée
      secondary: '#FCD34D',
      gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
      accent: '#3B82F6'
    };
    return {
      primary: '#8B5CF6',  // Violet soir
      secondary: '#A78BFA',
      gradient: 'linear-gradient(135deg, #6366F1, #A78BFA)',
      accent: '#F59E0B'
    };
  };

  const palette = getColorPalette();

  // Styles CSS intégrés améliorés
  const styles = {
    profileGreeting: {
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
      background: 'white',
    },
    cardHeader: {
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      padding: '20px 24px',
    },
    weatherIcon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weatherCard: {
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.05)',
      background: `linear-gradient(135deg, ${palette.secondary}15, ${palette.primary}10)`,
    },
    weatherIconCircle: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${palette.secondary}30, ${palette.primary}20)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 6px 16px ${palette.primary}20`,
    },
    weatherValueBox: {
      position: 'relative',
      borderRadius: '16px',
      padding: '16px',
      background: 'white',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${palette.secondary}20`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden',
      height: '100%',
    },
    weatherValueTitle: {
      fontSize: '13px',
      color: '#6B7280',
      marginBottom: '6px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    weatherValue: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#111827',
      display: 'flex',
      alignItems: 'center',
    },
    temperatureUnit: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#6B7280',
      marginLeft: '2px',
      position: 'relative',
      top: '-6px',
    },
    recommendationBox: {
      borderRadius: '16px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
      background: 'white',
      padding: '20px',
      border: `1px solid ${palette.secondary}40`,
      marginTop: '20px',
    },
    recommendationTitleWrapper: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '12px',
    },
    spinner: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      padding: '2rem 0',
    },
    spinnerText: {
      marginTop: '12px',
      color: '#6B7280',
      fontSize: '14px',
    },
    username: {
      color: palette.primary,
      fontWeight: 700,
    },
    greeting: {
      fontSize: '22px',
      fontWeight: '700',
      marginBottom: '0',
    },
    date: {
      fontSize: '14px',
      color: '#6B7280',
      marginBottom: '6px',
      fontWeight: '500',
    },
    viewAllButton: {
      borderRadius: '9999px',
      padding: '10px 20px',
      background: palette.gradient,
      color: 'white',
      fontWeight: '600',
      fontSize: '14px',
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: `0 6px 16px ${palette.primary}30`,
      transition: 'all 0.3s ease',
      marginTop: '20px',
      textDecoration: 'none',
    },
    buttonIcon: {
      marginLeft: '8px',
      width: '16px',
      height: '16px',
    },
    detailsToggleButton: {
      background: 'transparent',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      color: palette.primary,
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      padding: '0',
      marginTop: '6px',
      transition: 'color 0.3s ease',
    },
    roleContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      marginTop: '8px'
    }
  };

  // Récupérer le nom d'utilisateur depuis le stockage local
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.Name) {
      setUsername(user.Name.split(" ")[0]); // Prend seulement le prénom
    }
  }, []);


  // Récupérer le nom d'utilisateur et les rôles depuis le stockage local
useEffect(() => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    if (user.Name) {
      setUsername(user.Name.split(" ")[0]); // Prend seulement le prénom
    }
    
    // Récupération des rôles (gestion des différents formats possibles)
    if (user.Role) {
      const roles = Array.isArray(user.Role) ? user.Role : [user.Role];
      setUserRoles(roles);
    } else if (user.role) {
      const roles = Array.isArray(user.role) ? user.role : [user.role];
      setUserRoles(roles);
    }
  }
}, []);

const [userRoles, setUserRoles] = useState([]);
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
    if (!weather || !weather.mesures) return <Sun size={34} color={palette.accent} />;
    
    const { temperature, humidity } = weather.mesures;
    
    if (humidity > 80) return <CloudRain size={34} color={palette.primary} />;
    if (humidity > 60) return <Cloud size={34} color="#6B7280" />;
    if (temperature > 30) return <Thermometer size={34} color="#EF4444" />;
    if (temperature > 25) return <Sun size={34} color={palette.accent} />;
    if (temperature < 5) return <CloudSnow size={34} color="#60A5FA" />;
    return <Sun size={34} color={palette.accent} />;
  };

  // Fonction pour obtenir un message de salutation selon l'heure
  const getGreeting = () => {
    if (curHr < 12) return "Bonjour";
    if (curHr < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  // Format de date plus élaboré
  const getFormattedDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return today.toLocaleDateString('fr-FR', options);
  };

  return (
    <Col xxl="6" xl="6" lg="6" className="dash-45 box-col-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card style={styles.profileGreeting} className="profile-greeting">
          <CardBody style={{ padding: 0 }}>
            {/* En-tête de la carte */}
            <div style={styles.cardHeader}>
              <motion.div 
                className="d-flex justify-content-between align-items-center"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div className="d-flex align-items-center" variants={itemVariants}>
                  <div style={styles.weatherIconCircle} className="weather-icon me-3">
                    {getWeatherIcon()}
                  </div>
                  <div>
                  <h6 style={styles.date} className="text-capitalize">
  {getFormattedDate()} {/* Toujours utiliser la date locale */}
</h6>
<h4 style={styles.greeting}>
  {getGreeting()}, <span style={styles.username}>{username}</span>
</h4>
{/* Affichage des badges de rôle */}
{userRoles && userRoles.length > 0 && (
  <motion.div 
    style={styles.roleContainer}
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.3 }}
  >
    {userRoles.map((role, index) => (
      <RoleBadge key={index} role={role} />
    ))}
  </motion.div>
)}
                  </div>
                </motion.div>
                <ClockIcon curHr={curHr} curMi={curMi} meridiem={meridiem} />
              </motion.div>
            </div>

            {/* Contenu principal */}
            <div style={{ padding: '0 24px 24px' }}>
              {loading ? (
                <motion.div 
                  style={styles.spinner}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="spinner-grow" style={{ color: palette.primary }} role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p style={styles.spinnerText}>Chargement des données météo</p>
                </motion.div>
              ) : weather ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key="weather-data"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Affichage des valeurs météo */}
                    <Row className="g-3 mb-3">
                      <Col xs="6" md="6">
                        <motion.div 
                          style={styles.weatherValueBox}
                          whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
                          transition={{ duration: 0.3 }}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${palette.secondary}20, ${palette.primary}10)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Thermometer size={16} color={palette.primary} />
                          </div>
                          
                          <div style={styles.weatherValueTitle}>Température</div>
                          <div style={styles.weatherValue}>
                            {weather.mesures.temperature.toFixed(1)}
                            <span style={styles.temperatureUnit}>°C</span>
                          </div>
                          
                          <div style={{
                            marginTop: '8px',
                            width: '60%',
                            height: '4px',
                            background: '#f1f5f9',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, weather.mesures.temperature.toFixed(1) * 2.5)}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                              style={{
                                height: '100%',
                                background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent})`,
                                borderRadius: '2px'
                              }}
                            />
                          </div>
                        </motion.div>
                      </Col>
                      
                      <Col xs="6" md="6">
                        <motion.div 
                          style={styles.weatherValueBox}
                          whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
                          transition={{ duration: 0.3 }}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${palette.secondary}20, ${palette.primary}10)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Droplet size={16} color={palette.primary} />
                          </div>
                          
                          <div style={styles.weatherValueTitle}>Humidité</div>
                          <div style={styles.weatherValue}>
                            {weather.mesures.humidity.toFixed(0)}
                            <span style={styles.temperatureUnit}>%</span>
                          </div>
                          
                          <div style={{
                            marginTop: '8px',
                            width: '60%',
                            height: '4px',
                            background: '#f1f5f9',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, weather.mesures.humidity.toFixed(0))}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                              style={{
                                height: '100%',
                                background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent})`,
                                borderRadius: '2px'
                              }}
                            />
                          </div>
                        </motion.div>
                      </Col>
                    </Row>

                    {/* Section des recommandations */}
                    {weather.recommandation && (
                      <RecommendationCard 
                        recommendation={weather.recommandation}
                        timeSlot={weather.time_slot}
                        palette={palette}
                      />
                    )}

                    {/* Bouton pour voir les détails complets */}
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                      <Link to="/tivo/dashboard/weather-dashboard" style={{ textDecoration: 'none' }}>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={styles.viewAllButton}
                        >
                          Voir prévisions complètes
                          <svg 
                            width="18" 
                            height="18" 
                            style={styles.buttonIcon}
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14"></path>
                            <path d="M12 5l7 7-7 7"></path>
                          </svg>
                        </motion.div>
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <motion.div 
                  className="alert alert-info" 
                  style={{
                    borderRadius: '14px',
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Cloud size={20} color={palette.primary} style={{ marginRight: '12px' }} />
                  <div>
                    <strong style={{ color: palette.primary }}>Information :</strong> Aucune donnée météo disponible pour le moment.
                  </div>
                </motion.div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </Col>
  );
};

export default Greetingcard;