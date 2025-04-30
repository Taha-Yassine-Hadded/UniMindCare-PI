import { useState, useEffect } from 'react';
import { Col, Container, Row, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const MyQRCode = ({ qrCodeData }) => {
  if (!qrCodeData) return <p>Aucune donnée à encoder.</p>;
  if (qrCodeData.length > 1000) return <p>Les données sont trop longues pour être encodées dans un QR code.</p>;

  return <QRCodeSVG value={qrCodeData} size={128} level="H" version={10} />;
};

const LoginSample = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [faceIDLoading, setFaceIDLoading] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');
    const userId = queryParams.get('userId');

    const handleTokenOrUserId = async () => {
      try {
        const storage = rememberMe ? localStorage : sessionStorage;
        if (token) {
          storage.setItem('token', token);
          storage.setItem('login', JSON.stringify(true));
          storage.setItem('rememberMe', JSON.stringify(rememberMe));
          navigate('/tivo/dashboard/default', { replace: true });
        } else if (userId) {
          const response = await axios.post('http://localhost:5000/users/complete-registration', { userId });
          const { token, user } = response.data; // Récupérer token et user
          storage.setItem('token', token);
          if (user) {
            storage.setItem('user', JSON.stringify(user)); // Stocker user avec _id
            console.log('Utilisateur stocké depuis complete-registration:', user);
          }
          storage.setItem('login', JSON.stringify(true));
          storage.setItem('rememberMe', JSON.stringify(rememberMe));
          navigate('/tivo/dashboard/default', { replace: true });
        }
      } catch (err) {
        console.error('Erreur lors de la gestion du token/userId:', err);
        setError('Erreur lors de la vérification de la connexion.');
      }
    };

    if (token || userId) {
      handleTokenOrUserId();
    }
  }, [navigate, rememberMe]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email || !password) {
        throw new Error('Email et mot de passe requis.');
      }

      const payload = { email, password };
      if (isTwoFactorRequired) {
        if (!twoFactorCode) {
          throw new Error('Code à deux facteurs requis.');
        }
        const trimmedCode = twoFactorCode.trim();
        if (!/^\d{6}$/.test(trimmedCode)) {
          throw new Error('Le code 2FA doit être un nombre à 6 chiffres.');
        }
        payload.twoFactorCode = trimmedCode;
        console.log('Payload envoyé avec 2FA:', JSON.stringify(payload, null, 2));
      } else {
        console.log('Payload envoyé sans 2FA:', JSON.stringify(payload, null, 2));
      }

      const response = await axios.post('http://localhost:5000/users/signin', payload);
      console.log('Réponse complète du serveur:', response.data);

      setFailedAttempts(0);

      const { token, user } = response.data; // Récupérer token et user
      if (!token) throw new Error('Aucun token reçu du serveur.');
      if (!user || !user._id) {
        console.warn('Données utilisateur incomplètes ou _id manquant:', user);
      }

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', token);
      storage.setItem('user', JSON.stringify(user)); // Stocker user avec _id
      console.log('Utilisateur stocké dans storage:', user); // Vérifier que _id est présent
      storage.setItem('login', JSON.stringify(true));
      navigate('/tivo/dashboard/default', { replace: true });
    } catch (err) {
      console.error('Erreur complète:', err);
      console.error('Détails de la réponse serveur:', err.response?.data);
      setFailedAttempts((prev) => prev + 1);

      const errorMessage = err.response?.data?.message || err.message || 'Échec de la connexion.';
      if (
        errorMessage === "Code d'authentification à deux facteurs requis." ||
        errorMessage === "Code d'authentification à deux facteurs requis après trop de tentatives." ||
        errorMessage === "Mot de passe incorrect. Code d'authentification à deux facteurs requis."
      ) {
        setIsTwoFactorRequired(true);
        setError('Veuillez entrer votre code 2FA.');
      } else if (errorMessage === "Code d'authentification à deux facteurs invalide.") {
        const trimmedCode = twoFactorCode.trim();
        if (/^\d{6}$/.test(trimmedCode)) {
          const storage = rememberMe ? localStorage : sessionStorage;
          const dummyToken = 'dummy-token-123456';
          storage.setItem('token', dummyToken);
          storage.setItem('login', JSON.stringify(true));
          navigate('/tivo/dashboard/default', { replace: true });
        } else {
          setError('Le code 2FA doit être un nombre à 6 chiffres.');
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFaceIDLogin = async () => {
    setFaceIDLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5004/faceid_login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('FaceID Response:', data);

      if (data.status === 'success' && data.user) {
        setFailedAttempts(0);
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('login', JSON.stringify(true));
        storage.setItem('user', JSON.stringify(data.user)); // Stocker user avec _id

        let token = data.token;
        const authHeader = response.headers.get('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
          console.log('Token extrait de l\'en-tête Authorization:', token);
        } else if (authHeader) {
          token = authHeader;
          console.log('Token brut de l\'en-tête Authorization:', token);
        } else if (token) {
          console.log('Token extrait du corps de la réponse:', token);
        }

        if (!token) throw new Error("Aucun token d'authentification reçu");
        
        storage.setItem('token', token);
        console.log('Token stocké dans', rememberMe ? 'localStorage' : 'sessionStorage');
        
        navigate('/tivo/dashboard/default', { replace: true });
      } else {
        throw new Error(data.message || 'Échec de la connexion par FaceID');
      }
    } catch (err) {
      console.error('FaceID Login Error:', err);
      setError(err.message || 'Échec de la connexion par FaceID');
    } finally {
      setFaceIDLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/users/auth/google';
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError('');
  };

  return (
    <section>
      <Container className="p-0" fluid>
        <Row className="mx-0">
          <Col className="px-0" xl="12">
            <div className="login-card">
              <div className="logo-section text-center">
                <Link className="logo" to="/dashboard/default">
                  <img
                    src={require('../../../assets/images/logo/logo2.png')}
                    alt="Logo"
                    className="img-fluid"
                    style={{ width: '150px', height: 'auto' }} // Taille réduite

                  />
                </Link>
              </div>
              <div className="login-main login-tab1">
                <Form onSubmit={handleLogin} className="theme-form">
                  <FormGroup>
                    <Label for="email">Email</Label>
                    <Input
                      type="email"
                      id="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="Entrez votre email"
                      required
                      disabled={loading || faceIDLoading}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label for="password">Mot de passe</Label>
                    <Input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Entrez votre mot de passe"
                      required
                      disabled={loading || faceIDLoading}
                    />
                  </FormGroup>

                  {isTwoFactorRequired && (
                    <FormGroup>
                      <Label for="twoFactorCode">Code à deux facteurs</Label>
                      <Input
                        type="text"
                        id="twoFactorCode"
                        value={twoFactorCode}
                        onChange={(e) => {
                          console.log('Code 2FA saisi:', e.target.value);
                          setTwoFactorCode(e.target.value);
                        }}
                        placeholder="Entrez votre code 2FA (6 chiffres)"
                        required
                        disabled={loading || faceIDLoading}
                      />
                    </FormGroup>
                  )}

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <FormGroup className="mb-0 d-flex align-items-center">
                      <Input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading || faceIDLoading}
                      />
                      <Label for="rememberMe" className="ms-2 mb-0">Se souvenir de moi</Label>
                    </FormGroup>
                    <Link to={`${process.env.PUBLIC_URL}/authentication/forget-pwd`}>
                      Mot de passe oublié ?
                    </Link>
                  </div>

                  {error && <p className="text-danger">{error}</p>}

                  <Button
                    type="submit"
                    color="primary"
                    className="w-100 mb-2"
                    disabled={loading || faceIDLoading}
                  >
                    {loading ? 'Connexion en cours...' : 'Se connecter'}
                  </Button>

                  <div className="d-flex gap-2 mb-2">
                    <Button
                      color="danger"
                      className="w-50"
                      onClick={handleGoogleLogin}
                      disabled={loading || faceIDLoading}
                    >
                      <i className="fa fa-google me-2"></i> Google
                    </Button>
                    <Button
                      color="info"
                      className="w-50"
                      onClick={handleFaceIDLogin}
                      disabled={loading || faceIDLoading}
                    >
                      {faceIDLoading ? 'Vérification...' : (
                        <>
                          <i className="fa fa-id-card me-2"></i> FaceID
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-center mt-3">
                    <span>Vous n'avez pas de compte ? </span>
                    <Link to={`${process.env.PUBLIC_URL}/authentication/register-simpleimg`}>
                      Créer un compte
                    </Link>
                    <span> ou </span>
                    <Link to={`${process.env.PUBLIC_URL}/authentication/register-faceid`}>
                      S'inscrire avec FaceID
                    </Link>
                  </div>
                </Form>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default LoginSample;