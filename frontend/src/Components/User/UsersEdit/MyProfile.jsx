import React, { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardBody, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Image, H3, P } from '../../../AbstractElements';
import swal from 'sweetalert';

const MyProfileEdit = () => {
  const storedUser = JSON.parse(localStorage.getItem('user'));
  const [profileImage, setProfileImage] = useState('/defaultProfile.png');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const identifiant = storedUser?.Identifiant || storedUser?.identifiant;

  useEffect(() => {
    if (storedUser?.imageUrl) {
      setProfileImage(storedUser.imageUrl);
    }
  }, [storedUser]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !identifiant) return;

    setUploading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        swal("Erreur", "Votre session semble avoir expirée. Veuillez vous reconnecter.", "error");
        return;
      }

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(`http://localhost:5000/api/users/${identifiant}/upload-profile-picture`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${token}`,
          'X-Auth-FaceID': 'true',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        throw new Error(`Erreur lors de la mise à jour (${response.status})`);
      }

      const updatedUser = await response.json();
      console.log("Updated user from backend:", updatedUser);
      setProfileImage(updatedUser.imageUrl);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      swal("Succès", "Image de profil mise à jour avec succès", "success");
    } catch (err) {
      console.error("Erreur d'upload :", err);
      swal("Erreur", "Échec de l'upload de l'image", "error");
    }
    setUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <H3 attrH3={{ className: 'card-title mb-0' }}>My Profile</H3>
      </CardHeader>
      <CardBody>
        <Form>
          <Row className="mb-2">
            <div className="profile-title text-center">
              <Image
                attrImage={{
                  className: 'img-70 rounded-circle',
                  alt: 'Profile',
                  src: profileImage,
                  style: { cursor: 'pointer' },
                  onClick: () => fileInputRef.current.click(),
                }}
              />
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageChange}
              />
              {uploading && <p>Téléchargement de l'image...</p>}
              <div>
                <H3 attrH3={{ className: 'mb-1 f-20 txt-primary' }}>
                  {storedUser ? storedUser.Name : 'Nom'}
                </H3>
                <P attrPara={{ className: 'mb-0' }}>
                  Role: {storedUser ? storedUser.Role : 'Rôle'}
                </P>
              </div>
            </div>
          </Row>
          <FormGroup className="mb-3">
            <Label>Email Address</Label>
            <Input
              type="email"
              defaultValue={storedUser ? storedUser.Email : ''}
              disabled
            />
          </FormGroup>
        </Form>
      </CardBody>
    </Card>
  );
};

export default MyProfileEdit;