import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, CardBody, Button } from 'reactstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { H1, H3, P } from '../../AbstractElements';
import BlogAdmin from '../Tables/Reactstrap/BasicTable/BlogAdmin';

const AdminOnly = () => {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setIsAdmin(response.data.Role && response.data.Role.includes('admin'));
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  if (loading) {
    return (
      <Container fluid className="p-5 text-center">
        <H3>Chargement...</H3>
      </Container>
    );
  }

  // If user is admin, render the BlogAdmin component directly
  if (isAdmin) {
    return <BlogAdmin />;
  }

  // If not admin, show access denied message
  return (
    <Container fluid className="p-5">
      <Row className="justify-content-center">
        <Col md="8" lg="6">
          <Card className="text-center">
            <CardBody className="p-5">
              <div className="error-icon mb-4">
                <i className="fa fa-lock" style={{ fontSize: '5rem', color: '#d63031' }}></i>
              </div>
              <H1 attrH1={{ className: 'mb-4' }}>Accès Réservé</H1>
              <H3 attrH3={{ className: 'mb-4 text-muted' }}>Cette page est réservée aux administrateurs</H3>
              <P attrPara={{ className: 'mb-4' }}>
                Vous devez disposer des privilèges d'administrateur pour accéder à cette section.
                Si vous pensez que cette restriction est une erreur, veuillez contacter l'administrateur système.
              </P>
              <Button tag={Link} to="/dashboard/default" color="primary" size="lg" className="mt-3">
                Retour au Tableau de Bord
              </Button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminOnly;