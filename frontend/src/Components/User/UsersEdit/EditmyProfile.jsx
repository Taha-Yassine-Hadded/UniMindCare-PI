import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Row, Col, Card, CardHeader, CardBody, CardFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import swal from 'sweetalert';
import { jwtDecode } from 'jwt-decode'; // Nouvelle façon d'importer

// Fonction pour récupérer et décoder le token
const getAuthData = () => {
  const token = localStorage.getItem("token");
  if (!token) return { headers: null, userData: null };
  
  try {
    // Décodage du token pour récupérer les données utilisateur
    const userData = jwtDecode(token); // ← Changez ici aussi
    return {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      userData
    };
  } catch (error) {
    console.error("Erreur de décodage du token:", error);
    return { headers: null, userData: null };
  }
};

const EditMyProfile = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [profileImage, setProfileImage] = useState('/defaultProfile.png');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [userInfo, setUserInfo] = useState(null);

  // Récupération des données du token
  const { headers, userData } = getAuthData();
  const identifiant = userData ? (userData.identifiant || userData.Identifiant) : null;

  // Chargement des données utilisateur depuis le token et l'API
  useEffect(() => {
     // Ajoutez ces logs pour déboguer
  console.log("Token décodé:", userData);
  console.log("Identifiant extrait:", identifiant);
    const fetchUserData = async () => {
      if (!headers || !identifiant) {
        console.error("Token invalide ou identifiant manquant");
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/users/${identifiant}`, {
          method: 'GET',
          headers: headers
        });
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();

        if (data) {
          console.log('Données utilisateur récupérées:', data);
          setUserInfo(data);
          setValue('Name', data.Name);
          setValue('Email', data.Email);
          setValue('Classe', data.Classe);
          setValue('Role', data.Role);
          setValue('PhoneNumber', data.PhoneNumber);
          setProfileImage(data.imageUrl || '/defaultProfile.png');
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du profil :", error);
        swal("Erreur", "Impossible de récupérer vos informations de profil", "error");
      }
    };

    fetchUserData();
  }, [identifiant, setValue, headers]);

  // Upload de l'image sur Firebase Storage
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !identifiant) return;
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${identifiant}/profile/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setProfileImage(url);
    } catch (err) {
      console.error("Erreur d'upload :", err);
      swal("Erreur", "Échec de l'upload de l'image", "error");
    }
    setUploading(false);
  };

  // Soumission du formulaire
  const onSubmit = async (data) => {
    if (!headers || !identifiant) {
      swal("Erreur", "Session expirée. Veuillez vous reconnecter.", "error");
      return;
    }

    if (data.Password && data.Password !== data.ConfirmPassword) {
      swal("Erreur", "Les mots de passe ne correspondent pas !", "error");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${identifiant}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          ...data,
          imageUrl: profileImage
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const updatedUser = await response.json();
      
      swal("Succès", "Profil mis à jour avec succès", "success")
        .then(() => {
          window.location.reload();
        });
    } catch (error) {
      console.error("Erreur de mise à jour :", error);
      swal("Erreur", "Échec de la mise à jour", "error");
    }
  };

  // Si le token n'est pas valide ou si on n'a pas d'identifiant, afficher un message d'erreur
  if (!headers || !identifiant) {
    return (
      <Card>
        <CardBody className="text-center">
          <h4>Session expirée ou invalide</h4>
          <p>Veuillez vous reconnecter pour accéder à votre profil.</p>
          <Button color="primary" onClick={() => window.location.href = '/login'}>Se connecter</Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <h4>Edit Profile</h4>
          <p>Identifiant: {identifiant}</p>
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
                <Input type="text" {...register('Name', { required: "Le nom est requis" })} />
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
                <Input type="email" {...register('Email', { required: "L'email est requis" })} />
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
                />
                {errors.Classe && <span style={{ color: 'red' }}>{errors.Classe.message}</span>}
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Role</Label>
                <Input type="text" value={userData ? userData.roles.join(', ') : ''} disabled />
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
          </Row>
        </CardBody>
        <CardFooter className="text-end">
          <Button color="primary" type="submit">Update Profile</Button>
        </CardFooter>
      </Card>
    </Form>
  );
};

export default EditMyProfile;