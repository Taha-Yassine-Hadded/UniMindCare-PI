import { Fragment, useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, FormGroup, Label, Input, Button } from "reactstrap";
import Swal from 'sweetalert2'; // Add this import
// Injecter les styles globaux pour les animations


// Injecter les styles globaux pour les animations
const injectGlobalStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);
};

const AddEvaluation = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const { control, handleSubmit, formState: { errors }, setValue } = useForm({
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
    injectGlobalStyles();
    const fetchUserRoleAndStudents = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const userResponse = await fetch("http://localhost:5000/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error(`Erreur HTTP ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        if (userData.Role && userData.Role.includes("teacher")) {
          setUserRole("teacher");
        } else {
          setUserRole(null);
        }

        const studentsResponse = await fetch("http://localhost:5000/api/students", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!studentsResponse.ok) {
          throw new Error("Erreur lors de la récupération des étudiants");
        }

        const studentsData = await studentsResponse.json();
        setStudents(studentsData.students || []);
        setFilteredStudents(studentsData.students || []);
      } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoleAndStudents();
  }, [navigate]);

  const filterStudents = (value) => {
    if (value.trim()) {
      const filtered = students.filter((student) =>
        student.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredStudents(filtered);
      setShowDropdown(true);
    } else {
      setFilteredStudents(students);
      setShowDropdown(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectStudent = (student) => {
    setValue("nomEtudiant", student);
    setShowDropdown(false);
  };

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
        confirmButtonText: 'OK'
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
    return <div style={styles.loading}>Chargement des données utilisateur...</div>;
  }

  if (!userRole) {
    return (
      <Container fluid={true} style={styles.accessDeniedContainer}>
        <h2 style={styles.accessDeniedTitle}>Accès refusé</h2>
        <p style={styles.accessDeniedText}>Seuls les enseignants peuvent ajouter des évaluations.</p>
        <Button style={styles.logoutButton} onClick={handleLogout}>
          Se déconnecter
        </Button>
      </Container>
    );
  }

  return (
    <Fragment>
      <Container fluid={true} style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>📝 Ajouter une évaluation</h2>
          <Button style={styles.logoutButton} onClick={handleLogout}>
            Se déconnecter
          </Button>
        </div>
        <Form onSubmit={handleSubmit(handleSaveChange)} style={styles.form}>
          <Row>
            <Col md={6}>
              <FormGroup style={styles.formGroup}>
                <Label for="nomEtudiant" style={styles.label}>Nom de l'étudiant</Label>
                <Controller
                  name="nomEtudiant"
                  control={control}
                  rules={{ required: "Le nom de l'étudiant est requis" }}
                  render={({ field }) => (
                    <div style={styles.inputWrapper}>
                      <Input
                        id="nomEtudiant"
                        type="text"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          filterStudents(e.target.value);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        invalid={!!errors.nomEtudiant}
                        placeholder="Entrez le nom de l'étudiant"
                        style={styles.input}
                      />
                      {showDropdown && filteredStudents.length > 0 && (
                        <div ref={dropdownRef} style={styles.dropdown}>
                          {filteredStudents.map((student, index) => (
                            <div
                              key={index}
                              onClick={() => handleSelectStudent(student)}
                              style={styles.dropdownItem}
                            >
                              {student}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
                {errors.nomEtudiant && <span style={styles.errorText}>{errors.nomEtudiant.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="classe" style={styles.label}>Classe</Label>
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
                      style={styles.input}
                    />
                  )}
                />
                {errors.classe && <span style={styles.errorText}>{errors.classe.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="matiere" style={styles.label}>Matière</Label>
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
                      style={styles.input}
                    />
                  )}
                />
                {errors.matiere && <span style={styles.errorText}>{errors.matiere.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="dateEvaluation" style={styles.label}>Date d'évaluation</Label>
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
                      style={styles.input}
                    />
                  )}
                />
                {errors.dateEvaluation && <span style={styles.errorText}>{errors.dateEvaluation.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="reactionCorrection" style={styles.label}>Réaction à la correction</Label>
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
                      style={styles.select}
                    >
                      <option value="">Choisir...</option>
                      <option value="Accepte bien">Accepte bien</option>
                      <option value="Résiste légèrement">Résiste légèrement</option>
                      <option value="Résiste fortement">Résiste fortement</option>
                    </Input>
                  )}
                />
                {errors.reactionCorrection && <span style={styles.errorText}>{errors.reactionCorrection.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="gestionStress" style={styles.label}>Gestion du stress</Label>
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
                      style={styles.select}
                    >
                      <option value="">Choisir...</option>
                      <option value="Calme">Calme</option>
                      <option value="Anxieux">Anxieux</option>
                      <option value="Très stressé">Très stressé</option>
                    </Input>
                  )}
                />
                {errors.gestionStress && <span style={styles.errorText}>{errors.gestionStress.message}</span>}
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup style={styles.formGroup}>
                <Label for="presence" style={styles.label}>Présence</Label>
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
                      style={styles.select}
                    >
                      <option value="">Choisir...</option>
                      <option value="Toujours à l’heure">Toujours à l’heure</option>
                      <option value="Souvent en retard">Souvent en retard</option>
                      <option value="Absences fréquentes">Absences fréquentes</option>
                    </Input>
                  )}
                />
                {errors.presence && <span style={styles.errorText}>{errors.presence.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="expressionEmotionnelle" style={styles.label}>Expression émotionnelle</Label>
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
                      style={styles.select}
                    >
                      <option value="">Choisir...</option>
                      <option value="Enthousiaste">Enthousiaste</option>
                      <option value="Neutre">Neutre</option>
                      <option value="Triste">Triste</option>
                      <option value="Irrité">Irrité</option>
                    </Input>
                  )}
                />
                {errors.expressionEmotionnelle && <span style={styles.errorText}>{errors.expressionEmotionnelle.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="participationOrale" style={styles.label}>Participation orale</Label>
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
                      style={styles.select}
                    >
                      <option value="">Choisir...</option>
                      <option value="Très active">Très active</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Faible">Faible</option>
                      <option value="Nulle">Nulle</option>
                    </Input>
                  )}
                />
                {errors.participationOrale && <span style={styles.errorText}>{errors.participationOrale.message}</span>}
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="difficultes" style={styles.label}>Difficultés</Label>
                <Controller
                  name="difficultes"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="difficultes"
                      type="textarea"
                      {...field}
                      invalid={!!errors.difficultes}
                      style={styles.textarea}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="pointsPositifs" style={styles.label}>Points positifs</Label>
                <Controller
                  name="pointsPositifs"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="pointsPositifs"
                      type="textarea"
                      {...field}
                      invalid={!!errors.pointsPositifs}
                      style={styles.textarea}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="axesAmelioration" style={styles.label}>Axes d'amélioration</Label>
                <Controller
                  name="axesAmelioration"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="axesAmelioration"
                      type="textarea"
                      {...field}
                      invalid={!!errors.axesAmelioration}
                      style={styles.textarea}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup style={styles.formGroup}>
                <Label for="suiviRecommande" style={styles.label}>Suivi recommandé</Label>
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
                      style={styles.checkbox}
                    />
                  )}
                />
              </FormGroup>
            </Col>
          </Row>

          <Button type="submit" style={styles.submitButton}>
            Enregistrer
          </Button>

          {serverErrors.length > 0 && (
            <div style={styles.errorContainer}>
              <h5 style={styles.errorTitle}>Erreurs du serveur :</h5>
              <ul style={styles.errorList}>
                {serverErrors.map((error, index) => (
                  <li key={index} style={styles.errorItem}>{error.msg}</li>
                ))}
              </ul>
            </div>
          )}
        </Form>
      </Container>
    </Fragment>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    padding: "40px 20px",
    fontFamily: "'Poppins', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#2c3e50",
    margin: 0,
    animation: "fadeIn 0.5s ease-in-out",
  },
  logoutButton: {
    background: "linear-gradient(45deg, #e74c3c, #c0392b)",
    border: "none",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    borderRadius: "25px",
    color: "#fff",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    boxShadow: "0 4px 15px rgba(231, 76, 60, 0.3)",
    ":hover": {
      transform: "scale(1.05)",
      boxShadow: "0 6px 20px rgba(231, 76, 60, 0.4)",
    },
  },
  form: {
    background: "rgba(255, 255, 255, 0.95)",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
    animation: "fadeIn 0.5s ease-in-out",
  },
  formGroup: {
    marginBottom: "20px",
    position: "relative",
  },
  label: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#34495e",
    marginBottom: "8px",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    borderRadius: "10px",
    border: "1px solid #dfe6e9",
    padding: "12px",
    fontSize: "14px",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    ":focus": {
      borderColor: "#1E90FF",
      boxShadow: "0 0 8px rgba(30, 144, 255, 0.3)",
    },
  },
  select: {
    borderRadius: "10px",
    border: "1px solid #dfe6e9",
    padding: "12px",
    fontSize: "14px",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    ":focus": {
      borderColor: "#1E90FF",
      boxShadow: "0 0 8px rgba(30, 144, 255, 0.3)",
    },
  },
  textarea: {
    borderRadius: "10px",
    border: "1px solid #dfe6e9",
    padding: "12px",
    fontSize: "14px",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    minHeight: "80px",
    ":focus": {
      borderColor: "#1E90FF",
      boxShadow: "0 0 8px rgba(30, 144, 255, 0.3)",
    },
  },
  checkbox: {
    marginLeft: "10px",
    transform: "scale(1.2)",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "rgba(255, 255, 255, 0.98)",
    borderRadius: "10px",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)",
    maxHeight: "200px",
    overflowY: "auto",
    zIndex: 1000,
    animation: "dropdownFadeIn 0.3s ease-in-out",
    marginTop: "5px",
  },
  dropdownItem: {
    padding: "10px 15px",
    fontSize: "14px",
    color: "#34495e",
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease",
    ":hover": {
      background: "linear-gradient(45deg, #1E90FF, #00c4ff)",
      color: "#fff",
    },
  },
  submitButton: {
    background: "linear-gradient(45deg, #1E90FF, #00c4ff)",
    border: "none",
    padding: "12px 30px",
    fontSize: "16px",
    fontWeight: "500",
    borderRadius: "25px",
    color: "#fff",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    boxShadow: "0 4px 15px rgba(30, 144, 255, 0.3)",
    display: "block",
    margin: "20px auto 0",
    animation: "pulse 2s infinite",
    ":hover": {
      transform: "scale(1.05)",
      boxShadow: "0 6px 20px rgba(30, 144, 255, 0.4)",
    },
  },
  errorText: {
    color: "#e74c3c",
    fontSize: "12px",
    marginTop: "5px",
    animation: "fadeIn 0.3s ease-in-out",
  },
  errorContainer: {
    marginTop: "20px",
    textAlign: "center",
    animation: "fadeIn 0.5s ease-in-out",
  },
  errorTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#e74c3c",
  },
  errorList: {
    listStyle: "none",
    padding: 0,
  },
  errorItem: {
    color: "#e74c3c",
    fontSize: "14px",
    margin: "5px 0",
  },
  loading: {
    textAlign: "center",
    fontSize: "18px",
    color: "#34495e",
    padding: "50px",
  },
  accessDeniedContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
  },
  accessDeniedTitle: {
    fontSize: "32px",
    fontWeight: "600",
    color: "#e74c3c",
    animation: "fadeIn 0.5s ease-in-out",
  },
  accessDeniedText: {
    fontSize: "18px",
    color: "#34495e",
    marginBottom: "20px",
    animation: "fadeIn 0.5s ease-in-out",
  },
};

export default AddEvaluation;