import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Badge, Tooltip } from 'reactstrap';
import body1 from '../../../../assets/images/body1.png';
import body2 from '../../../../assets/images/body2.png';
import axios from 'axios';
import Swal from 'sweetalert2';

const DeviceList = () => {
  const [view, setView] = useState('front'); // 'front', 'back'
  const [selectedParts, setSelectedParts] = useState([]);
  const [tooltipOpen, setTooltipOpen] = useState({});
  const [painIntensity, setPainIntensity] = useState({});
  const [isRotating, setIsRotating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userIdentifiant, setUserIdentifiant] = useState(null);

  // Récupérer l'identifiant de l'utilisateur depuis localStorage au chargement du composant
  useEffect(() => {
    const getUserData = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setUserIdentifiant(parsedData.Identifiant);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données utilisateur:", error);
      }
    };

    getUserData();
  }, []);

  // Fonction pour alterner entre les vues avant et arrière
  const toggleView = () => {
    setIsRotating(true);
    setView(view === 'front' ? 'back' : 'front');
    
    const timer = setTimeout(() => {
      setIsRotating(false);
    }, 700);
    
    return () => clearTimeout(timer);
  };

  // Définition des zones du corps avec leurs coordonnées
  const bodyParts = {
    front: [
      { id: 'head', name: 'Tête', x: 50, y: 12, r: 8 },
      { id: 'neck', name: 'Cou', x: 50, y: 20, r: 4 },
      { id: 'chest_left', name: 'Poitrine gauche', x: 43, y: 30, r: 6 },
      { id: 'chest_right', name: 'Poitrine droite', x: 57, y: 30, r: 6 },
      { id: 'stomach_upper', name: 'Haut du ventre', x: 50, y: 38, r: 7 },
      { id: 'stomach_lower', name: 'Bas du ventre', x: 50, y: 47, r: 7 },
      { id: 'left_shoulder', name: 'Épaule gauche', x: 35, y: 25, r: 5 },
      { id: 'right_shoulder', name: 'Épaule droite', x: 65, y: 25, r: 5 },
      { id: 'left_arm_upper', name: 'Bras gauche (haut)', x: 28, y: 32, r: 5 },
      { id: 'right_arm_upper', name: 'Bras droit (haut)', x: 72, y: 32, r: 5 },
      { id: 'left_arm_lower', name: 'Bras gauche (bas)', x: 22, y: 42, r: 5 },
      { id: 'right_arm_lower', name: 'Bras droit (bas)', x: 78, y: 42, r: 5 },
      { id: 'left_hand', name: 'Main gauche', x: 17, y: 53, r: 4 },
      { id: 'right_hand', name: 'Main droite', x: 83, y: 53, r: 4 },
      { id: 'left_hip', name: 'Hanche gauche', x: 42, y: 55, r: 5 },
      { id: 'right_hip', name: 'Hanche droite', x: 58, y: 55, r: 5 },
      { id: 'left_leg_upper', name: 'Cuisse gauche', x: 40, y: 65, r: 6 },
      { id: 'right_leg_upper', name: 'Cuisse droite', x: 60, y: 65, r: 6 },
      { id: 'left_knee', name: 'Genou gauche', x: 40, y: 75, r: 5 },
      { id: 'right_knee', name: 'Genou droit', x: 60, y: 75, r: 5 },
      { id: 'left_leg_lower', name: 'Jambe gauche', x: 40, y: 85, r: 5 },
      { id: 'right_leg_lower', name: 'Jambe droite', x: 60, y: 85, r: 5 },
      { id: 'left_foot', name: 'Pied gauche', x: 40, y: 95, r: 4 },
      { id: 'right_foot', name: 'Pied droit', x: 60, y: 95, r: 4 },
    ],
    back: [
      { id: 'back_head', name: 'Arrière de la tête', x: 50, y: 12, r: 8 },
      { id: 'back_neck', name: 'Nuque', x: 50, y: 20, r: 4 },
      { id: 'upper_back_left', name: 'Haut du dos gauche', x: 43, y: 28, r: 6 },
      { id: 'upper_back_right', name: 'Haut du dos droit', x: 57, y: 28, r: 6 },
      { id: 'middle_back', name: 'Milieu du dos', x: 50, y: 38, r: 7 },
      { id: 'lower_back', name: 'Bas du dos', x: 50, y: 48, r: 7 },
      { id: 'left_shoulder_blade', name: 'Omoplate gauche', x: 35, y: 30, r: 5 },
      { id: 'right_shoulder_blade', name: 'Omoplate droite', x: 65, y: 30, r: 5 },
      { id: 'left_back_arm_upper', name: 'Bras gauche (haut)', x: 28, y: 32, r: 5 },
      { id: 'right_back_arm_upper', name: 'Bras droit (haut)', x: 72, y: 32, r: 5 },
      { id: 'left_back_arm_lower', name: 'Bras gauche (bas)', x: 22, y: 42, r: 5 },
      { id: 'right_back_arm_lower', name: 'Bras droit (bas)', x: 78, y: 42, r: 5 },
      { id: 'left_back_hand', name: 'Main gauche', x: 17, y: 53, r: 4 },
      { id: 'right_back_hand', name: 'Main droite', x: 83, y: 53, r: 4 },
      { id: 'left_buttock', name: 'Fesse gauche', x: 42, y: 55, r: 5 },
      { id: 'right_buttock', name: 'Fesse droite', x: 58, y: 55, r: 5 },
      { id: 'left_back_leg_upper', name: 'Cuisse arrière gauche', x: 40, y: 65, r: 6 },
      { id: 'right_back_leg_upper', name: 'Cuisse arrière droite', x: 60, y: 65, r: 6 },
      { id: 'left_back_knee', name: 'Arrière du genou gauche', x: 40, y: 75, r: 5 },
      { id: 'right_back_knee', name: 'Arrière du genou droit', x: 60, y: 75, r: 5 },
      { id: 'left_back_leg_lower', name: 'Mollet gauche', x: 40, y: 85, r: 5 },
      { id: 'right_back_leg_lower', name: 'Mollet droit', x: 60, y: 85, r: 5 },
      { id: 'left_back_foot', name: 'Talon gauche', x: 40, y: 95, r: 4 },
      { id: 'right_back_foot', name: 'Talon droit', x: 60, y: 95, r: 4 },
    ]
  };

  // Fonction pour basculer la sélection d'une partie du corps
  const toggleBodyPart = (partId) => {
    if (selectedParts.includes(partId)) {
      setSelectedParts(selectedParts.filter(id => id !== partId));
      // Supprimer l'intensité de douleur
      const newIntensity = {...painIntensity};
      delete newIntensity[partId];
      setPainIntensity(newIntensity);
    } else {
      setSelectedParts([...selectedParts, partId]);
      // Définir une intensité de douleur par défaut
      setPainIntensity({
        ...painIntensity,
        [partId]: 5 // Valeur par défaut (échelle 1-10)
      });
    }
  };

  // Gestion des tooltips
  const toggleTooltip = (partId) => {
    setTooltipOpen({
      ...tooltipOpen,
      [partId]: !tooltipOpen[partId]
    });
  };

  // Fonction pour changer l'intensité de la douleur
  const changePainIntensity = (partId, value) => {
    setPainIntensity({
      ...painIntensity,
      [partId]: value
    });
  };

  // Fonction pour sauvegarder les données
  const saveSelections = async () => {
    if (selectedParts.length === 0) {
      Swal.fire({
        title: 'Attention',
        text: 'Veuillez sélectionner au moins une partie du corps qui vous fait mal.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Compris'
      });
      return;
    }
    
    if (!userIdentifiant) {
      Swal.fire({
        title: 'Erreur',
        text: "Impossible d'identifier l'utilisateur. Veuillez vous reconnecter.",
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    setLoading(true);
    
    // Préparation des données à envoyer
    const painData = selectedParts.map(partId => {
      const part = [...bodyParts.front, ...bodyParts.back].find(p => p.id === partId);
      return {
        bodyPart: partId,
        bodyPartName: part?.name || "",
        intensity: painIntensity[partId] || 5
      };
    });
    
    try {
      // Envoyer les données au backend
      const response = await axios.post('http://localhost:5000/api/crisis/pain-zones', {
        identifiant: userIdentifiant,
        zones_malades: painData
      });
      
      console.log("Réponse du serveur:", response.data);
      
      // Afficher une belle SweetAlert avec un message de soutien
      Swal.fire({
        title: 'Nous sommes là pour vous',
        html: `<p>Vos informations ont été enregistrées avec succès.</p>
              <p>Nous prenons très au sérieux vos douleurs et notre équipe médicale en sera informée rapidement.</p>
              <p>N'hésitez pas à vous reposer et à prendre soin de vous. Votre bien-être est notre priorité.</p>
              <p class="mt-3"><em>L'équipe UniMindCare est à vos côtés pour vous accompagner dans ces moments difficiles.</em></p>`,
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Merci',
        allowOutsideClick: false,
        backdrop: `rgba(0,0,123,0.4)`,
        showClass: {
          popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp'
        }
      });
      
      // Réinitialiser les sélections après sauvegarde
      setSelectedParts([]);
      setPainIntensity({});
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des données:", error);
      
      Swal.fire({
        title: 'Erreur',
        text: 'Une erreur est survenue lors de l\'enregistrement de vos données. Veuillez réessayer plus tard.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Compris'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir la couleur du gradient en fonction de l'intensité
  const getPainColor = (intensity) => {
    if (!intensity) return 'rgba(255, 59, 59, 0.7)';
    
    // De jaune (faible) à orange puis rouge (intense)
    if (intensity <= 3) return 'rgba(255, 200, 0, 0.7)';
    if (intensity <= 5) return 'rgba(255, 150, 0, 0.7)';
    if (intensity <= 7) return 'rgba(255, 100, 0, 0.7)';
    return 'rgba(255, 0, 0, 0.7)';
  };

  return (
    <>
      <style>
        {`
          .human-body-container {
            width: 100%;
            height: 450px;
            position: relative;
            perspective: 1000px;
          }

          .human-body {
            width: 240px;
            height: 420px;
            position: relative;
            margin: 0 auto;
            transform-style: preserve-3d;
            transition: transform 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          .body-image {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            filter: drop-shadow(0 10px 15px rgba(0,0,0,0.15));
            transition: opacity 0.4s ease;
          }

          /* Effet de rotation 3D */
          .human-body.rotating {
            animation: rotate3D 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          @keyframes rotate3D {
            0% {
              transform: rotateY(0deg);
            }
            100% {
              transform: rotateY(180deg);
            }
          }

          /* Style des points de douleur avancé */
          .pain-point {
            position: absolute;
            border-radius: 50%;
            cursor: pointer;
            z-index: 2;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.2) inset;
            background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.5) 0%, transparent 70%);
            border: 2px solid rgba(255, 50, 50, 0.8);
          }

          .pain-point:hover {
            transform: scale(1.2);
            box-shadow: 0 0 15px rgba(255, 0, 0, 0.7), 0 0 25px rgba(255, 255, 255, 0.3) inset;
          }

          .pain-point.selected {
            border: 2px solid rgba(255, 255, 255, 0.9);
            animation: selected-pulse 2s infinite;
          }

          /* Animation avancée pour les points sélectionnés */
          @keyframes selected-pulse {
            0% {
              box-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.4);
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 20px rgba(255, 0, 0, 1), 0 0 30px rgba(255, 0, 0, 0.6);
              transform: scale(1.15);
            }
            100% {
              box-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.4);
              transform: scale(1);
            }
          }

          /* Style amélioré pour le conteneur principal */
          .body-model-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
          }

          /* Contrôleur d'intensité */
          .intensity-control {
            position: absolute;
            background: rgba(255,255,255,0.95);
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 3px 15px rgba(0,0,0,0.2);
            z-index: 10;
            width: 180px;
            transform: translateX(-50%);
          }

          .intensity-slider {
            width: 100%;
            margin: 10px 0;
            -webkit-appearance: none;
            height: 8px;
            border-radius: 4px;
            background: linear-gradient(to right, #ffdd00, #ff8800, #ff0000);
            outline: none;
          }

          .intensity-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ffffff;
            border: 2px solid #ff5500;
            cursor: pointer;
            box-shadow: 0 1px 5px rgba(0,0,0,0.2);
          }

          .intensity-level {
            display: flex;
            justify-content: space-between;
            margin-top: 5px;
          }

          .intensity-level span {
            font-size: 10px;
            color: #666;
          }

          /* Badges améliorés */
          .pain-badge {
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .pain-badge:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }

          .pain-badge:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
            transform: translateX(-100%);
            transition: transform 0.5s ease;
          }

          .pain-badge:hover:before {
            transform: translateX(100%);
          }

          /* Bouton de rotation 360° */
          .rotate-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
            z-index: 10;
            transition: all 0.3s ease;
          }

          .rotate-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            background: rgba(0, 123, 255, 0.1);
          }

          .rotate-btn svg {
            transition: transform 0.5s ease;
          }

          .rotate-btn:hover svg {
            transform: rotate(180deg);
          }

          .rotate-btn.rotating svg {
            animation: spin 0.7s linear;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Tooltip personnalisé */
          .custom-tooltip {
            opacity: 0.95 !important;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1) !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
          }
          
          /* Animation pour apparition */
          .fade-in {
            animation: fadeIn 0.5s ease-in-out;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <Card className="border-0 shadow h-100 overflow-hidden">
        <CardBody className="p-0">
          <div className="d-flex flex-column h-100">
            {/* En-tête amélioré */}
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
              <h5 className="mb-0 text-primary">
                <i className="fa fa-map-marker-alt me-2"></i>
                Indiquez vos zones de douleur
              </h5>
              <div>
                <p className="text-muted mb-0">
                  <small>
                    {view === 'front' ? 'Vue de face' : 'Vue de dos'} - Cliquez sur les zones douloureuses
                  </small>
                </p>
              </div>
            </div>
            
            {/* Modèle du corps amélioré avec images */}
            <div className="body-model-container p-4 flex-grow-1 d-flex align-items-center justify-content-center">
              <div className="human-body-container position-relative fade-in">
                {/* Bouton de rotation 360° */}
                <div 
                  className={`rotate-btn ${isRotating ? 'rotating' : ''}`} 
                  onClick={toggleView}
                  id="rotate-tooltip"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </div>
                <Tooltip
                  placement="left"
                  isOpen={tooltipOpen['rotate'] || false}
                  target="rotate-tooltip"
                  toggle={() => toggleTooltip('rotate')}
                  className="custom-tooltip"
                >
                  Tourner à {view === 'front' ? '180°' : '0°'}
                </Tooltip>
                
                <div className={`human-body ${isRotating ? 'rotating' : ''}`}>
                  {/* Images du corps */}
                  <div 
                    className="body-image"
                    style={{ 
                      backgroundImage: `url(${view === 'front' ? body1 : body2})`,
                      opacity: isRotating ? 0.5 : 1
                    }}
                  />
                  
                  {/* Points de douleur améliorés */}
                  {bodyParts[view].map(part => (
                    <React.Fragment key={part.id}>
                      <div 
                        className={`pain-point ${selectedParts.includes(part.id) ? 'selected' : ''}`}
                        style={{ 
                          left: `${part.x}%`, 
                          top: `${part.y}%`, 
                          width: `${part.r * 2}px`, 
                          height: `${part.r * 2}px`,
                          marginLeft: `-${part.r}px`,
                          marginTop: `-${part.r}px`,
                          backgroundColor: selectedParts.includes(part.id) 
                            ? getPainColor(painIntensity[part.id]) 
                            : 'rgba(255, 100, 100, 0.6)'
                        }}
                        onClick={() => toggleBodyPart(part.id)}
                        id={`tooltip-${part.id}`}
                      />
                      <Tooltip
                        isOpen={tooltipOpen[part.id] || false}
                        target={`tooltip-${part.id}`}
                        toggle={() => toggleTooltip(part.id)}
                        placement="top"
                        className="custom-tooltip"
                      >
                        {part.name}
                      </Tooltip>
                      
                      {/* Contrôleur d'intensité */}
                      {selectedParts.includes(part.id) && (
                        <div 
                          className="intensity-control fade-in"
                          style={{
                            left: `${part.x}%`,
                            top: part.y > 80 ? `${part.y - 15}%` : `${part.y + 10}%`
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted">Intensité de la douleur</small>
                            <Badge 
                              color={painIntensity[part.id] <= 3 ? 'warning' : painIntensity[part.id] <= 7 ? 'danger' : 'dark'}
                              pill
                            >
                              {painIntensity[part.id] || 5}/10
                            </Badge>
                          </div>
                          <input 
                            type="range" 
                            className="intensity-slider" 
                            min="1" 
                            max="10" 
                            value={painIntensity[part.id] || 5}
                            onChange={(e) => changePainIntensity(part.id, parseInt(e.target.value))}
                          />
                          <div className="intensity-level">
                            <span>Légère</span>
                            <span>Modérée</span>
                            <span>Sévère</span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Pied de page avec les parties sélectionnées et bouton de sauvegarde */}
            <div className="p-3 border-top bg-light">
              <div className="d-flex flex-wrap mb-2">
                {selectedParts.length > 0 ? (
                  selectedParts.map(partId => {
                    const part = [...bodyParts.front, ...bodyParts.back].find(p => p.id === partId);
                    return part ? (
                      <div key={partId} className="fade-in">
                        <Badge 
                          color={painIntensity[partId] <= 3 ? 'warning' : painIntensity[partId] <= 7 ? 'danger' : 'dark'}
                          className="pain-badge me-2 mb-2 px-3 py-2"
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleBodyPart(partId)}
                        >
                          {part.name} 
                          <span className="ms-2 badge bg-light text-dark rounded-pill">
                            {painIntensity[partId] || 5}/10
                          </span>
                          <i className="fa fa-times-circle ms-2"></i>
                        </Badge>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-muted mb-0">
                    <i className="fa fa-info-circle me-2"></i>
                    Cliquez sur les zones du corps où vous ressentez une douleur
                  </p>
                )}
              </div>
              
              {selectedParts.length > 0 && (
                <div className="text-end mt-3 fade-in">
                  <Button 
                    color="primary" 
                    className="shadow-sm" 
                    onClick={saveSelections}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <i className="fa fa-save me-2"></i>
                        Enregistrer {selectedParts.length} zone{selectedParts.length > 1 ? 's' : ''} de douleur
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default DeviceList;