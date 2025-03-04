import React, { useState, useEffect, Fragment } from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody, Form, FormGroup, Label, Input, Button, Alert, Progress } from 'reactstrap';
import { H4, H5, P } from '../../../../AbstractElements';

const SupportElement = () => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [userId, setUserId] = useState(null);

  // Récupérer l’ID de l’utilisateur depuis le token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && token !== "null") {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUserId(decoded.userId);
        console.log("User ID décodé:", decoded.userId);
      } catch (e) {
        console.error("Erreur lors du décodage du token:", e);
        setError("Erreur d’authentification. Veuillez vous reconnecter.");
        localStorage.removeItem("token"); // Nettoyer si invalide
      }
    } else {
      console.warn("Aucun token valide trouvé dans localStorage.");
      setError("Veuillez vous connecter pour accéder au questionnaire.");
    }
  }, []);

  // Récupérer les questions
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/questionnaire/questions');
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setQuestions(data);
      } catch (err) {
        console.error("Erreur lors de la récupération des questions:", err);
        setError(err.message || "Impossible de charger les questions.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) { // Ne fetch que si userId est défini
      fetchQuestions();
    } else {
      setLoading(false);
      setError("Utilisateur non authentifié.");
    }
  }, [userId]);

  // Gérer les changements de réponse
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(value)
    }));
  };

  // Soumettre le questionnaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(answers).length < questions.length) {
      setError("Veuillez répondre à toutes les questions.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedAnswers = Object.keys(answers).map(questionId => ({
        questionId: parseInt(questionId),
        answer: answers[questionId]
      }));

      const response = await fetch('http://localhost:5000/api/questionnaire/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          answers: formattedAnswers
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      setStep(2);
    } catch (err) {
      console.error("Erreur lors de la soumission:", err);
      setError(err.message || "Erreur lors de la soumission du questionnaire.");
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (score) => {
    if (score <= 15) return 'success';
    if (score <= 25) return 'info';
    if (score <= 35) return 'warning';
    return 'danger';
  };

  const handleRetakeQuiz = () => {
    setAnswers({});
    setResult(null);
    setStep(1);
  };

  if (loading && !questions.length) {
    return <div className="text-center p-5">Chargement du questionnaire...</div>;
  }

  if (error && !questions.length) {
    return <Alert color="danger">{error}</Alert>;
  }

  return (
    <Fragment>
      <Container fluid>
        <Row className="justify-content-center">
          <Col xl="8">
            <Card>
              <CardHeader className="pb-0">
                <H4>Questionnaire sur le bien-être étudiant</H4>
                <P>Évaluez votre état psychologique et votre expérience scolaire de cette semaine</P>
              </CardHeader>
              <CardBody>
                {step === 1 ? (
                  <Form onSubmit={handleSubmit}>
                    {error && <Alert color="danger">{error}</Alert>}
                    {questions.map((question) => (
                      <FormGroup key={question.id} className="mb-4">
                        <H5>{question.text}</H5>
                        <div className="d-flex justify-content-between flex-wrap mt-3">
                          {question.options.map((option, index) => (
                            <div key={index} className="mb-2">
                              <Input
                                type="radio"
                                name={`question-${question.id}`}
                                id={`q${question.id}-option${index + 1}`}
                                value={index + 1}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                checked={answers[question.id] === index + 1}
                                required
                                disabled={loading}
                              />
                              <Label className="ms-2" htmlFor={`q${question.id}-option${index + 1}`}>
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </FormGroup>
                    ))}
                    <div className="text-center mt-4">
                      <Button color="primary" type="submit" disabled={loading}>
                        {loading ? 'Traitement en cours...' : 'Soumettre mes réponses'}
                      </Button>
                    </div>
                  </Form>
                ) : (
                  <div className="result-container">
                    <H4 className="text-center mb-4">Résultats de votre évaluation</H4>
                    <div className="text-center mb-4">
                      <H5>Votre état psychologique : {result.emotionalState}</H5>
                      <div className="mt-3">
                        <Progress
                          value={result.score}
                          max={50}
                          color={getProgressColor(result.score)}
                          style={{ height: '20px' }}
                        >
                          Score: {result.score}/50
                        </Progress>
                      </div>
                    </div>
                    <Card className="mb-4">
                      <CardBody>
                        <H5 className="mb-3">Recommandations personnalisées :</H5>
                        <ul className="recommendation-list">
                          {result.recommendations.map((rec, index) => (
                            <li key={index} className="mb-2">{rec}</li>
                          ))}
                        </ul>
                      </CardBody>
                    </Card>
                    <div className="text-center">
                      <Button color="primary" onClick={handleRetakeQuiz} className="me-2">
                        Refaire le questionnaire
                      </Button>
                      <Button color="secondary" tag="a" href="/tivo/dashboard/default">
                        Retour à l'accueil
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