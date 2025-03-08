import { CardHeader, Button, Badge, Card, Row, Col, Container } from "reactstrap";
import { H4 } from "../../../../AbstractElements";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faOm, faStop, faPlay, faMedal, faHeartbeat, faInfoCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

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

// Fonctions API
async function startYoga() {
  try {
    const response = await fetchWithAuth("http://localhost:5005/start_yoga");
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    console.log("Réponse de startYoga:", data);
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
    console.log("Réponse de stopYoga:", data);
    return data;
  } catch (error) {
    console.error("Erreur lors de l'arrêt de la séance de yoga:", error.message);
    throw error;
  }
}

const TotalEarningCardHeader = () => {
    const [loading, setLoading] = useState(false);
    const [yogaActive, setYogaActive] = useState(false);
    const [userInfo, setUserInfo] = useState({ name: "Utilisateur" });
    const [yogaStats, setYogaStats] = useState({
        points: 0,
        sessionCount: 0,
        lastSession: null
    });

    // Extraire les infos du token au chargement du composant
    useEffect(() => {
        const token = getToken();
        if (token) {
            const decodedToken = decodeJWT(token);
            setUserInfo({
                name: decodedToken.name || decodedToken.email?.split('@')[0] || "Utilisateur"
            });
        }
    }, []);

    const handleStartYoga = async () => {
        try {
            setLoading(true);
            setYogaActive(true);
            const response = await startYoga();
            // La séance est terminée lorsque la réponse est reçue
            setYogaActive(false);
            setLoading(false);
            
            // Mise à jour des statistiques après la séance
            setYogaStats(prev => ({
                points: prev.points + Math.floor(Math.random() * 50) + 20, // Simuler des points gagnés
                sessionCount: prev.sessionCount + 1,
                lastSession: new Date().toLocaleString()
            }));
        } catch (error) {
            setYogaActive(false);
            setLoading(false);
            alert("Erreur lors du démarrage de la séance de yoga.");
        }
    };

    const handleStopYoga = async () => {
        try {
            await stopYoga();
            setYogaActive(false);
        } catch (error) {
            alert("Erreur lors de l'arrêt de la séance de yoga.");
        }
    };

    return (
        <Container className="py-3">
            <Card className="yoga-session-card border-0 shadow-sm mx-auto" style={{ maxWidth: '900px' }}>
                <CardHeader className="pb-0 bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                            <H4 className="text-white mb-0">
                                <FontAwesomeIcon icon={faOm} className="me-2" />
                                Séance de Yoga
                            </H4>
                        </div>
                    </div>
                </CardHeader>
                
                <div className="p-4">
                    {/* Bienvenue personnalisé */}
                    <div className="text-center mb-4">
                        <h3>Bienvenue, {userInfo.name}!</h3>
                        <p className="text-muted">Prêt pour votre séance de yoga d'aujourd'hui?</p>
                    </div>
                    
                    {/* Statistiques utilisateur */}
                    <Row className="mb-4 text-center">
                        <Col xs="6" md="4">
                            <div className="p-3 bg-light rounded shadow-sm">
                                <FontAwesomeIcon icon={faMedal} size="2x" className="text-warning mb-2" />
                                <h5 className="mb-0">{yogaStats.points}</h5>
                                <p className="text-muted small">Points accumulés</p>
                            </div>
                        </Col>
                        <Col xs="6" md="4">
                            <div className="p-3 bg-light rounded shadow-sm">
                                <FontAwesomeIcon icon={faHeartbeat} size="2x" className="text-danger mb-2" />
                                <h5 className="mb-0">{yogaStats.sessionCount}</h5>
                                <p className="text-muted small">Séances terminées</p>
                            </div>
                        </Col>
                        <Col xs="12" md="4" className="mt-3 mt-md-0">
                            <div className="p-3 bg-light rounded shadow-sm">
                                <h6 className="text-muted">Dernière séance</h6>
                                <p className="mb-0">{yogaStats.lastSession || "Aucune séance"}</p>
                            </div>
                        </Col>
                    </Row>
                    
                    {/* Boutons de contrôle */}
                    <div className="d-flex justify-content-center gap-3 mt-4">
                        <Button
                            color="success"
                            size="lg"
                            className="px-5 py-3 rounded-pill shadow"
                            disabled={loading || yogaActive}
                            onClick={handleStartYoga}
                        >
                            <FontAwesomeIcon icon={faPlay} className="me-2" />
                            Commencer une séance
                        </Button>
                        
                        <Button 
                            color="danger"
                            size="lg"
                            className="px-5 py-3 rounded-pill shadow"
                            disabled={!yogaActive}
                            onClick={handleStopYoga}
                        >
                            <FontAwesomeIcon icon={faStop} className="me-2" />
                            Arrêter la séance
                        </Button>
                    </div>
                    
                    {/* État de la séance */}
                    <div className="text-center mt-4">
                        {loading && (
                            <div className="d-flex align-items-center justify-content-center">
                                <div className="spinner-border text-primary me-2" role="status">
                                    <span className="visually-hidden">Chargement...</span>
                                </div>
                                <span>Initialisation de la séance...</span>
                            </div>
                        )}
                        
                        {yogaActive && !loading && (
                            <Badge color="success" pill className="px-4 py-2 fs-6">
                                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                Séance en cours
                            </Badge>
                        )}
                    </div>
                    
                    {/* Instructions avec style amélioré */}
                    {yogaActive && (
                        <div className="mt-4">
                            <div className="bg-primary text-white rounded-top p-3">
                                <div className="d-flex align-items-center">
                                    <FontAwesomeIcon icon={faInfoCircle} className="me-3" size="lg" />
                                    <h5 className="mb-0">Comment pratiquer votre yoga</h5>
                                </div>
                            </div>
                            <div className="bg-light rounded-bottom p-4 shadow-sm border border-top-0">
                                <Row>
                                    <Col md={6}>
                                        <div className="d-flex align-items-start mb-3">
                                            <span className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center me-3" style={{width: "30px", height: "30px"}}>1</span>
                                            <div>
                                                <h6 className="mb-1">Positionnement</h6>
                                                <p className="mb-0">Placez-vous face à la caméra à une distance de 1-2 mètres</p>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-start mb-3">
                                            <span className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center me-3" style={{width: "30px", height: "30px"}}>2</span>
                                            <div>
                                                <h6 className="mb-1">Postures</h6>
                                                <p className="mb-0">Essayez une des poses: <span className="fw-bold">T Pose</span>, <span className="fw-bold">Tree Pose</span>, <span className="fw-bold">Warrior II</span>, ou <span className="fw-bold">Meditation Pose</span></p>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="d-flex align-items-start mb-3">
                                            <span className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center me-3" style={{width: "30px", height: "30px"}}>3</span>
                                            <div>
                                                <h6 className="mb-1">Maintien</h6>
                                                <p className="mb-0">Maintenez la pose quelques secondes pour qu'elle soit comptabilisée</p>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-start">
                                            <span className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center me-3" style={{width: "30px", height: "30px"}}>4</span>
                                            <div>
                                                <h6 className="mb-1">Terminaison</h6>
                                                <p className="mb-0">Appuyez sur "q" dans la fenêtre de la caméra ou sur le bouton "Arrêter" pour terminer</p>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </Container>
    );
};

export default TotalEarningCardHeader;