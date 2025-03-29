import React, { useState, useEffect, Fragment } from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody, Form, FormGroup, Label, Input, Button, Alert, Progress, Badge } from 'reactstrap';
import { H4, H5, P } from '../../../../AbstractElements';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  // Fonction pour gérer les réponses
  const handleAnswerChange = (questionId, value) => {
    console.log("Question répondue:", questionId, value);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: parseInt(value, 10)
    }));
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
        console.log("Initialisation du test avec token du localStorage");
        
        // Décoder le token pour obtenir le userId et email
        const decodedToken = decodeJWT(token);
        if (!decodedToken.userId) {
          throw new Error("Token invalide ou expiré");
        }
        
        setUserId(decodedToken.userId);
        setUserEmail(decodedToken.email || "Email non disponible");
        console.log("UserID extrait du token:", decodedToken.userId);
        
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
        console.log("Questions récupérées:", data);
        
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

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (Object.keys(answers).length !== questions.length) {
      setError("Veuillez répondre à toutes les questions.");
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

  // Redirection vers la page de connexion
  const handleLoginRedirect = () => {
    navigate('/tivo/authentication/login-simple');
  };

  // Affichage pour l'erreur d'authentification
  if (!tokenExists && error) {
    return (
      <Container className="mt-5">
        <Alert color="warning" className="text-center">
          <H4>{error}</H4>
          <p></p>
       
        </Alert>
      </Container>
    );
  }

  // Affichage du chargement
  if (loading && !questions.length) {
    return (
      <Container className="text-center p-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-3">Chargement du questionnaire...</p>
      </Container>
    );
  }

  if (!isQuestionnaireAvailable) {
    return (
      <Container className="mt-5">
        <Alert color="info" className="text-center">
          <H4>Questionnaire non disponible</H4>
          <p>Le questionnaire de bien-être est uniquement disponible le samedi.</p>
          {nextAvailableDate && (
            <p>Prochain questionnaire disponible le: <strong>{new Date(nextAvailableDate).toLocaleDateString()}</strong></p>
          )}
          <Button 
            color="primary" 
            className="mt-3"
            onClick={() => navigate('/tivo/dashboard/default')}
          >
            Retour au tableau de bord
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Fragment>
      <Container fluid>
        <Row className="justify-content-center">
          <Col xl="8">
            <Card>
              <CardHeader className="pb-0">
                <H4>Questionnaire sur le bien-être étudiant</H4>
                <P>Évaluez votre état psychologique et votre expérience scolaire</P>
                {userEmail && (
                  <div className="mt-2">
                    <Badge color="info" pill className="p-2">
                      <i className="fa fa-user me-1"></i> {userEmail}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              
              <CardBody>
                {error && <Alert color="danger" timeout={500}>{error}</Alert>}
                
                {step === 1 ? (
                  <Form onSubmit={handleSubmit}>
                    {Array.isArray(questions) && questions.length > 0 ? (
                      questions.map((question) => (
                        <FormGroup key={question.id} className="mb-4 p-3 border rounded">
                          <H5>{question.text}</H5>
                          <div className="d-flex flex-wrap mt-3">
                            {question.options && Array.isArray(question.options) ? (
                              question.options.map((option, index) => (
                                <div key={index} className="form-check m-2">
                                  <Input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    id={`q${question.id}-opt${index}`}
                                    value={index + 1}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    required
                                  />
                                  <Label for={`q${question.id}-opt${index}`}>
                                    {option}
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <p>Options non disponibles pour cette question</p>
                            )}
                          </div>
                        </FormGroup>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p>Aucune question disponible pour le moment.</p>
                      </div>
                    )}

                    {Array.isArray(questions) && questions.length > 0 && (
                      <div className="text-center mt-4">
                        <Button color="primary" size="lg" type="submit" disabled={loading}>
                          {loading ? "Traitement en cours..." : "Valider le questionnaire"}
                        </Button>
                      </div>
                    )}
                  </Form>
                ) : (
                  <div className="result-section">
                    <H4 className="text-center mb-4">Résultats de l'analyse</H4>
                    
                    <div className="score-section mb-4">
                        <Progress
                          value={result.score}
                          max={50}
                          color={
                            result.score <= 15 ? 'success' :
                            result.score <= 25 ? 'info' :
                            result.score <= 35 ? 'warning' : 'danger'
                          }
                          className="mb-3"
                        >
                          Score: {result.score}/50
                        </Progress>
                        <H5>État émotionnel : {result.emotionalState}</H5>
                    </div>

                    <Card className="recommendation-card">
                      <CardHeader>Recommandations</CardHeader>
                      <CardBody>
                        <ul className="list-unstyled">
                          {result.recommendations && Array.isArray(result.recommendations) ? (
                            result.recommendations.map((rec, index) => (
                              <li key={index} className="mb-2">✔️ {rec}</li>
                            ))
                          ) : (
                            <li>Aucune recommandation disponible</li>
                          )}
                        </ul>
                      </CardBody>
                    </Card>

                    {/* Carte pour les points avec couleur bleue */}
                    <Card className="points-card mb-4" color="primary">
                      <CardBody className="text-center text-white">
                        <div className="mb-2">
                          <span className="badge bg-warning text-dark p-2">
                            <i className="fa fa-star me-1"></i> +{result.pointsEarned || 20} points
                          </span>
                        </div>
                        <p className="mb-0">Félicitations ! Vous avez gagné des points pour avoir complété ce questionnaire.</p>
                        <p className="text-white-50 small">Un email récapitulatif a été envoyé à votre adresse.</p>
                      </CardBody>
                    </Card>

                    <div className="text-center mt-4">
                      <Button color="secondary" className="me-2" onClick={() => setStep(1)}>
                        Refaire le test
                      </Button>
                      <Button color="primary" href="/tivo/dashboard/default">
                        Retour au tableau de bord
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default SupportElement;