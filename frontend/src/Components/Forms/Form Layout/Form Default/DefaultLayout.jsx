import React, { Fragment, useState } from 'react';
import { Input, Label, FormGroup, Form, CardBody, CardFooter, Col, Row } from 'reactstrap';
import axios from 'axios';
import { Btn, H5 } from '../../../../AbstractElements';
import { Bar, Doughnut } from 'react-chartjs-2'; // Importer les composants de graphiques
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const DefaultLayout = () => {
  const [formData, setFormData] = useState({
    nomEtudiant: '',
    classe: '',
    matiere: '',
    dateEvaluation: '',
    engagement: '',
    concentration: 1,
    interaction: '',
    reactionCorrection: '',
    gestionStress: '',
    presence: '',
    expressionEmotionnelle: '',
    participationOrale: '',
    difficultes: '',
    pointsPositifs: '',
    axesAmelioration: '',
    suiviRecommande: false,
  });

  const [stats, setStats] = useState(null);
  const [searchStudent, setSearchStudent] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/evaluation', formData);
      alert('Évaluation ajoutée avec succès');
      setFormData({
        nomEtudiant: '',
        classe: '',
        matiere: '',
        dateEvaluation: '',
        engagement: '',
        concentration: 1,
        interaction: '',
        reactionCorrection: '',
        gestionStress: '',
        presence: '',
        expressionEmotionnelle: '',
        participationOrale: '',
        difficultes: '',
        pointsPositifs: '',
        axesAmelioration: '',
        suiviRecommande: false,
      });
    } catch (error) {
      console.error('Erreur :', error.response?.data || error.message);
      alert('Erreur lors de l\'envoi');
    }
  };

  const fetchStats = async () => {
    if (!searchStudent) {
      alert('Veuillez entrer un nom d’étudiant');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/statistiques/${searchStudent}`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des stats :', error);
      setStats(null);
      alert('Aucune statistique trouvée ou erreur serveur');
    }
  };

  // Préparer les données pour les graphiques
  const prepareChartData = (field) => {
    if (!stats || !stats[field]) return null;
    const labels = Object.keys(stats[field]);
    const data = Object.values(stats[field]).map(val => parseFloat(val.replace('%', '')));
    return {
      labels,
      datasets: [
        {
          label: field.charAt(0).toUpperCase() + field.slice(1),
          data,
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true },
    },
  };

  return (
    <Fragment>
      <Row>
        {/* Formulaire à gauche */}
        <Col md="6">
          <CardBody>
            <H5>Formulaire d'évaluation</H5>
            <Form className="theme-form" onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Nom de l'étudiant</Label>
                <Input type="text" name="nomEtudiant" value={formData.nomEtudiant} onChange={handleChange} required />
              </FormGroup>
              <FormGroup>
                <Label>Classe</Label>
                <Input type="text" name="classe" value={formData.classe} onChange={handleChange} required />
              </FormGroup>
              <FormGroup>
                <Label>Matière</Label>
                <Input type="text" name="matiere" value={formData.matiere} onChange={handleChange} required />
              </FormGroup>
              <FormGroup>
                <Label>Date de l'évaluation</Label>
                <Input type="date" name="dateEvaluation" value={formData.dateEvaluation} onChange={handleChange} required />
              </FormGroup>
              <FormGroup>
                <Label>Engagement</Label>
                <Input type="select" name="engagement" value={formData.engagement} onChange={handleChange} required>
                  <option value="">Sélectionnez</option>
                  <option value="Très impliqué">Très impliqué</option>
                  <option value="Moyennement impliqué">Moyennement impliqué</option>
                  <option value="Peu impliqué">Peu impliqué</option>
                  <option value="Pas du tout impliqué">Pas du tout impliqué</option>
                </Input>
              </FormGroup>
              <FormGroup>
                <Label>Concentration (1 à 5)</Label>
                <Input type="number" name="concentration" value={formData.concentration} onChange={handleChange} min="1" max="5" required />
              </FormGroup>
              <FormGroup>
                <Label>Interaction</Label>
                <Input type="select" name="interaction" value={formData.interaction} onChange={handleChange} required>
                  <option value="">Sélectionnez</option>
                  <option value="Positives">Positives</option>
                  <option value="Neutres">Neutres</option>
                  <option value="Négatives">Négatives</option>
                </Input>
              </FormGroup>
              <FormGroup>
                <Label>Réaction à la correction</Label>
                <Input type="select" name="reactionCorrection" value={formData.reactionCorrection} onChange={handleChange} required>
                  <option value="">Sélectionnez</option>
                  <option value="Accepte bien">Accepte bien</option>
                  <option value="Résiste légèrement">Résiste légèrement</option>
                  <option value="Résiste fortement">Résiste fortement</option>
                </Input>
              </FormGroup>
              <FormGroup>
                <Label>Gestion du stress</Label>
                <Input type="select" name="gestionStress" value={formData.gestionStress} onChange={handleChange} required>
                  <option value="">Sélectionnez</option>
                  <option value="Calme">Calme</option>
                  <option value="Anxieux">Anxieux</option>
                  <option value="Très stressé">Très stressé</option>
                </Input>
              </FormGroup>
              <FormGroup>
                <Label>Présence</Label>
                <Input type="select" name="presence" value={formData.presence} onChange={handleChange} required>
                  <option value="">Sélectionnez</option>
                  <option value="Toujours à l’heure">Toujours à l’heure</option>
                  <option value="Souvent en retard">Souvent en retard</option>
                  <option value="Absences fréquentes">Absences fréquentes</option>
                </Input>
              </FormGroup>
              <FormGroup>
                <Label>Suivi recommandé</Label>
                <Input type="checkbox" name="suiviRecommande" checked={formData.suiviRecommande} onChange={handleChange} />
              </FormGroup>
              <CardFooter>
                <Btn attrBtn={{ color: 'primary', type: 'submit' }}>Soumettre</Btn>
                <Btn attrBtn={{ color: 'secondary' }} onClick={() => setFormData({
                  nomEtudiant: '',
                  classe: '',
                  matiere: '',
                  dateEvaluation: '',
                  engagement: '',
                  concentration: 1,
                  interaction: '',
                  reactionCorrection: '',
                  gestionStress: '',
                  presence: '',
                  expressionEmotionnelle: '',
                  participationOrale: '',
                  difficultes: '',
                  pointsPositifs: '',
                  axesAmelioration: '',
                  suiviRecommande: false,
                })}>
                  Réinitialiser
                </Btn>
              </CardFooter>
            </Form>
          </CardBody>
        </Col>

        {/* Statistiques à droite avec graphiques */}
        <Col md="6">
          <CardBody>
            <H5>Statistiques par étudiant</H5>
            <FormGroup>
              <Label>Rechercher un étudiant</Label>
              <Input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Entrez le nom de l'étudiant"
              />
            </FormGroup>
            <Btn attrBtn={{ color: 'primary', onClick: fetchStats }}>Rechercher</Btn>

            {stats && (
              <div className="mt-3">
                <h6>Résultats pour {searchStudent}</h6>
                <p><strong>Total des évaluations :</strong> {stats.totalEvaluations}</p>
                <p><strong>Moyenne de concentration :</strong> {stats.moyenneConcentration.toFixed(2)}/5</p>
                <p><strong>Pourcentage suivi recommandé :</strong> {stats.suiviRecommande.toFixed(2)}%</p>

                {/* Graphique en barres pour Engagement */}
                <div className="mt-3">
                  <h6>Engagement</h6>
                  <Bar data={prepareChartData('engagement')} options={{ ...chartOptions, plugins: { title: { text: 'Engagement' } } }} />
                </div>

                {/* Graphique en donut pour Interaction */}
                <div className="mt-3">
                  <h6>Interaction</h6>
                  <Doughnut data={prepareChartData('interaction')} options={{ ...chartOptions, plugins: { title: { text: 'Interaction' } } }} />
                </div>

                {/* Graphique en barres pour Réaction à la correction */}
                <div className="mt-3">
                  <h6>Réaction à la correction</h6>
                  <Bar data={prepareChartData('reactionCorrection')} options={{ ...chartOptions, plugins: { title: { text: 'Réaction à la correction' } } }} />
                </div>

                {/* Graphique en donut pour Gestion du stress */}
                <div className="mt-3">
                  <h6>Gestion du stress</h6>
                  <Doughnut data={prepareChartData('gestionStress')} options={{ ...chartOptions, plugins: { title: { text: 'Gestion du stress' } } }} />
                </div>

                {/* Graphique en barres pour Présence */}
                <div className="mt-3">
                  <h6>Présence</h6>
                  <Bar data={prepareChartData('presence')} options={{ ...chartOptions, plugins: { title: { text: 'Présence' } } }} />
                </div>
              </div>
            )}
          </CardBody>
        </Col>
      </Row>
    </Fragment>
  );
};

export default DefaultLayout;