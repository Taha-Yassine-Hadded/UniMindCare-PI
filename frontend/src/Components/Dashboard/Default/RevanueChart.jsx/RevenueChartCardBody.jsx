import { CardBody } from "reactstrap";
import { H6, P } from "../../../../AbstractElements";
import { AlertCircle, Calendar, Map, User, Clock, Heart, Activity } from "react-feather";
import { useEffect, useState } from "react";

const RevenueChartCardBody = ({ healthData, loading, error, animate }) => {
  const [animateItems, setAnimateItems] = useState(false);
  
  // Animation séquentielle pour les éléments
  useEffect(() => {
    if (animate) {
      setTimeout(() => setAnimateItems(true), 300);
    }
  }, [animate]);

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

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
  
  const getZoneIcon = (zone) => {
    switch (zone?.toLowerCase()) {
      case "head":
      case "tête":
        return <Activity size={16} className="me-2" style={{color: '#7366ff'}} />;
      case "neck":
      case "cou":
        return <Activity size={16} className="me-2" style={{color: '#7366ff'}} />;
      case "abdomen":
        return <Activity size={16} className="me-2" style={{color: '#7366ff'}} />;
      default:
        return <Map size={16} className="me-2" style={{color: '#7366ff'}} />;
    }
  };

  // Styles pour les animations
  const getItemStyle = (index) => ({
    transform: animateItems ? 'translateX(0)' : 'translateX(-20px)',
    opacity: animateItems ? 1 : 0,
    transition: `all 0.5s ease ${0.1 + index * 0.1}s`,
  });
  
  const getSummaryStyle = () => ({
    backgroundColor: healthData ? getStateColor(healthData.etat) + '10' : '#f5f5f5',
    borderLeft: healthData ? `4px solid ${getStateColor(healthData.etat)}` : '4px solid #e0e0e0',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '16px',
    boxShadow: `0 4px 12px ${healthData ? getStateColor(healthData.etat) + '10' : 'rgba(0,0,0,0.05)'}`,
    transform: animateItems ? 'scale(1)' : 'scale(0.95)',
    opacity: animateItems ? 1 : 0,
    transition: 'all 0.6s ease 0.4s',
  });

  if (loading) {
    return (
      <CardBody className="p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '180px' }}>
          <div className="spinner-grow" style={{
            color: '#7366ff',
            width: '3rem', 
            height: '3rem',
            animationDuration: '1.5s'
          }} role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      </CardBody>
    );
  }

  if (error) {
    return (
      <CardBody className="p-4">
        <div className="alert alert-danger mb-0 d-flex align-items-center" role="alert" style={{
          borderRadius: '10px',
          border: 'none',
          boxShadow: '0 4px 15px rgba(255, 82, 82, 0.1)'
        }}>
          <AlertCircle size={18} className="me-2" />
          <div>{error}</div>
        </div>
      </CardBody>
    );
  }

  if (!healthData) {
    return (
      <CardBody className="p-4">
        <div className="alert alert-info mb-0 d-flex align-items-center" role="alert" style={{
          borderRadius: '10px',
          border: 'none',
          backgroundColor: 'rgba(115, 102, 255, 0.1)',
          color: '#7366ff',
          boxShadow: '0 4px 15px rgba(115, 102, 255, 0.1)'
        }}>
          <AlertCircle size={18} className="me-2" />
          <div>Aucune donnée de santé disponible actuellement.</div>
        </div>
      </CardBody>
    );
  }

  return (
    <CardBody className="pt-0 pb-3 px-4">
      <div className="health-stats">
        {/* Informations de base */}
        <div className="d-flex align-items-center mt-3 mb-2" style={getItemStyle(0)}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: 'rgba(115, 102, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px'
          }}>
            <User size={14} style={{color: '#7366ff'}} />
          </div>
          <P attrPara={{ className: "mb-0" }}>
            <span style={{ fontWeight: 600, color: '#333' }}>Étudiant: </span>
            <span style={{ color: '#555' }}>{healthData.nom_etudiant}</span>
            <span style={{ 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px', 
              padding: '2px 6px', 
              fontSize: '12px',
              marginLeft: '8px',
              color: '#666'
            }}>
              {healthData.identifiant}
            </span>
          </P>
        </div>
        
        {/* Zone affectée */}
        <div className="d-flex align-items-center mb-2" style={getItemStyle(1)}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: 'rgba(115, 102, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px'
          }}>
            {getZoneIcon(healthData.zone_malade)}
          </div>
          <P attrPara={{ className: "mb-0" }}>
            <span style={{ fontWeight: 600, color: '#333' }}>Zone affectée: </span>
            <span className="badge" style={{
              backgroundColor: 'rgba(115, 102, 255, 0.1)',
              color: '#7366ff',
              fontWeight: '500',
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              {healthData.zone_malade || "Non spécifiée"}
            </span>
          </P>
        </div>
        
        {/* Date de la dernière mise à jour */}
        <div className="d-flex align-items-center mb-3" style={getItemStyle(2)}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: 'rgba(115, 102, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px'
          }}>
            <Clock size={14} style={{color: '#7366ff'}} />
          </div>
          <P attrPara={{ className: "mb-0" }}>
            <span style={{ fontWeight: 600, color: '#333' }}>Analyse: </span>
            <span style={{ color: '#555' }}>{formatDate(healthData.last_update)}</span>
          </P>
        </div>
        
        {/* Description de l'état */}
        <div className="health-summary" style={getSummaryStyle()}>
          <P attrPara={{ 
            className: "mb-0", 
            style: { 
              fontSize: '14px', 
              lineHeight: '1.6',
              color: '#333',
              fontStyle: 'italic',
              textAlign: 'justify'
            } 
          }}>
            "{healthData.descriptionEtat || healthData.description || "Aucune description disponible"}"
          </P>
        </div>

        {/* Date de détection initiale */}
        <div className="d-flex align-items-center mt-3" style={{
          ...getItemStyle(4),
          justifyContent: 'flex-end',
          opacity: animateItems ? 0.7 : 0,
        }}>
          <Calendar size={12} className="me-1" style={{color: '#888'}} />
          <small style={{color: '#888', fontSize: '11px'}}>
            Détecté le {formatDate(healthData.date_crisis)}
          </small>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(115, 102, 255, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(115, 102, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(115, 102, 255, 0); }
        }
        
        .health-stats .health-summary:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1) !important;
        }
        
        .health-stats > div {
          transition: all 0.3s ease;
        }
        
        .health-stats > div:hover {
          transform: translateX(3px);
        }
      `}</style>
    </CardBody>
  );
};

export default RevenueChartCardBody;