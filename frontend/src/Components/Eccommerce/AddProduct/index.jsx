import { Fragment, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, FormGroup, Label, Input, Button } from "reactstrap";

const AddEvaluation = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState([]);

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      nomEtudiant: "",
      classe: "",
      matiere: "",
      dateEvaluation: "",
      reactionCorrection: "",
      gestionStress: "",
      presence: "",
      expressionEmotionnelle: "",
      participationOrale: "",
      difficultes: "",
      pointsPositifs: "",
      axesAmelioration: "",
      suiviRecommande: false,
    },
  });

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

        if (userData.Role && userData.Role.includes("teacher")) {
          setUserRole("teacher");
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

  const handleSaveChange = async (data) => {
    setServerErrors([]);
    console.log("Données avant envoi :", data);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/evaluation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      console.log("Statut de la réponse :", response.status); // Log pour débogage
      const responseData = await response.json();
      console.log("Réponse du serveur :", responseData);

      if (!response.ok) {
        const errors = responseData.errors || [{ msg: responseData.message || "Erreur serveur" }];
        setServerErrors(errors);
        return;
      }

      alert("Évaluation ajoutée avec succès");
      navigate("/evaluations/list");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      setServerErrors([{ msg: "Erreur réseau ou réponse inattendue du serveur" }]);
    }
  };

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

  if (loading) {
    return <div>Chargement des données utilisateur...</div>;
  }

  if (!userRole) {
    return (
      <Container fluid={true} className="text-center mt-5">
        <h2>Accès refusé</h2>
        <p>Seuls les enseignants peuvent ajouter des évaluations.</p>
        <Button color="secondary" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </Container>
    );
  }

  return (
    <Fragment>
      <Container fluid={true} className="add-evaluation">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Ajouter une évaluation</h2>
          <Button color="secondary" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </div>
        <Form onSubmit={handleSubmit(handleSaveChange)}>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="nomEtudiant">Nom de l'étudiant</Label>
                <Controller
                  name="nomEtudiant"
                  control={control}
                  rules={{ required: "Le nom de l'étudiant est requis" }}
                  render={({ field }) => (
                    <Input
                      id="nomEtudiant"
                      type="text"
                      {...field}
                      invalid={!!errors.nomEtudiant}
                    />
                  )}
                />
                {errors.nomEtudiant && <span className="text-danger">{errors.nomEtudiant.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="classe">Classe</Label>
                <Controller
                  name="classe"
                  control={control}
                  rules={{ required: "La classe est requise" }}
                  render={({ field }) => (
                    <Input
                      id="classe"
                      type="text"
                      {...field}
                      invalid={!!errors.classe}
                    />
                  )}
                />
                {errors.classe && <span className="text-danger">{errors.classe.message}</span>}
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
                <Label for="dateEvaluation">Date d'évaluation</Label>
                <Controller
                  name="dateEvaluation"
                  control={control}
                  rules={{
                    required: "La date est requise",
                    validate: (value) => !isNaN(new Date(value).getTime()) || "La date est invalide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="dateEvaluation"
                      type="date"
                      {...field}
                      invalid={!!errors.dateEvaluation}
                    />
                  )}
                />
                {errors.dateEvaluation && <span className="text-danger">{errors.dateEvaluation.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="reactionCorrection">Réaction à la correction</Label>
                <Controller
                  name="reactionCorrection"
                  control={control}
                  rules={{
                    required: "La réaction est requise",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="reactionCorrection"
                      type="select"
                      {...field}
                      invalid={!!errors.reactionCorrection}
                    >
                      <option value="">Choisir...</option>
                      <option value="Accepte bien">Accepte bien</option>
                      <option value="Résiste légèrement">Résiste légèrement</option>
                      <option value="Résiste fortement">Résiste fortement</option>
                    </Input>
                  )}
                />
                {errors.reactionCorrection && <span className="text-danger">{errors.reactionCorrection.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="gestionStress">Gestion du stress</Label>
                <Controller
                  name="gestionStress"
                  control={control}
                  rules={{
                    required: "La gestion du stress est requise",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="gestionStress"
                      type="select"
                      {...field}
                      invalid={!!errors.gestionStress}
                    >
                      <option value="">Choisir...</option>
                      <option value="Calme">Calme</option>
                      <option value="Anxieux">Anxieux</option>
                      <option value="Très stressé">Très stressé</option>
                    </Input>
                  )}
                />
                {errors.gestionStress && <span className="text-danger">{errors.gestionStress.message}</span>}
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <Label for="presence">Présence</Label>
                <Controller
                  name="presence"
                  control={control}
                  rules={{
                    required: "La présence est requise",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="presence"
                      type="select"
                      {...field}
                      invalid={!!errors.presence}
                    >
                      <option value="">Choisir...</option>
                      <option value="Toujours à l’heure">Toujours à l’heure</option>
                      <option value="Souvent en retard">Souvent en retard</option>
                      <option value="Absences fréquentes">Absences fréquentes</option>
                    </Input>
                  )}
                />
                {errors.presence && <span className="text-danger">{errors.presence.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="expressionEmotionnelle">Expression émotionnelle</Label>
                <Controller
                  name="expressionEmotionnelle"
                  control={control}
                  rules={{
                    required: "L'expression émotionnelle est requise",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="expressionEmotionnelle"
                      type="select"
                      {...field}
                      invalid={!!errors.expressionEmotionnelle}
                    >
                      <option value="">Choisir...</option>
                      <option value="Enthousiaste">Enthousiaste</option>
                      <option value="Neutre">Neutre</option>
                      <option value="Triste">Triste</option>
                      <option value="Irrité">Irrité</option>
                    </Input>
                  )}
                />
                {errors.expressionEmotionnelle && <span className="text-danger">{errors.expressionEmotionnelle.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="participationOrale">Participation orale</Label>
                <Controller
                  name="participationOrale"
                  control={control}
                  rules={{
                    required: "La participation orale est requise",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input
                      id="participationOrale"
                      type="select"
                      {...field}
                      invalid={!!errors.participationOrale}
                    >
                      <option value="">Choisir...</option>
                      <option value="Très active">Très active</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Faible">Faible</option>
                      <option value="Nulle">Nulle</option>
                    </Input>
                  )}
                />
                {errors.participationOrale && <span className="text-danger">{errors.participationOrale.message}</span>}
              </FormGroup>

              <FormGroup>
                <Label for="difficultes">Difficultés</Label>
                <Controller
                  name="difficultes"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="difficultes"
                      type="textarea"
                      {...field}
                      invalid={!!errors.difficultes}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup>
                <Label for="pointsPositifs">Points positifs</Label>
                <Controller
                  name="pointsPositifs"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="pointsPositifs"
                      type="textarea"
                      {...field}
                      invalid={!!errors.pointsPositifs}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup>
                <Label for="axesAmelioration">Axes d'amélioration</Label>
                <Controller
                  name="axesAmelioration"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="axesAmelioration"
                      type="textarea"
                      {...field}
                      invalid={!!errors.axesAmelioration}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup>
                <Label for="suiviRecommande">Suivi recommandé</Label>
                <Controller
                  name="suiviRecommande"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="suiviRecommande"
                      type="checkbox"
                      {...field}
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  )}
                />
              </FormGroup>
            </Col>
          </Row>

          <Button type="submit" color="primary" className="mt-3">
            Enregistrer
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

export default AddEvaluation;