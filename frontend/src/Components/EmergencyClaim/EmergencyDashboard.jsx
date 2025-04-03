import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Modal, Nav } from 'react-bootstrap';
import { BsExclamationTriangleFill, BsClockHistory, BsCheckCircle, BsBarChartFill, BsMap } from 'react-icons/bs';
import { FaMapMarkerAlt, FaUserCircle, FaHospital, FaPhone } from 'react-icons/fa';
import axios from 'axios';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
      
      <p className="mt-2">
        <small className="text-muted">
          Carte montrant {validClaimsWithCoords.length} cas d'urgence
        </small>
      </p>
      
      {/* Liste des emplacements sous la carte */}
      <div className="mt-3 text-start">
        <h6>Liste des emplacements:</h6>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {validClaimsWithCoords.map((claim, index) => (
            <div key={claim._id || index} className="mb-2 p-2 border-bottom">
              <strong>{index + 1}. {claim.identifiant}</strong>
              <div>
                <FaMapMarkerAlt className="text-danger me-1" /> 
                {claim.location || `${claim.latitude}, ${claim.longitude}`}
              </div>
            </div>
          ))}
        </div>
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
      <h6>Localisation</h6>
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
      
      console.log("Données formatées:", formattedClaims);
      
      // Vérifier si les données ont des coordonnées valides
      const withCoords = formattedClaims.filter(claim => 
        claim.latitude && claim.longitude && 
        !isNaN(claim.latitude) && 
        !isNaN(claim.longitude)
      );
      
      console.log("Réclamations avec coordonnées valides:", withCoords.length);
      if (withCoords.length > 0) {
        console.log("Exemple de coordonnées:", {
          lat: withCoords[0].latitude,
          lng: withCoords[0].longitude
        });
      }
      
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

  // Load data on component mount
  useEffect(() => {
    if (userData) {
      fetchPendingClaims();
      fetchStats();
      fetchAllClaims();
      
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
  }, [fetchPendingClaims, fetchStats, fetchAllClaims, userData, activeTab]);

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
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0">
              <BsExclamationTriangleFill className="me-2 text-danger" />
              Tableau de Bord des Urgences
            </h2>
            <Button 
              variant="outline-primary" 
              onClick={() => {
                fetchPendingClaims();
                fetchStats();
                if (activeTab === 'map') {
                  fetchAllClaims();
                }
              }}
            >
              Actualiser
            </Button>
          </div>
          <p className="text-muted">
            Gestion centralisée des cas d'urgence pour intervention rapide
          </p>
        </Col>
      </Row>

      {error && error !== "Vous n'avez pas les permissions nécessaires pour accéder à cette page." && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Row className="mb-4">
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                <div className="display-4 text-warning mb-2">
                  {stats.statsByStatus?.find(s => s._id === 'pending')?.count || 0}
                </div>
                <div className="text-muted">Cas en attente</div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                <div className="display-4 text-info mb-2">
                  {stats.statsByStatus?.find(s => s._id === 'processing')?.count || 0}
                </div>
                <div className="text-muted">Cas en traitement</div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                <div className="display-4 text-success mb-2">
                  {stats.statsByStatus?.find(s => s._id === 'resolved')?.count || 0}
                </div>
                <div className="text-muted">Cas résolus</div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} sm={12} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                <div className="display-4 text-danger mb-2">
                  {stats.recentStats?.reduce((sum, item) => sum + (item?.count || 0), 0) || 0}
                </div>
                <div className="text-muted">Dernières 24h</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
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
            <Nav.Item>
              <Nav.Link eventKey="map" className="d-flex align-items-center">
                <BsMap className="me-2" /> Carte des urgences
              </Nav.Link>
            </Nav.Item>
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
                  {pendingClaims.map((claim) => (
                    <div 
                      key={claim._id} 
                      className={`emergency-claim-item p-3 border-bottom ${selectedClaim?._id === claim._id ? 'bg-light' : ''}`}
                      onClick={() => handleSelectClaim(claim)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex align-items-start">
                        <div className={`severity-indicator me-3 mt-1 ${claim.severityScore > 8 ? 'bg-danger' : claim.severityScore > 4 ? 'bg-warning' : 'bg-info'}`} style={{ width: '4px', height: '40px', borderRadius: '2px' }}></div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <h6 className="mb-1 fw-bold">{claim.identifiant}</h6>
                            <small className="text-muted">
                              {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true, locale: fr })}
                            </small>
                          </div>
                          <p className="mb-1 text-truncate" style={{ maxWidth: '400px' }}>{claim.description}</p>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {claim.symptoms && claim.symptoms.map((symptom, idx) => (
                              <Badge 
                                key={idx} 
                                bg={symptom.severity?.toLowerCase() === 'high' || symptom.severity?.toLowerCase() === 'grave' ? 'danger' : 
                                    symptom.severity?.toLowerCase() === 'medium' || symptom.severity?.toLowerCase() === 'modéré' ? 'warning' : 'info'}
                                className="me-1 mb-1"
                                style={{ opacity: 0.9 }}
                              >
                                {symptom.name}
                              </Badge>
                            ))}
                          </div>
                          {claim.location && (
                            <div className="mt-1">
                              <small className="text-muted">
                                <FaMapMarkerAlt className="me-1" /> {claim.location}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Affichage des statistiques */}
          {activeTab === 'chart' && chartData && (
            <div className="p-4">
              <Row className="mb-4">
                <Col md={6}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="mb-0">Répartition des cas par statut</h5>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Bar 
                      data={{
                        labels: ['En attente', 'En traitement', 'Résolus', 'Rejetés'],
                        datasets: [
                          {
                            label: 'Nombre de cas',
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
                            borderWidth: 1
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                        }
                      }}
                    />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="mb-0">Répartition par gravité</h5>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Bar 
                      data={{
                        labels: ['Basse', 'Moyenne', 'Élevée'],
                        datasets: [
                          {
                            label: 'Niveau de gravité',
                            data: stats ? [
                              stats.severityStats?.find(s => s._id === 'low')?.count || 0,
                              stats.severityStats?.find(s => s._id === 'medium')?.count || 0,
                              stats.severityStats?.find(s => s._id === 'high')?.count || 0,
                            ] : [0, 0, 0],
                            backgroundColor: [
                              'rgba(13, 202, 240, 0.7)',
                              'rgba(255, 193, 7, 0.7)',
                              'rgba(220, 53, 69, 0.7)',
                            ],
                            borderColor: [
                              'rgb(13, 202, 240)',
                              'rgb(255, 193, 7)',
                              'rgb(220, 53, 69)',
                            ],
                            borderWidth: 1
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                        }
                      }}
                    />
                  </div>
                </Col>
              </Row>

              <Row>
                <Col xs={12}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Évolution des cas d'urgence</h5>
                    <div className="btn-group">
                      <Button 
                        size="sm" 
                        variant={dateRange === 'week' ? 'primary' : 'outline-primary'} 
                        onClick={() => setDateRange('week')}
                      >
                        Semaine
                      </Button>
                      <Button 
                        size="sm" 
                        variant={dateRange === 'month' ? 'primary' : 'outline-primary'} 
                        onClick={() => setDateRange('month')}
                      >
                        Mois
                      </Button>
                      <Button 
                        size="sm" 
                        variant={dateRange === 'year' ? 'primary' : 'outline-primary'} 
                        onClick={() => setDateRange('year')}
                      >
                        Année
                      </Button>
                    </div>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Line 
                      data={{
                        labels: chartData.time.map(item => {
                          if (dateRange === 'year') {
                            // Pour l'affichage annuel
                            return format(new Date(item.date), 'MMM yyyy', { locale: fr });
                          } else {
                            // Pour l'affichage quotidien
                            return format(new Date(item.date), 'd MMM', { locale: fr });
                          }
                        }),
                        datasets: [
                          {
                            label: 'Nouveaux cas',
                            data: chartData.time.map(item => item.count),
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            tension: 0.3,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                          },
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
                            }
                          }
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              title: function(tooltipItems) {
                                const item = tooltipItems[0];
                                const date = chartData.time[item.dataIndex].date;
                                return format(new Date(date), 'PPP', { locale: fr });
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
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
        <Modal.Header closeButton>
          <Modal.Title>Détails du cas d'urgence</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClaim && (
            <>
              <div className="emergency-header mb-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className={`severity-indicator me-3 ${selectedClaim.severityScore > 8 ? 'bg-danger' : selectedClaim.severityScore > 4 ? 'bg-warning' : 'bg-info'}`} style={{ width: '8px', height: '40px', borderRadius: '4px' }}></div>
                    <div>
                      <h5 className="mb-1">{selectedClaim.identifiant}</h5>
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
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="mb-3">Description de l'urgence</h6>
                      <p>{selectedClaim.description}</p>
                      
                      {selectedClaim.location && (
                        <div className="d-flex align-items-center mt-3">
                          <FaMapMarkerAlt className="text-danger me-2" />
                          <span>{selectedClaim.location}</span>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <h6 className="mb-3">Symptômes rapportés</h6>
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

              <div className="action-section mt-4">
                <h6>Actions de prise en charge</h6>
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
                <h6>Actions rapides</h6>
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
                  <Button 
                    variant="outline-info" 
                    size="sm"
                    onClick={() => {
                      navigate(`/users/useredit/${selectedClaim.identifiant}`);
                    }}
                  >
                    <FaUserCircle className="me-1" /> Voir profil étudiant
                  </Button>
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