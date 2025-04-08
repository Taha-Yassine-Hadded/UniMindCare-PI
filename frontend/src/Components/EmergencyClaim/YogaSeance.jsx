import React, { useState, useEffect, useRef } from "react";
import { Card, Row, Col, Container, Button, Badge, Progress, Nav, NavItem } from "reactstrap";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faOm, faStop, faPlay, faMedal, faHeartbeat, faInfoCircle, faCheckCircle, faTrophy, 
  faAward, faBolt, faClock, faFire, faAngleRight, faYinYang, faDumbbell, faCalendarAlt,
  faStar, faStarHalf, faChartLine, faRunning, faUserFriends, faLock, faUnlock,
  faCertificate, faGift, faMagic, faChevronRight, faChevronDown, faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import Chart from 'react-apexcharts';

// Dynamic import of Lottie components to prevent build errors
let Lottie = null;
let meditationAnimation = null;
let successAnimation = null;

// Try to import Lottie and animations
try {
  // Import Lottie dynamically
  import('lottie-react').then(module => {
    Lottie = module.default;
  }).catch(err => {
    console.warn("Lottie animations will not be available:", err.message);
  });
  
  // Import animations
  import('./animations/meditation.json').then(module => {
    meditationAnimation = module.default;
  }).catch(err => {
    console.warn("Meditation animation not found:", err.message);
  });
  
  import('./animations/success.json').then(module => {
    successAnimation = module.default;
  }).catch(err => {
    console.warn("Success animation not found:", err.message);
  });
} catch (error) {
  console.warn("Error importing animation dependencies:", error.message);
}

// Custom LottieWrapper component to gracefully handle missing Lottie
const LottieWrapper = ({ animationData, style, loop, autoplay, lottieRef }) => {
  if (!Lottie || !animationData) {
    // Fallback UI when Lottie or animation data isn't available
    return (
      <div 
        style={{ 
          ...style, 
          backgroundColor: '#f0f0f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: '50%'
        }}
      >
        <FontAwesomeIcon icon={faYinYang} className="text-primary" style={{ fontSize: '2rem' }} />
      </div>
    );
  }

  return (
    <Lottie 
      lottieRef={lottieRef}
      animationData={animationData} 
      style={style}
      loop={loop}
      autoplay={autoplay}
    />
  );
};

// Fonction pour décoder le token JWT
const decodeJWT = (token) => {
  try {
    if (!token) return {};
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Erreur de décodage du token:", error);
    return {};
  }
};

// Fonction pour obtenir le token depuis le stockage
const getToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
};

// Fonction pour les appels API authentifiés
const fetchWithAuth = async (url, options = {}) => {
  const config = { ...options };
  config.headers = config.headers || {};
  
  const token = getToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  
  return fetch(url, config);
};

// Fonctions API modifiées
async function startYoga() {
  try {
    const response = await fetchWithAuth("http://localhost:5005/start_yoga");
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors du démarrage de la séance de yoga:", error.message);
    throw error;
  }
}

async function stopYoga() {
  try {
    const response = await fetchWithAuth("http://localhost:5005/stop_yoga");
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de l'arrêt de la séance de yoga:", error.message);
    throw error;
  }
}

