import { Fragment, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, FormGroup, Label, Input, Button } from "reactstrap";
import React from "react";

const AddFeedback = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState([]);

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      nomEnseignant: "",
      matiere: "",
      dateSession: "",
      clarteExplications: "",
      interactionEtudiant: "",
      disponibilite: "",
      gestionCours: "",
      commentaire: "",
      satisfactionGlobale: 3, // Valeur par défaut (échelle de 1 à 5)
    },
  });

  // Vérification du rôle de l'utilisateur au montage
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch("http://localhost:5000/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}`);
        }

        const userData = await response.json();
        console.log("Données utilisateur :", userData);

        if (userData.Role && userData.Role.includes("student")) {
          setUserRole("student");
        } else {
          setUserRole(null);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du rôle :", err);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [navigate]);

  // Gestion de la soumission du formulaire
  const handleSaveChange = async (data) => {
    setServerErrors([]);
    console.log("Données avant envoi :", data);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      console.log("Statut de la réponse :", response.status);
      const responseData = await response.json();
      console.log("Réponse du serveur :", responseData);

      if (!response.ok) {
        const errors = responseData.errors || [{ msg: responseData.message || "Erreur serveur" }];
        setServerErrors(errors);
        return;
      }

      alert("Feedback envoyé avec succès");
      navigate("/feedback/list"); // Redirection vers une liste de feedback ou autre page
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      setServerErrors([{ msg: "Erreur réseau ou réponse inattendue du serveur : " + error.message }]);
    }
  };

  // Gestion de la déconnexion
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        await fetch("http://localhost:5000/users/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("login");
      sessionStorage.removeItem("login");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Erreur lors de la déconnexion :", err);
      navigate("/login", { replace: true });
    }
  };

  // Chargement initial
  if (loading) {
    return <div>Chargement des données utilisateur...</div>;
  }

  // Accès refusé pour les non-étudiants
  if (!userRole) {
    return (
      <Container fluid={true} className="text-center mt-5">
        <h2>Accès refusé</h2>
        <p>Seuls les étudiants peuvent soumettre un feedback.</p>
        <Button color="secondary" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </Container>
    );
  }

  // Afficher le formulaire pour les étudiants
  return (
    <Fragment>
      <Container fluid={true} className="add-feedback">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Ajouter un feedback sur un enseignant</h2>
          <Button color="secondary" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </div>
        <Form onSubmit={handleSubmit(handleSaveChange)}>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="nomEnseignant">Nom de l'enseignant</Label>
                <Controller
                  name="nomEnseignant"
                  control={control}
                  rules={{ required: "Le nom de l'enseignant est requis" }}
                  render={({ field }) => (
                    <Input
                      id="nomEnseignant"
                      type="text"
                      {...field}
                      invalid={!!errors.nomEnseignant}
                    />
                  )}
                />
                {errors.nomEnseignant && <span className="text-danger">{errors.nomEnseignant.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="matiere">Matière</Label>
                <Controller
                  name="matiere"
                  control={control}
                  rules={{ required: "La matière est requise" }}
                  render={({ field }) => (
                    <Input
                      id="matiere"
                      type="text"
                      {...field}
                      invalid={!!errors.matiere}
                    />
                  )}
                />
                {errors.matiere && <span className="text-danger">{errors.matiere.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="dateSession">Date de la session</Label>
                <Controller
                  name="dateSession"
                  control={control}
                  rules={{
                    required: "La date est requise",
                    validate: (value) => !isNaN(new Date(value).getTime()) || "La date est invalide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="dateSession"
                      type="date"
                      {...field}
                      invalid={!!errors.dateSession}
                    />
                  )}
                />
                {errors.dateSession && <span className="text-danger">{errors.dateSession.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="clarteExplications">Clarté des explications</Label>
                <Controller
                  name="clarteExplications"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="clarteExplications"
                      type="select"
                      {...field}
                      invalid={!!errors.clarteExplications}
                    >
                      <option value="">Choisir...</option>
                      <option value="Très claire">Très claire</option>
                      <option value="Clair">Clair</option>
                      <option value="Moyen">Moyen</option>
                      <option value="Peu clair">Peu clair</option>
                    </Input>
                  )}
                />
                {errors.clarteExplications && <span className="text-danger">{errors.clarteExplications.message}</span>}
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <Label for="interactionEtudiant">Interaction avec les étudiants</Label>
                <Controller
                  name="interactionEtudiant"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="interactionEtudiant"
                      type="select"
                      {...field}
                      invalid={!!errors.interactionEtudiant}
                    >
                      <option value="">Choisir...</option>
                      <option value="Très positive">Très positive</option>
                      <option value="Positive">Positive</option>
                      <option value="Neutre">Neutre</option>
                      <option value="Négative">Négative</option>
                    </Input>
                  )}
                />
                {errors.interactionEtudiant && <span className="text-danger">{errors.interactionEtudiant.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="disponibilite">Disponibilité</Label>
                <Controller
                  name="disponibilite"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="disponibilite"
                      type="select"
                      {...field}
                      invalid={!!errors.disponibilite}
                    >
                      <option value="">Choisir...</option>
                      <option value="Toujours disponible">Toujours disponible</option>
                      <option value="Souvent disponible">Souvent disponible</option>
                      <option value="Rarement disponible">Rarement disponible</option>
                      <option value="Jamais disponible">Jamais disponible</option>
                    </Input>
                  )}
                />
                {errors.disponibilite && <span className="text-danger">{errors.disponibilite.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="gestionCours">Gestion du cours</Label>
                <Controller
                  name="gestionCours"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="gestionCours"
                      type="select"
                      {...field}
                      invalid={!!errors.gestionCours}
                    >
                      <option value="">Choisir...</option>
                      <option value="Excellente">Excellente</option>
                      <option value="Bonne">Bonne</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Mauvaise">Mauvaise</option>
                    </Input>
                  )}
                />
                {errors.gestionCours && <span className="text-danger">{errors.gestionCours.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="satisfactionGlobale">Satisfaction globale (1-5)</Label>
                <Controller
                  name="satisfactionGlobale"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    min: { value: 1, message: "La note doit être au moins 1" },
                    max: { value: 5, message: "La note ne peut pas dépasser 5" },
                  }}
                  render={({ field }) => (
                    <Input
                      id="satisfactionGlobale"
                      type="number"
                      min="1"
                      max="5"
                      {...field}
                      invalid={!!errors.satisfactionGlobale}
                    />
                  )}
                />
                {errors.satisfactionGlobale && <span className="text-danger">{errors.satisfactionGlobale.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="commentaire">Commentaire (optionnel)</Label>
                <Controller
                  name="commentaire"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="commentaire"
                      type="textarea"
                      {...field}
                      invalid={!!errors.commentaire}
                    />
                  )}
                />
              </FormGroup>
            </Col>
          </Row>

          <Button type="submit" color="primary" className="mt-3">
            Envoyer le feedback
          </Button>

          {serverErrors.length > 0 && (
            <div className="mt-3">
              <h5>Erreurs du serveur :</h5>
              <ul>
                {serverErrors.map((error, index) => (
                  <li key={index} className="text-danger">{error.msg}</li>
                ))}
              </ul>
            </div>
          )}
        </Form>
      </Container>
    </Fragment>
  );
};

export default AddFeedback;