import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardBody, CardHeader, Button, Alert, Spinner, Badge, Progress, Col, Row } from 'reactstrap';
import { motion, AnimatePresence } from 'framer-motion';
import TotalEarningCardHeader from "./TotalEarningCardHeader";
import TotalEarningCardFooter from "./TotalEarningCardFooter";
import { useNavigate } from 'react-router-dom';

// Fonction pour décoder le JWT
const decodeJWT = (token) => {
  try {
    if (!token) return null;
    
    // Extraire la partie payload du token (deuxième partie)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Décoder en UTF-8
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erreur lors du décodage du token JWT:', error);
    return null;
  }
};

// Fonction pour obtenir le token
const getToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

const TotalEarning = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('idle');
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(0);
  const navigate = useNavigate();

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95, transition: { duration: 0.2 } }
  };

  // Fonction auxiliaire pour les requêtes API
  const apiRequest = async (endpoint) => {
    try {
      const response = await axios.get(`http://localhost:8000${endpoint}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 secondes timeout
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'appel API ${endpoint}:`, error);
      throw error;
    }
  };
  const handleViewStats = () => {
    navigate('/tivo/dashboard/emotion-stats');
  };
  // Vérifier le rôle de l'utilisateur au chargement du composant
  useEffect(() => {
    const checkUserRole = () => {
      try {
        // Méthode 1: Utiliser le token
        const token = getToken();
        if (token) {
          const decodedToken = decodeJWT(token);
          if (decodedToken && decodedToken.role) {
            // Si role est un tableau, vérifier si l'un des rôles autorisés est présent
            if (Array.isArray(decodedToken.role)) {
              setUserRole(decodedToken.role);
              setHasAccess(decodedToken.role.some(role => 
                ['admin', 'teacher', 'psychiatre'].includes(role)
              ));
            } else {
              // Si role est une chaîne, vérifier directement
              setUserRole([decodedToken.role]);
              setHasAccess(['admin', 'teacher', 'psychiatre'].includes(decodedToken.role));
            }
            setIsLoading(false);
            return;
          }
        }

        // Méthode 2: Utiliser les données utilisateur stockées dans localStorage
        const user = JSON.parse(localStorage.getItem("user")) || {};
        const role = user.Role || user.role || [];
        const roles = Array.isArray(role) ? role : [role];
        
        setUserRole(roles);
        setHasAccess(roles.some(r => 
          typeof r === 'string' && 
          ['admin', 'teacher', 'psychiatre'].includes(r.toLowerCase())
        ));
      } catch (error) {
        console.error("Erreur lors de la vérification des autorisations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUserRole();
  }, []);

  // Vérifier l'état du serveur au chargement du composant
  useEffect(() => {
    if (!hasAccess) return;
    
    const checkServerStatus = async () => {
      try {
        console.log('Vérification de la connexion au serveur Python...');
        // Animation de connexion
        setConnectionStatus(30);
        
        // Utilisez fetch à la place d'axios pour tester
        const response = await fetch('http://localhost:8000/', {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        setConnectionStatus(70);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Serveur Python connecté avec succès:', data);
          setApiStatus('ready');
          setError(null);
          setConnectionStatus(100);
        } else {
          throw new Error(`Réponse serveur: ${response.status}`);
        }
      } catch (error) {
        console.error('Erreur lors de la connexion au serveur:', error);
        setError('Le serveur Python n\'est pas en cours d\'exécution. Veuillez démarrer le serveur avec "python emotion_detector.py --api"');
        setApiStatus('error');
        setConnectionStatus(0);
      }
    };
    
    checkServerStatus();
  }, [hasAccess]);

  const handleStartStop = async () => {
    try {
      setApiStatus('loading');
      
      if (!isRunning) {
        // Démarrer la caméra PC via Flask
        const data = await apiRequest('/start-camera');
        console.log('Camera started:', data);
        
        if (data.status === 'error') {
          setError(data.message);
          setApiStatus('error');
          // Ouvrir automatiquement le guide si l'erreur concerne la caméra déjà utilisée
          if (data.message.includes("utilisée par une autre application")) {
            setHelpDialogOpen(true);
          }
        } else {
          setIsRunning(true);
          setApiStatus('ready');
        }
      } else {
        // Arrêter la caméra PC via Flask
        const data = await apiRequest('/stop-camera');
        console.log('Camera stopped:', data);
        setIsRunning(false);
        setApiStatus('ready');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Erreur lors du contrôle de la caméra. Assurez-vous que le serveur Python est en cours d\'exécution avec "python emotion_detector.py --api"');
      setIsRunning(false);
      setApiStatus('error');
    }
  };

  const handleOpenHelpDialog = () => {
    setHelpDialogOpen(true);
  };

  const handleCloseHelpDialog = () => {
    setHelpDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="mb-4 border-0 shadow-sm" style={{ maxWidth: '1100px', margin: '0 auto', marginTop: '-15px', marginLeft: '40px' }}>
        <CardBody className="text-center p-5">
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '250px' }}>
            <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-4 text-primary fw-medium">Vérification des autorisations...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!hasAccess) {
    return (
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        style={{ marginTop: '-15px' }}  // Décalage plus prononcé vers le haut
      >
        <Card className="mb-4 border-0 shadow overflow-hidden" style={{ maxWidth: '1100px', margin: '0 auto', marginLeft: '40px' }}>
          <CardHeader className="bg-light border-0">
            <div className="d-flex align-items-center">
              <div className="bg-primary rounded-circle p-2 me-3">
                <i className="fa fa-video-camera text-white"></i>
              </div>
              <h4 className="mb-0">Détection de Gestes et Analyse Vocale</h4>
            </div>
          </CardHeader>
          <CardBody className="text-center p-5">
            <div className="d-flex justify-content-center mb-4">
              <div className="rounded-circle bg-light-subtle p-4" style={{ boxShadow: '0 0 0 10px rgba(108, 117, 125, 0.1)' }}>
                <i className="fa fa-lock" style={{ fontSize: '50px', color: '#6c757d' }}></i>
              </div>
            </div>
            <h3 className="mb-3">Accès restreint</h3>
            <p className="mb-4 text-muted px-md-5">
              Cette fonctionnalité avancée de détection est réservée aux administrateurs, enseignants et psychiatres.
            </p>
            <Badge color="secondary" className="text-uppercase px-3 py-2">Rôle requis: Admin / Teacher / Psychiatre</Badge>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      style={{ maxWidth: '1100px', margin: '0 auto', marginTop: '-15px', marginLeft: '40px' }}
    >
      <Card className="mb-4 border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-primary text-white border-0">
          <div className="d-flex align-items-center">
            <div className="bg-primary rounded-circle p-2 me-3" style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }}>
              <i className="fa fa-video-camera text-white"></i>
            </div>
            <h4 className="text-white mb-0 flex-grow-1">Détection de Gestes et Analyse Vocale</h4>
            <Badge 
              color={apiStatus === 'ready' ? "success" : apiStatus === 'error' ? "danger" : "warning"}
              pill
              className="px-3 py-2"
            >
              {apiStatus === 'ready' ? "Prêt" : apiStatus === 'error' ? "Erreur" : "Connectant..."}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="p-4">
          {connectionStatus > 0 && connectionStatus < 100 && (
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-1">
                <small>Connexion au serveur Python</small>
                <small>{connectionStatus}%</small>
              </div>
              <Progress 
                animated 
                value={connectionStatus} 
                color="primary" 
                className="progress-sm" 
                style={{ height: '6px' }}
              />
            </div>
          )}
          
          {error && (
            <Alert color="danger" className="mb-4 d-flex align-items-center">
              <i className="fa fa-exclamation-triangle me-3 fs-4"></i>
              <div className="flex-grow-1">
                <h6 className="alert-heading mb-1">Erreur de connexion</h6>
                <p className="mb-0">{error}</p>
              </div>
              <motion.button 
                className="btn btn-sm btn-outline-light" 
                onClick={handleOpenHelpDialog}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <i className="fa fa-question-circle me-1"></i> Aide
              </motion.button>
            </Alert>
          )}

          <div className="bg-light p-4 mb-4 rounded-3">
            <Row>
              <Col md={6} className="d-flex align-items-center mb-3 mb-md-0">
                <motion.button
                  className={`btn btn-lg btn-${isRunning ? "danger" : "success"} d-flex align-items-center`}
                  onClick={handleStartStop}
                  disabled={apiStatus === 'loading' || apiStatus === 'error'}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <i className={`fa fa-${isRunning ? 'stop-circle' : 'play-circle'} me-2 fs-5`}></i>
                  <span className="fw-semibold">{isRunning ? 'Arrêter la Caméra' : 'Démarrer la Caméra'}</span>
                </motion.button>
                
                <motion.button 
                  className="btn btn-outline-secondary ms-3" 
                  onClick={handleOpenHelpDialog}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <i className="fa fa-question-circle me-2"></i>
                  Problèmes?
                </motion.button>

                <motion.button
                  className="btn btn-primary btn-icon rounded-circle ms-1"
                  onClick={handleViewStats}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  title="Voir les statistiques"
                >
                  <i className="fa fa-bar-chart"></i>
                </motion.button>
              </Col>
              
              <Col md={6}>
                <div className="d-flex align-items-center">
                  <div className={`rounded-circle ${isRunning ? 'bg-primary' : 'bg-primary'} p-2 me-3`}>
                    <i className={`fa fa-${isRunning ? 'video-camera' : 'camera'} text-white`}></i>
                  </div>
                  <div>
                    <h6 className="mb-1 text-dark">État de la caméra</h6>
                    <p className="mb-0 text-secondary small">
                      {isRunning ? 
                        'Active - Appuyez sur "q" dans la fenêtre OpenCV pour fermer manuellement' : 
                        'Inactive - Cliquez sur "Démarrer la Caméra" pour commencer'
                      }
                    </p>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
          
          <div className="bg-light-success bg-opacity-10 p-4 rounded-3 border border-success border-opacity-25">
            <h5 className="text-success mb-3">
              <i className="fa fa-check-circle me-2"></i>
              Fonctionnalités actives:
            </h5>
            <Row className="g-3">
              <Col md={4}>
                <div className="feature-card p-3 bg-white rounded shadow-sm h-100">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary rounded p-2 me-3">
                      <i className="fa fa-hand-paper-o text-white"></i>
                    </div>
                    <h6 className="mb-0">Détection de gestes</h6>
                  </div>
                  <p className="mb-0 small text-secondary">
                    Reconnaissance des gestes comme main sur la tête, yeux, cou et ventre.
                  </p>
                </div>
              </Col>
              <Col md={4}>
                <div className="feature-card p-3 bg-white rounded shadow-sm h-100">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary rounded p-2 me-3">
                      <i className="fa fa-microphone text-white"></i>
                    </div>
                    <h6 className="mb-0">Analyse vocale</h6>
                  </div>
                  <p className="mb-0 small text-secondary">
                    Détection de mots-clés et reconnaissance vocale en temps réel.
                  </p>
                </div>
              </Col>
              <Col md={4}>
                <div className="feature-card p-3 bg-white rounded shadow-sm h-100">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary rounded p-2 me-3">
                      <i className="fa fa-database text-white"></i>
                    </div>
                    <h6 className="mb-0">Stockage des données</h6>
                  </div>
                  <p className="mb-0 small text-secondary">
                    Enregistrement automatique des données détectées dans MongoDB.
                  </p>
                </div>
              </Col>
            </Row>
          </div>
        </CardBody>
        
        {/* Modal de dépannage (utilisant un modal personnalisé) */}
        <AnimatePresence>
          {helpDialogOpen && (
            <motion.div 
              className="modal d-block" 
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="modal-dialog modal-lg"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 20 }}
              >
                <div className="modal-content border-0 shadow-lg">
                  <div className="modal-header bg-light">
                    <h5 className="modal-title">
                      <i className="fa fa-tools me-2 text-primary"></i>
                      Guide de dépannage de la caméra
                    </h5>
                    <button type="button" className="btn-close" onClick={handleCloseHelpDialog}></button>
                  </div>
                  <div className="modal-body p-4">
                    <div className="mb-4 p-3 bg-light rounded">
                      <h6 className="mb-3 text-primary">
                        <i className="fa fa-info-circle me-2"></i>
                        Si vous ne pouvez pas accéder à la caméra, suivez ces étapes:
                      </h6>
                    </div>
                    
                    <ul className="list-group list-group-flush mb-4">
                      <li className="list-group-item p-3">
                        <div className="d-flex">
                          <div className="flex-shrink-0">
                            <span className="badge rounded-circle bg-danger p-2">1</span>
                          </div>
                          <div className="ms-3">
                            <h6 className="fw-bold mb-1">La caméra est utilisée par une autre application</h6>
                            <p className="text-muted mb-0">Fermez toutes les applications qui pourraient utiliser la caméra (navigateurs, Zoom, Teams, Skype, etc.)</p>
                          </div>
                        </div>
                      </li>
                      
                      <li className="list-group-item p-3">
                        <div className="d-flex">
                          <div className="flex-shrink-0">
                            <span className="badge rounded-circle bg-danger p-2">2</span>
                          </div>
                          <div className="ms-3">
                            <h6 className="fw-bold mb-1">Windows Camera Privacy Settings</h6>
                            <p className="text-muted mb-0">Assurez-vous que les paramètres de confidentialité Windows autorisent l'accès à la caméra</p>
                          </div>
                        </div>
                      </li>
                      
                      <li className="list-group-item p-3">
                        <div className="d-flex">
                          <div className="flex-shrink-0">
                            <span className="badge rounded-circle bg-danger p-2">3</span>
                          </div>
                          <div className="ms-3">
                            <h6 className="fw-bold mb-1">Redémarrer le serveur Python</h6>
                            <p className="text-muted mb-0">Arrêtez le serveur Python (Ctrl+C) et redémarrez-le avec 'python emotion_detector.py --api'</p>
                          </div>
                        </div>
                      </li>
                      
                      <li className="list-group-item p-3">
                        <div className="d-flex">
                          <div className="flex-shrink-0">
                            <span className="badge rounded-circle bg-success p-2">4</span>
                          </div>
                          <div className="ms-3">
                            <h6 className="fw-bold mb-1">Redémarrer l'ordinateur</h6>
                            <p className="text-muted mb-0">Si aucune des solutions ci-dessus ne fonctionne, redémarrez votre ordinateur pour libérer la caméra</p>
                          </div>
                        </div>
                      </li>
                    </ul>
                    
                    <div className="alert alert-info d-flex">
                      <i className="fa fa-lightbulb-o me-3 fs-4"></i>
                      <div>
                        <h6 className="alert-heading">Note importante</h6>
                        <p className="mb-0 small">
                          Si vous voyez l'erreur "Impossible de lire la caméra" répétée plusieurs fois dans votre terminal, cela signifie que l'application ne peut pas accéder à la caméra.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <motion.button 
                      className="btn btn-primary" 
                      onClick={handleCloseHelpDialog}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      Fermer
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default TotalEarning;