async function fetchYogaStats(identifiant) {
  try {
    const response = await fetchWithAuth(`http://localhost:5005/yoga_stats/${identifiant}`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques yoga:", error.message);
    return {
      points: 0,
      sessionCount: 0,
      lastSession: null,
      streak: 0,
      level: 1,
      weeklyStats: [10, 25, 15, 30, 20, 35, 45],
      achievements: []
    };
  }
}

async function checkCameraStatus() {
  try {
    const response = await fetch("http://localhost:5005/camera_status");
    const data = await response.json();
    return data.status === "camera_running";
  } catch (error) {
    console.error("Erreur lors de la vérification de la caméra:", error);
    return false;
  }
}

// Composant qui affiche une pose de yoga avec effet de survol
const YogaPoseCard = ({ name, icon, description, difficulty, duration }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const difficultyColors = {
    easy: "success",
    medium: "warning",
    hard: "danger"
  };
  
  return (
    <motion.div 
      whileHover={{ y: -8, boxShadow: "0 15px 30px rgba(0,0,0,0.15)" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="pose-card bg-white rounded-4 shadow-sm border border-1 border-light overflow-hidden"
      style={{ transition: "all 0.3s ease" }}
    >
      <div className="position-relative">
        <div 
          className="pose-image-container" 
          style={{ 
            height: "140px",
            background: `linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(155, 89, 182, 0.8))`,
            overflow: "hidden"
          }}
        >
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-white" style={{ fontSize: "3rem" }}>
              {icon}
            </div>
          </div>
          
          <div className="position-absolute top-0 end-0 m-2">
            <Badge 
              color={difficultyColors[difficulty]} 
              pill 
              className="px-3 py-1"
            >
              {difficulty === "easy" ? "Facile" : difficulty === "medium" ? "Moyen" : "Difficile"}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="p-3">
        <h6 className="mb-1 fw-bold">{name}</h6>
        <p className="mb-2 text-muted small">{description}</p>
        
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span className="text-primary small fw-bold">
            <FontAwesomeIcon icon={faClock} className="me-1" />
            {duration} sec
          </span>
          
          <motion.button
            initial={{ opacity: 0.8 }}
            animate={{ opacity: isHovered ? 1 : 0.8 }}
            className="btn btn-sm btn-outline-primary rounded-pill px-3"
          >
            Voir détails
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// Composant pour les défis
const ChallengeCard = ({ title, description, points, progress, locked, unlockRequirement }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`challenge-card p-3 border rounded-4 shadow-sm mb-3 ${locked ? 'bg-light' : 'bg-white'}`}
    >
      <div className="d-flex align-items-center mb-2">
        <div className={`rounded-circle p-2 me-3 ${locked ? 'bg-secondary bg-opacity-10' : 'bg-primary bg-opacity-10'}`}>
          <FontAwesomeIcon 
            icon={locked ? faLock : faTrophy} 
            className={locked ? "text-secondary" : "text-primary"} 
            style={{opacity: locked ? 0.7 : 1}}
          />
        </div>
        <div>
          <h6 className={`mb-0 fw-bold ${locked ? 'text-secondary' : ''}`} style={{opacity: locked ? 0.7 : 1}}>{title}</h6>
          {locked ? (
            <small className="text-muted">Débloque en: {unlockRequirement}</small>
          ) : (
            <small className="text-primary">{points} points</small>
          )}
        </div>
      </div>
      
      <p className={`small mb-2 ${locked ? 'text-muted' : ''}`} style={{opacity: locked ? 0.7 : 1}}>
        {description}
      </p>
      
      {!locked && (
        <div className="progress-container">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <small className="text-muted">Progression</small>
            <small className="text-primary fw-bold">{progress}%</small>
          </div>
          <Progress 
            value={progress} 
            className="progress-sm" 
            style={{height: "6px", borderRadius: "3px"}} 
            color="primary"
          />
        </div>
      )}
    </motion.div>
  );
};

// Composant principal
const YogaInterface = () => {
    const [loading, setLoading] = useState(false);
    const [yogaActive, setYogaActive] = useState(false);
    const [userInfo, setUserInfo] = useState({ name: "Utilisateur", identifiant: "" });
    const [yogaStats, setYogaStats] = useState({
        points: 0,
        sessionCount: 0,
        lastSession: null,
        streak: 0,
        level: 1,
        weeklyStats: [10, 25, 15, 30, 20, 35, 45],
        achievements: []
    });
    const [sessionCompleted, setSessionCompleted] = useState(false);
    const [earnedPoints, setEarnedPoints] = useState(0);
    const [activeStep, setActiveStep] = useState(0);
    const [showPoses, setShowPoses] = useState(false);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [sessionTimer, setSessionTimer] = useState(null);
    const [activeTab, setActiveTab] = useState("session");
    const [expandedStats, setExpandedStats] = useState(true);
    const [expandedChallenges, setExpandedChallenges] = useState(true);
    const [skillLevel, setSkillLevel] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(0); // Ajouté pour suivre l'heure de début réelle
    const [cameraConnected, setCameraConnected] = useState(false); // Nouvel état pour la connexion caméra
    const [loadingImages, setLoadingImages] = useState(false);

    // Référence pour l'animation
    const lottieRef = useRef(null);
    
    // Animation pour le cercle de progression
    const circleProgress = useMotionValue(0);
    const circleProgressDisplay = useTransform(circleProgress, value => Math.round(value));

    // Extraire les infos du token et de localStorage au chargement du composant
    useEffect(() => {
        // Récupérer les informations utilisateur
        const token = getToken();
        const userFromStorage = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        
        if (userFromStorage) {
            setUserInfo({
                name: userFromStorage.Name || "Utilisateur",
                identifiant: userFromStorage.Identifiant || ""
            });
            
            // Si on a un identifiant, charger les statistiques yoga
            if (userFromStorage.Identifiant) {
                fetchYogaStats(userFromStorage.Identifiant)
                    .then(stats => {
                        if (stats) {
                            console.log("Statistiques reçues de l'API:", stats);
                            
                            // Utiliser directement les statistiques reçues de l'API
                            setYogaStats(stats);
                            setSkillLevel((stats.level / 10) * 100);
                        }
                    })
                    .catch(error => {
                        console.error("Erreur lors de la récupération des statistiques:", error);
                    });
            }
        } else if (token) {
            const decodedToken = decodeJWT(token);
            setUserInfo({
                name: decodedToken.name || decodedToken.email?.split('@')[0] || "Utilisateur",
                identifiant: decodedToken.identifiant || ""
            });
        }
    }, []);

    // Animation pour le cercle de progression quand le niveau change
    useEffect(() => {
        // Animation pour le cercle de progression quand le niveau change
        const animateProgress = async () => {
            const startValue = circleProgress.get();
            
            // Calcul du pourcentage de progression vers le niveau suivant
            // Si level=3, points=6500, alors on est à 500/2000 = 25% vers le niveau 4
            const currentLevelPoints = (yogaStats.level - 1) * 2000;
            const pointsInCurrentLevel = yogaStats.points - currentLevelPoints;
            const progressPercent = (pointsInCurrentLevel / 2000) * 100;
            
            const endValue = Math.min(100, progressPercent);
            
            const duration = 1000; // ms
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);
                
                const currentValue = startValue + (endValue - startValue) * progress;
                circleProgress.set(currentValue);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        };
        
        if (yogaStats.level > 0) {
            animateProgress();
        }
    }, [yogaStats.level, yogaStats.points]);

    // Vérification périodique de l'état de la caméra
    useEffect(() => {
        // Vérifier le statut de la caméra toutes les 10 secondes
        if (yogaActive) {
            const statusChecker = setInterval(async () => {
                try {
                    const isActive = await checkCameraStatus();
                    setCameraConnected(isActive);
                    if (!isActive && yogaActive) {
                        // Si la caméra n'est plus active mais qu'on pense qu'elle l'est
                        setYogaActive(false);
                        clearInterval(sessionTimer);
                        setSessionTimer(null);
                    }
                } catch (error) {
                    console.error("Erreur lors de la vérification du statut de la caméra:", error);
                }
            }, 10000);
            
            return () => clearInterval(statusChecker);
        }
    }, [yogaActive, sessionTimer]);

    // Gestion du timer de session - MODIFIÉ pour utiliser le sessionStartTime
  // Remplacez l'useEffect existant pour le timer de session par celui-ci:
useEffect(() => {
    if (yogaActive && sessionStartTime > 0) {
        // Créer un nouveau timer seulement si nécessaire
        if (!sessionTimer) {
            console.log("Démarrage du timer avec timestamp de début:", sessionStartTime);
            const timer = setInterval(() => {
                const currentTime = Math.floor(Date.now() / 1000);
                const elapsedTime = currentTime - sessionStartTime;
                console.log("Temps écoulé:", elapsedTime, "secondes");
                setSessionDuration(elapsedTime);
            }, 1000);
            setSessionTimer(timer);
        }
    } else if (!yogaActive && sessionTimer) {
        // Nettoyer le timer lorsque la session est terminée
        console.log("Arrêt du timer de session");
        clearInterval(sessionTimer);
        setSessionTimer(null);
    }
    
    return () => {
        if (sessionTimer) {
            clearInterval(sessionTimer);
        }
    };
}, [yogaActive, sessionTimer, sessionStartTime]);

    // Configuration pour le graphique
    const chartOptions = {
        chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            foreColor: '#9e9e9e'
        },
        colors: ['#6366F1'],
        dataLabels: { enabled: false },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        grid: {
            borderColor: '#f1f1f1',
            strokeDashArray: 5
        },
        markers: {
            size: 5,
            colors: ['#6366F1'],
            strokeColors: '#ffffff',
            strokeWidth: 2,
            hover: { size: 7 }
        },
        xaxis: {
            categories: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
            labels: {
                style: {
                    colors: '#9e9e9e',
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            min: 0,
            labels: {
                style: {
                    colors: '#9e9e9e',
                    fontSize: '12px'
                }
            }
        },
        tooltip: {
            theme: 'dark'
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.2,
                stops: [0, 90, 100]
            }
        }
    };
    
    const chartSeries = [
        {
            name: 'Points',
            data: yogaStats.weeklyStats
        }
    ];

    // Données pour le graphique à barres
    const barChartOptions = {
        chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            foreColor: '#9e9e9e'
        },
        plotOptions: {
            bar: {
                columnWidth: '60%',
                borderRadius: 5
            }
        },
        colors: ['#6366F1', '#38bdf8'],
        dataLabels: { enabled: false },
        xaxis: {
            categories: yogaStats.monthlyProgress ? yogaStats.monthlyProgress.map(item => item.month) : [],

            labels: {
                style: {
                    colors: '#9e9e9e',
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#9e9e9e',
                    fontSize: '12px'
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right'
        },
        tooltip: {
            theme: 'dark'
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: "vertical",
                shadeIntensity: 0.25,
                gradientToColors: undefined,
                inverseColors: true,
                opacityFrom: 0.85,
                opacityTo: 0.85,
                stops: [50, 0, 100]
            }
        }
    };
    
    const barChartSeries = [
        {
            name: 'Points',
            data: yogaStats.monthlyProgress ? yogaStats.monthlyProgress.map(item => item.points) : []
        },
        {
            name: 'Séances',
            data: yogaStats.monthlyProgress ? yogaStats.monthlyProgress.map(item => item.sessions * 10) : [] // Multiplié pour l'échelle
        }
    ];

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartYoga = async () => {
        try {
            setSessionCompleted(false);
            setEarnedPoints(0);
            setLoading(true);
            setActiveStep(1);
            setSessionDuration(0);
            
            // Démarrer la caméra
            const response = await startYoga();
            setYogaActive(true);
            setCameraConnected(true);
            setLoading(false);
            
            // Démarrer l'animation Lottie
            if (lottieRef.current) {
                lottieRef.current.play();
            }
            
            // Configuration d'une vérification périodique pour le timestamp réel
            const checkRealStartTime = async () => {
                try {
                    const realTimeResponse = await fetch("http://localhost:5005/real_start_time");
                    const data = await realTimeResponse.json();
                    
                    if (data.ready && data.sessionStartTime > 0) {
                        console.log("Session réellement démarrée avec timestamp:", data.sessionStartTime);
                        setSessionStartTime(data.sessionStartTime);
                        return true; // Indique que nous avons obtenu le vrai temps de début
                    }
                    return false; // Pas encore prêt
                } catch (err) {
                    console.error("Erreur lors de la vérification du temps de début réel:", err);
                    return false;
                }
            };
            
            // Vérifier toutes les 500ms si la session a réellement commencé
            const intervalId = setInterval(async () => {
                const ready = await checkRealStartTime();
                if (ready) {
                    clearInterval(intervalId);
                    console.log("Chronométrage démarré avec le timestamp réel");
                }
            }, 500);
            
            // Nettoyer l'intervalle si le composant est démonté
            return () => clearInterval(intervalId);
            
        } catch (error) {
            console.error("Erreur lors du démarrage de la séance de yoga:", error);
            setYogaActive(false);
            setLoading(false);
            alert("Erreur lors du démarrage de la séance de yoga.");
        }
    };

const handleStopYoga = async () => {
    try {
        // Arrêter la session
        await stopYoga();
        
        // Arrêter l'animation et les timers
        if (lottieRef.current) {
            lottieRef.current.stop();
        }
        
        // Générer des points en fonction de la durée
        const points = Math.max(5, Math.floor(sessionDuration / 30)); // 1 point toutes les 30 secondes, minimum 5 points
        setEarnedPoints(points);
        
        // Mettre à jour les statistiques locales
        setYogaStats(prev => ({
            ...prev,
            points: prev.points + points,
            sessionCount: prev.sessionCount + 1,
            lastSession: "Aujourd'hui"
        }));
        
        // Mise à jour des états
        setYogaActive(false);
        setCameraConnected(false);
        setSessionCompleted(true);
        setActiveStep(2);
        
        // Rafraîchir les statistiques depuis le serveur
        if (userInfo.identifiant) {
            const updatedStats = await fetchYogaStats(userInfo.identifiant);
            if (updatedStats) {
                setYogaStats({
                    ...updatedStats,
                    weeklyStats: updatedStats.weeklyStats || yogaStats.weeklyStats,
                    monthlyProgress: yogaStats.monthlyProgress, // Garder les données mensuelles actuelles
                    achievements: yogaStats.achievements // Garder les réalisations actuelles
                });
            }
        }
    } catch (error) {
        console.error("Erreur lors de l'arrêt de la séance de yoga:", error);
        // Arrêter quand même la session localement en cas d'erreur API
        setYogaActive(false);
        setCameraConnected(false);
    }
};

const yogaPoses = [
    {
        name: "Pose en T",
        icon: <FontAwesomeIcon icon={faOm} />,
        description: "Une pose debout qui renforce votre concentration et votre équilibre.",
        difficulty: "easy",
        duration: 60
    },
    {
        name: "Pose de l'Arbre",
        icon: <FontAwesomeIcon icon={faYinYang} />,
        description: "Renforcez votre équilibre et votre concentration avec cette pose classique.",
        difficulty: "medium",
        duration: 45
    },
    {
        name: "Pose du Guerrier",
        icon: <FontAwesomeIcon icon={faDumbbell} />,
        description: "Développez votre force et votre stabilité avec cette pose puissante.",
        difficulty: "medium",
        duration: 90
    },
    {
        name: "Pose du Lotus",
        icon: <FontAwesomeIcon icon={faOm} />,
        description: "Une pose de méditation classique pour la tranquillité mentale.",
        difficulty: "hard",
        duration: 120
    },
    {
        name: "Pose du Chien Tête en Bas",
        icon: <FontAwesomeIcon icon={faDumbbell} />,
        description: "Étire tout le corps et renforce les bras et les épaules.",
        difficulty: "medium",
        duration: 60
    },
    {
        name: "Pose de Méditation Assise",
        icon: <FontAwesomeIcon icon={faOm} />,
        description: "Une pose simple mais efficace pour la méditation et la respiration.",
        difficulty: "easy",
        duration: 180
    }
];

const challenges = [
    {
        title: "7 jours consécutifs",
        description: "Pratiquez le yoga pendant 7 jours d'affilée pour compléter ce défi.",
        points: 100,
        progress: (yogaStats.streak / 7) * 100,
        locked: false
    },
    {
        title: "Maître de la pose T",
        description: "Maintenez la pose T parfaitement pendant 2 minutes au total.",
        points: 50,
        progress: 60,
        locked: false
    },
    {
        title: "Expert en équilibre",
        description: "Complétez 5 séances avec des poses d'équilibre avancées.",
        points: 150,
        progress: 40,
        locked: false
    },
    {
        title: "Marathon de yoga",
        description: "Complétez une séance de 30 minutes sans interruption.",
        points: 200,
        progress: 0,
        locked: true,
        unlockRequirement: "Niveau 3"
    }
];

// Composant pour les réalisations
const AchievementItem = ({ title, date, icon, color }) => {
    return (
        <div className="achievement-item d-flex align-items-center mb-3">
            <div 
                className="achievement-icon rounded-circle d-flex align-items-center justify-content-center me-3"
                style={{ 
                    width: 36, 
                    height: 36, 
                    backgroundColor: `${color}20` 
                }}
            >
                <FontAwesomeIcon icon={icon} style={{ color }} />
            </div>
            <div className="flex-grow-1">
                <div className="d-flex justify-content-between">
                    <span className="small fw-semibold">{title}</span>
                    <small className="text-muted">{date}</small>
                </div>
            </div>
        </div>
    );
};

return (
    <Container fluid className="yoga-interface py-4 px-4 bg-light">
        <Row className="mb-4">
            <Col lg={12}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                    <h2 className="mb-0 fw-bold" style={{ color: "#000000" }}>Interface Yoga</h2>                        <p className="text-muted mb-0">Bienvenue dans votre espace de pratique du yoga</p>
                    </div>
                    
                    <div className="tabs-wrapper">
                        <Nav className="bg-white rounded-pill p-1 shadow-sm" style={{ padding: "0 0.5rem" }}>
                            <NavItem>
                                <Button
                                    color={activeTab === "session" ? "primary" : "light"}
                                    className={`rounded-pill px-3 py-2 ${activeTab === "session" ? 'text-white' : ''}`}
                                    onClick={() => setActiveTab("session")}
                                >
                                    <FontAwesomeIcon icon={faPlay} className="me-2" />
                                    Session
                                </Button>
                            </NavItem>
                            <NavItem>
                                <Button
                                    color={activeTab === "stats" ? "primary" : "light"}
                                    className={`rounded-pill px-3 py-2 ms-2 ${activeTab === "stats" ? 'text-white' : ''}`}
                                    onClick={() => setActiveTab("stats")}
                                >
                                    <FontAwesomeIcon icon={faChartLine} className="me-2" />
                                    Statistiques
                                </Button>
                            </NavItem>
                            <NavItem>
                                <Button
                                    color={activeTab === "poses" ? "primary" : "light"}
                                    className={`rounded-pill px-3 py-2 ms-2 ${activeTab === "poses" ? 'text-white' : ''}`}
                                    onClick={() => setActiveTab("poses")}
                                >
                                    <FontAwesomeIcon icon={faYinYang} className="me-2" />
                                    Poses
                                </Button>
                            </NavItem>
                            <NavItem>
                                <Button
                                    color={activeTab === "challenges" ? "primary" : "light"}
                                    className={`rounded-pill px-3 py-2 ms-2 ${activeTab === "challenges" ? 'text-white' : ''}`}
                                    onClick={() => setActiveTab("challenges")}
                                >
                                    <FontAwesomeIcon icon={faTrophy} className="me-2" />
                                    Défis
                                </Button>
                            </NavItem>
                        </Nav>
                    </div>
                </div>
            </Col>
        </Row>
                    
        <Row>
            <Col lg={8} className="mb-4 mb-lg-0">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <AnimatePresence mode="wait">
                        {/* Onglet session */}
                        {activeTab === "session" && (
                            <motion.div 
                                key="session-tab"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {!sessionCompleted ? (
                                    <Card className="border-0 shadow-lg overflow-hidden" style={{ borderRadius: "20px" }}>
                                        <div className="p-4">
                                            <h4 className="mb-3 fw-bold">
                                                {activeStep === 0 ? "Commencer une séance" : "Séance en cours"}
                                            </h4>
                                            
                                            <div className="steps-container mb-4">
                                                <div className="steps-wrapper d-flex">
                                                    <div className={`step-item d-flex align-items-center ${activeStep >= 0 ? 'completed' : ''}`}>
                                                        <div className="step-number d-flex align-items-center justify-content-center rounded-circle">
                                                            {activeStep > 0 ? (
                                                                <FontAwesomeIcon icon={faCheckCircle} />
                                                            ) : (
                                                                <span>1</span>
                                                            )}
                                                        </div>
                                                        <span className="step-label ms-2">Commencer</span>
                                                    </div>
                                                    
                                                    <div className="step-divider flex-grow-1 mx-3"></div>
                                                    
                                                    <div className={`step-item d-flex align-items-center ${activeStep >= 1 ? 'completed' : ''}`}>
                                                        <div className="step-number d-flex align-items-center justify-content-center rounded-circle">
                                                            {activeStep > 1 ? (
                                                                <FontAwesomeIcon icon={faCheckCircle} />
                                                            ) : (
                                                                <span>2</span>
                                                            )}
                                                        </div>
                                                        <span className="step-label ms-2">Pratique</span>
                                                    </div>
                                                    
                                                    <div className="step-divider flex-grow-1 mx-3"></div>
                                                    
                                                    <div className={`step-item d-flex align-items-center ${activeStep >= 2 ? 'completed' : ''}`}>
                                                        <div className="step-number d-flex align-items-center justify-content-center rounded-circle">
                                                            <span>3</span>
                                                        </div>
                                                        <span className="step-label ms-2">Résultat</span>
                                                    </div>
                                                </div>
                                            </div>
                                                
                                            {activeStep === 0 && (
                                                <div className="start-screen text-center">
                                                    <div className="animation-container mb-4">
                                                        <LottieWrapper 
                                                            animationData={meditationAnimation} 
                                                            style={{ width: 200, height: 200, margin: '0 auto' }}
                                                            loop={true}
                                                            autoplay={true}
                                                            lottieRef={lottieRef}
                                                        />
                                                    </div>
                                                    
                                                    <p className="text-muted mb-4">
                                                        Prêt à commencer votre séance de yoga? Assurez-vous d'être dans un
                                                        environnement calme avec suffisamment d'espace pour pratiquer.
                                                    </p>
                                                    
                                                    <motion.button
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        className={`btn btn-lg ${loading ? 'btn-secondary' : 'btn-primary'} rounded-pill px-5`}
                                                        onClick={handleStartYoga}
                                                        disabled={loading}
                                                    >
                                                        {loading ? (
                                                            <span>Chargement...</span>
                                                        ) : (
                                                            <span>
                                                                <FontAwesomeIcon icon={faPlay} className="me-2" />
                                                                Commencer
                                                            </span>
                                                        )}
                                                    </motion.button>
                                                </div>
                                            )}
                                                
                                            {activeStep === 1 && (
                                                <div className="session-screen">
                                                    <div className="row">
                                                        <div className="col-md-6 mb-4 mb-md-0">
                                                            <div className="session-animation text-center">
                                                                <LottieWrapper 
                                                                    animationData={meditationAnimation} 
                                                                    style={{ width: 180, height: 180, margin: '0 auto' }}
                                                                    loop={true}
                                                                    autoplay={true}
                                                                    lottieRef={lottieRef}
                                                                />
                                                            </div>
                                                            
                                                            <div className="text-center mt-3">
                                                                <span className="badge bg-light text-primary rounded-pill px-3 py-2 fs-5 shadow-sm">
                                                                    {cameraConnected ? (
                                                                        <>
                                                                            <span className="status-indicator connected me-2"></span>
                                                                            Caméra connectée
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="status-indicator disconnected me-2"></span>
                                                                            Caméra déconnectée
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="col-md-6">
                                                            <div className="session-info">
                                                                <div className="card bg-light border-0 rounded-4 mb-3">
                                                                    <div className="card-body">
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <span className="text-muted">Durée</span>
                                                                            <span className="fs-4 fw-bold text-primary">
                                                                                {formatTime(sessionDuration)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="session-instruction mb-4">
                                                                    <h5 className="fw-bold mb-2">Instructions :</h5>
                                                                    <p className="mb-2">
                                                                        1. Adoptez les poses indiquées par l'instructeur
                                                                    </p>
                                                                    <p className="mb-2">
                                                                        2. Maintenez chaque pose correctement pour accumuler des points
                                                                    </p>
                                                                    <p className="mb-2">
                                                                        3. Suivez votre respiration et restez concentré
                                                                    </p>
                                                                </div>
                                                                
                                                                <div className="text-center">
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        className="btn btn-danger rounded-pill px-4 py-2"
                                                                        onClick={handleStopYoga}
                                                                    >
                                                                        <FontAwesomeIcon icon={faStop} className="me-2" />
                                                                        Terminer la séance
                                                                    </motion.button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ) : (
                                    <Card className="border-0 shadow-lg overflow-hidden" style={{ borderRadius: "20px" }}>
                                        <div className="p-4">
                                            <h4 className="mb-4 fw-bold text-success text-center">Félicitations!</h4>
                                            
                                            <div className="result-animation text-center mb-4">
                                                <LottieWrapper 
                                                    animationData={successAnimation} 
                                                    style={{ width: 180, height: 180, margin: '0 auto' }}
                                                    loop={false}
                                                    autoplay={true}
                                                />
                                            </div>
                                            
                                            <div className="result-stats row text-center">
                                                <div className="col-md-4 mb-3 mb-md-0">
                                                    <div className="card bg-light border-0 rounded-4">
                                                        <div className="card-body">
                                                            <div className="text-muted mb-1">Durée</div>
                                                            <div className="fs-3 fw-bold text-primary">
                                                                {formatTime(sessionDuration)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="col-md-4 mb-3 mb-md-0">
                                                    <div className="card bg-light border-0 rounded-4">
                                                        <div className="card-body">
                                                            <div className="text-muted mb-1">Points gagnés</div>
                                                            <div className="fs-3 fw-bold text-success">
                                                                +{earnedPoints}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="col-md-4">
                                                    <div className="card bg-light border-0 rounded-4">
                                                        <div className="card-body">
                                                            <div className="text-muted mb-1">Total</div>
                                                            <div className="fs-3 fw-bold text-primary">
                                                                {yogaStats.points}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 text-center">
                                                <motion.button
                                                    whileHover={{ scale: 1.03 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    className="btn btn-primary rounded-pill px-4 py-2"
                                                    onClick={() => {
                                                        setSessionCompleted(false);
                                                        setActiveStep(0);
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faPlay} className="me-2" />
                                                    Nouvelle séance
                                                </motion.button>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </motion.div>
                        )}

                        {/* Onglet poses */}
                        {activeTab === "poses" && (
    <motion.div 
        key="poses-tab"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
    >
        <Card className="border-0 shadow-lg overflow-hidden p-4" style={{ borderRadius: "20px" }}>
            <h4 className="mb-4 fw-bold">Catalogue des poses</h4>
            
            <p className="text-muted mb-4">
                Explorez notre collection de poses de yoga et apprenez à les maîtriser pour améliorer votre pratique.
                Chaque pose est classée par niveau de difficulté et offre des bienfaits spécifiques pour votre corps et votre esprit.
            </p>
            
            <div className="mb-4 p-3 border rounded-4 bg-light">
    <h5 className="fw-bold mb-3" style={{ color: "#000000" }}>Votre progression</h5>
    <Row>
        {yogaStats.poseMastery && Object.entries(yogaStats.poseMastery).map(([poseName, poseData], index) => {
            const mastery = poseData.mastery;
            const count = poseData.count;
            let statusColor = "primary";
            
            // Déterminer la couleur en fonction du niveau de maîtrise
            if (mastery >= 100) {
                statusColor = "success";
            } else if (mastery >= 75) {
                statusColor = "info";
            } else if (mastery >= 50) {
                statusColor = "warning";
            } else if (mastery >= 25) {
                statusColor = "primary";
            } else {
                statusColor = "secondary";
            }
            
            return (
                <Col md={6} key={index} className="mb-3">
                    <div className="bg-white p-3 rounded-3 shadow-sm">
                        <div className="d-flex align-items-center mb-2">
                            <div 
                                className={`rounded-circle bg-${statusColor} bg-opacity-10 d-flex align-items-center justify-content-center me-3`}
                                style={{width: "40px", height: "40px"}}
                            >
                                <FontAwesomeIcon 
                                    icon={faYinYang} 
                                    className={`text-${statusColor}`} 
                                    style={{fontSize: "1.2rem"}}
                                />
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between">
                                    <h6 className="mb-0 fw-bold" style={{ color: "#000000" }}>{poseName}</h6>
                                    <span className="badge bg-light" style={{ color: "#000000" }}>
                                        {count} fois
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-2">
                            <div className="d-flex justify-content-between mb-1">
                                <small style={{ color: "#000000" }}>Maîtrise</small>
                                <small className={`fw-bold text-${statusColor}`}>{mastery}%</small>
                            </div>
                            <Progress 
                                value={mastery} 
                                color={statusColor} 
                                className="progress" 
                                style={{height: "8px", borderRadius: "4px"}}
                            />
                        </div>
                    </div>
                </Col>
            );
        })}
        
        {(!yogaStats.poseMastery || Object.keys(yogaStats.poseMastery).length === 0) && (
            <Col xs={12} className="text-center py-4">
                <div style={{ color: "#000000" }}>
                    <FontAwesomeIcon icon={faYinYang} className="mb-3" style={{fontSize: "2rem", opacity: 0.3}} />
                    <p>Aucune pose pratiquée pour le moment</p>
                    <p className="small">Commencez une session pour suivre votre progression</p>
                </div>
            </Col>
        )}
    </Row>
</div>
            
            <Row className="g-4">
                {yogaPoses.map((pose, index) => (
                    <Col lg={4} md={6} key={index}>
                        <YogaPoseCard {...pose} />
                    </Col>
                ))}
            </Row>
        </Card>
    </motion.div>
)}
                        {/* Onglet statistiques */}
                        {activeTab === "stats" && (
                            <motion.div 
                                key="stats-tab"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="border-0 shadow-lg overflow-hidden p-4" style={{ borderRadius: "20px" }}>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <h4 className="mb-0 fw-bold">Vos statistiques</h4>
                                        
                                        <div className="d-flex align-items-center">
                                            <div className="pe-3 border-end">
                                                <div className="text-muted small">Total des points</div>
                                                <div className="fs-5 fw-bold text-primary">{yogaStats.points}</div>
                                            </div>
                                            
                                            <div className="ps-3">
                                                <div className="text-muted small">Nombre de séances</div>
                                                <div className="fs-5 fw-bold text-success">{yogaStats.sessionCount}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div 
    className="stats-header mb-3 p-3 rounded-4"
    style={{
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(155, 89, 182, 0.1) 100%)",
        border: "1px solid rgba(99, 102, 241, 0.2)"
    }}
>
    <div className="d-flex justify-content-between align-items-center">
        <div>
            <div className="text-muted mb-1">Niveau actuel</div>
            <h5 className="mb-0 fw-bold">Niveau {yogaStats.level}</h5>
            
            {/* Calculer les points restants pour le prochain niveau */}
            {(() => {
                const currentLevelPoints = (yogaStats.level - 1) * 2000;
                const pointsInCurrentLevel = yogaStats.points - currentLevelPoints;
                const pointsToNextLevel = 2000 - pointsInCurrentLevel;
                const progressPercent = (pointsInCurrentLevel / 2000) * 100;
                
                return (
                    <div className="text-primary mt-1">
                        {Math.round(progressPercent)}% ({pointsInCurrentLevel}/{2000} points)
                    </div>
                );
            })()}
        </div>
        
        <div 
            className="level-circle position-relative d-flex align-items-center justify-content-center"
            style={{ width: 80, height: 80 }}
        >
            <svg width="80" height="80" viewBox="0 0 80 80">
                <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    strokeWidth="6"
                    stroke="rgba(99, 102, 241, 0.2)"
                />
                <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    strokeWidth="6"
                    stroke="#6366F1"
                    strokeDasharray="220"
                    strokeDashoffset={220 - (220 * circleProgress.get() / 100)}
                    transform="rotate(-90 40 40)"
                />
            </svg>
            <div className="position-absolute">
                <motion.div>
                    {Math.round(circleProgressDisplay.get())}%
                </motion.div>
            </div>
        </div>
    </div>
</div>
                                    
                                    <Row>
                                        <Col lg={6} className="mb-4">
                                            <div className="card-stats p-3 rounded-4 bg-white border shadow-sm h-100">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h5 className="fw-bold mb-0">Points hebdomadaires</h5>
                                                    <Badge color="primary" pill className="px-3">Cette semaine</Badge>
                                                </div>
                                                
                                                <Chart
                                                    options={chartOptions}
                                                    series={chartSeries}
                                                    type="area"
                                                    height={250}
                                                />
                                            </div>
                                        </Col>
                                        
                                        <Col lg={6} className="mb-4">
                                            <div className="card-stats p-3 rounded-4 bg-white border shadow-sm h-100">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h5 className="fw-bold mb-0">Série actuelle</h5>
                                                    <Badge color="danger" pill className="px-3">{yogaStats.streak} jours</Badge>
                                                </div>
                                                
                                                <div className="streak-calendar">
    <div className="d-flex flex-wrap">
        {Array.from({ length: 7 }).map((_, index) => {
            const isActive = index < yogaStats.streak;
            return (
                <div key={index} className="streak-day text-center p-2 m-1" style={{ flex: '1' }}>
                    <div 
                        className={`day-circle mx-auto rounded-circle d-flex align-items-center justify-content-center ${isActive ? 'bg-danger' : 'bg-light'}`}
                        style={{ width: 40, height: 40, opacity: isActive ? 1 : 0.5 }}
                    >
                        {isActive && <FontAwesomeIcon icon={faCheckCircle} className="text-white" />}
                    </div>
                    <small className="text-muted d-block mt-1">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index]}
                    </small>
                </div>
            )
        })}
    </div>
    
    <div className="text-center mt-4">
        <h4 className="text-danger mb-1 fw-bold">{yogaStats.streak} Jours</h4>
        <p className="text-muted mb-0">Continuez votre pratique quotidienne pour maintenir votre série!</p>
    </div>
</div>
                                            </div>
                                        </Col>
                                        
                                        <Col lg={4} className="mb-4">
                                            <div className="achievements-card p-3 rounded-4 bg-white border shadow-sm h-100">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h6 className="mb-0 fw-bold">Réalisations récentes</h6>
                                                    <Button color="link" className="p-0 text-decoration-none" style={{ fontSize: "0.9rem" }}>
                                                        <small>Voir tout</small>
                                                    </Button>
                                                </div>
                                                
                                                <div className="achievements-list">
                                                    <AchievementItem 
                                                        title="Première séance"
                                                        date="Il y a 2 semaines"
                                                        icon={faCheckCircle}
                                                        color="#6366F1"
                                                    />
                                                    
                                                    <AchievementItem 
                                                        title="Série de 3 jours"
                                                        date="Il y a 4 jours"
                                                        icon={faFire}
                                                        color="#F43F5E"
                                                    />
                                                    
                                                    <AchievementItem 
                                                        title="Niveau 2 atteint"
                                                        date="Hier"
                                                        icon={faAward}
                                                        color="#F59E0B"
                                                    />
                                                </div>
                                            </div>
                                        </Col>
                                        
                                        <Col lg={8}>
                                            <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className="chart-card p-3 rounded-4 bg-white border shadow-sm"
                                            >
                                                <div className="d-flex justify-content-between align-items-center mb-4">
                                                    <h5 className="fw-bold mb-0">Progression mensuelle</h5>
                                                    <div className="btn-group">
                                                        <button className="btn btn-sm btn-primary rounded-pill px-3">Points</button>
                                                        <button className="btn btn-sm btn-outline-primary rounded-pill px-3">Séances</button>
                                                    </div>
                                                </div>
                                                <Chart 
                                                    options={barChartOptions}
                                                    series={barChartSeries}
                                                    type="bar"
                                                    height={280}
                                                />
                                            </motion.div>
                                        </Col>
                                    </Row>
                                </Card>
                            </motion.div>
                        )}

                        {/* Onglet challenges */}
                        {activeTab === "challenges" && (
                            <motion.div 
                                key="challenges-tab"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="border-0 shadow-lg overflow-hidden p-4" style={{ borderRadius: "20px" }}>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div>
                                            <h4 className="mb-1 fw-bold">Défis du Yoga</h4>
                                            <p className="text-muted mb-0">Accomplissez ces défis pour débloquer des récompenses spéciales</p>
                                        </div>
                                        
                                        <div className="challenge-points d-flex align-items-center">
                                            <div className="challenge-icon rounded-circle d-flex align-items-center justify-content-center me-2"
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faTrophy} className="text-white" />
                                            </div>
                                            <div>
                                                <div className="text-muted small">Points de défis</div>
                                                <div className="fw-bold">{yogaStats.points}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Row>
                                        <Col lg={8} className="mb-4">
                                            <div className="challenges-wrapper pe-lg-4">
                                                {challenges.map((challenge, index) => (
                                                    <ChallengeCard key={index} {...challenge} />
                                                ))}
                                                
                                                <div className="text-center mt-3">
                                                    <Button color="link" className="text-decoration-none">
                                                        <FontAwesomeIcon icon={faChevronDown} className="me-2" />
                                                        Voir plus de défis
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                        
                                        <Col lg={4}>
                                            <div className="rewards-card p-3 rounded-4 bg-white border shadow-sm">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h6 className="mb-0 fw-bold">Récompenses</h6>
                                                </div>
                                                
                                                <ul className="list-unstyled">
                                                    <li className="reward-item border-bottom py-3 d-flex align-items-center">
                                                        <div className="reward-icon rounded-circle d-flex align-items-center justify-content-center me-3"
                                                            style={{ width: 36, height: 36, backgroundColor: "rgba(99, 102, 241, 0.1)" }}
                                                        >
                                                            <FontAwesomeIcon icon={faMagic} className="text-primary" />
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6 className="mb-0 fw-semibold">Thème spécial</h6>
                                                            <small className="text-muted">200 points</small>
                                                        </div>
                                                        <Button 
                                                            color="primary"
                                                            size="sm"
                                                            className="rounded-pill"
                                                            disabled={yogaStats.points < 200}
                                                        >
                                                            {yogaStats.points >= 200 ? "Débloquer" : "Bloqué"}
                                                        </Button>
                                                    </li>
                                                    
                                                    <li className="reward-item border-bottom py-3 d-flex align-items-center">
                                                        <div className="reward-icon rounded-circle d-flex align-items-center justify-content-center me-3"
                                                            style={{ width: 36, height: 36, backgroundColor: "rgba(99, 102, 241, 0.1)" }}
                                                        >
                                                            <FontAwesomeIcon icon={faCertificate} className="text-primary" />
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6 className="mb-0 fw-semibold">Badge expert</h6>
                                                            <small className="text-muted">500 points</small>
                                                        </div>
                                                        <Button 
                                                            color="primary"
                                                            size="sm"
                                                            outline
                                                            className="rounded-pill"
                                                            disabled={yogaStats.points < 500}
                                                        >
                                                            {yogaStats.points >= 500 ? "Débloquer" : "Bloqué"}
                                                        </Button>
                                                    </li>
                                                    
                                                    <li className="reward-item py-3 d-flex align-items-center">
                                                        <div className="reward-icon rounded-circle d-flex align-items-center justify-content-center me-3"
                                                            style={{ width: 36, height: 36, backgroundColor: "rgba(99, 102, 241, 0.1)" }}
                                                        >
                                                            <FontAwesomeIcon icon={faGift} className="text-primary" />
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6 className="mb-0 fw-semibold">Programmes spéciaux</h6>
                                                            <small className="text-muted">1000 points</small>
                                                        </div>
                                                        <Button 
                                                            color="primary"
                                                            size="sm"
                                                            outline
                                                            className="rounded-pill"
                                                            disabled={yogaStats.points < 1000}
                                                        >
                                                            {yogaStats.points >= 1000 ? "Débloquer" : "Bloqué"}
                                                        </Button>
                                                    </li>
                                                </ul>
                                                
                                                <div className="next-milestone p-3 rounded-4 mt-3" 
    style={{ backgroundColor: "rgba(99, 102, 241, 0.05)" }}
>
    <h6 className="text-primary mb-2 fw-bold">Prochain palier</h6>
    {(() => {
        const currentLevelPoints = (yogaStats.level - 1) * 2000;
        const pointsInCurrentLevel = yogaStats.points - currentLevelPoints;
        const pointsToNextLevel = 2000 - pointsInCurrentLevel;
        
        return (
            <>
                <p className="small mb-2">Encore {pointsToNextLevel} points pour atteindre le niveau {yogaStats.level + 1}</p>
                <Progress 
                    value={(pointsInCurrentLevel * 100 / 2000)} 
                    className="progress-sm"
                    style={{ height: "6px", borderRadius: "3px" }}
                    color="primary"
                />
                <div className="d-flex justify-content-between">
                    <small className="text-muted">{pointsInCurrentLevel} / 2000</small>
                    <small className="text-primary">Niveau {yogaStats.level + 1}</small>
                </div>
            </>
        );
    })()}
</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </Col>

            <Col lg={4}>
                <div className="sidebar-content position-sticky" style={{ top: "20px" }}>
                    <Card className="border-0 shadow-sm mb-4 overflow-hidden" style={{ borderRadius: "20px" }}>
                        <div className="position-relative">
                            <div className="profile-header p-4" 
                                style={{ 
                                    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <div className="avatar bg-white rounded-circle d-flex align-items-center justify-content-center"
                                        style={{ width: 60, height: 60, boxShadow: "0 5px 15px rgba(0,0,0,0.15)" }}
                                    >
                                        <span className="fw-bold text-primary" style={{ fontSize: "1.5rem" }}>{userInfo.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    
                                    <div className="ms-3 text-white">
                                        <h5 className="mb-1 fw-bold">{userInfo.name}</h5>
                                        <div className="d-flex align-items-center">
                                            <span className="me-2">Niveau {yogaStats.level}</span>
                                            <span className="badge bg-white text-primary rounded-pill">Débutant</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="profile-body p-4">
                            <div className="d-flex stats-row mb-3">
                                <div className="stat-item flex-grow-1 text-center">
                                    <div className="stat-number fw-bold text-primary fs-4">{yogaStats.points}</div>
                                    <div className="stat-label text-muted small">Points</div>
                                </div>
                                
                                <div className="stat-item flex-grow-1 text-center px-3 border-start border-end">
                                    <div className="stat-number fw-bold text-success fs-4">{yogaStats.sessionCount}</div>
                                    <div className="stat-label text-muted small">Séances</div>
                                </div>
                                
                                <div className="stat-item flex-grow-1 text-center">
                                    <div className="stat-number fw-bold text-danger fs-4">{yogaStats.streak}</div>
                                    <div className="stat-label text-muted small">Jours</div>
                                </div>
                            </div>
                            
                            <div className="streak-info p-3 rounded-4 mb-3"
                                style={{ backgroundColor: "rgba(99, 102, 241, 0.05)" }}
                            >
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="mb-0 fw-semibold">Série actuelle</h6>
                                        <p className="mb-0 small text-muted">Pratiquez chaque jour</p>
                                    </div>
                                    <div>
                                        <span className="badge bg-danger rounded-pill px-3 py-2">
                                            <FontAwesomeIcon icon={faFire} className="me-1" />
                                            {yogaStats.streak} jours
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="last-session mb-3">
    <h6 className="mb-2 fw-semibold">Dernière séance</h6>
    <div className="d-flex justify-content-between align-items-center p-3 rounded-4 border">
        <div>
            <div className="text-muted small">Date</div>
            <div>{yogaStats.lastSession || "Aucune séance"}</div>
        </div>
        
        <div className="text-center">
            <div className="text-muted small">Durée</div>
            <div>{formatTime(yogaStats.lastSessionDuration || 0)}</div>
        </div>
        
        <div className="text-end">
            <div className="text-muted small">Points</div>
            <div>{yogaStats.lastSessionPoints || 0}</div>
        </div>
    </div>
</div>
                            
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="btn btn-primary w-100 rounded-pill"
                                onClick={() => {
                                    setActiveTab("session");
                                    setSessionCompleted(false);
                                    setActiveStep(0);
                                }}
                            >
                                <FontAwesomeIcon icon={faPlay} className="me-2" />
                                Nouvelle séance
                            </motion.button>
                        </div>
                    </Card>
                    
                    <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: "20px" }}>
                        <div className="card-header bg-white p-4 border-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">Vos progrès</h5>
                                <Button 
                                    color="link" 
                                    className="p-0 text-decoration-none"
                                    onClick={() => setExpandedStats(!expandedStats)}
                                >
                                    <FontAwesomeIcon icon={expandedStats ? faChevronUp : faChevronDown} />
                                </Button>
                            </div>
                        </div>
                        
                        <AnimatePresence>
                            {expandedStats && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="card-body pt-0 pb-4 px-4">
                                    <div className="skills mb-4">
    <div className="d-flex justify-content-between mb-1">
        <small className="text-muted">Niveau de compétence</small>
        <small className="text-primary fw-bold">{skillLevel}%</small>
    </div>
    <Progress 
        value={skillLevel} 
        className="mb-3" 
        style={{height: "8px", borderRadius: "4px"}}
    />
    
    <div className="d-flex justify-content-between text-center">
        <div className="level-marker">
            <div className="marker-dot bg-primary rounded-circle mx-auto mb-1" 
                style={{width: "8px", height: "8px"}} 
            />
            <small className="text-muted">Débutant</small>
        </div>
        
        <div className="level-marker">
            <div className="marker-dot bg-primary rounded-circle mx-auto mb-1" 
                style={{
                    width: "8px", 
                    height: "8px", 
                    opacity: yogaStats.level >= 5 ? 1 : 0.3
                }} 
            />
            <small className="text-muted">Intermédiaire</small>
        </div>
        
        <div className="level-marker">
            <div className="marker-dot bg-primary rounded-circle mx-auto mb-1" 
                style={{
                    width: "8px", 
                    height: "8px", 
                    opacity: yogaStats.level >= 15 ? 1 : 0.3
                }} 
            />
            <small className="text-muted">Avancé</small>
        </div>
    </div>
</div>
                                        
                                        <hr className="my-3" />
                                        
                                        <h6 className="fw-bold mb-3">Poses maîtrisées</h6>

<div className="poses-mastered">
    {yogaStats.poseMastery && Object.entries(yogaStats.poseMastery)
        .sort((a, b) => b[1].mastery - a[1].mastery) // Trier par pourcentage de maîtrise décroissant
        .slice(0, 3) // Afficher seulement les 3 premières poses
        .map(([poseName, poseData], index) => {
            const mastery = poseData.mastery;
            let statusColor = "primary";
            let statusText = `${mastery}%`;
            
            // Déterminer la couleur et le texte en fonction du niveau de maîtrise
            if (mastery >= 100) {
                statusColor = "success";
                statusText = "Maîtrisé";
            } else if (mastery >= 75) {
                statusColor = "info";
            } else if (mastery >= 50) {
                statusColor = "warning";
            } else if (mastery >= 25) {
                statusColor = "primary";
            } else {
                statusColor = "secondary";
            }
            
            return (
                <div className="pose-item d-flex align-items-center mb-2" key={index}>
                    <div 
                        className={`pose-icon rounded-circle bg-${statusColor} bg-opacity-10 d-flex align-items-center justify-content-center me-2`}
                        style={{width: "30px", height: "30px"}}
                    >
                        <FontAwesomeIcon 
                            icon={
                                poseName === "T Pose" ? faYinYang :
                                poseName === "Tree Pose" ? faYinYang :
                                poseName === "Warrior II Pose" ? faYinYang :
                                poseName === "Seated Meditation Pose" ? faOm :
                                faYinYang
                            } 
                            className={`text-${statusColor}`} 
                            size="sm" 
                        />
                    </div>
                    <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                            <span className="small">{poseName.replace(" Pose", "")}</span>
                            <small className={`text-${statusColor}`}>
                                {statusText}
                            </small>
                        </div>
                        <Progress 
                            value={mastery} 
                            color={statusColor} 
                            className="progress-sm" 
                            style={{height: "4px", borderRadius: "2px"}} 
                        />
                    </div>
                </div>
            );
        })}
    
    {(!yogaStats.poseMastery || Object.keys(yogaStats.poseMastery).length === 0) && (
        <p className="text-muted text-center small">Aucune pose pratiquée</p>
    )}
    
    <div className="text-center mt-3">
        <Button 
            color="link"
            className="text-decoration-none p-0"
            onClick={() => setActiveTab("poses")}
        >
            <small>Voir toutes les poses</small>
        </Button>
    </div>
</div>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </div>
            </Col>
        </Row>
    </Container>
);
};

export default YogaInterface;