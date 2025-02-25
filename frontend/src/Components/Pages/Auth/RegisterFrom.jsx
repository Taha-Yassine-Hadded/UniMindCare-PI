import { useState } from "react";
import { Form, FormGroup, Input, Label, Row, Col } from "reactstrap";
import { Btn, H4, P } from "../../../AbstractElements";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';

const RegisterFrom = () => {
  const [formData, setFormData] = useState({
    Name: "",
    Identifiant: "",
    Email: "",
    Password: "",
    Classe: "",
    Role: "student",
    PhoneNumber: "",
    imageUrl: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      console.log("Fichier sélectionné:", e.target.files[0]);
      setFormData({ ...formData, imageFile: e.target.files[0] });
    }
  };
  
const [isClasseDisabled, setIsClasseDisabled] = useState(false);

const handleRoleChange = (e) => {
  const selectedRole = e.target.value;
  setFormData({ ...formData, Role: selectedRole });

  // Désactiver ou masquer la classe si c'est un enseignant ou psychiatre
  setIsClasseDisabled(selectedRole === "teacher" || selectedRole === "psychiatre");
};

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
  
    if (!formData.Email.endsWith("@esprit.tn")) {
      setError("L'email doit être au format @esprit.tn");
      return;
    }
  
    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key !== "imageFile" && formData[key] !== "") {
        formDataToSend.append(key, formData[key]);
      }
    });
  
    // Vérifiez si une image est envoyée, sinon envoyez imageUrl vide
    formDataToSend.append("imageUrl", formData.imageFile ? formData.imageFile.name : "");
  
    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: formDataToSend,
      });
  
      if (!response.ok) {
        const message = await response.text();
        console.error("Erreur serveur:", message);
        setError(message);
      } else {
        setSuccess(true);
        setFormData({
          Name: "",
          Identifiant: "",
          Email: "",
          Password: "",
          Classe: "",
          Role: "student",
          PhoneNumber: "",
          imageFile: null,
          imageUrl: "",
        });
        // ✅ Affichage d'une alerte SweetAlert2
      Swal.fire({
        title: "Inscription réussie !",
        text: "Un email de vérification a été envoyé. Vous allez être redirigé vers la page de connexion.",
        icon: "success",
        timer: 5000,
        showConfirmButton: false
      });

      // ✅ Redirection après un délai de 3 secondes
      setTimeout(() => navigate(`${process.env.PUBLIC_URL}/login`), 3000);
      
      }
    } catch (err) {
      console.error("Erreur serveur:", err);
      setError("Erreur serveur. Veuillez réessayer.");
    }
  };
  
  

  return (
    <div className="login-main">
      <Form className="theme-form login-form" onSubmit={handleSubmit}>
        <div className="login-header text-center">
          <H4>Créer votre compte</H4>
          <P>Remplissez vos informations personnelles</P>
        </div>
        
        {error && <p className="text-danger">{error}</p>}
        {success && <p className="text-success">Inscription réussie! Redirection...</p>}


        <FormGroup>
          <Label>Nom complet</Label>
          <Input type="text" name="Name" required value={formData.Name} onChange={handleChange} placeholder="Nom complet" />
        </FormGroup>

        <FormGroup>
          <Label>Identifiant</Label>
          <Input type="text" name="Identifiant" required value={formData.Identifiant} onChange={handleChange} placeholder="Identifiant unique" />
        </FormGroup>

        <FormGroup>
          <Label>Email</Label>
          <Input type="email" name="Email" required value={formData.Email} onChange={handleChange} placeholder="ex: user@esprit.tn" />
        </FormGroup>

        <FormGroup>
          <Label>Mot de passe</Label>
          <Input type="password" name="Password" required value={formData.Password} onChange={handleChange} placeholder="********" />
        </FormGroup>

     

        <FormGroup>
          <Label>Rôle</Label>
          <Input type="select" name="Role" value={formData.Role} onChange={handleRoleChange}>
            <option value="student">Étudiant</option>
            <option value="teacher">Enseignant</option>
            <option value="psychiatre">Psychiatre</option>
          </Input>
        </FormGroup>

        {!isClasseDisabled && (
  <FormGroup>
    <Label>Classe</Label>
    <Input type="text" name="Classe" value={formData.Classe} onChange={handleChange} placeholder="ex: 3A" />
  </FormGroup>
)}

        <FormGroup>
          <Label>Numéro de téléphone</Label>
          <Input type="tel" name="PhoneNumber" value={formData.PhoneNumber} onChange={handleChange} placeholder="ex: +216 12 345 678" />
        </FormGroup>

        <FormGroup>
          <Label>Image de profil</Label>
          <Input type="file" name="imageFile" onChange={handleFileChange} accept="image/*" />
        </FormGroup>

        <FormGroup>
          <Btn attrBtn={{ color: "primary", className: "w-100", type: "submit" }}>Créer un compte</Btn>
        </FormGroup>
      </Form>
    </div>
  );
};

export default RegisterFrom;
