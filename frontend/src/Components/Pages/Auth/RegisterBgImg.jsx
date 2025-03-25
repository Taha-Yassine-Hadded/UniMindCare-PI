import React, { useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, FormGroup, Input, Label } from "reactstrap";
import { Btn, H4, P } from "../../../AbstractElements";
import Swal from 'sweetalert2';

const RegisterBgImg = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = new URLSearchParams(location.search).get('userId');

  const [identifiant, setIdentifiant] = useState('');
  const [classe, setClasse] = useState('');
  const [role, setRole] = useState('student');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [isClasseDisabled, setIsClasseDisabled] = useState(false);

  // Handle role change
  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    setIsClasseDisabled(selectedRole !== "student");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      const response = await axios.post('http://localhost:5000/users/complete-registration', {
        userId,
        identifiant,
        classe,
        role,
        phoneNumber,
      });

      localStorage.setItem('token', response.data.token);
      setSuccess(true);

      Swal.fire({
        title: "Registration Completed!",
        text: "Your registration is successful. Redirecting to dashboard...",
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
      });

      setTimeout(() => navigate('/tivo/dashboard/default'), 3000);
    } catch (err) {
      setError('Failed to complete registration. Please try again.');
    }
  };

  return (
    <div className="login-main d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="card p-4" style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
        <Form className="theme-form login-form" onSubmit={handleSubmit}>
          <div className="login-header text-center">
            <H4>Créer votre compte</H4>
            <P>Remplissez vos informations personnelles</P>
          </div>

          {error && <p className="text-danger">{error}</p>}
          {success && <p className="text-success">Registration successful! Redirecting...</p>}

          <FormGroup>
            <Label>Identifiant</Label>
            <Input
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="Identifiant unique"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Rôle</Label>
            <Input
              type="select"
              value={role}
              onChange={handleRoleChange}
              required
            >
              <option value="student">Étudiant</option>
              <option value="teacher">Enseignant</option>
              <option value="psychologist">Psychiatre</option>
            </Input>
          </FormGroup>

          {!isClasseDisabled && (
            <FormGroup>
              <Label>Classe</Label>
              <Input
                type="text"
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                placeholder="ex: 3A"
              />
            </FormGroup>
          )}

     

          <FormGroup>
            <Label>Numéro de téléphone</Label>
            <Input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="ex: +216 12 345 678"
              required
            />
          </FormGroup>

          <FormGroup>
            <Btn attrBtn={{ color: "primary", className: "w-100", type: "submit" }}>
              Créer un compte
            </Btn>
          </FormGroup>
        </Form>
      </div>
    </div>
  );
};

export default RegisterBgImg;