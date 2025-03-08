import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Row, Col, Card, CardHeader, CardBody, CardFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import swal from 'sweetalert';
import { useOutletContext } from 'react-router-dom';

const authHeader = () => {
  const token = localStorage.getItem("token");
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
};

const EditMyProfile = () => {
  const { userData } = useOutletContext() || {};
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [profileImage, setProfileImage] = useState('/defaultProfile.png');
  const [uploading, setUploading] = useState(false);
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