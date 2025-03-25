//// filepath: /C:/Users/Lenovo/Desktop/Pi2025/Front-pi-main/Front-pi-main/src/Components/Pages/Auth/CreatePwd.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Col, Container, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Btn, H4, P, Image } from '../../../AbstractElements';
import imgg from '../../../assets/images/login/login_bg.png';
import { dynamicImage } from '../../../Services';
import swal from 'sweetalert';

const CreatePwd = () => {
  const { state } = useLocation();
  const email = state?.email || '';
  const otp = state?.otp || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return swal("Erreur", "Les mots de passe ne correspondent pas", "error");
    }
    try {
      const response = await fetch('http://localhost:5000/api/reset-password', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword: password
        })
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la réinitialisation du mot de passe');
      }
      await swal("Succès", "Mot de passe réinitialisé avec succès", "success");
    //  navigate(`${process.env.PUBLIC_URL}/login`);
      navigate(`${process.env.PUBLIC_URL}/authentication/login-simple`);

    } catch (error) {
      console.error(error);
      swal("Erreur", error.message || "La réinitialisation a échoué", "error");
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
                  <H4 attrH4={{ className: 'mb-3' }}>Reset Your Password</H4>
                  <FormGroup className='position-relative pass-hide'>
                    <Label>NewPassword</Label>
                    <Input 
                      type="password" 
                      required 
                      placeholder="*********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup className='position-relative pass-hide'>
                    <Label>RetypePassword</Label>
                    <Input 
                      type="password" 
                      required 
                      placeholder="*********"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Btn attrBtn={{ color: 'primary', type: 'submit', className: 'w-100' }}>Done</Btn>
                  </FormGroup>
                  <P attrPara={{ className: 'text-center mt-4 mb-0' }}>
                    Don't have account?
                    <Link className="ps-2" to={`${process.env.PUBLIC_URL}/authentication/register-simpleimg`}>
                      CreateAccount
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

export default CreatePwd;