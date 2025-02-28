import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Col, Container, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Btn, H4, P } from '../../../AbstractElements';
import { Verify } from '../../../Constant';
import axios from 'axios';

const VerifyCode = () => {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Assurez-vous d'envoyer le bon email pour l'utilisateur connecté, par exemple récupéré via context ou props
        const email = "utilisateur@example.com"; // Changez cette ligne pour obtenir l'email de l'utilisateur connecté

        try {
            const response = await axios.post('http://localhost:5000/verify-email', { email, code });
            setMessage(response.data);
        } catch (error) {
            setMessage(error.response.data);
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
                                    <H4>{Verify}</H4>
                                    {message && <p>{message}</p>}
                                    <FormGroup className='form-group position-relative'>
                                        <Label className="col-form-label">Enter Verification Code</Label>
                                        <Input
                                            type="text"
                                            name="code"
                                            required
                                            placeholder="Verification Code"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Btn attrBtn={{ color: 'primary', type: 'submit', className: 'w-100' }}>
                                            Verify
                                        </Btn>
                                    </FormGroup>
                                    <P attrPara={{ className: 'text-center mt-4 mb-0' }}>
                                        Already verified?
                                        <Link className='ms-2' to={`${process.env.PUBLIC_URL}/login`}>
                                            Sign In
                                        </Link>
                                    </P>
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
