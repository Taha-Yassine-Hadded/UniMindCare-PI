import React, { useEffect, useState, useRef } from 'react';
<<<<<<< HEAD
import { useForm } from 'react-hook-form';
import { Row, Col, Card, CardHeader, CardBody, CardFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
=======
import { Row, Col, Card, CardHeader, CardBody, CardFooter, FormGroup, Label, Input, Button } from 'reactstrap';
//import { storage } from '../../../firebase';
//import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
>>>>>>> full-Integration
import swal from 'sweetalert';
import { useOutletContext } from 'react-router-dom';

const authHeader = () => {
<<<<<<< HEAD
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
=======
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
>>>>>>> full-Integration
};

const EditMyProfile = () => {
  const { userData } = useOutletContext() || {};
<<<<<<< HEAD
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [profileImage, setProfileImage] = useState('/defaultProfile.png');
  const [uploading, setUploading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null); // État pour le QR code
  const [twoFactorCode, setTwoFactorCode] = useState(''); // Code saisi par l'utilisateur
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false); // Statut 2FA
  const fileInputRef = useRef(null);

  const storedUser = JSON.parse(localStorage.getItem('user')) || userData;
  const identifiant = storedUser?.Identifiant || storedUser?.identifiant;

  useEffect(() => {
    if (storedUser) {
      setValue('Name', storedUser.Name || '');
      setValue('Email', storedUser.Email || '');
      setValue('Classe', storedUser.Classe || '');
      setValue('Role', storedUser.Role || '');
      setValue('PhoneNumber', storedUser.PhoneNumber || '');
      setProfileImage(storedUser.imageUrl || '/defaultProfile.png');
      setTwoFactorEnabled(storedUser.twoFactorEnabled || false); // Charger le statut 2FA
      console.log("Données chargées dans EditMyProfile:", storedUser);
    }
  }, [storedUser, setValue]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !identifiant) return;
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${identifiant}/profile/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setProfileImage(url);

      const updatedUser = { 
        ...storedUser, 
        Identifiant: identifiant, 
        imageUrl: url 
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Erreur d'upload :", err);
      swal("Erreur", "Échec de l'upload de l'image", "error");
    }
    setUploading(false);
  };

  const onSubmit = async (data) => {
    if (data.Password && data.Password !== data.ConfirmPassword) {
      swal("Erreur", "Les mots de passe ne correspondent pas !", "error");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${identifiant}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          ...data,
          imageUrl: profileImage
        })
      });
      
      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify({
        ...updatedUser,
        Identifiant: updatedUser.Identifiant || identifiant
      }));
      swal("Succès", "Profil mis à jour avec succès", "success")
        .then(() => {
          window.location.reload();
        });
    } catch (error) {
      console.error("Erreur de mise à jour :", error);
      swal("Erreur", "Échec de la mise à jour", "error");
    }
  };
// Générer le QR code pour 2FA
const handleGenerate2FA = async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    swal("Erreur", "Vous devez être connecté pour activer 2FA. Veuillez vous reconnecter.", "error");
    return;
  }
  try {
    const response = await fetch('http://localhost:5000/api/users/generate-2fa', {
      method: 'GET',
      headers: authHeader()
    });
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();
    setQrCodeUrl(data.qrCodeUrl); // Afficher le QR code
  } catch (error) {
    console.error("Erreur génération 2FA :", error);
    swal("Erreur", "Échec de la génération du QR code : " + error.message, "error");
  }
};

// Activer le 2FA après scan et saisie du code
const handleEnable2FA = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/users/enable-2fa', {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ code: twoFactorCode })
    });
    const data = await response.json();
    if (response.ok) {
      setTwoFactorEnabled(true);
      setQrCodeUrl(null); // Cacher le QR code
      setTwoFactorCode(''); // Réinitialiser le champ
      swal("Succès", "2FA activé avec succès", "success");
      const updatedUser = { ...storedUser, twoFactorEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } else {
      swal("Erreur", data.message || "Code invalide", "error");
    }
  } catch (error) {
    console.error("Erreur activation 2FA :", error);
    swal("Erreur", "Échec de l'activation du 2FA", "error");
  }
};

