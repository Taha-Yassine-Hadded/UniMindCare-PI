import React, { useEffect, useState, useRef } from 'react';
import { Row, Col, Card, CardHeader, CardBody, CardFooter, FormGroup, Label, Input, Button } from 'reactstrap';
//import { storage } from '../../../firebase';
//import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import swal from 'sweetalert';
import { useOutletContext } from 'react-router-dom';

const authHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.warn('Aucun token d\'authentification trouvé!');
    return { 'Content-Type': 'application/json' };
  }
  console.log('Token utilisé:', token.substring(0, 20) + '...');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Auth-FaceID': 'true',
  };
};

const EditMyProfile = () => {
  const { userData } = useOutletContext() || {};
  const [qrCodeUrl, setQrCodeUrl] = useState(null); // État pour le QR code
  const [twoFactorCode, setTwoFactorCode] = useState(''); // Code saisi par l'utilisateur
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false); // Statut 2FA
  //const fileInputRef = useRef(null);

  const storedUser = JSON.parse(localStorage.getItem('user')) || userData;
  //const identifiant = storedUser?.Identifiant || storedUser?.identifiant;

  useEffect(() => {
    // Synchronisation du token entre localStorage et sessionStorage
    const syncAuthState = () => {
      const localToken = localStorage.getItem('token');
      const sessionToken = sessionStorage.getItem('token');

      console.log('Vérifiant l\'état de connexion:');
      console.log('- Token dans localStorage:', localToken ? 'présent' : 'absent');
      console.log('- Token dans sessionStorage:', sessionToken ? 'présent' : 'absent');

      if (sessionToken && !localToken) {
        localStorage.setItem('token', sessionToken);
        console.log('Token synchronisé depuis sessionStorage vers localStorage');
      } else if (localToken && !sessionToken) {
        sessionStorage.setItem('token', localToken);
        console.log('Token synchronisé depuis localStorage vers sessionStorage');
      }

      if (!localToken && !sessionToken) {
        console.log('Aucun token disponible, l\'utilisateur doit se reconnecter');
        return false;
      }

      return true;
    };

    const isLoggedIn = syncAuthState();

    if (!isLoggedIn) {
      swal('Session expirée', 'Veuillez vous reconnecter', 'warning').then(() => {
        window.location.href = '/login';
      });
    }

    // Charger le statut 2FA
    if (storedUser) {
      setTwoFactorEnabled(storedUser.twoFactorEnabled || false);
      console.log('Données chargées dans EditMyProfile:', storedUser);
    }
  }, [storedUser]);

  // Générer le QR code pour 2FA
  const handleGenerate2FA = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('Tentative d\'activation 2FA sans token');
        swal('Erreur', 'Votre session semble avoir expiré. Veuillez vous reconnecter.', 'error');
        return;
      }

      console.log('Token utilisé pour l\'activation 2FA:', token.substring(0, 20) + '...');

      const response = await fetch('http://localhost:5000/api/users/generate-2fa', {
        method: 'GET',
        headers: authHeader(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur HTTP lors de la génération 2FA:', response.status, errorText);
        throw new Error(`Erreur lors de la génération du QR code (${response.status})`);
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
    } catch (error) {
      console.error('Erreur génération 2FA :', error);
      swal('Erreur', 'Échec de la génération du QR code: ' + error.message, 'error');
    }
  };

  // Activer le 2FA après scan et saisie du code
  const handleEnable2FA = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('Tentative de validation 2FA sans token');
        swal('Erreur', 'Votre session semble avoir expiré. Veuillez vous reconnecter.', 'error');
        return;
      }

      if (!twoFactorCode || twoFactorCode.trim() === '') {
        swal('Erreur', 'Veuillez entrer un code de vérification', 'error');
        return;
      }

      console.log('Token utilisé pour la validation 2FA:', token.substring(0, 20) + '...');
      console.log('Code 2FA soumis:', twoFactorCode);

      const response = await fetch('http://localhost:5000/api/users/enable-2fa', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ code: twoFactorCode }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur HTTP lors de l\'activation 2FA:', response.status, errorText);
        throw new Error(`Erreur lors de l\'activation du 2FA (${response.status})`);
      }

      const data = await response.json();
      setTwoFactorEnabled(true);
      setQrCodeUrl(null); // Cacher le QR code
      setTwoFactorCode(''); // Réinitialiser le champ

      const updatedUser = { ...storedUser, twoFactorEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      swal('Succès', '2FA activé avec succès', 'success');
    } catch (error) {
      console.error('Erreur activation 2FA :', error);
      swal('Erreur', 'Échec de l\'activation du 2FA: ' + error.message, 'error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <h4>Two-Factor Authentication</h4>
      </CardHeader>
      <CardBody>
        <Row>
          <Col md="12" className="mt-3">
            <FormGroup>
              <Label>Authentification à deux facteurs (2FA)</Label>
              {twoFactorEnabled ? (
                <p style={{ color: 'green' }}>2FA est activé</p>
              ) : (
                <>
                  <Button color="secondary" onClick={handleGenerate2FA} disabled={qrCodeUrl}>
                    Activer 2FA
                  </Button>
                  {qrCodeUrl && (
                    <div className="mt-3">
                      <p>Scannez ce QR code avec une application d'authentification (ex. Google Authenticator) :</p>
                      <img src={qrCodeUrl} alt="QR Code 2FA" style={{ maxWidth: '200px' }} />
                      <FormGroup className="mt-2">
                        <Label>Entrez le code 2FA</Label>
                        <Input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          placeholder="Code à 6 chiffres"
                        />
                      </FormGroup>
                      <Button color="primary" onClick={handleEnable2FA} className="mt-2">
                        Valider et activer 2FA
                      </Button>
                    </div>
                  )}
                </>
              )}
            </FormGroup>
          </Col>
        </Row>
      </CardBody>
      <CardFooter className="text-end">
        {/* Optional: Keep a button for navigation or other actions if needed */}
      </CardFooter>
    </Card>
  );
};

export default EditMyProfile;