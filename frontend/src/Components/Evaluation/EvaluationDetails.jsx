import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Container, Row, Col, Button } from 'reactstrap';
import { Breadcrumbs, H4 } from '../../AbstractElements';

const EvaluationDetails = () => {
  const { id } = useParams(); // Récupérer l'ID depuis l'URL
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvaluationDetails = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`http://localhost:5000/api/evaluation/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des détails de l\'évaluation');
        }

        const data = await response.json();
        setEvaluation(data.evaluation);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluationDetails();
  }, [id, navigate]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Chargement des détails...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c' }}>{error}</div>;
  }

  if (!evaluation) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c' }}>Évaluation non trouvée</div>;
  }

  return (
    <div>
      <Breadcrumbs
        mainTitle="Détails de l'Évaluation"
        parent="Évaluations"
        title="Détails de l'Évaluation"
      />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardHeader className="pb-0">
                <H4>Détails de l'Évaluation de {evaluation.nomEtudiant}</H4>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md="6">
                    <p><strong>Nom de l'étudiant :</strong> {evaluation.nomEtudiant}</p>
                    <p><strong>Classe :</strong> {evaluation.classe}</p>
                    <p><strong>Matière :</strong> {evaluation.matiere}</p>
                    <p><strong>Date :</strong> {evaluation.dateEvaluation}</p>
                    <p><strong>Réaction à la correction :</strong> {evaluation.reactionCorrection}</p>
                    <p><strong>Gestion du stress :</strong> {evaluation.gestionStress}</p>
                    <p><strong>Présence :</strong> {evaluation.presence}</p>
                  </Col>
                  <Col md="6">
                    <p><strong>Expression émotionnelle :</strong> {evaluation.expressionEmotionnelle}</p>
                    <p><strong>Participation orale :</strong> {evaluation.participationOrale}</p>
                    <p><strong>Engagement :</strong> {evaluation.engagement || 'N/A'}</p>
                    <p><strong>Concentration :</strong> {evaluation.concentration || 'N/A'}</p>
                    <p><strong>Interaction :</strong> {evaluation.interaction || 'N/A'}</p>
                    <p><strong>Suivi recommandé :</strong> {evaluation.suiviRecommande ? 'Oui' : 'Non'}</p>
                  </Col>
                </Row>
                <Row className="mt-3">
                  <Col md="12">
                    <p><strong>Difficultés :</strong> {evaluation.difficultes || 'Aucune'}</p>
                    <p><strong>Points positifs :</strong> {evaluation.pointsPositifs || 'Aucun'}</p>
                    <p><strong>Axes d'amélioration :</strong> {evaluation.axesAmelioration || 'Aucun'}</p>
                  </Col>
                </Row>
                <Button
                  color="primary"
                  onClick={() => navigate('/evaluation-history')}
                  style={{
                    borderRadius: '20px',
                    padding: '5px 15px',
                    fontSize: '12px',
                    background: 'linear-gradient(45deg, #1E90FF, #00c4ff)',
                    border: 'none',
                    boxShadow: '0 2px 5px rgba(30, 144, 255, 0.3)',
                    transition: 'transform 0.3s ease',
                    marginTop: '20px',
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                >
                  Retour à l'Historique
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default EvaluationDetails;