return (
  <Form onSubmit={handleSubmit(onSubmit)}>
    <Card>
      <CardHeader>
        <h4>Edit Profile</h4>
      </CardHeader>
      <CardBody>
        <Row>
          <Col md="12" className="text-center mb-3">
            <img
              src={profileImage}
              alt="Profile"
              style={{ width: '150px', height: '150px', borderRadius: '50%', cursor: 'pointer' }}
              onClick={() => fileInputRef.current.click()}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageChange}
            />
            {uploading && <p>Téléchargement de l'image...</p>}
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Name</Label>
              <Input type="text" {...register('Name', { required: "Le nom est requis" })} defaultValue={storedUser?.Name || ''} />
              {errors.Name && <span style={{ color: 'red' }}>{errors.Name.message}</span>}
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Identifiant</Label>
              <Input type="text" value={identifiant || ''} disabled />
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Email</Label>
              <Input type="email" {...register('Email', { required: "L'email est requis" })} defaultValue={storedUser?.Email || ''} />
              {errors.Email && <span style={{ color: 'red' }}>{errors.Email.message}</span>}
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Classe</Label>
              <Input
                type="text"
                {...register('Classe', {
                  required: "La classe est requise",
                  pattern: {
                    value: /^[a-zA-Z0-9]+$/,
                    message: "La classe doit être valide (alphanumérique)"
                  }
                })}
                defaultValue={storedUser?.Classe || ''}
              />
              {errors.Classe && <span style={{ color: 'red' }}>{errors.Classe.message}</span>}
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Role</Label>
              <Input type="text" {...register('Role', { required: "Le rôle est requis" })} defaultValue={storedUser?.Role || ''} />
              {errors.Role && <span style={{ color: 'red' }}>{errors.Role.message}</span>}
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Phone Number</Label>
              <Input
                type="text"
                {...register('PhoneNumber', {
                  required: "Le numéro de téléphone est requis",
                  pattern: {
                    value: /^[0-9]{8,10}$/,
                    message: "Le numéro de téléphone doit être valide (8 à 10 chiffres)"
                  }
                })}
                defaultValue={storedUser?.PhoneNumber || ''}
              />
              {errors.PhoneNumber && <span style={{ color: 'red' }}>{errors.PhoneNumber.message}</span>}
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Password</Label>
              <Input type="password" {...register('Password')} placeholder="Nouveau mot de passe" autoComplete="new-password" />
            </FormGroup>
          </Col>
          <Col md="6">
            <FormGroup>
              <Label>Confirm Password</Label>
              <Input type="password" {...register('ConfirmPassword')} placeholder="Confirmez le mot de passe" autoComplete="new-password" />
            </FormGroup>
          </Col>
          {/* Bouton et section 2FA */}
=======
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
>>>>>>> full-Integration
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
<<<<<<< HEAD
                      <img src={qrCodeUrl} alt="QR Code 2FA" />
=======
                      <img src={qrCodeUrl} alt="QR Code 2FA" style={{ maxWidth: '200px' }} />
>>>>>>> full-Integration
                      <FormGroup className="mt-2">
                        <Label>Entrez le code 2FA</Label>
                        <Input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          placeholder="Code à 6 chiffres"
                        />
                      </FormGroup>
<<<<<<< HEAD
                      <Button color="primary" onClick={handleEnable2FA}>
=======
                      <Button color="primary" onClick={handleEnable2FA} className="mt-2">
>>>>>>> full-Integration
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
<<<<<<< HEAD
        <Button color="primary" type="submit">Update Profile</Button>
      </CardFooter>
    </Card>
  </Form>
);
=======
        {/* Optional: Keep a button for navigation or other actions if needed */}
      </CardFooter>
    </Card>
  );
>>>>>>> full-Integration
};

export default EditMyProfile;