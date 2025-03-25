// src/Components/Pages/Stats/UserStatistics.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardTitle, Row, Col } from 'reactstrap';
import { Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';

const UserStatistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/api/usersStat/statistics')
      .then(response => {
        setStats(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erreur lors de la récupération des statistiques:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (!stats) return <p>Erreur lors du chargement des statistiques</p>;

  // Préparer les données pour le graphique en barres (répartition par rôle)
  const roleLabels = stats.roleStats.map(item => item._id || 'Non défini');
  const roleCounts = stats.roleStats.map(item => item.count);
  const roleBarData = {
    labels: roleLabels,
    datasets: [
      {
        label: 'Utilisateurs par rôle',
        data: roleCounts,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      }
    ]
  };

  // Préparer les données pour le graphique doughnut (répartition par classe)
  const classLabels = stats.classStats.map(item => item._id || 'Non défini');
  const classCounts = stats.classStats.map(item => item.count);
  const classDoughnutData = {
    labels: classLabels,
    datasets: [
      {
        data: classCounts,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
      }
    ]
  };

  return (
    <div>
      <Row>
        {/* Carte Total Utilisateurs */}
        <Col md="4">
          <Card>
            <CardBody>
              <CardTitle tag="h5">Nombre total d'utilisateurs</CardTitle>
              <h2>{stats.totalUsers}</h2>
            </CardBody>
          </Card>
        </Col>
        {/* Graphique en Barres pour la répartition par rôle */}
        <Col md="8">
          <Card>
            <CardBody>
              <CardTitle tag="h5">Répartition par rôle</CardTitle>
              <Bar data={roleBarData} options={{ maintainAspectRatio: true }} />
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row className="mt-4">
        {/* Graphique Doughnut pour la répartition par classe */}
        <Col md="6">
          <Card>
            <CardBody>
              <CardTitle tag="h5">Répartition par classe</CardTitle>
              <div style={{ position: 'relative', height: '300px' }}>
                <Doughnut data={classDoughnutData} options={{ maintainAspectRatio: false }} />
              </div>
            </CardBody>
          </Card>
        </Col>
        {/* Vous pouvez ajouter d'autres composants statistiques ici */}
      </Row>
    </div>
  );
};

export default UserStatistics;
