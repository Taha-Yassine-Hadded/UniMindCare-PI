import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Modal, Nav, Table, ProgressBar } from 'react-bootstrap';
import { BsExclamationTriangleFill, BsClockHistory, BsCheckCircle, BsBarChartFill, BsMap, BsCalendar, BsPieChart } from 'react-icons/bs';
import { FaMapMarkerAlt, FaUserCircle, FaHospital, FaPhone, FaChartLine, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './EmergencyDashboard.css';

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Fonction utilitaire pour extraire les coordonnées à partir d'un claim
const extractCoordinates = (claim) => {
  // Si on a déjà lat/lng
  if (claim.latitude && claim.longitude && 
      !isNaN(parseFloat(claim.latitude)) && 
      !isNaN(parseFloat(claim.longitude))) {
    return {
      lat: parseFloat(claim.latitude),
      lng: parseFloat(claim.longitude)
    };
  }
  
  // Sinon, essayer d'extraire depuis location
  if (claim.location) {
    const coordsMatch = claim.location.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
    if (coordsMatch) {
      return {
        lat: parseFloat(coordsMatch[1]),
        lng: parseFloat(coordsMatch[2])
      };
    }
  }
  
  return null; // Pas de coordonnées trouvées
};

// Composant pour afficher une carte OpenStreetMap (solution de secours)
const OpenStreetMapEmbed = ({ latitude, longitude, zoom = 15 }) => {
  return (
    <iframe
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.005}%2C${latitude-0.005}%2C${longitude+0.005}%2C${latitude+0.005}&amp;layer=mapnik&amp;marker=${latitude}%2C${longitude}`}
      style={{ width: '100%', height: '100%', border: '1px solid #ddd', borderRadius: '8px' }}
      title="OpenStreetMap"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    ></iframe>
  );
};

// Sous-composant pour afficher une carte d'une seule réclamation
const SingleEmergencyMap = ({ claim }) => {
  const [singleMapError, setSingleMapError] = useState(false);
  
  return (
    <div className="emergency-map" style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      {!singleMapError ? (
        <iframe 
          title="Emergency Locations Map"
          width="100%" 
          height="100%" 
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDdL6W-ZWFsrcYoxx2LLPg8NUDOZOhr4RY&q=${claim.latitude},${claim.longitude}&zoom=15`}
          onError={() => setSingleMapError(true)}
        ></iframe>
      ) : (
        <div style={{ height: '100%', width: '100%' }}>
          <OpenStreetMapEmbed 
            latitude={parseFloat(claim.latitude)} 
            longitude={parseFloat(claim.longitude)}
          />
          <div className="mt-2 text-center">
            <small className="text-muted">
              Coordonnées: {claim.latitude}, {claim.longitude}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant de carte pour afficher les emplacements des urgences
const EmergencyMap = ({ claims }) => {
  const [imageLoadError, setImageLoadError] = useState(false);

  // Filtrer les réclamations avec des coordonnées valides
  const validClaimsWithCoords = claims.filter(claim => {
    // Vérifier si location contient des coordonnées
    if (claim.location && !claim.latitude && !claim.longitude) {
      const coordsMatch = claim.location.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
      if (coordsMatch) {
        claim.latitude = coordsMatch[1];
        claim.longitude = coordsMatch[2];
      }
    }
    
    return claim.latitude && claim.longitude && 
      !isNaN(parseFloat(claim.latitude)) && 
      !isNaN(parseFloat(claim.longitude));
  });

  console.log('Claims avec coordonnées valides:', validClaimsWithCoords);
  
  if (validClaimsWithCoords.length === 0) {
    return (
      <div className="text-center py-5">
        <p>Aucune coordonnée disponible pour les cas d'urgence</p>
      </div>
    );
  }

  // Si on a une seule réclamation, afficher une carte simple avec un marqueur
  if (validClaimsWithCoords.length === 1) {
    return <SingleEmergencyMap claim={validClaimsWithCoords[0]} />;
  }

  // Pour plusieurs réclamations, calculer le centre et afficher tous les marqueurs
  // Calculer le centre de la carte (moyenne des coordonnées)
  const center = validClaimsWithCoords.reduce(
    (acc, claim) => {
      acc.lat += parseFloat(claim.latitude) / validClaimsWithCoords.length;
      acc.lng += parseFloat(claim.longitude) / validClaimsWithCoords.length;
      return acc;
    },
    { lat: 0, lng: 0 }
  );

  // Construire les marqueurs pour l'URL
  const markers = validClaimsWithCoords
    .map((claim, index) => {
      // Alterner les couleurs des marqueurs pour les distinguer
      const color = claim.severityScore > 8 ? 'red' : 
                    claim.severityScore > 4 ? 'yellow' : 'blue';
      // Ajouter un label pour chaque marqueur (si moins de 10 points)
      const label = validClaimsWithCoords.length <= 10 ? `${index + 1}` : '';
      return `color:${color}|label:${label}|${claim.latitude},${claim.longitude}`;
    })
    .join('&markers=');

  // Créer une image de carte statique avec tous les marqueurs
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=14&size=800x600&scale=2&maptype=roadmap&markers=${markers}&key=AIzaSyDdL6W-ZWFsrcYoxx2LLPg8NUDOZOhr4RY`;

  return (
    <div className="emergency-map text-center" style={{ borderRadius: '8px', overflow: 'hidden' }}>
      {!imageLoadError ? (
        <div className="position-relative">
          <img 
            src={staticMapUrl} 
            alt="Carte des urgences" 
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
            onError={() => {
              console.error("Erreur de chargement de la carte Google Maps statique");
              setImageLoadError(true);
            }}
          />
        </div>
      ) : (
        <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <OpenStreetMapEmbed 
            latitude={center.lat} 
            longitude={center.lng} 
            zoom={13}
          />
          <div className="mt-2 text-center">
            <small className="text-muted">
              Vue alternative - Les marqueurs individuels ne sont pas disponibles sur cette carte
            </small>
          </div>
        </div>
      )}
      
      <p className="mt-3">
        <small className="text-muted">
          Carte montrant {validClaimsWithCoords.length} cas d'urgence
        </small>
      </p>
      
      {/* Liste des emplacements sous la carte */}
      <div className="mt-3 text-start">
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-white">
            <h6 className="mb-0">Liste des emplacements</h6>
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {validClaimsWithCoords.map((claim, index) => (
                <div key={claim._id || index} className="d-flex align-items-center p-3 border-bottom">
                  <div className={`me-3 rounded-circle d-flex align-items-center justify-content-center ${
                    claim.severityScore > 8 ? 'bg-danger' : claim.severityScore > 4 ? 'bg-warning' : 'bg-info'}`} 
                    style={{width: '32px', height: '32px', color: 'white'}}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="fw-bold">{claim.identifiant}</div>
                    <div className="small text-muted">
                      <FaMapMarkerAlt className="text-danger me-1" /> 
                      {claim.location || `${claim.latitude}, ${claim.longitude}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

// Composant pour afficher la carte de localisation dans le modal
const LocationMapModal = ({ claim }) => {
  const [iframeError, setIframeError] = useState(false);
  
  // Extraire les coordonnées
  const coords = extractCoordinates(claim);
  
  // Si pas de coordonnées valides, ne pas afficher de carte
  if (!coords) return null;
  
  return (
    <div className="mb-4">
      <h6 className="mb-3 fw-bold text-primary">Localisation</h6>
      {!iframeError ? (
        <div style={{ height: '200px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe 
            title={`Map for ${claim.identifiant}`}
            width="100%" 
            height="100%" 
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDdL6W-ZWFsrcYoxx2LLPg8NUDOZOhr4RY&q=${coords.lat},${coords.lng}&zoom=15`}
            onError={() => setIframeError(true)}
          ></iframe>
        </div>
      ) : (
        <div style={{ height: '200px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <OpenStreetMapEmbed 
            latitude={coords.lat} 
            longitude={coords.lng}
          />
        </div>
      )}
      <p className="mt-1 small text-muted">
        <strong>Coordonnées:</strong> {coords.lat}, {coords.lng}
      </p>
    </div>
  );
};

// Composant principal
const EmergencyDashboard = () => {
  // State variables
const [pendingClaims, setPendingClaims] = useState([]);
const [allClaims, setAllClaims] = useState([]);
const [stats, setStats] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [selectedClaim, setSelectedClaim] = useState(null);
const [showModal, setShowModal] = useState(false);
const [processingClaim, setProcessingClaim] = useState(false);
const [status, setStatus] = useState('processing');
const [notes, setNotes] = useState('');
const [userData, setUserData] = useState(null);
const [usersData, setUsersData] = useState({});  // Ajoutez cette ligne
const [activeTab, setActiveTab] = useState('list');
const [dateRange, setDateRange] = useState('week'); // week, month, year
const navigate = useNavigate();
  // Fonction simplifiée pour gérer le chargement de la carte - évite complètement le JS de Google Maps
  const [mapLoaded, setMapLoaded] = useState(true);  // Toujours considéré comme chargé

  // Fonction pour décoder un token JWT
  const decodeToken = (token) => {
    try {
      if (!token) return null;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Erreur de décodage du token:", error);
      return null;
    }
  };

  // Récupérer les données utilisateur au chargement du composant
  useEffect(() => {
    try {
      // Récupérer les données utilisateur du localStorage comme le fait le composant Ravanuechart
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        const parsedUserData = JSON.parse(userDataString);
        setUserData(parsedUserData);
        console.log("Données utilisateur récupérées:", parsedUserData);
        
        // Vérifier si l'utilisateur a le rôle admin, psychologist ou teacher
        const userRoles = Array.isArray(parsedUserData.Role) ? 
          parsedUserData.Role : 
          [parsedUserData.Role];
        
        const canAccessEmergency = userRoles.some(role => 
          ['admin', 'psychologist', 'teacher'].includes(role)
        );
        
        if (!canAccessEmergency) {
          setError("Vous n'avez pas les permissions nécessaires pour accéder à cette page.");
          setLoading(false);
        }
      } else {
        console.warn("Données utilisateur non trouvées dans localStorage");
        setError("Impossible de récupérer vos informations. Veuillez vous reconnecter.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des données utilisateur:", err);
      setError("Une erreur est survenue lors du chargement de vos données.");
      setLoading(false);
    }
  }, []);

  // Récupérer le token avec un fallback sur sessionStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }, []);

  // Configuration Axios avec authentification
  const getAuthConfig = useCallback(() => {
    const token = getToken();
    const config = {
      headers: {}
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      config.headers['X-Auth-FaceID'] = 'true';  // Ajout du même en-tête que dans PrivateRoute
    }

    return config;
  }, [getToken]);

  // Récupérer tous les cas d'urgence avec coordonnées pour la carte
  const fetchAllClaims = useCallback(async () => {
    try {
      const config = getAuthConfig();
      
      if (!config.headers.Authorization) {
        console.error("Non authentifié. Veuillez vous connecter.");
        return;
      }
  
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/emergency/all-claims`,
        config
      );
      
      // Transformation des données pour s'assurer que les coordonnées sont bien formatées
      const formattedClaims = response.data.map(claim => {
        // Si location contient des coordonnées, les extraire
        if (claim.location && !claim.latitude && !claim.longitude) {
          const coordsMatch = claim.location.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
          if (coordsMatch) {
            claim.latitude = coordsMatch[1];
            claim.longitude = coordsMatch[2];
          }
        }
        
        return {
          ...claim,
          // Convertir les coordonnées en nombre ou les définir à null si invalides
          latitude: claim.latitude ? parseFloat(claim.latitude) : null,
          longitude: claim.longitude ? parseFloat(claim.longitude) : null
        };
      });
      
      setAllClaims(formattedClaims);
    } catch (err) {
      console.error("Erreur lors de la récupération de tous les cas d'urgence:", err);
    }
  }, [getAuthConfig]);
  
  // Fetch prioritized pending claims
  const fetchPendingClaims = useCallback(async () => {
    try {
      setLoading(true);
      
      const config = getAuthConfig();
      
      if (!config.headers.Authorization) {
        setError("Non authentifié. Veuillez vous connecter.");
        setLoading(false);
        return;
      }
      
      // Vérifier si l'utilisateur a les permissions nécessaires
      if (userData && userData.Role) {
        const userRoles = Array.isArray(userData.Role) ? userData.Role : [userData.Role];
        const canAccessEmergency = userRoles.some(role => 
          ['admin', 'psychologist', 'teacher'].includes(role)
        );
        
        if (!canAccessEmergency) {
          setError("Vous n'avez pas les permissions nécessaires pour accéder à ces données.");
          setLoading(false);
          return;
        }
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/emergency/pending-prioritized`,
        config
      );
      
      setPendingClaims(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors de la récupération des cas d'urgence:", err);
      setError(err.response?.data?.message || "Impossible de récupérer les cas d'urgence. Veuillez réessayer.");
      setLoading(false);
    }
  }, [getAuthConfig, userData]);

  // Fetch emergency statistics
  const fetchStats = useCallback(async () => {
    try {
      const config = getAuthConfig();
      
      if (!config.headers.Authorization) {
        console.error("Non authentifié. Veuillez vous connecter.");
        return;
      }
      
      // Vérifier si l'utilisateur a les permissions nécessaires
      if (userData && userData.Role) {
        const userRoles = Array.isArray(userData.Role) ? userData.Role : [userData.Role];
        const canAccessEmergency = userRoles.some(role => 
          ['admin', 'psychologist', 'teacher'].includes(role)
        );
        
        if (!canAccessEmergency) {
          console.error("Utilisateur sans permissions nécessaires pour les statistiques d'urgence");
          return;
        }
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/emergency/stats`,
        config
      );
      
      setStats(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des statistiques:", err);
    }
  }, [getAuthConfig, userData]);



// Fetch users data
const fetchUserDetails = useCallback(async () => {
  try {
    const config = getAuthConfig();
    
    if (!config.headers.Authorization) {
      console.error("Non authentifié. Veuillez vous connecter.");
      return [];
    }
    
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users`,
      config
    );
    
    return response.data;
  } catch (err) {
    console.error("Erreur lors de la récupération des données utilisateurs:", err);
    return [];
  }
}, [getAuthConfig]);


  // Load data on component mount
useEffect(() => {
  if (userData) {
    fetchPendingClaims();
    fetchStats();
    fetchAllClaims();
    
    // Récupérer les détails des utilisateurs
    fetchUserDetails().then((users) => {
      // Transformer le tableau en objet indexé par Identifiant pour un accès rapide
      const userMap = {};
      users.forEach(user => {
        userMap[user.Identifiant] = user;
      });
      setUsersData(userMap);
    });
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchPendingClaims();
      fetchStats();
      
      // Récupérer les données de la carte seulement si l'onglet carte est actif
      if (activeTab === 'map') {
        fetchAllClaims();
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }
}, [fetchPendingClaims, fetchStats, fetchAllClaims, userData, activeTab, fetchUserDetails]);

  // Récupérer les données de la carte quand on active l'onglet
  useEffect(() => {
    if (activeTab === 'map' && userData) {
      fetchAllClaims();
    }
  }, [activeTab, fetchAllClaims, userData]);

  // Handle claim selection
  const handleSelectClaim = (claim) => {
    setSelectedClaim(claim);
    setShowModal(true);
    setNotes('');
    setStatus('processing'); // Reset status à chaque sélection
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedClaim) return;
    
    try {
      setProcessingClaim(true);
      const config = getAuthConfig();
      
      if (!config.headers.Authorization) {
        setError("Non authentifié. Veuillez vous connecter.");
        setProcessingClaim(false);
        return;
      }
      
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/emergency/${selectedClaim._id}/status`,
        { status, notes },
        config
      );
      
      setShowModal(false);
      setSelectedClaim(null);
      setProcessingClaim(false);
      
      // Refresh data
      fetchPendingClaims();
      fetchStats();
      if (activeTab === 'map') {
        fetchAllClaims();
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      setError(err.response?.data?.message || "Erreur lors de la mise à jour du statut.");
      setProcessingClaim(false);
    }
  };

  // Prepare chart data for statistics with safeguards
  const chartData = useMemo(() => {
    if (!stats) return {
      basic: { pendingCount: 0, processingCount: 0, resolvedCount: 0, rejectedCount: 0, recentCount: 0 },
      time: []
    };
    
    // Statistiques de base
    const pendingCount = stats.statsByStatus?.find(s => s._id === 'pending')?.count || 0;
    const processingCount = stats.statsByStatus?.find(s => s._id === 'processing')?.count || 0;
    const resolvedCount = stats.statsByStatus?.find(s => s._id === 'resolved')?.count || 0;
    const rejectedCount = stats.statsByStatus?.find(s => s._id === 'rejected')?.count || 0;
    const recentCount = stats.recentStats?.reduce((sum, item) => sum + (item?.count || 0), 0) || 0;
    
    // Données de tendance
    let timeData = [];

    // Format des données temporelles selon la période sélectionnée
    if (dateRange === 'week' && stats.dailyStats && stats.dailyStats.length > 0) {
      // Derniers 7 jours
      timeData = stats.dailyStats.slice(0, 7).reverse();
    } else if (dateRange === 'month' && stats.dailyStats && stats.dailyStats.length > 0) {
      // Dernier mois
      timeData = stats.dailyStats.slice(0, 30).reverse();
    } else if (dateRange === 'year' && stats.monthlyStats && stats.monthlyStats.length > 0) {
      // Dernière année
      timeData = stats.monthlyStats.slice(0, 12).reverse();
    }
    
    return { 
      basic: { pendingCount, processingCount, resolvedCount, rejectedCount, recentCount },
      time: timeData
    };
  }, [stats, dateRange]);

  // Si l'utilisateur n'a pas les autorisations nécessaires, afficher un message d'erreur
  if (error && error === "Vous n'avez pas les permissions nécessaires pour accéder à cette page.") {
    return (
      <Container fluid className="py-5">
        <Row>
          <Col>
            <Alert variant="danger">
              <Alert.Heading>Accès refusé</Alert.Heading>
              <p>
                Vous n'avez pas les autorisations nécessaires pour accéder au tableau de bord des urgences.
                Cette fonctionnalité est réservée aux administrateurs, psychologues et enseignants.
              </p>
              <hr />
              <div className="d-flex justify-content-end">
                <Button 
                  onClick={() => navigate('/dashboard/default')} 
                  variant="outline-danger"
                >
                  Retour au tableau de bord
                </Button>
              </div>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header modernisé */}
      <Card className="border-0 shadow-sm bg-primary text-white mb-4">
        <Card.Body className="py-4">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div className="bg-white text-danger p-3 rounded-circle me-3">
                <BsExclamationTriangleFill size={24} />
              </div>
              <div>
                <h2 className="mb-0">Tableau de Bord des Urgences</h2>
                <p className="mb-0 mt-1 opacity-75">
                  Gestion centralisée des cas d'urgence pour intervention rapide
                </p>
              </div>
            </div>
            <Button 
              variant="light" 
              className="shadow-sm"
              onClick={() => {
                fetchPendingClaims();
                fetchStats();
                if (activeTab === 'map') {
                  fetchAllClaims();
                }
              }}
            >
              Actualiser
              {stats && stats.recentStats && (
                <Badge bg="danger" className="ms-2">
                  {stats.recentStats.reduce((sum, item) => sum + (item?.count || 0), 0)} aujourd'hui
                </Badge>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {error && error !== "Vous n'avez pas les permissions nécessaires pour accéder à cette page." && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Navigation entre liste, graphique et carte */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white">
          <Nav variant="tabs" defaultActiveKey="list" onSelect={(key) => setActiveTab(key)}>
            <Nav.Item>
              <Nav.Link eventKey="list" className="d-flex align-items-center">
                <BsExclamationTriangleFill className="me-2" /> Cas en attente
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="chart" className="d-flex align-items-center">
                <BsBarChartFill className="me-2" /> Statistiques
              </Nav.Link>
            </Nav.Item>
            {/* 
<Nav.Item>
  <Nav.Link eventKey="map" className="d-flex align-items-center">
    <BsMap className="me-2" /> Carte des urgences
  </Nav.Link>
</Nav.Item> 
*/}
          </Nav>
        </Card.Header>
        <Card.Body className="p-0">
          {activeTab === 'list' && (
            <div className="p-3">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Chargement des cas d'urgence...</p>
                </div>
              ) : pendingClaims.length === 0 ? (
                <div className="text-center py-5">
                  <BsCheckCircle size={48} className="text-success mb-3" />
                  <h5>Aucun cas d'urgence en attente</h5>
                  <p className="text-muted">Tout va bien pour le moment!</p>
                </div>
              ) : (
                <div className="emergency-claims-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
  {pendingClaims.map((claim) => {
    // Récupérer les informations de l'utilisateur
    const userDetails = usersData[claim.identifiant] || {};
    
    return (
      <div 
        key={claim._id} 
        className={`emergency-claim-item p-3 mb-3 rounded border ${selectedClaim?._id === claim._id ? 'border-primary' : ''}`}
        onClick={() => handleSelectClaim(claim)}
        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
      >
        <div className="d-flex align-items-start">
          <div className={`me-3 mt-1 ${claim.severityScore > 8 ? 'bg-danger' : claim.severityScore > 4 ? 'bg-warning' : 'bg-info'}`} 
               style={{ width: '6px', height: '55px', borderRadius: '3px' }}></div>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h5 className="mb-0 fw-bold">{userDetails.Name || claim.identifiant}</h5>
                <div className="text-muted small">
                  <span className="me-3"><i className="fas fa-id-card me-1"></i> ID: {claim.identifiant}</span>
                  {userDetails.Email && <span className="d-block mt-1"><i className="fas fa-envelope me-1"></i> {userDetails.Email}</span>}
                  {userDetails.PhoneNumber && <span className="d-block mt-1"><i className="fas fa-phone me-1"></i> {userDetails.PhoneNumber}</span>}
                </div>
              </div>
              
              <small className="text-muted">
                {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true, locale: fr })}
              </small>
            </div>
            <p className="mb-2">{claim.description}</p>
            <div className="d-flex flex-wrap gap-1 mb-2">
              {claim.symptoms && claim.symptoms.map((symptom, idx) => (
                <Badge 
                  key={idx} 
                  bg={symptom.severity?.toLowerCase() === 'high' || symptom.severity?.toLowerCase() === 'grave' ? 'danger' : 
                      symptom.severity?.toLowerCase() === 'medium' || symptom.severity?.toLowerCase() === 'modéré' ? 'warning' : 'info'}
                  className="me-1 mb-1 py-2 px-3"
                >
                  {symptom.name}
                </Badge>
              ))}
            </div>
            {claim.location && (
              <div className="mt-1 bg-light p-2 rounded d-flex align-items-center">
                <FaMapMarkerAlt className="text-danger me-2" /> 
                <span className="text-muted small">{claim.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })}
</div>
              )}
            </div>
          )}

          {/* Affichage des statistiques modernes */}
          {activeTab === 'chart' && chartData && (
            <div className="p-4">
              {/* Section 1: Périodes */}
              <Row className="mb-4 align-items-center">
                <Col md={6}>
                  <h5 className="mb-0">Analyse des cas d'urgence</h5>
                  <p className="text-muted mb-0">Aperçu des tendances et répartitions</p>
                </Col>
                <Col md={6}>
                  <div className="d-flex justify-content-md-end">
                    <div className="btn-group">
                      <Button 
                        size="sm" 
                        variant={dateRange === 'week' ? 'primary' : 'outline-primary'} 
                        onClick={() => setDateRange('week')}
                      >
                        <FaCalendarAlt className="me-1" /> Semaine
                      </Button>
                      <Button 
                        size="sm" 
                        variant={dateRange === 'month' ? 'primary' : 'outline-primary'} 
                        onClick={() => setDateRange('month')}
                      >
                        <FaCalendarAlt className="me-1" /> Mois
                      </Button>
                      <Button 
                        size="sm" 
                        variant={dateRange === 'year' ? 'primary' : 'outline-primary'} 
                        onClick={() => setDateRange('year')}
                      >
                        <FaChartLine className="me-1" /> Année
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Section 2: Vue d'ensemble avec design amélioré */}
              <Row className="mb-4">
                <Col md={6} className="mb-4">
                  <Card className="h-100 shadow-sm border-0">
                    <Card.Header className="bg-white border-bottom-0">
                      <div className="d-flex align-items-center">
                        <BsPieChart className="me-2 text-primary" />
                        <h6 className="mb-0 fw-bold">Distribution par statut</h6>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <Table className="mb-0 table-hover">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Nombre</th>
                            <th>Pourcentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats && (
                            <>
                              <tr>
                                <td>
                                  <span className="d-flex align-items-center">
                                    <span className="me-2 d-inline-block bg-warning" style={{ width: '12px', height: '12px', borderRadius: '50%' }}></span>
                                    En attente
                                  </span>
                                </td>
                                <td className="fw-bold">{chartData.basic.pendingCount}</td>
                                <td>
                                  <ProgressBar now={chartData.basic.pendingCount} max={chartData.basic.pendingCount + chartData.basic.processingCount + chartData.basic.resolvedCount + chartData.basic.rejectedCount || 1} variant="warning" style={{ height: '8px', borderRadius: '4px' }} />
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <span className="d-flex align-items-center">
                                    <span className="me-2 d-inline-block bg-info" style={{ width: '12px', height: '12px', borderRadius: '50%' }}></span>
                                    En traitement
                                  </span>
                                </td>
                                <td className="fw-bold">{chartData.basic.processingCount}</td>
                                <td>
                                  <ProgressBar now={chartData.basic.processingCount} max={chartData.basic.pendingCount + chartData.basic.processingCount + chartData.basic.resolvedCount + chartData.basic.rejectedCount || 1} variant="info" style={{ height: '8px', borderRadius: '4px' }} />
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <span className="d-flex align-items-center">
                                    <span className="me-2 d-inline-block bg-success" style={{ width: '12px', height: '12px', borderRadius: '50%' }}></span>
                                    Résolu
                                  </span>
                                </td>
                                <td className="fw-bold">{chartData.basic.resolvedCount}</td>
                                <td>
                                  <ProgressBar now={chartData.basic.resolvedCount} max={chartData.basic.pendingCount + chartData.basic.processingCount + chartData.basic.resolvedCount + chartData.basic.rejectedCount || 1} variant="success" style={{ height: '8px', borderRadius: '4px' }} />
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <span className="d-flex align-items-center">
                                    <span className="me-2 d-inline-block bg-secondary" style={{ width: '12px', height: '12px', borderRadius: '50%' }}></span>
                                    Rejeté
                                  </span>
                                </td>
                                <td className="fw-bold">{chartData.basic.rejectedCount}</td>
                                <td>
                                  <ProgressBar now={chartData.basic.rejectedCount} max={chartData.basic.pendingCount + chartData.basic.processingCount + chartData.basic.resolvedCount + chartData.basic.rejectedCount || 1} variant="secondary" style={{ height: '8px', borderRadius: '4px' }} />
                                </td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6} className="mb-4">
                

                <Card className="h-100 shadow-sm border-0">
  <Card.Header className="bg-white border-bottom-0">
    <div className="d-flex align-items-center">
      <FaChartLine className="me-2 text-primary" />
      <h6 className="mb-0 fw-bold">Répartition par catégorie</h6>
    </div>
  </Card.Header>
  <Card.Body className="p-4">
    <Table className="mb-0 table-hover">
      <thead>
        <tr>
          <th>Type</th>
          <th>Nombre</th>
          <th>Pourcentage</th>
        </tr>
      </thead>
      <tbody>
        {stats && stats.symptomStats && (
          <>
            <tr>
              <td>
                <span className="d-flex align-items-center">
                  <span className="me-2 d-inline-block bg-info" style={{ width: '12px', height: '12px', borderRadius: '50%' }}></span>
                  Neurologique
                </span>
              </td>
              <td className="fw-bold">{stats.symptomStats.find(s => s._id === 'neurological')?.count || 0}</td>
              <td>
                <ProgressBar 
                  now={stats.symptomStats.find(s => s._id === 'neurological')?.count || 0} 
                  max={Math.max(1, (stats.symptomStats || []).reduce((sum, item) => sum + (item?.count || 0), 0))} 
                  variant="info" 
                  style={{ height: '8px', borderRadius: '4px' }} 
                />
              </td>
            </tr>
            <tr>
              <td>
                <span className="d-flex align-items-center">
                  <span className="me-2 d-inline-block bg-warning" style={{ width: '12px', height: '12px', borderRadius: '50%' }}></span>
                  Psychologique
                </span>
              </td>
              <td className="fw-bold">{stats.symptomStats.find(s => s._id === 'psychological')?.count || 0}</td>
              <td>
                <ProgressBar 
                  now={stats.symptomStats.find(s => s._id === 'psychological')?.count || 0}
                  max={Math.max(1, (stats.symptomStats || []).reduce((sum, item) => sum + (item?.count || 0), 0))}
                  variant="warning" 
                  style={{ height: '8px', borderRadius: '4px' }} 
                />
              </td>
            </tr>
            <tr>
              <td>
                <span className="d-flex align-items-center">
                  <span className="me-2 d-inline-block bg-danger" style={{ width: '12px', height: '12px', borderRadius: '50%' }}></span>
                  Infection
                </span>
              </td>
              <td className="fw-bold">{stats.symptomStats.find(s => s._id === 'infection')?.count || 0}</td>
              <td>
                <ProgressBar 
                  now={stats.symptomStats.find(s => s._id === 'infection')?.count || 0}
                  max={Math.max(1, (stats.symptomStats || []).reduce((sum, item) => sum + (item?.count || 0), 0))}
                  variant="danger" 
                  style={{ height: '8px', borderRadius: '4px' }} 
                />
              </td>
            </tr>
          </>
        )}
      </tbody>
    </Table>
  </Card.Body>
</Card>
              
                </Col>
              </Row>

              {/* Section 3: Timeline améliorée avec design moderne */}
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white border-bottom-0">
                  <div className="d-flex align-items-center">
                    <BsCalendar className="me-2 text-primary" />
                    <h6 className="mb-0 fw-bold">Évolution temporelle</h6>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="time-chart p-2">
                    <table className="table table-borderless table-hover">
                      <thead>
                        <tr>
                          <th style={{ width: '30%' }}>Période</th>
                          <th style={{ width: '20%' }}>Nombre</th>
                          <th style={{ width: '50%' }}>Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.time.map((item, index) => {
                          // Calcul du maximum pour avoir une échelle relative
                          const maxValue = Math.max(...chartData.time.map(i => i.count)) || 1;
                          const dateFormatted = format(
                            new Date(item.date), 
                            dateRange === 'year' ? 'MMM yyyy' : 'd MMM', 
                            { locale: fr }
                          );
                          
                          return (
                            <tr key={index}>
                              <td>{dateFormatted}</td>
                              <td className="fw-bold">{item.count}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="progress flex-grow-1" style={{ height: '8px', borderRadius: '4px' }}>
                                    <div 
                                      className="progress-bar bg-primary" 
                                      role="progressbar" 
                                      style={{ width: `${(item.count / maxValue) * 100}%` }}
                                      aria-valuenow={item.count} 
                                      aria-valuemin="0" 
                                      aria-valuemax={maxValue}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>

              {/* Nouveau: Vue visuelle en donut chart */}
              <Row className="mt-4">
                <Col md={6} className="mb-4">
                  <Card className="shadow-sm border-0 h-100">
                    <Card.Header className="bg-white border-bottom-0">
                      <h6 className="mb-0 fw-bold">Distribution des statuts</h6>
                    </Card.Header>
                    <Card.Body className="p-4 d-flex flex-column justify-content-center">
                      <div style={{ height: '220px' }}>
                        {stats && (
                          <Doughnut 
                            data={{
                              labels: ['En attente', 'En traitement', 'Résolus', 'Rejetés'],
                              datasets: [{
                                data: [
                                  chartData.basic.pendingCount,
                                  chartData.basic.processingCount,
                                  chartData.basic.resolvedCount,
                                  chartData.basic.rejectedCount,
                                ],
                                backgroundColor: [
                                  'rgba(255, 193, 7, 0.7)',
                                  'rgba(13, 202, 240, 0.7)',
                                  'rgba(25, 135, 84, 0.7)',
                                  'rgba(108, 117, 125, 0.7)',
                                ],
                                borderColor: [
                                  'rgb(255, 193, 7)',
                                  'rgb(13, 202, 240)',
                                  'rgb(25, 135, 84)',
                                  'rgb(108, 117, 125)',
                                ],
                                borderWidth: 1,
                                hoverOffset: 4
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom'
                                }
                              }
                            }}
                          />
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6} className="mb-4">
              
                <Card className="shadow-sm border-0 h-100">
  <Card.Header className="bg-white border-bottom-0">
    <h6 className="mb-0 fw-bold">Évolution par type</h6>
  </Card.Header>
  <Card.Body className="p-4 d-flex flex-column justify-content-center">
    <div style={{ height: '220px' }}>
      {stats && stats.dailyStats && (
        <Line 
          data={{
            labels: chartData.time.slice(0, 7).map(item => format(new Date(item.date), 'd MMM', { locale: fr })),
            datasets: [
              {
                label: 'Neurologique',
                data: [2, 1, 3, 2, 1, 0, 2], // Ces données devraient idéalement venir de votre API
                borderColor: 'rgb(13, 202, 240)',
                backgroundColor: 'rgba(13, 202, 240, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
              },
              {
                label: 'Psychologique',
                data: [1, 2, 1, 3, 2, 1, 0], // Ces données devraient idéalement venir de votre API
                borderColor: 'rgb(255, 193, 7)',
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
              },
              {
                label: 'Infection',
                data: [0, 1, 0, 1, 2, 1, 1], // Ces données devraient idéalement venir de votre API
                borderColor: 'rgb(220, 53, 69)',
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
              }
            ]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  usePointStyle: true
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            elements: {
              point: {
                radius: 3,
                hoverRadius: 5
              }
            }
          }}
        />
      )}
    </div>
    <div className="text-center mt-3">
      <small className="text-muted">Derniers 7 jours</small>
    </div>
  </Card.Body>
</Card>



                </Col>
              </Row>
            </div>
          )}

          {/* Affichage de la carte */}
          {activeTab === 'map' && (
            <div className="p-3">
              <EmergencyMap claims={allClaims} />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Emergency Claim Detail Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <div className={`me-2 ${selectedClaim && selectedClaim.severityScore > 8 ? 'text-danger' : selectedClaim && selectedClaim.severityScore > 4 ? 'text-warning' : 'text-info'}`}>
                <BsExclamationTriangleFill size={20} />
              </div>
              Détails du cas d'urgence
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClaim && (
            <>
              <div className="emergency-header mb-4 p-3 rounded bg-light">
  <div className="d-flex align-items-center justify-content-between">
    <div className="d-flex align-items-center">
      <div className={`severity-indicator me-3 ${selectedClaim.severityScore > 8 ? 'bg-danger' : selectedClaim.severityScore > 4 ? 'bg-warning' : 'bg-info'}`} style={{ width: '8px', height: '40px', borderRadius: '4px' }}></div>
      <div>
        <h5 className="mb-1 fw-bold text-primary">{usersData[selectedClaim.identifiant]?.Name || selectedClaim.identifiant}</h5>
        <div className="text-muted small mb-1">ID: {selectedClaim.identifiant}</div>
        {usersData[selectedClaim.identifiant]?.Email && (
          <div className="d-flex align-items-center mb-1">
            <i className="fas fa-envelope me-1 text-muted"></i>
            <span className="text-muted small">{usersData[selectedClaim.identifiant].Email}</span>
          </div>
        )}
        {usersData[selectedClaim.identifiant]?.PhoneNumber && (
          <div className="d-flex align-items-center mb-1">
            <i className="fas fa-phone me-1 text-muted"></i>
            <span className="text-muted small">{usersData[selectedClaim.identifiant].PhoneNumber}</span>
          </div>
        )}
        <div className="d-flex align-items-center">
          <BsClockHistory className="me-1 text-muted" />
          <small className="text-muted">
            Soumis le {format(new Date(selectedClaim.createdAt), 'PPp', { locale: fr })}
          </small>
        </div>
      </div>
    </div>
    <Badge 
      bg="warning" 
      className="px-3 py-2"
    >
      En attente
    </Badge>
  </div>
</div>

              <Row className="mb-4">
                <Col md={6}>
                  <Card className="border-0 bg-primary bg-opacity-10 h-100 shadow-sm">
                    <Card.Body className="p-4">
                      <h6 className="mb-3 fw-bold">Description de l'urgence</h6>
                      <p className="mb-4">{selectedClaim.description || "Urgence signalée sans description détaillée."}</p>
                      
                      {(selectedClaim.location || true) && (
                        <div className="d-flex align-items-center mt-3 p-3 bg-white rounded shadow-sm">
                          <FaMapMarkerAlt className="text-danger me-2" />
                          <span className="mb-3 fw-bold text-primary">{selectedClaim.location || '36.865733604669245, 10.307028444714604'}</span>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 bg-blue-100 h-100 shadow-sm" style={{ backgroundColor: 'rgba(13, 110, 253, 0.05)' }}>
                    <Card.Body className="p-4">
                      <h6 className="mb-3 fw-bold text-primary">Symptômes rapportés</h6>
                      {selectedClaim.symptoms && selectedClaim.symptoms.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                          {selectedClaim.symptoms.map((symptom, idx) => (
                            <Badge 
                              key={idx}
                              bg={symptom.severity?.toLowerCase() === 'high' || symptom.severity?.toLowerCase() === 'grave' ? 'danger' : 
                                  symptom.severity?.toLowerCase() === 'medium' || symptom.severity?.toLowerCase() === 'modéré' ? 'warning' : 'info'}
                              className="px-3 py-2"
                            >
                              {symptom.name} ({symptom.severity})
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted">Aucun symptôme spécifié</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Utilisation du nouveau système d'affichage de carte */}
              {selectedClaim && <LocationMapModal claim={selectedClaim} />}

              {selectedClaim.imageUrl && (
                <div className="mb-4">
                  <h6>Documentation jointe</h6>
                  <img 
                    src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${selectedClaim.imageUrl}`} 
                    alt="Documentation visuelle de la situation d'urgence" 
                    className="img-fluid rounded"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              )}

<div className="action-section mt-4 border p-4 rounded bg-primary bg-opacity-10 shadow-sm">
  <h6 className="fw-bold mb-3 text-primary">Actions de prise en charge</h6>
  <div className="mb-3">
    <label htmlFor="status" className="form-label">Changer le statut</label>
    <select 
      id="status" 
      className="form-select" 
      value={status}
      onChange={(e) => setStatus(e.target.value)}
    >
      <option value="processing">En cours de traitement</option>
      <option value="resolved">Résolu</option>
      <option value="rejected">Rejeté</option>
    </select>
  </div>
  <div className="mb-3">
    <label htmlFor="notes" className="form-label">Notes (visibles par l'étudiant)</label>
    <textarea 
      id="notes"
      className="form-control"
      rows="3"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Ajoutez des instructions, des commentaires ou des recommandations..."
    ></textarea>
  </div>
</div>

              <div className="quick-actions mt-4 mb-3">
                <h6 className="fw-bold mb-3">Actions rapides</h6>
                <div className="d-flex flex-wrap gap-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => setNotes(prev => prev + "Veuillez vous rendre au service médical de l'université dès que possible.")}
                  >
                    <FaHospital className="me-1" /> Demander visite médicale
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => setNotes(prev => prev + "Un responsable va vous contacter par téléphone dans les plus brefs délais.")}
                  >
                    <FaPhone className="me-1" /> Contacter par téléphone
                  </Button>
                 {/* <Button 
                    variant="outline-info" 
                    size="sm"
                    onClick={() => {
                      navigate(`/users/useredit/${selectedClaim.identifiant}`);
                    }}
                  >
                    <FaUserCircle className="me-1" /> Voir profil étudiant
                  </Button> */}
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Fermer
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStatusUpdate}
            disabled={processingClaim}
          >
            {processingClaim ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Traitement...
              </>
            ) : "Mettre à jour le statut"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmergencyDashboard;