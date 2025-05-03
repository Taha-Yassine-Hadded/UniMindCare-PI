import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Col, Alert } from "reactstrap";
import { H4, P } from "../../../../AbstractElements";
import axios from "axios";
import RevenueChartCardBody from "./RevenueChartCardBody";
import CardInvest from "../CardInvest/CardInvest";
import { AlertTriangle, Check, Activity, Heart, Info } from "react-feather";
import EmergencyClaimButton from "../../../EmergencyClaim/EmergencyClaimButton"; // Importation du bouton d'urgence

const Ravanuechart = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [userIdentifiant, setUserIdentifiant] = useState(""); // Pour stocker l'identifiant de l'utilisateur
  const [userRole, setUserRole] = useState(null); // Nouveau state pour stocker le rôle de l'utilisateur
  
  // Animation d'entrée
  useEffect(() => {
    // Déclencher l'animation après le chargement des données
    if (!loading && healthData) {
      setTimeout(() => setAnimate(true), 300);
    }
  }, [loading, healthData]);
  
  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setLoading(true);
        
        // Récupérer l'identifiant du localStorage ou du state global si disponible
        const user = JSON.parse(localStorage.getItem("user")) || {};
        
        // Correction ici: utiliser Identifiant avec majuscule comme dans PrivateRoute.jsx
        const identifiant = user.Identifiant || user.identifiant;
        
        // Récupérer le rôle de l'utilisateur
        const role = user.Role || user.role || [];
        const roles = Array.isArray(role) ? role : [role];
        setUserRole(roles);
        
        // Vérifier si l'utilisateur est un étudiant
        const isStudent = roles.some(r => 
          typeof r === 'string' && 
          (r.toLowerCase() === 'student' || r.toLowerCase() === 'étudiant')
        );
        
        console.log("Rôles utilisateur:", roles, "Est étudiant:", isStudent);
        
        // Ne pas charger les données de santé si l'utilisateur n'est pas un étudiant
        if (!isStudent) {
          setLoading(false);
          return;
        }
        
        setUserIdentifiant(identifiant); // Stocker l'identifiant pour le passer au composant EmergencyClaimButton
        
        console.log("Identifiant récupéré du localStorage:", identifiant);
        
        // Si aucun identifiant n'est trouvé, utilisez un identifiant de test
        if (!identifiant) {
          console.warn("Aucun identifiant trouvé, utilisation de données de test");
          // On utilise un identifiant d'exemple de votre collection
          const testResponse = await axios.get("http://localhost:5000/api/crisis/student/233alt014");
          setHealthData(testResponse.data);
          setLoading(false);
          return;
        }
        
        // Sinon, récupérer les données pour l'utilisateur connecté
        const response = await axios.get(`http://localhost:5000/api/crisis/student/${identifiant}`);
        
        if (response.data) {
          setHealthData(response.data);
          console.log("Données de santé récupérées pour l'utilisateur:", identifiant);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des données de santé:", err);
        setError("Impossible de charger vos données de santé");
        
        // En cas d'erreur, afficher quand même quelque chose d'utile
        try {
          // Fallback sur les données test
          console.log("Tentative de récupération des données de test après erreur");
          const testResponse = await axios.get("http://localhost:5000/api/crisis/student/233alt014");
          setHealthData(testResponse.data);
        } catch (fallbackError) {
          console.error("Erreur également avec les données de test:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchHealthData();
  }, []);
  
  // Fonction pour déterminer la couleur basée sur l'état de santé
  const getStateColor = (state) => {
    switch (state?.toLowerCase()) {
      case "très danger":
      case "très dangereux":
      case "danger":
        return "#FF5252";
      case "attention":
      case "vigilance":
        return "#FFC107"; 
      case "normal":
        return "#4CAF50";
      default:
        return "#757575";
    }
  };
  
  // Fonction pour obtenir une description courte de l'état
  const getStatusLabel = (state) => {
    switch (state?.toLowerCase()) {
      case "très danger":
      case "très dangereux":
        return "État critique";
      case "danger":
        return "État préoccupant";
      case "attention":
      case "vigilance":
        return "Attention requise";
      case "normal":
        return "État normal";
      default:
        return "État inconnu";
    }
  };
  
  // Fonction pour obtenir l'icône d'état
  const getStatusIcon = (state) => {
    switch (state?.toLowerCase()) {
      case "très danger":
      case "très dangereux":
      case "danger":
        return <AlertTriangle size={22} />;
      case "attention":
      case "vigilance":
        return <Activity size={22} />;
      case "normal":
        return <Check size={22} />;
      default:
        return <Heart size={22} />;
    }
  };

  // Styles avec animation
  const cardStyle = {
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: healthData 
      ? `0 12px 24px -8px ${getStateColor(healthData.etat)}30`
      : '0 8px 16px rgba(0,0,0,0.08)',
    border: healthData ? `1px solid ${getStateColor(healthData.etat)}` : 'none',
    transform: animate ? 'translateY(0)' : 'translateY(20px)',
    opacity: animate ? 1 : 0,
    transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    marginBottom: '20px',
  };
  
  const headerStyle = {
    borderBottom: healthData ? `2px solid ${getStateColor(healthData.etat)}` : 'none',
    background: 'white',
    padding: '18px 20px',
    position: 'relative',
    overflow: 'hidden',
  };
  
  const statusIconStyle = {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: healthData ? `${getStateColor(healthData.etat)}10` : '#f5f5f5',
    color: healthData ? getStateColor(healthData.etat) : '#757575',
    boxShadow: healthData ? `0 3px 10px ${getStateColor(healthData.etat)}30` : 'none',
    animation: animate ? 'pulse 2s infinite' : 'none',
  };

  // Vérifier si l'utilisateur est un étudiant
  const isStudent = userRole && userRole.some(r => 
    typeof r === 'string' && 
    (r.toLowerCase() === 'student' || r.toLowerCase() === 'étudiant')
  );

  // Si l'utilisateur n'est pas un étudiant, afficher un message alternatif
  if (!isStudent) {
    return (
      <Col md="6" xl="3" className="box-col-25">
        <Card className="overflow-hidden" 
          style={{
            borderRadius: '16px',
            border: '1px solid #e0e0e0',
            boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
            marginBottom: '20px',
            transform: animate ? 'translateY(0)' : 'translateY(20px)',
            opacity: animate ? 1 : 0,
            transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <CardHeader style={{ background: 'white', padding: '18px 20px' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <P attrPara={{ 
                  className: "f-w-600 mb-0", 
                  style: { 
                    color: '#333',
                    fontSize: '14px', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  } 
                }}>État de santé</P>
              </div>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
              }}>
                <Info size={20} />
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <Alert color="info" className="mb-0">
              <div className="d-flex align-items-center">
                <Info size={20} className="me-2" />
                <div>
                  <p className="mb-0">Les recommandations de santé et de crise sont accessibles uniquement aux étudiants.</p>
                </div>
              </div>
            </Alert>
          </CardBody>
        </Card>
        <CardInvest />
      </Col>
    );
  }

  // Affichage pour les étudiants (code original)
  return (
    <Col md="6" xl="3" className="box-col-25">
      <Card className="health-status-card overflow-hidden" style={cardStyle}>
        <CardHeader style={headerStyle}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="flex-grow-1">
              <P attrPara={{ 
                className: "f-w-600 mb-1", 
                style: { 
                  color: '#333',
                  fontSize: '14px', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                } 
              }}>
                État de santé
              </P>
              <div className="d-flex align-items-center">
                <H4 style={{ 
                  color: healthData ? getStateColor(healthData.etat) : '#757575',
                  marginBottom: '0',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {healthData ? getStatusLabel(healthData.etat) : "Chargement..."}
                  
                  {healthData && (
                    <span className="ms-2 badge" style={{ 
                      backgroundColor: getStateColor(healthData.etat) + '20',
                      color: getStateColor(healthData.etat),
                      padding: '5px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      verticalAlign: 'middle',
                      animation: animate ? 'fadeIn 1s' : 'none',
                    }}>
                      {healthData.confidence_percent.toFixed(1)}%
                    </span>
                  )}
                </H4>
              </div>
            </div>
            {healthData && (
              <div style={statusIconStyle}>
                {getStatusIcon(healthData.etat)}
              </div>
            )}
          </div>
        </CardHeader>
        <RevenueChartCardBody healthData={healthData} loading={loading} error={error} animate={animate} />
        
        {/* Bouton de réclamation d'urgence */}
        <div className="px-3 pb-3 mt-1">
          <EmergencyClaimButton 
            userIdentifiant={userIdentifiant} 
            className="btn-emergency-claim w-100" 
          />
        </div>
      </Card>
      <style jsx="true">{`
        @keyframes pulse {
          0% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.05); }
          100% { transform: translateY(-50%) scale(1); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .health-status-card {
          will-change: transform, opacity;
        }
        
        .health-status-card:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 15px 30px rgba(0,0,0,0.12) !important;
        }
        
        /* Style pour le bouton d'urgence */
        .btn-emergency-claim {
          animation: glowing 1.5s infinite alternate;
          box-shadow: 0 0 8px #ff0000;
          transition: all 0.3s ease;
        }
        
        @keyframes glowing {
          0% { box-shadow: 0 0 5px #ff3333; }
          100% { box-shadow: 0 0 15px #ff0000, 0 0 20px #ff6666; }
        }
        
        .btn-emergency-claim:hover {
          transform: scale(1.05);
          box-shadow: 0 0 12px #ff0000, 0 0 20px #ff3333;
        }
      `}</style>
      <CardInvest />
    </Col>
  );
};

export default Ravanuechart;