import { Fragment, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { 
  Container, Row, Col, Form, FormGroup, Label, Input, Button,
  Card, CardBody, CardHeader, Spinner, Alert
} from "reactstrap";
import Swal from 'sweetalert2';
import { motion } from "framer-motion"; // Vous devrez installer cette bibliothèque: npm install framer-motion

const AddEvaluation = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState([]);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
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

      const responseData = await response.json();

      if (!response.ok) {
        const errors = responseData.errors || [{ msg: responseData.message || "Erreur serveur" }];
        setServerErrors(errors);
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Succès!',
        text: 'Évaluation ajoutée avec succès',
        confirmButtonText: 'OK',
        background: '#f8f9fa',
        iconColor: '#4caf50',
        confirmButtonColor: '#3f51b5'
      }).then(() => {
        navigate(`${process.env.PUBLIC_URL}/dashboard/default`);
      });

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
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        <span className="ml-3">Chargement des données utilisateur...</span>
      </div>
    );
  }

  if (!userRole) {
    return (
      <Container fluid={true} className="text-center mt-5">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-lg border-0">
            <CardBody className="p-5">
              <h2 className="text-danger mb-3">Accès refusé</h2>
              <p className="lead">Seuls les enseignants peuvent ajouter des évaluations.</p>
              <Button color="primary" onClick={handleLogout} className="mt-3 px-4 py-2">
                Se déconnecter
              </Button>
            </CardBody>
          </Card>
        </motion.div>
      </Container>
    );
  }

  const formContainerVariant = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      } 
    }
  };

  const formItemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Fragment>
      <div className="bg-light min-vh-100 py-5">
        <Container className="add-evaluation">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <Card className="shadow-sm border-0 mb-4">
              <CardHeader className="bg-primary text-white d-flex justify-content-between align-items-center">
                <h3 className="m-0">Ajouter une évaluation</h3>
                <Button color="light" size="sm" onClick={handleLogout}>
                  <i className="fa fa-sign-out mr-2"></i> Se déconnecter
                </Button>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div
            variants={formContainerVariant}
            initial="hidden"
            animate="visible"
          >
            <Form onSubmit={handleSubmit(handleSaveChange)}>
              <Row>
                <Col lg={6}>
                  <motion.div variants={formItemVariant}>
                    <Card className="shadow-sm border-0 mb-4">
                    <CardHeader className="bg-info text-white">
                    <h5 className="mb-0">Informations générales</h5>
                      </CardHeader>
                      <CardBody>
                        <FormGroup>
                          <Label for="nomEtudiant" className="fw-bold">Nom de l'étudiant</Label>
                          <Controller
                            name="nomEtudiant"
                            control={control}
                            rules={{ required: "Le nom de l'étudiant est requis" }}
                            render={({ field }) => (
                              <Input
                                id="nomEtudiant"
                                type="text"
                                className="form-control-lg"
                                placeholder="Entrez le nom complet"
                                {...field}
                                invalid={!!errors.nomEtudiant}
                              />
                            )}
                          />
                          {errors.nomEtudiant && <span className="text-danger">{errors.nomEtudiant.message}</span>}
                        </FormGroup>

                        <Row>
                          <Col md={6}>
                            <FormGroup>
                              <Label for="classe" className="fw-bold">Classe</Label>
                              <Controller
                                name="classe"
                                control={control}
                                rules={{ required: "La classe est requise" }}
                                render={({ field }) => (
                                  <Input
                                    id="classe"
                                    type="text"
                                    placeholder="Ex: 3ème A"
                                    {...field}
                                    invalid={!!errors.classe}
                                  />
                                )}
                              />
                              {errors.classe && <span className="text-danger">{errors.classe.message}</span>}
                            </FormGroup>
                          </Col>
                          <Col md={6}>
                            <FormGroup>
                              <Label for="matiere" className="fw-bold">Matière</Label>
                              <Controller
                                name="matiere"
                                control={control}
                                rules={{ required: "La matière est requise" }}
                                render={({ field }) => (
                                  <Input
                                    id="matiere"
                                    type="text"
                                    placeholder="Ex: Mathématiques"
                                    {...field}
                                    invalid={!!errors.matiere}
                                  />
                                )}
                              />
                              {errors.matiere && <span className="text-danger">{errors.matiere.message}</span>}
                            </FormGroup>
                          </Col>
                        </Row>

                        <FormGroup>
                          <Label for="dateEvaluation" className="fw-bold">Date d'évaluation</Label>
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
                      </CardBody>
                    </Card>
                  </motion.div>

                  <motion.div variants={formItemVariant}>
                    <Card className="shadow-sm border-0 mb-4">
                      <CardHeader className="bg-light">
                        <h5 className="mb-0">Comportement en classe</h5>
                      </CardHeader>
                      <CardBody>
                        <FormGroup>
                          <Label for="reactionCorrection" className="fw-bold">Réaction à la correction</Label>
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
                                className="form-select"
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
                          <Label for="gestionStress" className="fw-bold">Gestion du stress</Label>
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
                                className="form-select"
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

                        <FormGroup>
                          <Label for="presence" className="fw-bold">Présence</Label>
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
                                className="form-select"
                                {...field}
                                invalid={!!errors.presence}
                              >
                                <option value="">Choisir...</option>
                                <option value="Toujours à l'heure">Toujours à l'heure</option>
                                <option value="Souvent en retard">Souvent en retard</option>
                                <option value="Absences fréquentes">Absences fréquentes</option>
                              </Input>
                            )}
                          />
                          {errors.presence && <span className="text-danger">{errors.presence.message}</span>}
                        </FormGroup>
                      </CardBody>
                    </Card>
                  </motion.div>
                </Col>

                <Col lg={6}>
                  <motion.div variants={formItemVariant}>
                    <Card className="shadow-sm border-0 mb-4">
                      <CardHeader className="bg-light">
                        <h5 className="mb-0">Expression et participation</h5>
                      </CardHeader>
                      <CardBody>
                        <FormGroup>
                          <Label for="expressionEmotionnelle" className="fw-bold">Expression émotionnelle</Label>
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
                                className="form-select"
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
                          <Label for="participationOrale" className="fw-bold">Participation orale</Label>
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
                                className="form-select"
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
                      </CardBody>
                    </Card>
                  </motion.div>

                  <motion.div variants={formItemVariant}>
                    <Card className="shadow-sm border-0 mb-4">
                      <CardHeader className="bg-light">
                        <h5 className="mb-0">Commentaires et recommandations</h5>
                      </CardHeader>
                      <CardBody>
                        <FormGroup>
                          <Label for="difficultes" className="fw-bold">Difficultés rencontrées</Label>
                          <Controller
                            name="difficultes"
                            control={control}
                            render={({ field }) => (
                              <Input
                                id="difficultes"
                                type="textarea"
                                rows="3"
                                placeholder="Décrivez les difficultés observées"
                                {...field}
                                invalid={!!errors.difficultes}
                              />
                            )}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label for="pointsPositifs" className="fw-bold">Points positifs</Label>
                          <Controller
                            name="pointsPositifs"
                            control={control}
                            render={({ field }) => (
                              <Input
                                id="pointsPositifs"
                                type="textarea"
                                rows="3"
                                placeholder="Indiquez les forces et points forts"
                                {...field}
                                invalid={!!errors.pointsPositifs}
                              />
                            )}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label for="axesAmelioration" className="fw-bold">Axes d'amélioration</Label>
                          <Controller
                            name="axesAmelioration"
                            control={control}
                            render={({ field }) => (
                              <Input
                                id="axesAmelioration"
                                type="textarea"
                                rows="3"
                                placeholder="Suggestions pour progresser"
                                {...field}
                                invalid={!!errors.axesAmelioration}
                              />
                            )}
                          />
                        </FormGroup>

                        <FormGroup className="d-flex align-items-center mt-4">
                          <Controller
                            name="suiviRecommande"
                            control={control}
                            render={({ field }) => (
                              <Input
                                id="suiviRecommande"
                                type="checkbox"
                                className="me-2"
                                {...field}
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                              />
                            )}
                          />
                          <Label for="suiviRecommande" className="fw-bold mb-0">
                            Suivi psychologique recommandé
                          </Label>
                        </FormGroup>
                      </CardBody>
                    </Card>
                  </motion.div>
                </Col>
              </Row>

              {serverErrors.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <Alert color="danger">
                    <h5 className="alert-heading">Erreurs du serveur :</h5>
                    <ul className="mb-0">
                      {serverErrors.map((error, index) => (
                        <li key={index}>{error.msg}</li>
                      ))}
                    </ul>
                  </Alert>
                </motion.div>
              )}

              <div className="text-center mt-4">
                <Button
                  type="submit"
                  color="primary"
                  className="btn-lg px-5 shadow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="me-2" /> Enregistrement...
                    </>
                  ) : (
                    "Enregistrer l'évaluation"
                  )}
                </Button>
              </div>
            </Form>
          </motion.div>
        </Container>
      </div>
    </Fragment>
  );
};

export default AddEvaluation;