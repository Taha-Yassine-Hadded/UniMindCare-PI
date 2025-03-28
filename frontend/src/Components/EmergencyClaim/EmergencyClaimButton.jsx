import React, { useState, useRef, useEffect } from 'react';
import { 
  Button, Modal, ModalHeader, ModalBody, ModalFooter, 
  Form, FormGroup, Label, Input, Alert, Card, CardBody, 
  Row, Col, Badge, ListGroup, ListGroupItem, Spinner
} from 'reactstrap';
import { AlertTriangle, Phone, Upload, MapPin, Activity, Heart, Clock } from 'react-feather';
import axios from 'axios';
import { toast } from 'react-toastify';

const EmergencyClaimButton = ({ userIdentifiant }) => {
  // États pour gérer le modal et le formulaire
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [symptomsList, setSymptomsList] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setDescription('');
    setLocation('');
    setSelectedSymptoms([]);
    setUploadedImage(null);
    setImagePreview(null);
    setStep(1);
    setError(null);
    setSubmissionSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Ouvrir/fermer le modal
  const toggle = () => {
    if (!modal) {
      loadSymptoms();
      resetForm(); // Réinitialiser le formulaire à l'ouverture
    } else {
      // Si on ferme, attendre que l'animation de fermeture soit terminée avant de réinitialiser
      setTimeout(resetForm, 300);
    }
    setModal(!modal);
  };

  // Charger la liste des symptômes depuis le serveur
  const loadSymptoms = async () => {
    try {
      // Simulation de chargement des symptômes (à remplacer par un appel API réel)
      const predefinedSymptoms = [
        { id: 1, name: "Douleur thoracique intense", severity: "high", category: "cardiovascular" },
        { id: 2, name: "Difficulté à respirer", severity: "high", category: "respiratory" },
        { id: 3, name: "Perte de conscience", severity: "high", category: "neurological" },
        { id: 4, name: "Saignement important", severity: "high", category: "trauma" },
        { id: 5, name: "Confusion soudaine", severity: "medium", category: "neurological" },
        { id: 6, name: "Fièvre très élevée", severity: "medium", category: "infection" },
        { id: 7, name: "Éruption cutanée avec fièvre", severity: "medium", category: "allergic" },
        { id: 8, name: "Maux de tête sévères", severity: "medium", category: "neurological" },
        { id: 9, name: "Vision trouble soudaine", severity: "medium", category: "neurological" },
        { id: 10, name: "Palpitations cardiaques", severity: "medium", category: "cardiovascular" },
        { id: 11, name: "Nausées et vomissements persistants", severity: "medium", category: "gastrointestinal" },
        { id: 12, name: "Faiblesse musculaire", severity: "low", category: "musculoskeletal" },
        { id: 13, name: "Anxiété intense", severity: "medium", category: "psychological" },
        { id: 14, name: "Crise de panique", severity: "medium", category: "psychological" }
      ];
      
      setSymptomsList(predefinedSymptoms);
    } catch (err) {
      console.error("Erreur lors du chargement des symptômes:", err);
      setError("Impossible de charger la liste des symptômes");
    }
  };

  // Gérer la sélection des symptômes
  const toggleSymptomSelection = (symptom) => {
    if (selectedSymptoms.some(s => s.id === symptom.id)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== symptom.id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  // Gérer le téléchargement d'image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('location', location);
      formData.append('symptoms', JSON.stringify(selectedSymptoms));
      formData.append('identifiant', userIdentifiant);
      
      if (uploadedImage) {
        formData.append('emergencyImage', uploadedImage);
      }
      
      // Appel API pour envoyer la réclamation
      const response = await axios.post(
        'http://localhost:5000/api/emergency/submit',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setSubmissionSuccess(true);
      setStep(3); // Passer à l'étape de confirmation
      
      // Notification de succès
      toast.success("Réclamation d'urgence envoyée avec succès");
    } catch (err) {
      console.error("Erreur lors de la soumission:", err);
      setError(err.response?.data?.message || "Une erreur est survenue lors de l'envoi de votre réclamation");
      toast.error("Erreur lors de l'envoi de la réclamation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Déterminer la couleur par niveau de gravité
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  };

  // Activer géolocalisation
  const activateGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude}, ${longitude}`);
          toast.info("Emplacement récupéré avec succès");
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          toast.warning("Impossible d'obtenir votre emplacement actuel");
        }
      );
    } else {
      toast.warning("La géolocalisation n'est pas prise en charge par votre navigateur");
    }
  };

  // Rendu des différentes étapes du formulaire
  const renderStepContent = () => {
    switch (step) {
      case 1: // Symptômes et informations générales
        return (
          <>
            <div className="emergency-intro mb-4">
              <h5 className="text-danger mb-3 d-flex align-items-center">
                <AlertTriangle size={20} className="me-2" />
                Réclamation d'urgence médicale
              </h5>
              <p className="text-muted">
                Ce formulaire est destiné à signaler rapidement des situations médicales graves nécessitant une intervention rapide.
              </p>
            </div>
            
            <div className="mb-4">
              <Label className="form-label fw-bold d-flex align-items-center">
                <Activity size={16} className="me-2" style={{color: '#7366ff'}} />
                Sélectionnez les symptômes
              </Label>
              <div className="symptoms-grid">
                {symptomsList.map((symptom) => (
                  <Badge
                    key={symptom.id}
                    color={selectedSymptoms.some(s => s.id === symptom.id) ? getSeverityColor(symptom.severity) : 'light'}
                    className={`symptom-badge mb-2 me-2 px-3 py-2 ${selectedSymptoms.some(s => s.id === symptom.id) ? 'selected' : ''}`}
                    style={{ 
                      cursor: 'pointer', 
                      borderRadius: '30px', 
                      fontSize: '0.85rem',
                      // Modification: le texte sera noir pour les symptômes non sélectionnés
                      color: selectedSymptoms.some(s => s.id === symptom.id) ? 'white' : '#212529'
                    }}
                    onClick={() => toggleSymptomSelection(symptom)}
                  >
                    {symptom.name}
                  </Badge>
                ))}
              </div>
            </div>

            <FormGroup className="mb-3">
              <Label className="form-label fw-bold d-flex align-items-center">
                <MapPin size={16} className="me-2" style={{color: '#7366ff'}} />
                Localisation
              </Label>
              <div className="input-group">
                <Input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Emplacement actuel ou description du lieu"
                  className="location-input"
                />
                <Button 
                  color="primary" 
                  outline
                  onClick={activateGeolocation}
                  title="Utiliser ma position actuelle"
                >
                  <MapPin size={16} />
                </Button>
              </div>
              <small className="text-muted">
                Cliquez sur l'icône pour utiliser votre position actuelle
              </small>
            </FormGroup>
            
            <div className="d-flex justify-content-between mt-4">
              <Button 
                color="secondary" 
                onClick={toggle}
              >
                Annuler
              </Button>
              <Button 
                color="primary"
                onClick={() => selectedSymptoms.length > 0 ? setStep(2) : toast.warning("Veuillez sélectionner au moins un symptôme")}
                disabled={selectedSymptoms.length === 0}
              >
                Continuer
              </Button>
            </div>
          </>
        );
        
      case 2: // Description et téléchargement d'image
        return (
          <>
            <h5 className="text-primary mb-3">Détails supplémentaires</h5>
            
            <div className="selected-symptoms mb-3">
              <Label className="form-label fw-bold">Symptômes sélectionnés :</Label>
              <div className="d-flex flex-wrap">
                {selectedSymptoms.map((symptom) => (
                  <Badge
                    key={symptom.id}
                    color={getSeverityColor(symptom.severity)}
                    className="me-2 mb-2 px-3 py-2"
                    style={{ borderRadius: '30px', fontSize: '0.85rem' }}
                  >
                    {symptom.name}
                    <span 
                      className="ms-2"
                      style={{cursor: 'pointer'}}
                      onClick={() => toggleSymptomSelection(symptom)}
                    >
                      &times;
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            
            <FormGroup className="mb-4">
              <Label className="form-label fw-bold">Description détaillée</Label>
              <Input
                type="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez la situation d'urgence, les symptômes, leur évolution et leur durée..."
                rows={4}
                className="description-textarea"
              />
            </FormGroup>
            
            <FormGroup className="mb-4">
              <Label className="form-label fw-bold">Photo (optionnelle)</Label>
              <div className="image-upload-container position-relative">
                {imagePreview ? (
                  <div className="image-preview-container position-relative">
                    <img 
                      src={imagePreview} 
                      alt="Aperçu" 
                      className="img-thumbnail mb-2"
                      style={{ maxHeight: '150px', width: 'auto' }}
                    />
                    <Button
                      color="danger"
                      size="sm"
                      className="position-absolute"
                      style={{ top: '5px', right: '5px', padding: '0.2rem 0.4rem' }}
                      onClick={() => {
                        setImagePreview(null);
                        setUploadedImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      &times;
                    </Button>
                  </div>
                ) : (
                  <div
                    className="upload-placeholder d-flex flex-column align-items-center justify-content-center p-4 border rounded"
                    style={{ cursor: 'pointer', borderStyle: 'dashed', height: '120px' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={24} className="mb-2 text-primary" />
                    <span className="text-muted">Cliquez pour télécharger une image</span>
                  </div>
                )}
                <Input
                  type="file"
                  innerRef={fileInputRef}
                  className="d-none"
                  onChange={handleImageUpload}
                  accept="image/*"
                />
              </div>
              <small className="text-muted">
                Une photo peut aider à mieux comprendre la situation (éruption cutanée, blessure, etc.)
              </small>
            </FormGroup>
            
            <div className="d-flex justify-content-between mt-4">
              <Button 
                color="secondary" 
                outline
                onClick={() => setStep(1)}
              >
                Retour
              </Button>
              <Button 
                color="danger"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Envoi en cours...
                  </>
                ) : (
                  "Soumettre la réclamation d'urgence"
                )}
              </Button>
            </div>
          </>
        );
        
      case 3: // Confirmation et ressources
        return (
          <>
            <div className="text-center mb-4">
              {submissionSuccess ? (
                <div className="success-animation mb-3">
                  <div className="checkmark-circle">
                    <div className="checkmark draw"></div>
                  </div>
                </div>
              ) : (
                <AlertTriangle size={50} className="text-warning mb-3" />
              )}
              
              <h5 className="mb-2">{submissionSuccess ? "Réclamation envoyée avec succès" : "Important"}</h5>
              <p className="text-muted">
                {submissionSuccess 
                  ? "Votre réclamation d'urgence a été enregistrée et sera traitée en priorité."
                  : "Si la situation est critique, n'attendez pas et contactez directement les services d'urgence."}
              </p>
            </div>
            
            <Card className="border-0 shadow-sm mb-4">
              <CardBody className="bg-danger bg-opacity-10">
                <h6 className="text-danger mb-3 fw-bold">Numéros d'urgence</h6>
                <ListGroup flush className="bg-transparent emergency-contacts">
                  <ListGroupItem className="border-0 bg-transparent px-0 py-2">
                    <div className="d-flex align-items-center">
                      <div className="emergency-icon me-3 bg-danger text-white rounded-circle p-2">
                        <Phone size={18} />
                      </div>
                      <div>
                        <div className="fw-bold">SAMU</div>
                        {/* Modification: Numéro d'urgence en noir */}
                        <div className="emergency-number text-dark">190</div>
                      </div>
                    </div>
                  </ListGroupItem>
                  
                  <ListGroupItem className="border-0 bg-transparent px-0 py-2">
                    <div className="d-flex align-items-center">
                      <div className="emergency-icon me-3 bg-danger text-white rounded-circle p-2">
                        <Phone size={18} />
                      </div>
                      <div>
                        <div className="fw-bold">Police</div>
                        {/* Modification: Numéro d'urgence en noir */}
                        <div className="emergency-number text-dark">197</div>
                      </div>
                    </div>
                  </ListGroupItem>
                  
                  <ListGroupItem className="border-0 bg-transparent px-0 py-2">
                    <div className="d-flex align-items-center">
                      <div className="emergency-icon me-3 bg-danger text-white rounded-circle p-2">
                        <Phone size={18} />
                      </div>
                      <div>
                        <div className="fw-bold">Pompiers</div>
                        {/* Modification: Numéro d'urgence en noir */}
                        <div className="emergency-number text-dark">198</div>
                      </div>
                    </div>
                  </ListGroupItem>
                  
                  <ListGroupItem className="border-0 bg-transparent px-0 py-2">
                    <div className="d-flex align-items-center">
                      <div className="emergency-icon me-3 bg-danger text-white rounded-circle p-2">
                        <Phone size={18} />
                      </div>
                      <div>
                        <div className="fw-bold">Centre Anti-poison</div>
                        {/* Modification: Numéro d'urgence en noir */}
                        <div className="emergency-number text-dark">71 335 500</div>
                      </div>
                    </div>
                  </ListGroupItem>
                </ListGroup>
              </CardBody>
            </Card>
            
            <div className="mental-health-resources mb-4">
              <h6 className="text-primary mb-3 fw-bold">Ressources en santé mentale</h6>
              <ListGroup flush>
                <ListGroupItem className="d-flex align-items-center px-0 py-2 border-0">
                  <Heart size={16} className="me-2 text-danger" />
                  <span>SOS Écoute : 80 105 105 (Ligne nationale)</span>
                </ListGroupItem>
                <ListGroupItem className="d-flex align-items-center px-0 py-2 border-0">
                  <Heart size={16} className="me-2 text-danger" />
                  <span>Service psychologique de l'université</span>
                </ListGroupItem>
              </ListGroup>
            </div>
            
            <div className="text-center mt-4">
              <Button color="primary" onClick={toggle}>
                Fermer
              </Button>
            </div>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <Button
        color="danger"
        className="emergency-button d-flex align-items-center justify-content-center gap-2 w-100 mt-3 mb-4"
        onClick={toggle}
        style={{
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 10px rgba(220, 53, 69, 0.2)',
          transition: 'all 0.3s ease'
        }}
      >
        <AlertTriangle size={18} />
        <span>Signaler un cas d'urgence</span>
      </Button>

      <Modal
        isOpen={modal}
        toggle={toggle}
        className="emergency-modal"
        size="lg"
        backdrop="static"
        centered
      >
        <ModalHeader 
          toggle={toggle}
          className={step === 3 && submissionSuccess ? "bg-success text-white" : "bg-danger text-white"}
        >
          {step === 3 && submissionSuccess 
            ? "Réclamation traitée" 
            : "Réclamation d'urgence médicale"}
        </ModalHeader>
        <ModalBody className="p-4">
          {error && (
            <Alert color="danger" className="mb-4">
              {error}
            </Alert>
          )}
          
          {step < 3 && (
            <div className="steps-indicator mb-4">
              <div className="step-progress-bar">
                <div 
                  className="step-progress-fill" 
                  style={{ width: `${(step / 2) * 100}%` }}
                ></div>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <div className={`step-label ${step >= 1 ? 'active' : ''}`}>
                  <div className={`step-number ${step >= 1 ? 'active' : ''}`}>1</div>
                  <small>Symptômes</small>
                </div>
                <div className={`step-label ${step >= 2 ? 'active' : ''}`}>
                  <div className={`step-number ${step >= 2 ? 'active' : ''}`}>2</div>
                  <small>Détails</small>
                </div>
              </div>
            </div>
          )}
          
          {renderStepContent()}
        </ModalBody>
        
        {step < 3 && (
          <ModalFooter className="border-top-0 bg-light p-3">
            <div className="w-100 text-center">
              <small className="text-muted d-flex align-items-center justify-content-center">
                <Clock size={14} className="me-1" />
                Les réclamations d'urgence sont traitées en priorité
              </small>
            </div>
          </ModalFooter>
        )}
      </Modal>

      <style jsx="true">{`
        .emergency-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(220, 53, 69, 0.3) !important;
        }
        
        .symptom-badge {
          transition: all 0.2s ease;
        }
        
        .symptom-badge:hover {
          transform: translateY(-2px);
        }
        
        .symptom-badge.selected {
          transform: translateY(-2px);
          box-shadow: 0 3px 6px rgba(0,0,0,0.1);
        }
        
        .step-progress-bar {
          height: 6px;
          background-color: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .step-progress-fill {
          height: 100%;
          background-color: #7366ff;
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        
        .step-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #6c757d;
        }
        
        .step-label.active {
          color: #7366ff;
          font-weight: 500;
        }
        
        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #e9ecef;
          color: #6c757d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          margin-bottom: 4px;
        }
        
        .step-number.active {
          background-color: #7366ff;
          color: white;
        }
        
        .success-animation {
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }
        
        .checkmark-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke-miterlimit: 10;
          stroke: #4caf50;
          fill: none;
          animation: stroke .6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        
        .checkmark {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: block;
          stroke-width: 6;
          stroke: #4caf50;
          stroke-miterlimit: 10;
          box-shadow: inset 0px 0px 0px #4caf50;
          animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
          position: relative;
          top: 5px;
        }
        
        .checkmark.draw {
          animation-delay: 0s;
          animation-duration: 1s;
          stroke-dasharray: 640;
          stroke-dashoffset: 640;
          animation: draw-check 1s ease-in-out forwards;
        }
        
        @keyframes draw-check {
          0% {
            stroke-dashoffset: 640;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        .emergency-number {
          font-size: 1.1rem;
          font-weight: bold;
          /* Modification: Couleur du numéro en noir au lieu de rouge */
        }
        
        .emergency-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </>
  );
};

export default EmergencyClaimButton;