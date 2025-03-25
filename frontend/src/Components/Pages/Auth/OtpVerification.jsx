//// filepath: /C:/Users/Lenovo/Desktop/Pi2025/Front-pi-main/Front-pi-main/src/Components/Pages/Auth/OtpVerification.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Col, Container, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Btn, H4, P, Image } from '../../../AbstractElements';
import imgg from '../../../assets/images/login/login_bg.png';
import swal from 'sweetalert';

const OtpVerification = () => {
  const { state } = useLocation();
  const email = state?.email || '';
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/verify-otp', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      if (!response.ok) {
        throw new Error('OTP invalide ou expiré');
      }
      await swal("Succès", "OTP valide", "success");
      // Rediriger vers la page de réinitialisation du mot de passe en passant email et otp

      navigate(`${process.env.PUBLIC_URL}/authentication/create-pwd`, { state: { email  ,otp} });


    } catch (error) {
      console.error(error);
      swal("Erreur", error.message || "OTP invalide ou expiré", "error");
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
                  <Image attrImage={{ className: 'img-fluid', src: require('../../../assets/images/logo/logo2.png'), alt: '' }} />
                </Link>
              </div>
              <div className='login-main'>
                <Form className="theme-form login-form" onSubmit={handleSubmit}>
                  <H4 attrH4={{ className: 'mb-3' }}>OTP Verification</H4>
                  <FormGroup>
                    <Label>EnterOTP</Label>
                    <Input 
                      type="text"
                      required 
                      placeholder="Enter OTP" 
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup className='text-end'>
                    <Btn attrBtn={{ color: 'primary', type: 'submit', className: 'w-100' }} >Verify OTP</Btn>
                  </FormGroup>
                  <P attrPara={{ className: 'text-center mt-4 mb-0' }}>
                    <Link to={`${process.env.PUBLIC_URL}/authentication/forget-pwd`}>Resend OTP</Link>
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

export default OtpVerification;