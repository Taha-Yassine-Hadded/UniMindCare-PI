import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardBody, Form, FormGroup, Label, Input, Button, Row, Col } from 'reactstrap';
import swal from 'sweetalert';
import { useOutletContext } from 'react-router-dom';

const authHeader = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    console.warn("Aucun token d'authentification trouvé!");
    return { "Content-Type": "application/json" };
  }
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    'X-Auth-FaceID': 'true',
  };
};

const EditMyProfile = () => {
  const { userData } = useOutletContext() || {};
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const [qrCodeUrl, setQrCodeUrl] = useState(null); // État pour le QR code
  const [twoFactorCode, setTwoFactorCode] = useState(''); // Code saisi par l'utilisateur
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false); // Statut 2FA

  const storedUser = JSON.parse(localStorage.getItem('user')) || userData;
  const identifiant = storedUser?.Identifiant || storedUser?.identifiant;

  // Watch the new password field for validation
  const newPassword = watch('Password');

  useEffect(() => {
    const syncAuthState = () => {
      const localToken = localStorage.getItem("token");
      const sessionToken = sessionStorage.getItem("token");
      if (sessionToken && !localToken) {
        localStorage.setItem("token", sessionToken);
      } else if (localToken && !sessionToken) {
        sessionStorage.setItem("token", localToken);
      }
      if (!localToken && !sessionToken) {
        return false;
      }
      return true;
    };

    const isLoggedIn = syncAuthState();
    if (!isLoggedIn) {
      swal("Session expirée", "Veuillez vous reconnecter", "warning").then(() => {
        window.location.href = "/login";
      });
    }

    if (storedUser) {
      setTwoFactorEnabled(storedUser.twoFactorEnabled || false); // Charger le statut 2FA
    }
  }, [storedUser]);

  const handleGenerate2FA = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        swal("Erreur", "Votre session semble avoir expirée. Veuillez vous reconnecter.", "error");
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/generate-2fa`, {
        method: 'GET',
        headers: authHeader(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur lors de la génération du QR code (${response.status})`);
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
    } catch (error) {
      console.error("Erreur génération 2FA :", error);
      swal("Erreur", "Échec de la génération du QR code: " + error.message, "error");
    }
  };

  const handleEnable2FA = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        swal("Erreur", "Votre session semble avoir expirée. Veuillez vous reconnecter.", "error");
        return;
      }

      if (!twoFactorCode || twoFactorCode.trim() === '') {
        swal("Erreur", "Veuillez entrer un code de vérification", "error");
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/enable-2fa`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ code: twoFactorCode }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur lors de l'activation du 2FA (${response.status})`);
      }

      const data = await response.json();
      setTwoFactorEnabled(true);
      setQrCodeUrl(null);
      setTwoFactorCode('');

      const updatedUser = { ...storedUser, twoFactorEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      swal("Succès", "2FA activé avec succès", "success");
    } catch (error) {
      console.error("Erreur activation 2FA :", error);
      swal("Erreur", "Échec de l'activation du 2FA: " + error.message, "error");
    }
  };

  const onSubmit = async (data) => {
    console.log("Form submitted with data:", data); // Log the form data
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        swal("Erreur", "Votre session semble avoir expirée. Veuillez vous reconnecter.", "error").then(() => {
          window.location.href = "/login";
        });
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/${identifiant}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          Password: data.Password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur lors de la mise à jour (${response.status})`);
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));

      swal("Succès", "Mot de passe mis à jour avec succès", "success").then(() => {
        reset(); // Reset the form after successful submission
        window.location.reload();
      });
    } catch (error) {
      console.error("Erreur de mise à jour du mot de passe :", error.message);
      if (error.message.includes("User not found")) {
        swal("Erreur", "Utilisateur non trouvé", "error");
      } else if (error.message.includes("Current password is required")) {
        swal("Erreur", "Le mot de passe actuel est requis pour changer le mot de passe", "error");
      } else if (error.message.includes("Current password is incorrect")) {
        swal("Erreur", "Le mot de passe actuel est incorrect", "error");
      } else if (error.message.includes("jwt") || error.message.includes("Token")) {
        swal("Erreur d'authentification", "Votre session a expirée. Veuillez vous reconnecter.", "error").then(() => {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          window.location.href = "/login";
        });
      } else {
        swal("Erreur", "Échec de la mise à jour du mot de passe: " + error.message, "error");
      }
    }
  };

  // Log validation errors to debug
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Form validation errors:", errors);
    }
  }, [errors]);

  return (
    <Card>
      <CardHeader>
        <h4>Edit Profile</h4>
      </CardHeader>
      <CardBody>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  {...register('currentPassword', { required: "Le mot de passe actuel est requis" })}
                  placeholder="Mot de passe actuel"
                  autoComplete="current-password"
                />
                {errors.currentPassword && <span style={{ color: 'red' }}>{errors.currentPassword.message}</span>}
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>New Password</Label>
                <Input
                  type="password"
                  {...register('Password', {
                    required: "Le nouveau mot de passe est requis",
                    minLength: { value: 8, message: "Le mot de passe doit contenir au moins 8 caractères" },
                    // Temporarily remove strict pattern for debugging
                    // pattern: {
                    //   value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    //   message: "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial",
                    // },
                  })}
                  placeholder="Nouveau mot de passe"
                  autoComplete="new-password"
                />
                {errors.Password && <span style={{ color: 'red' }}>{errors.Password.message}</span>}
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  {...register('confirmPassword', {
                    required: "Veuillez confirmer le nouveau mot de passe",
                    validate: value => value === newPassword || "Les mots de passe ne correspondent pas",
                  })}
                  placeholder="Confirmez le mot de passe"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <span style={{ color: 'red' }}>{errors.confirmPassword.message}</span>}
              </FormGroup>
            </Col>
            <Col md="12" className="text-end">
              <Button color="primary" type="submit">Update Password</Button>
            </Col>
          </Row>
        </Form>

        <FormGroup className="mt-3">
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
                  <img src={qrCodeUrl} alt="QR Code 2FA" />
                  <FormGroup className="mt-2">
                    <Label>Entrez le code 2FA</Label>
                    <Input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="Code à 6 chiffres"
                    />
                  </FormGroup>
                  <Button color="primary" onClick={handleEnable2FA}>
                    Valider et activer 2FA
                  </Button>
                </div>
              )}
            </>
          )}
        </FormGroup>
      </CardBody>
    </Card>
  );
};

export default EditMyProfile;
