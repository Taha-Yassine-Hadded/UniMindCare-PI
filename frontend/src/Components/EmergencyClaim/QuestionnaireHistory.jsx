import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody, Button, Nav, NavItem, NavLink, TabContent, TabPane, Badge, Spinner } from 'reactstrap';
import { Line, Pie, Radar } from 'react-chartjs-2';
import { Calendar, Clock, Award, TrendingUp, AlertTriangle, ChevronRight, BarChart2, FileText, Activity, Info } from 'react-feather';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { H4, H5, P } from '../../AbstractElements';
import { getToken, decodeJWT } from '../../utils/token';

const QuestionnaireHistory = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pointsData, setPointsData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  // Helper to check if chart data is valid
  const isChartDataValid = (data) => {
    return data && Array.isArray(data.labels) && Array.isArray(data.datasets);
  };

  const toggle = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const getScoreColor = (score) => {
    if (score <= 15) return '#28a745'; // vert - excellent
    if (score <= 25) return '#17a2b8'; // bleu - bon
    if (score <= 35) return '#ffc107'; // jaune - moyen
    if (score <= 45) return '#ff6f00'; // orange - préoccupant
    return '#dc3545'; // rouge - très préoccupant
  };

  useEffect(() => {
    async function fetchUserData() {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Aucun token d'authentification trouvé.");
        }
        
        const decodedToken = decodeJWT(token);
        if (!decodedToken.userId) {
          throw new Error("Token invalide ou expiré");
        }
        
        setUserId(decodedToken.userId);
        await fetchHistoryAndPoints(decodedToken.userId, token);
      } catch (err) {
        console.error("Erreur:", err);
        setError(err.message);
        setHistoryLoading(false);
      }
    }
    
    fetchUserData();
  }, []);

  const fetchHistoryAndPoints = async (userId, token) => {
    try {
      setHistoryLoading(true);
      // Récupérer l'historique des questionnaires
      const historyResponse = await fetch(`http://localhost:5000/api/questionnaire/history/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!historyResponse.ok) {
        throw new Error(`Erreur HTTP ${historyResponse.status}`);
      }
      
      const historyData = await historyResponse.json();
      setHistoryData(historyData);
      
      // Récupérer les points de l'utilisateur
      const pointsResponse = await fetch(`http://localhost:5000/api/questionnaire/points/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!pointsResponse.ok) {
        throw new Error(`Erreur HTTP ${pointsResponse.status}`);
      }
      
      const pointsData = await pointsResponse.json();
      setPointsData(pointsData);
    } catch (err) {
      console.error("Erreur lors de la récupération des données:", err);
      setError("Erreur lors de la récupération des données");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Données pour le graphique d'évolution des scores avec meilleure gestion des erreurs
  const prepareScoreEvolutionData = () => {
    try {
      if (!historyData || historyData.length === 0) {
        // Renvoyer des données par défaut si historyData est vide
        return {
          labels: ['Aucune donnée'],
          datasets: [
            {
              label: 'Score',
              data: [0],
              borderColor: '#0d6efd',
              backgroundColor: 'rgba(13, 110, 253, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#0d6efd',
              pointBorderColor: '#ffffff',
              pointRadius: 6,
              pointHoverRadius: 9,
              pointBorderWidth: 3,
              borderWidth: 4,
            }
          ]
        };
      }
      
      const sortedData = [...historyData].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      return {
        labels: sortedData.map(item => format(new Date(item.createdAt), 'dd/MM/yyyy')),
        datasets: [
          {
            label: 'Score',
            data: sortedData.map(item => item.score),
            borderColor: '#0d6efd', // Version simplifiée sans gradient pour éviter les erreurs
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#0d6efd',
            pointBorderColor: '#ffffff',
            pointRadius: 6,
            pointHoverRadius: 9,
            pointBorderWidth: 3,
            borderWidth: 4,
          }
        ]
      };
    } catch (error) {
      console.error("Erreur dans prepareScoreEvolutionData:", error);
      // Retourner un jeu de données minimal en cas d'erreur
      return {
        labels: ['Erreur'],
        datasets: [{ label: 'Erreur', data: [0], borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)' }]
      };
    }
  };

  // Données pour le graphique radar des réponses avec meilleure gestion des erreurs
  const prepareLatestAnswersData = () => {
    try {
      // Les catégories de questions pour le radar chart
      const categories = [
        "Charge de travail",
        "Concentration",
        "Anxiété",
        "Niveau d'énergie",
        "Qualité du sommeil",
        "Confiance en soi",
        "Vie sociale",
        "Pression ressentie",
        "Équilibre de vie",
        "Satisfaction personnelle"
      ];
      
      // Renvoyer des données vides mais valides si pas d'historique
      if (!historyData || historyData.length === 0) {
        return {
          labels: categories,
          datasets: [
            {
              label: 'Pas de données',
              data: Array(categories.length).fill(0),
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 2,
              pointBackgroundColor: 'rgb(54, 162, 235)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgb(54, 162, 235)',
              pointRadius: 4,
            }
          ]
        };
      }
      
      // Trier l'historique par date (du plus récent au plus ancien)
      const sortedData = [...historyData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latest = sortedData[0];
      
      // Gérer le cas où les réponses ne sont pas disponibles
      if (!latest || !latest.answers || !Array.isArray(latest.answers) || latest.answers.length === 0) {
        return {
          labels: categories,
          datasets: [
            {
              label: 'Données indisponibles',
              data: Array(categories.length).fill(0),
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 2,
              pointBackgroundColor: 'rgb(54, 162, 235)',
              pointBorderColor: '#fff'
            }
          ]
        };
      }
      
      // S'assurer que nous avons 10 valeurs pour les 10 catégories
      const values = Array(categories.length).fill(0);
      
      // Transformer les réponses en valeurs de 1-5 (certaines questions sont inversées)
      latest.answers.forEach(answer => {
        const index = answer.questionId - 1; // Les IDs commencent à 1, les indices à 0
        if (index >= 0 && index < categories.length) {
          // Questions où 5 est négatif (1, 3, 5, 6, 8) - on inverse
          if ([1, 3, 5, 6, 8].includes(answer.questionId)) {
            values[index] = 6 - answer.answer; // Inversion 5→1, 4→2, etc.
          } else {
            values[index] = answer.answer;
          }
        }
      });
      
      return {
        labels: categories,
        datasets: [
          {
            label: 'Dernier questionnaire',
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 2,
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(54, 162, 235)',
            pointRadius: 4,
          }
        ]
      };
    } catch (error) {
      console.error("Erreur dans prepareLatestAnswersData:", error);
      // Retourner un jeu de données minimal en cas d'erreur
      return {
        labels: ["Erreur de données"],
        datasets: [{ label: 'Erreur', data: [0], backgroundColor: 'rgba(220, 53, 69, 0.2)', borderColor: 'rgb(220, 53, 69)' }]
      };
    }
  };

  // Données pour le graphique de distribution des scores avec meilleure gestion des erreurs
  const prepareScoreDistributionData = () => {
    try {
      // Catégories de score
      const categories = [
        'Excellent (≤15)',
        'Bon (16-25)',
        'Moyen (26-35)',
        'Préoccupant (36-45)',
        'Très préoccupant (>45)'
      ];
      
      // Si pas de données, retourner un jeu de données vide mais valide
      if (!historyData || historyData.length === 0) {
        return {
          labels: categories,
          datasets: [
            {
              label: 'Nombre de questionnaires',
              data: Array(categories.length).fill(0),
              backgroundColor: [
                'rgba(40, 167, 69, 0.7)',
                'rgba(23, 162, 184, 0.7)',
                'rgba(255, 193, 7, 0.7)',
                'rgba(255, 111, 0, 0.7)',
                'rgba(220, 53, 69, 0.7)',
              ],
              borderColor: [
                'rgb(40, 167, 69)',
                'rgb(23, 162, 184)',
                'rgb(255, 193, 7)',
                'rgb(255, 111, 0)',
                'rgb(220, 53, 69)',
              ],
              borderWidth: 1
            }
          ]
        };
      }
      
      // Compter les occurrences dans chaque catégorie
      const counts = [0, 0, 0, 0, 0];
      
      historyData.forEach(item => {
        if (item && typeof item.score === 'number') {
          const score = item.score;
          if (score <= 15) counts[0]++;
          else if (score <= 25) counts[1]++;
          else if (score <= 35) counts[2]++;
          else if (score <= 45) counts[3]++;
          else counts[4]++;
        }
      });
      
      return {
        labels: categories,
        datasets: [
          {
            label: 'Nombre de questionnaires',
            data: counts,
            backgroundColor: [
              'rgba(40, 167, 69, 0.7)',  // Vert (excellent)
              'rgba(23, 162, 184, 0.7)',  // Bleu (bon)
              'rgba(255, 193, 7, 0.7)',   // Jaune (moyen)
              'rgba(255, 111, 0, 0.7)',   // Orange (préoccupant)
              'rgba(220, 53, 69, 0.7)',   // Rouge (très préoccupant)
            ],
            borderColor: [
              'rgb(40, 167, 69)',
              'rgb(23, 162, 184)',
              'rgb(255, 193, 7)',
              'rgb(255, 111, 0)',
              'rgb(220, 53, 69)',
            ],
            borderWidth: 1
          }
        ]
      };
    } catch (error) {
      console.error("Erreur dans prepareScoreDistributionData:", error);
      // Retourner un jeu de données minimal en cas d'erreur
      return {
        labels: ['Erreur'],
        datasets: [{ label: 'Erreur', data: [0], backgroundColor: 'rgba(220, 53, 69, 0.7)', borderColor: 'rgb(220, 53, 69)' }]
      };
    }
  };

  // Options pour les graphiques
  const scoreEvolutionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        }
      },
      y: {
        min: 0,
        max: 50,
        ticks: {
          stepSize: 10
        }
      }
    }
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scale: {
      ticks: {
        beginAtZero: true,
        max: 5,
        min: 0,
        stepSize: 1
      }
    },
    plugins: {
      legend: {
        position: 'top',
      }
    }
  };

  const distributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      }
    }
  };

  if (historyLoading) {
    return (
      <Container className="text-center p-5">
        <Spinner color="primary" />
        <p className="mt-3">Chargement de l'historique des questionnaires...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Card>
          <CardBody className="text-center">
            <AlertTriangle size={50} className="text-danger mb-3" />
            <H4>Erreur</H4>
            <p>{error}</p>
            <Button color="primary" onClick={() => window.history.back()}>Retour</Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid className="pb-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Row className="justify-content-center">
          <Col xl="10">
            <Card className="overview-card">
              <CardHeader className="pb-0">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div>
                    <H4>Historique des Questionnaires</H4>
                    <P>Visualisez l'évolution de votre bien-être au fil du temps</P>
                  </div>
                  <div className="d-flex align-items-center">
                    {pointsData && (
                      <div className="me-3 pe-3 border-end">
                        <span className="d-block text-muted small">Points accumulés</span>
                        <div className="d-flex align-items-center">
                          <Award size={20} className="me-1 text-warning" />
                          <span className="h5 mb-0">{pointsData.points || 0}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="d-block text-muted small">Questionnaires complétés</span>
                      <div className="d-flex align-items-center">
                        <Activity size={20} className="me-1 text-info" />
                        <span className="h5 mb-0">{historyData.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Nav tabs className="card-header-tabs mt-4">
                  <NavItem>
                    <NavLink
                      className={activeTab === '1' ? 'active' : ''}
                      onClick={() => toggle('1')}
                    >
                      <TrendingUp size={16} className="me-1" /> Aperçu
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === '2' ? 'active' : ''}
                      onClick={() => toggle('2')}
                    >
                      <BarChart2 size={16} className="me-1" /> Statistiques
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === '3' ? 'active' : ''}
                      onClick={() => toggle('3')}
                    >
                      <FileText size={16} className="me-1" /> Historique complet
                    </NavLink>
                  </NavItem>
                </Nav>
              </CardHeader>
              
              <CardBody>
                <TabContent activeTab={activeTab}>
                  <TabPane tabId="1">
                    <Row>
                      <Col md="12">
                      <div className="mb-4 position-relative p-4 border rounded bg-light">
  <h5 className="mb-3 fw-bold" style={{ color: 'black' }}>Évolution de votre score de bien-être</h5>
  <div style={{ height: '300px' }}>
    {isChartDataValid(prepareScoreEvolutionData()) ? (
      <Line 
        data={prepareScoreEvolutionData()} 
        options={scoreEvolutionOptions} 
      />
    ) : (
      <div className="text-center py-5">
        <p className="text-muted">Aucune donnée d'évolution disponible</p>
      </div>
    )}
  </div>
</div>
                      </Col>

                      <Col md="6">
                        <div className="card h-100 border shadow-sm">
                          <div className="card-body">
                            <H5 className="mb-3">Votre profil actuel</H5>
                            <div style={{ height: '300px' }}>
                              {isChartDataValid(prepareLatestAnswersData()) ? (
                                <Radar 
                                  data={prepareLatestAnswersData()}
                                  options={radarOptions}
                                />
                              ) : (
                                <div className="text-center py-5">
                                  <p className="text-muted">Aucune donnée de profil disponible</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="card h-100 border shadow-sm">
                          <div className="card-body">
                            <H5 className="mb-3">Répartition de vos résultats</H5>
                            <div style={{ height: '300px' }}>
                              {isChartDataValid(prepareScoreDistributionData()) ? (
                                <Pie 
                                  data={prepareScoreDistributionData()}
                                  options={distributionOptions}
                                />
                              ) : (
                                <div className="text-center py-5">
                                  <p className="text-muted">Aucune donnée de répartition disponible</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Col>

                      {historyData && historyData.length > 0 && (
                        <Col md="12" className="mt-4">
                          <Card className="border shadow-sm">
                            <CardBody>
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <H5 className="mb-0">Résultat le plus récent</H5>
                                <Badge color={
                                  historyData[0].score <= 15 ? 'success' :
                                  historyData[0].score <= 25 ? 'info' :
                                  historyData[0].score <= 35 ? 'warning' : 'danger'
                                } pill>
                                  Score: {historyData[0].score}/50
                                </Badge>
                              </div>
                              
                              <p className="mb-3">
                                <strong>État émotionnel:</strong> {historyData[0].emotionalState}
                              </p>
                              
                              <H5 className="mb-2">Recommandations:</H5>
                              <ul className="ps-3">
                                {historyData[0].recommendations && historyData[0].recommendations.map((rec, index) => (
                                  <li key={index} className="mb-2">{rec}</li>
                                ))}
                              </ul>
                            </CardBody>
                          </Card>
                        </Col>
                      )}
                    </Row>
                  </TabPane>

                  <TabPane tabId="2">
                    {/* Contenu de l'onglet Statistiques */}
                    <Row className="g-4">
                      <Col lg="7">
                        <Card className="h-100 border">
                          <CardHeader className="bg-primary text-white">
                            <H5 className="mb-0">Évolution temporelle détaillée</H5>
                          </CardHeader>
                          <CardBody>
                            <div style={{ height: '400px' }}>
                              {isChartDataValid(prepareScoreEvolutionData()) ? (
                                <Line 
                                  data={prepareScoreEvolutionData()} 
                                  options={{
                                    ...scoreEvolutionOptions,
                                    plugins: {
                                      ...scoreEvolutionOptions.plugins,
                                      annotation: {
                                        annotations: {
                                          line1: {
                                            type: 'line',
                                            yMin: 35,
                                            yMax: 35,
                                            borderColor: 'rgba(255, 193, 7, 0.5)',
                                            borderWidth: 2,
                                            borderDash: [6, 6],
                                            label: {
                                              content: 'Seuil de préoccupation',
                                              enabled: true,
                                              position: 'end'
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }} 
                                />
                              ) : (
                                <div className="text-center py-5">
                                  <p className="text-muted">Aucune donnée d'évolution disponible</p>
                                </div>
                              )}
                            </div>
                          </CardBody>
                        </Card>
                      </Col>

                      <Col lg="5">
                        <Card className="border mb-4">
                          <CardHeader className="bg-primary text-white">
                            <H5 className="mb-0">Distribution des scores</H5>
                          </CardHeader>
                          <CardBody>
                            <div style={{ height: '220px' }}>
                              {isChartDataValid(prepareScoreDistributionData()) ? (
                                <Pie 
                                  data={prepareScoreDistributionData()}
                                  options={distributionOptions}
                                />
                              ) : (
                                <div className="text-center py-5">
                                  <p className="text-muted">Aucune donnée de répartition disponible</p>
                                </div>
                              )}
                            </div>
                          </CardBody>
                        </Card>

                        <Card className="border">
                          <CardHeader className="bg-primary text-white">
                            <H5 className="mb-0">Vos points d'équilibre</H5>
                          </CardHeader>
                          <CardBody>
                            <div style={{ height: '220px' }}>
                              {isChartDataValid(prepareLatestAnswersData()) ? (
                                <Radar 
                                  data={prepareLatestAnswersData()}
                                  options={radarOptions}
                                />
                              ) : (
                                <div className="text-center py-5">
                                  <p className="text-muted">Aucune donnée de profil disponible</p>
                                </div>
                              )}
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    </Row>
                  </TabPane>

                  <TabPane tabId="3">
                    {historyData.length === 0 ? (
                      <div className="text-center py-5">
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: '#f8f9fa',
                          margin: '0 auto 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Activity size={36} color="#6c757d" />
                        </div>
                        <H4 className="mb-2">Aucun historique disponible</H4>
                        <p className="text-muted">
                          Complétez votre premier questionnaire pour voir apparaître votre historique.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <div className="d-flex align-items-center">
                            <div className="me-3 d-flex align-items-center justify-content-center" style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #6157ff, #ee49fd)',
                            }}>
                              <Activity size={22} color="#fff" />
                            </div>
                            <div>
                              <H5 className="mb-0">Historique des questionnaires</H5>
                              <p className="text-muted small mb-0">{historyData.length} questionnaires complétés</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="history-list">
                          {[...historyData]
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map((item, index) => (
                              <motion.div
                                key={index}
                                className="p-4 mb-4"
                                style={{
                                  background: 'white',
                                  borderRadius: '15px',
                                  boxShadow: '0 5px 20px rgba(0, 0, 0, 0.05)'
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)' }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <div className="d-flex align-items-center">
                                    <div style={{
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: getScoreColor(item.score),
                                      marginRight: '10px'
                                    }}></div>
                                    <h5 className="mb-0">{format(new Date(item.createdAt), 'EEEE d MMMM yyyy', { locale: fr })}</h5>
                                  </div>
                                  <Badge 
                                    color={
                                      item.score <= 15 ? 'success' :
                                      item.score <= 25 ? 'info' :
                                      item.score <= 35 ? 'warning' : 'danger'
                                    }
                                    className="p-2"
                                  >
                                    Score: {item.score}/50
                                  </Badge>
                                </div>
                                
                                <div className="d-md-flex mb-3">
                                  <div className="mb-3 mb-md-0 me-md-4" style={{ flex: '1' }}>
                                    <p className="text-muted small mb-1">État émotionnel</p>
                                    <div className="p-2" style={{
                                      borderRadius: '8px',
                                      background: `linear-gradient(to right, ${getScoreColor(item.score)}10, ${getScoreColor(item.score)}20)`,
                                    }}>
                                      <span style={{ color: getScoreColor(item.score) }}>
                                        {item.emotionalState || "Non spécifié"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {item.recommendations && item.recommendations.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-muted small mb-2">Recommandations</p>
                                    <ul className="p-0 m-0" style={{ listStyle: 'none' }}>
                                      {item.recommendations.slice(0, 2).map((rec, idx) => (
                                        <li key={idx} className="mb-1 d-flex">
                                          <div className="me-2" style={{
                                            minWidth: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: getScoreColor(item.score) + '30',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}>
                                            <Info size={12} color={getScoreColor(item.score)} />
                                          </div>
                                          <span className="small">{rec}</span>
                                        </li>
                                      ))}
                                      {item.recommendations.length > 2 && (
                                        <li className="small text-muted">
                                          + {item.recommendations.length - 2} autres recommandations
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}
                  </TabPane>
                </TabContent>
              </CardBody>
            </Card>
            
            <div className="text-center mt-4">
              <Button color="primary" onClick={() => window.history.back()}>
                <ChevronRight size={16} className="me-2 rotate-180" /> Retour
              </Button>
            </div>
          </Col>
        </Row>
      </motion.div>
    </Container>
  );
};

export default QuestionnaireHistory;