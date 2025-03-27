//// filepath: /C:/Users/Lenovo/Desktop/Pi2025/Front-pi-main/Front-pi-main/src/Components/Pages/Auth/ForgetPwd.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Col, Container, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Btn, H4, P, Image } from '../../../AbstractElements';
import imgg from '../../../assets/images/login/login_bg.png';
import { Send, ResetYourPassword } from '../../../Constant';
import { dynamicImage } from '../../../Services';
import swal from 'sweetalert';

const ForgetPwd = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/forgot-password', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'OTP');
      }
      await swal("Succès", "OTP envoyé par email.\nValide pendant 10 minutes", "success");
      // Redirection vers la page de vérification OTP en passant l'email

      navigate(`${process.env.PUBLIC_URL}/authentication/verify-otp`, { state: { email } });
    } catch (error) {
      console.error(error);
      swal("Erreur", "L'envoi de l'email a échoué", "error");
    }
  };

  return (
    <section>
      <Container fluid={true} className="p-0">
        <Row className="m-0">
          <Col xl="12 p-0">
            <div className="login-card" style={{ backgroundImage: `url(${imgg})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div>
                <Link className="logo" to={`${process.env.PUBLIC_URL}/dashboard/default`}>
                  <Image attrImage={{ className: 'img-fluid', src: dynamicImage('logo/logo2.png'), alt: '' }} />
                </Link>
              </div>
              <div className='login-main'>
                <Form className="theme-form login-form" onSubmit={handleSubmit}>
                  <H4 attrH4={{ className: 'mb-3' }}>{ResetYourPassword}</H4>
                  <FormGroup>
                    <Label>Email Address</Label>
                    <Input 
                      type="email" 
                      required 
                      placeholder="Enter your email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </FormGroup>
                  <FormGroup className='text-end'>
                    <Btn attrBtn={{ color: 'primary', type: 'submit', className: 'w-100' }} >{Send}</Btn>
                  </FormGroup>
                  <P attrPara={{ className: 'text-center mt-4 mb-0' }}>
                    Remember your password?
                    <Link className="ps-2" to={`${process.env.PUBLIC_URL}/login`}>Sign In</Link>
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

export default ForgetPwd;