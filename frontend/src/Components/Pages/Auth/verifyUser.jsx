import React, { useState } from 'react';
import { Link, useLocation,useNavigate } from 'react-router-dom';
import { Col, Container, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Btn, H4, P } from '../../../AbstractElements';
import { Verify } from '../../../Constant';
import axios from 'axios';

const VerifyCode = () => {
    const location = useLocation();
    const [code, setCode] = useState('');
    const [email, setEmail] = useState(location.state?.email || ''); // Récupérer l'email depuis state
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !code) {
            setMessage('L\'email et le code sont requis.');
            return;
        }
        try {
            const response = await axios.post('http://localhost:5000/verify-email', { email, code });
            setMessage(response.data);
            setTimeout(() => navigate(`${process.env.PUBLIC_URL}/login`), 3000);
        } catch (error) {
          setMessage(error.response?.data || 'Erreur lors de la requête');
        }
      };
    
    

    return (
        <section>
            <Container fluid={true} className="p-0">
                <Row className="m-0">
                    <Col className="p-0">
                        <div className="login-card">
                            <div className="login-main">
                                <Form className="theme-form login-form" onSubmit={handleSubmit}>
                                    <H4>Verify</H4>
                                    {message && <p>{message}</p>}
                                    <FormGroup>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Entrez votre email"
                      disabled={!!location.state?.email} // Désactiver si transmis depuis Register
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Enter Verification Code</Label>
                    <Input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Verification Code"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Btn attrBtn={{ color: 'primary', type: 'submit', className: 'w-100' }}>
                      Verify
                    </Btn>
                  </FormGroup>
                </Form>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default VerifyCode;