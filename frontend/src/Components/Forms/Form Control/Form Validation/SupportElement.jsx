import React, { useState, useEffect, Fragment, useRef } from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody, Form, FormGroup, Label, Input, Button, Alert, Progress, Badge } from 'reactstrap';
import { H4, H5, P } from '../../../../AbstractElements';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Award, TrendingUp, AlertTriangle, ChevronRight, BarChart2, FileText, Activity, Info, Sun, Moon, Target, Clipboard } from 'react-feather';
import { motion } from 'framer-motion';

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
    
    // Debug: afficher le contenu brut du token
    console.log("Token décodé:", JSON.parse(jsonPayload));
    
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

// Style pour les animations
const animations = `
@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }
  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -30px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes bounce {
  from, 20%, 53%, 80%, to {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -15px, 0);
  }
  70% {
    transform: translate3d(0, -7px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.shake-animation {
  animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
}

.pulse-animation {
  animation: pulse 1.5s infinite;
}

.fadeInDown-animation {
  animation: fadeInDown 0.5s forwards;
}

.bounce-animation {
  animation: bounce 1s;
}

.highlight-question {
  background-color: rgba(220, 53, 69, 0.05);
  border-left: 4px solid #dc3545 !important;
}

.validation-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1050;
  min-width: 400px;
  max-width: 90%;
  box-shadow: 0 5px 15px rgba(0,0,0,.2);
}

.form-floating-alert {
  position: sticky;
  top: 10px;
  z-index: 1040;
  margin-bottom: 15px;
}
`;

const SupportElement = () => {
  // États
  const [isQuestionnaireAvailable, setIsQuestionnaireAvailable] = useState(true);
  const [nextAvailableDate, setNextAvailableDate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [tokenExists, setTokenExists] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showMissingAlert, setShowMissingAlert] = useState(false);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const alertRef = useRef(null);
  const formRef = useRef(null);
  const navigate = useNavigate();

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // Fonction pour gérer les réponses
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: parseInt(value, 10)
    }));
    
    // Supprimer cette question des erreurs de validation si elle existe
    setValidationErrors(prev => prev.filter(id => id !== questionId));

    // Masquer l'alerte si elle est visible
    if (showMissingAlert) {
      setShowMissingAlert(false);
    }
  };

  // Fetch questions au chargement du composant
  useEffect(() => {
    async function initializeData() {
      try {
        // Récupérer le token du localStorage
        const token = getToken();
        if (!token) {
          throw new Error("Aucun token d'authentification trouvé. Veuillez vous connecter.");
        }
        
        setTokenExists(true);
        
        // Décoder le token pour obtenir le userId, email et role
        const decodedToken = decodeJWT(token);
        console.log("Token décodé complet:", decodedToken);
        
        if (!decodedToken.userId) {
          throw new Error("Token invalide ou expiré");
        }

        setUserId(decodedToken.userId);
        setUserEmail(decodedToken.Email || decodedToken.email || "Email non disponible");

        // CORRECTION: Vérifier toutes les propriétés possibles où le rôle pourrait être stocké
        const tokenRole = decodedToken.Role || decodedToken.role || decodedToken.roles;
        console.log("Role dans le token:", tokenRole);
        
        // Accepter le format array ou string
        const userRoles = Array.isArray(tokenRole) ? tokenRole : [tokenRole];
        console.log("Roles traités:", userRoles);
        
        setUserRole(userRoles);

        // Vérification plus robuste pour le rôle étudiant - compte les différentes casses possibles
        const isStudent = userRoles.some(role => {
          if (typeof role !== 'string') return false;
          const lowerRole = role.toLowerCase();
          return lowerRole === 'student' || lowerRole === 'étudiant';
        });

        console.log("Est un étudiant:", isStudent);
        
        // DÉCOMMENTÉ: Restriction d'accès aux étudiants uniquement
        if (!isStudent) {
          console.error("Accès refusé - Rôles de l'utilisateur:", userRoles);
          throw new Error("Seuls les étudiants peuvent accéder à ce questionnaire.");
        }
        
        // Récupérer les questions
        const response = await fetch('http://localhost:5000/api/questionnaire/questions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 403) {
            setIsQuestionnaireAvailable(false);
            setNextAvailableDate(errorData.nextAvailableDate);
            throw new Error(errorData.message);
          } else {
            throw new Error(`Erreur HTTP ${response.status}`);
          }
        }
        
        const data = await response.json();
        
        // S'assurer que nous extrayons correctement le tableau de questions
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
        } else if (Array.isArray(data)) {
          setQuestions(data);
        } else {
          console.error("Format de données inattendu:", data);
          setQuestions([]);
        }
        
        setIsQuestionnaireAvailable(data.isAvailable !== undefined ? data.isAvailable : true);
        setLoading(false);
      } catch (err) {
        console.error("Erreur:", err);
        setError(`${err.message}`);
        setLoading(false);
        setTokenExists(false);
      }
    }
    
    initializeData();
  }, []);

  // Ajouter le style d'animation au chargement
  useEffect(() => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(animations));
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Masquer l'alerte après un certain temps
  useEffect(() => {
    if (showMissingAlert) {
      const timer = setTimeout(() => {
        setShowMissingAlert(false);
      }, 15000); // Augmentation du temps à 15 secondes pour plus de visibilité
      return () => clearTimeout(timer);
    }
  }, [showMissingAlert]);

  // Effet pour faire défiler jusqu'à l'alerte ou la première question non répondue
  useEffect(() => {
    if (validationErrors.length > 0) {
      // Option 1: Défiler vers l'alerte si elle existe
      if (showMissingAlert && alertRef.current) {
        alertRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Option 2: Défiler vers la première question non répondue
        const firstErrorId = validationErrors[0];
        const firstErrorElement = document.getElementById(`question-${firstErrorId}`);
        if (firstErrorElement) {
          setTimeout(() => {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    }
  }, [validationErrors, showMissingAlert]);

  // Soumission du formulaire avec gestion améliorée des erreurs
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marquer qu'une tentative de soumission a été faite
    setSubmissionAttempted(true);
    
    // Identifier les questions sans réponses
    const unansweredQuestions = questions
      .filter(question => !answers[question.id])
      .map(question => question.id);
    
    if (unansweredQuestions.length > 0) {
      // Vibrer l'appareil si disponible
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Mettre à jour l'état des erreurs de validation
      setValidationErrors(unansweredQuestions);
      setShowMissingAlert(true);
      
      // CORRECTION: Afficher un message d'alerte fixe en haut du formulaire
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Effet visuel pour mettre en évidence les questions non répondues
      unansweredQuestions.forEach(questionId => {
        const element = document.getElementById(`question-${questionId}`);
        if (element) {
          // Animation d'alerte
          element.classList.add('shake-animation', 'highlight-question');
          element.style.boxShadow = '0 0 0 2px #dc3545';
          element.style.transition = 'box-shadow 0.3s ease-in-out';
          
          // Supprimer les effets après l'animation
          setTimeout(() => {
            element.classList.remove('shake-animation');
            // Garder une bordure subtile pour indiquer qu'il faut répondre
            element.style.boxShadow = '0 0 0 1px #dc3545';
          }, 2000);
        }
      });

      // Message d'erreur flottant pour mobile plus visible et durable
      const mobileAlert = document.createElement('div');
      mobileAlert.className = 'validation-alert fadeInDown-animation';
      mobileAlert.innerHTML = `
        <div class="bg-danger text-white p-3 rounded" style="display:flex;align-items:center">
          <span style="font-size:24px;margin-right:10px">⚠️</span>
          <div>
            <strong>Attention!</strong> ${unansweredQuestions.length} question(s) non répondue(s).
            <br/><small>Veuillez répondre à toutes les questions.</small>
          </div>
        </div>
      `;
      document.body.appendChild(mobileAlert);
      
      setTimeout(() => {
        document.body.removeChild(mobileAlert);
      }, 6000); // Augmentation du temps d'affichage
      
      // Faire défiler vers la première question non répondue après un court délai
      setTimeout(() => {
        const firstErrorElement = document.getElementById(`question-${unansweredQuestions[0]}`);
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      
      return;
    }

    setLoading(true);
    
    try {
      // Récupérer le token du localStorage
      const token = getToken();
      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      
      const formattedAnswers = Object.entries(answers).map(([id, value]) => ({
        questionId: parseInt(id, 10),
        answer: value
      }));

      const response = await fetch('http://localhost:5000/api/questionnaire/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          answers: formattedAnswers
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const resultData = await response.json();
      setResult(resultData);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigation vers l'historique des questionnaires
  const navigateToHistory = () => {
    navigate('/tivo/emergency-claim/questionnaire-history');
  };

  // Affichage pour l'erreur d'authentification ou de rôle
  if (!tokenExists && error) {
    return (
      <Container className="mt-5">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <Alert color="warning" className="text-center shadow-sm">
            <H4>{error}</H4>
            <p className="mt-3">Veuillez vous connecter avec un compte étudiant pour accéder au questionnaire.</p>
            <Button 
              color="primary" 
              className="mt-2"
              onClick={() => navigate('/tivo/authentication/login-simple')}
            >
              Se connecter
            </Button>
          </Alert>
        </motion.div>
      </Container>
    );
  }

  // Affichage du chargement
  if (loading && !questions.length) {
    return (
      <Container className="text-center p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-4">Chargement du questionnaire...</p>
        </motion.div>
      </Container>
    );
  }

  if (!isQuestionnaireAvailable) {
    return (
      <Container className="mt-5">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <Card className="shadow-sm border-0">
            <CardBody className="text-center p-5">
              <div className="mb-4">
                <Calendar size={50} className="text-primary" />
              </div>
              <H4>Questionnaire non disponible</H4>
              <p className="text-muted mb-4">Le questionnaire de bien-être est uniquement disponible le mardi.</p>
              {nextAvailableDate && (
                <div className="bg-light p-3 rounded mb-4">
                  <p className="mb-0">Prochain questionnaire disponible le: <Badge color="info" className="ms-2 p-2">{new Date(nextAvailableDate).toLocaleDateString()}</Badge></p>
                </div>
              )}
              <div className="d-flex justify-content-center">
                <Button 
                  color="primary" 
                  className="me-2"
                  onClick={() => navigate('/tivo/dashboard/default')}
                >
                  <ChevronRight size={16} className="me-1" /> Retour au tableau de bord
                </Button>
                <Button 
                  color="info" 
                  outline
                  onClick={navigateToHistory}
                >
                  <BarChart2 size={16} className="me-1" /> Voir mon historique
                </Button>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </Container>
    );
  }

  return (
    <Fragment>
      <Container fluid>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <Row className="justify-content-center">
            <Col xl="9">
              <Card className="shadow-sm border-0">
                <CardHeader className="py-4 bg-primary text-white" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}>
                  <div className="position-relative">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <div className="d-flex align-items-center">
                        <div className="bg-white rounded-circle p-2 me-3 shadow-sm">
                          <Target size={22} className="text-primary" />
                        </div>
                        <div>
                          <H4 className="text-white mb-1">Questionnaire sur le bien-être étudiant</H4>
                          <P className="text-white-50 mb-0 fs-6">
                            <i className="fa fa-clock-o me-1"></i> 
                            Évaluez votre état psychologique et votre expérience scolaire
                          </P>
                        </div>
                      </div>
                      
                      <Button
                        color="light"
                        size="sm"
                        className="d-flex align-items-center"
                        onClick={navigateToHistory}
                      >
                        <BarChart2 size={14} className="me-1 text-primary" /> 
                        <span>Voir mon historique</span>
                      </Button>
                    </div>
                    
                    <div className="d-flex flex-wrap align-items-center mt-3">
                      <div className="d-flex align-items-center me-3 mb-2">
                        {userEmail && (
                          <Badge color="light" pill className="p-2 px-3 d-flex align-items-center">
                            <div className="bg-primary rounded-circle p-1 me-2" style={{ minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fa fa-user text-white" style={{ fontSize: '10px' }}></i>
                            </div>
                            <span className="text-primary" style={{ wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                              {userEmail}
                            </span>
                          </Badge>
                        )}
                      </div>
                      
                      <Badge color="warning" pill className="p-2 mb-2">
                        <Calendar size={14} className="me-1" /> {new Date().toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardBody className="pt-4">
                  {/* Alerte de questions manquantes - fixe en haut lors du défilement */}
                  <div ref={alertRef} id="validation-alert-container">
                    {showMissingAlert && validationErrors.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bounce-animation form-floating-alert"
                      >
                        <Alert 
                          color="danger" 
                          className="d-flex align-items-center mb-4 shadow pulse-animation"
                          style={{ 
                            borderLeft: "5px solid #dc3545",
                            background: "#ffebee",
                            borderTop: "1px solid #dc3545",
                            borderRight: "1px solid #dc3545",
                            borderBottom: "1px solid #dc3545"
                          }}
                        >
                          <div className="me-3 bg-danger rounded-circle p-2">
                            <AlertTriangle size={24} className="text-white" />
                          </div>
                          <div>
                            <h5 className="mb-1 text-danger">Questions non répondues détectées</h5>
                            <p className="mb-2">
                              Vous avez oublié de répondre à <strong className="text-danger">{validationErrors.length} question{validationErrors.length > 1 ? 's' : ''}</strong>.
                            </p>
                            <div className="mt-2 d-flex flex-wrap">
                              {validationErrors.map((qId, idx) => {
                                const qIndex = questions.findIndex(q => q.id === qId);
                                return (
                                  <Button
                                    key={qId}
                                    color="danger"
                                    size="sm"
                                    outline
                                    className="me-2 mb-2"
                                    onClick={() => {
                                      const element = document.getElementById(`question-${qId}`);
                                      if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        element.classList.add('shake-animation');
                                        setTimeout(() => element.classList.remove('shake-animation'), 1000);
                                      }
                                    }}
                                  >
                                    <AlertTriangle size={12} className="me-1" />
                                    Question {qIndex + 1}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        </Alert>
                      </motion.div>
                    )}
                  </div>

                  {/* Alerte d'erreur générale */}
                  {error && !showMissingAlert && (
                    <Alert color="danger" className="d-flex align-items-center mb-4 shadow-sm">
                      {typeof error === 'string' ? (
                        <>
                          <AlertTriangle size={20} className="me-2" />
                          {error}
                        </>
                      ) : (
                        error
                      )}
                    </Alert>
                  )}
                  
                  {step === 1 ? (
                    <Form onSubmit={handleSubmit} ref={formRef}>
                      {/* Indicateur persistant si une soumission a été tentée avec des erreurs */}
                      {submissionAttempted && validationErrors.length > 0 && !showMissingAlert && (
                        <Alert color="danger" className="mb-4">
                          <div className="d-flex align-items-center">
                            <AlertTriangle size={20} className="me-2" />
                            <span>Veuillez répondre à toutes les questions avant de soumettre le questionnaire.</span>
                          </div>
                        </Alert>
                      )}
                      
                      <div className="mb-4 pb-2 border-bottom">
                        <div className="d-flex align-items-center">
                          <div className="bg-light p-2 rounded-circle me-3">
                            <Clipboard size={24} className="text-primary" />
                          </div>
                          <div>
                            <h5 className="mb-0">Instructions</h5>
                            <p className="text-muted mb-0">Répondez honnêtement aux questions ci-dessous pour obtenir une évaluation précise.</p>
                          </div>
                        </div>
                      </div>
                      
                      {Array.isArray(questions) && questions.length > 0 ? (
                        <div className="questions-container">
                          {questions.map((question, qIndex) => {
                            const isUnanswered = validationErrors.includes(question.id);
                            return (
                              <motion.div
                                key={question.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: qIndex * 0.1 }}
                                id={`question-${question.id}`}
                                className={isUnanswered ? 'position-relative' : ''}
                              >
                                <FormGroup className={`mb-4 p-4 border rounded-3 shadow-sm bg-white position-relative ${isUnanswered ? 'border-danger' : ''}`}>
                                  <div className="position-absolute" style={{ top: '-10px', left: '20px', background: 'white', padding: '0 10px' }}>
                                    <Badge color={isUnanswered ? "danger" : "primary"} pill className="px-3 py-1">
                                      {isUnanswered && <AlertTriangle size={12} className="me-1" />}
                                      {`Question ${qIndex + 1}`}
                                    </Badge>
                                  </div>
                                  
                                  {isUnanswered && (
                                    <div className="position-absolute" style={{ top: '-10px', right: '20px' }}>
                                      <Badge color="danger" pill className="px-3 py-1">
                                        <AlertTriangle size={12} className="me-1" />
                                        Réponse requise
                                      </Badge>
                                    </div>
                                  )}
                                  
                                  <H5 className="mt-2">{question.text}</H5>
                                  
                                  <div className="mt-4">
                                    {question.options && Array.isArray(question.options) ? (
                                      <div className="d-flex flex-column gap-2">
                                        {question.options.map((option, index) => {
                                          const inputId = `q${question.id}-opt${index}`;
                                          const isSelected = answers[question.id] === index + 1;
                                          
                                          return (
                                            <div 
                                              key={index} 
                                              className={`
                                                option-card p-3 rounded-3 cursor-pointer
                                                ${isSelected ? 'border-primary bg-primary' : 'border'}
                                                ${isUnanswered ? 'border-danger-subtle' : ''}
                                              `}
                                              onClick={() => handleAnswerChange(question.id, index + 1)}
                                              style={{ 
                                                transition: 'all 0.2s ease-in-out',
                                                cursor: 'pointer',
                                                transform: isSelected ? 'translateY(-2px)' : 'none',
                                                boxShadow: isSelected ? '0 4px 8px rgba(0,0,0,0.1)' : 'none'
                                              }}
                                            >
                                              <div className="d-flex align-items-center">
                                                <div className={`
                                                  option-radio me-3 rounded-circle d-flex align-items-center justify-content-center
                                                  ${isSelected ? 'bg-white' : 'bg-light'}
                                                `} style={{ width: '24px', height: '24px' }}>
                                                  {isSelected && <div className="bg-primary rounded-circle" style={{ width: '8px', height: '8px' }}></div>}
                                                </div>
                                                <Label 
                                                  for={inputId} 
                                                  className={`mb-0 w-100 ${isSelected ? 'text-white fw-medium' : ''}`}
                                                  style={{ cursor: 'pointer' }}
                                                >
                                                  {option}
                                                </Label>
                                                <Input
                                                  type="radio"
                                                  name={`question-${question.id}`}
                                                  id={inputId}
                                                  value={index + 1}
                                                  checked={answers[question.id] === index + 1}
                                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                  required
                                                  className="d-none" // Cacher le bouton radio standard
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-center text-muted">Options non disponibles pour cette question</p>
                                    )}
                                  </div>
                                  
                                  {/* Indication visuelle supplémentaire pour les questions sans réponse */}
                                  {isUnanswered && (
                                    <div className="mt-3 pt-2 border-top border-danger-subtle">
                                      <div className="d-flex align-items-center text-danger">
                                        <AlertTriangle size={16} className="me-2" />
                                        <span className="small">Veuillez sélectionner une option pour continuer</span>
                                      </div>
                                    </div>
                                  )}
                                </FormGroup>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <AlertTriangle size={40} className="text-warning mb-3" />
                          <p className="lead">Aucune question disponible pour le moment.</p>
                        </div>
                      )}

                      {Array.isArray(questions) && questions.length > 0 && (
                        <div className="text-center mt-5">
                          <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="text-muted small">0 questions</span>
                              <span className="text-primary fw-medium">
                                {Object.keys(answers).length} sur {questions.length} questions répondues
                              </span>
                              <span className="text-muted small">{questions.length} questions</span>
                            </div>
                            <Progress 
                              value={(Object.keys(answers).length / questions.length) * 100} 
                              className="mt-1"
                              style={{ height: '8px', borderRadius: '4px' }}
                            />
                          </div>
                          
                          {/* Alerte fixe en bas avant le bouton si erreurs détectées */}
                          {validationErrors.length > 0 && (
                            <Alert color="danger" className="mb-3 d-flex align-items-center">
                              <AlertTriangle size={16} className="me-2" />
                              <div>
                                <p className="mb-0">
                                  <strong>Formulaire incomplet:</strong> {validationErrors.length} question(s) sans réponse
                                </p>
                                <p className="small mb-0">
                                  Veuillez répondre à toutes les questions avant de valider
                                </p>
                              </div>
                            </Alert>
                          )}
                          
                          <Button 
                            color="primary" 
                            size="lg" 
                            type="submit" 
                            disabled={loading}
                            className="px-5 py-3 shadow"
                          >
                            {loading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Traitement en cours...
                              </>
                            ) : (
                              <>
                                Valider le questionnaire <ChevronRight size={16} className="ms-1" />
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </Form>
                  ) : (
                    <motion.div 
                      className="result-section"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="text-center mb-5">
                        <div className="d-inline-block p-3 bg-primary bg-opacity-10 rounded-circle mb-3">
                          <Target size={40} className="text-primary" />
                        </div>
                        <H4 className="mb-2">Résultats de l'analyse</H4>
                        <p className="text-muted">Voici l'analyse de vos réponses au questionnaire de bien-être</p>
                      </div>
                      
                      <Row className="mb-5">
                        <Col md="12">
                          <Card className="shadow-sm border-0 mb-4">
                            <CardBody className="p-4">
                              <div className="d-flex justify-content-between mb-3">
                                <h5 className="mb-0">Score global</h5>
                                <Badge 
                                  color={
                                    result.score <= 15 ? 'success' :
                                    result.score <= 25 ? 'info' :
                                    result.score <= 35 ? 'warning' : 'danger'
                                  } 
                                  pill 
                                  className="px-3 py-2"
                                >
                                  {result.score}/50
                                </Badge>
                              </div>
                              
                              <Progress
                                value={result.score}
                                max={50}
                                color={
                                  result.score <= 15 ? 'success' :
                                  result.score <= 25 ? 'info' :
                                  result.score <= 35 ? 'warning' : 'danger'
                                }
                                className="mb-3"
                                style={{ height: '10px', borderRadius: '5px' }}
                              />
                              
                              <div className="mt-4 mb-2">
                                <h5>État émotionnel : <span className={`
                                  fw-bold
                                  ${result.score <= 15 ? 'text-success' :
                                    result.score <= 25 ? 'text-info' :
                                    result.score <= 35 ? 'text-warning' : 'text-danger'}
                                `}>{result.emotionalState}</span></h5>
                              </div>
                              
                              <div className="d-flex flex-wrap mt-3">
                                <div className="d-flex align-items-center me-4 mb-2">
                                  <div className="bg-success rounded-circle p-1" style={{ width: '12px', height: '12px' }}></div>
                                  <span className="small ms-2">0-15: Excellent</span>
                                </div>
                                <div className="d-flex align-items-center me-4 mb-2">
                                  <div className="bg-info rounded-circle p-1" style={{ width: '12px', height: '12px' }}></div>
                                  <span className="small ms-2">16-25: Bon</span>
                                </div>
                                <div className="d-flex align-items-center me-4 mb-2">
                                  <div className="bg-warning rounded-circle p-1" style={{ width: '12px', height: '12px' }}></div>
                                  <span className="small ms-2">26-35: Moyen</span>
                                </div>
                                <div className="d-flex align-items-center mb-2">
                                  <div className="bg-danger rounded-circle p-1" style={{ width: '12px', height: '12px' }}></div>
                                  <span className="small ms-2">36-50: Préoccupant</span>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                      
                      <Row className="mb-5">
                        <Col lg="7">
                          <Card className="recommendation-card shadow-sm border-0 h-100">
                            <CardHeader className="bg-light">
                              <div className="d-flex align-items-center">
                                <Sun size={20} className="text-warning me-2" />
                                <h5 className="mb-0">Recommandations personnalisées</h5>
                              </div>
                            </CardHeader>
                            <CardBody className="p-4">
                              {result.recommendations && Array.isArray(result.recommendations) ? (
                                <ul className="list-unstyled">
                                  {result.recommendations.map((rec, index) => (
                                    <motion.li 
                                      key={index} 
                                      className="mb-3 d-flex"
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: index * 0.1 }}
                                    >
                                      <div className="me-3 text-primary">
                                        <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                                          <Info size={16} className="text-primary" />
                                        </div>
                                      </div>
                                      <div>
                                        <p className="mb-0">{rec}</p>
                                      </div>
                                    </motion.li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-muted">Aucune recommandation disponible</p>
                                </div>
                              )}
                            </CardBody>
                          </Card>
                        </Col>
                        
                        <Col lg="5">
                          <Card className="points-card mb-4 shadow-sm border-0">
                            <CardBody className="p-4 bg-primary text-white text-center">
                              <Award size={40} className="mb-3 text-warning" />
                              <h4 className="mb-3">Félicitations !</h4>
                              <div className="mb-3">
                                <span className="badge bg-warning text-dark p-2 px-3 fs-6">
                                  <i className="fa fa-star me-1"></i> +{result.pointsEarned || 20} points
                                </span>
                              </div>
                              <p className="mb-1">Vous avez gagné des points pour avoir complété ce questionnaire.</p>
                              <p className="text-white-50 small">Un email récapitulatif a été envoyé à votre adresse.</p>
                              <div className="mt-3 bg-white bg-opacity-10 p-3 rounded">
                                <div className="d-flex align-items-center justify-content-center">
                                  <Award size={20} className="text-warning me-2" />
                                  <h6 className="mb-0 text-white">Total des points : {result.totalPoints || 20}</h6>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                          
                          <Card className="shadow-sm border-0">
                            <CardBody className="p-4">
                              <h5 className="mb-3">Votre prochain questionnaire</h5>
                              <div className="d-flex align-items-center mb-2">
                                <Calendar size={18} className="text-primary me-2" />
                                <span>Prochain questionnaire mardi prochain</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <Clock size={18} className="text-primary me-2" />
                                <span>Prévoir environ 5 minutes</span>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>

                      <div className="text-center mt-4">
                        <Button color="secondary" className="me-2" onClick={() => setStep(1)}>
                          <Activity size={18} className="me-1" /> Refaire le test
                        </Button>
                        <Button color="info" className="me-2" onClick={() => navigate('/tivo/emergency-claim/questionnaire-history')}>
                          <BarChart2 size={18} className="me-1" /> Voir mon historique
                        </Button>
                        <Button color="primary" href="/tivo/dashboard/default">
                          <ChevronRight size={18} className="me-1" /> Retour au tableau de bord
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </motion.div>
      </Container>
    </Fragment>
  );
};

export default SupportElement;