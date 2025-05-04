import { Fragment, useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, FormGroup, Label, Input, Button } from "reactstrap";

const AddFeedback = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const { control, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      nomEnseignant: "",
      matiere: "",
      dateSession: "",
      clarteExplications: "",
      interactionEtudiant: "",
      disponibilite: "",
      gestionCours: "",
      commentaire: "",
      satisfactionGlobale: 3,
    },
  });

  useEffect(() => {
    const fetchUserRoleAndTeachers = async () => {
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
        if (!userResponse.ok) throw new Error(`Erreur HTTP ${userResponse.status}`);
        const userData = await userResponse.json();
        setUserRole(userData.Role && userData.Role.includes("student") ? "student" : null);

        const teachersResponse = await fetch("http://localhost:5000/api/teachers", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!teachersResponse.ok) throw new Error("Erreur lors de la récupération des enseignants");
        const teachersData = await teachersResponse.json();
        setTeachers(teachersData.teachers || []);
        setFilteredTeachers(teachersData.teachers || []);
      } catch (err) {
        console.error("Erreur lors de la récupération des données :", err);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoleAndTeachers();
  }, [navigate]);

  const filterTeachers = (value) => {
    if (value.trim()) {
      const filtered = teachers.filter((teacher) =>
        teacher.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTeachers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredTeachers(teachers);
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTeacher = (teacher) => {
    setValue("nomEnseignant", teacher);
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
      const response = await fetch("http://localhost:5000/api/feedback", {
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
      alert("Feedback envoyé avec succès");
      navigate("/feedback/list");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      setServerErrors([{ msg: "Erreur réseau ou réponse inattendue du serveur : " + error.message }]);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        await fetch("http://localhost:5000/users/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
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

  if (loading) return <div style={styles.loading}>Chargement...</div>;

  if (!userRole) {
    return (
      <Container fluid style={styles.denied}>
        <h2>Accès refusé</h2>
        <p>Seuls les étudiants peuvent soumettre un feedback.</p>
        <Button color="secondary" onClick={handleLogout} style={styles.smallButton}>Se déconnecter</Button>
      </Container>
    );
  }

  return (
    <Fragment>
      <Container fluid className="add-feedback" style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Ajouter votre feedback</h2>
          <Button color="secondary" onClick={handleLogout} style={styles.smallButton}>Déconnexion</Button>
        </div>
        <Form onSubmit={handleSubmit(handleSaveChange)} style={styles.form}>
          <Row style={styles.row}>
            <Col md={6}>
              <FormGroup style={styles.formGroup}>
                <Label for="nomEnseignant" style={styles.label}>Nom de l'enseignant</Label>
                <Controller
                  name="nomEnseignant"
                  control={control}
                  rules={{ required: "Le nom de l'enseignant est requis" }}
                  render={({ field }) => (
                    <div style={styles.inputWrapper}>
                      <Input
                        id="nomEnseignant"
                        type="text"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          filterTeachers(e.target.value);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Entrez le nom de l'enseignant"
                        style={styles.input}
                      />
                      {showDropdown && filteredTeachers.length > 0 && (
                        <div ref={dropdownRef} style={styles.dropdown}>
                          {filteredTeachers.map((teacher, index) => (
                            <div
                              key={index}
                              onClick={() => handleSelectTeacher(teacher)}
                              style={styles.dropdownItem}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f2f5")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              {teacher}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
                {errors.nomEnseignant && <span style={styles.errorText}>{errors.nomEnseignant.message}</span>}
              </FormGroup>
              <FormGroup style={styles.formGroup}>
                <Label for="matiere" style={styles.label}>Matière</Label>
                <Controller
                  name="matiere"
                  control={control}
                  rules={{ required: "La matière est requise" }}
                  render={({ field }) => (
                    <Input id="matiere" type="text" {...field} style={styles.input} placeholder="Entrez la matière" />
                  )}
                />
                {errors.matiere && <span style={styles.errorText}>{errors.matiere.message}</span>}
              </FormGroup>
              <FormGroup style={styles.formGroup}>
                <Label for="dateSession" style={styles.label}>Date de la session</Label>
                <Controller
                  name="dateSession"
                  control={control}
                  rules={{
                    required: "La date est requise",
                    validate: (value) => !isNaN(new Date(value).getTime()) || "La date est invalide",
                  }}
                  render={({ field }) => (
                    <Input id="dateSession" type="date" {...field} style={styles.input} />
                  )}
                />
                {errors.dateSession && <span style={styles.errorText}>{errors.dateSession.message}</span>}
              </FormGroup>
              <FormGroup style={styles.formGroup}>
                <Label for="clarteExplications" style={styles.label}>Clarté des explications</Label>
                <Controller
                  name="clarteExplications"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input id="clarteExplications" type="select" {...field} style={styles.inputSelect}>
                      <option value="">Choisir...</option>
                      <option value="Très claire">Très claire</option>
                      <option value="Clair">Clair</option>
                      <option value="Moyen">Moyen</option>
                      <option value="Peu clair">Peu clair</option>
                    </Input>
                  )}
                />
                {errors.clarteExplications && <span style={styles.errorText}>{errors.clarteExplications.message}</span>}
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup style={styles.formGroup}>
                <Label for="interactionEtudiant" style={styles.label}>Interaction avec les étudiants</Label>
                <Controller
                  name="interactionEtudiant"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input id="interactionEtudiant" type="select" {...field} style={styles.inputSelect}>
                      <option value="">Choisir...</option>
                      <option value="Très positive">Très positive</option>
                      <option value="Positive">Positive</option>
                      <option value="Neutre">Neutre</option>
                      <option value="Négative">Négative</option>
                    </Input>
                  )}
                />
                {errors.interactionEtudiant && <span style={styles.errorText}>{errors.interactionEtudiant.message}</span>}
              </FormGroup>
              <FormGroup style={styles.formGroup}>
                <Label for="disponibilite" style={styles.label}>Disponibilité</Label>
                <Controller
                  name="disponibilite"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input id="disponibilite" type="select" {...field} style={styles.inputSelect}>
                      <option value="">Choisir...</option>
                      <option value="Toujours disponible">Toujours disponible</option>
                      <option value="Souvent disponible">Souvent disponible</option>
                      <option value="Rarement disponible">Rarement disponible</option>
                      <option value="Jamais disponible">Jamais disponible</option>
                    </Input>
                  )}
                />
                {errors.disponibilite && <span style={styles.errorText}>{errors.disponibilite.message}</span>}
              </FormGroup>
              <FormGroup style={styles.formGroup}>
                <Label for="gestionCours" style={styles.label}>Gestion du cours</Label>
                <Controller
                  name="gestionCours"
                  control={control}
                  rules={{
                    required: "Ce champ est requis",
                    validate: (value) => value !== "" || "Veuillez sélectionner une option valide",
                  }}
                  render={({ field }) => (
                    <Input id="gestionCours" type="select" {...field} style={styles.inputSelect}>
                      <option value="">Choisir...</option>
                      <option value="Excellente">Excellente</option>
                      <option value="Bonne">Bonne</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Mauvaise">Mauvaise</option>
                    </Input>
                  )}
                />
                {errors.gestionCours && <span style={styles.errorText}>{errors.gestionCours.message}</span>}
              </FormGroup>
              <FormGroup style={styles.formGroup}>
                <Label for="satisfactionGlobale" style={styles.label}>Satisfaction globale (1-5)</Label>
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
                      style={styles.input}
                      placeholder="1 à 5"
                    />
                  )}
                />
                {errors.satisfactionGlobale && <span style={styles.errorText}>{errors.satisfactionGlobale.message}</span>}
              </FormGroup>
              <FormGroup style={styles.formGroup}>
                <Label for="commentaire" style={styles.label}>Commentaire (optionnel)</Label>
                <Controller
                  name="commentaire"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="commentaire"
                      type="textarea"
                      {...field}
                      style={styles.textarea}
                      placeholder="Ajoutez un commentaire..."
                    />
                  )}
                />
              </FormGroup>
            </Col>
          </Row>
          <Button type="submit" color="primary" style={styles.submitButton}>
            Envoyer votre feedback
          </Button>
          {serverErrors.length > 0 && (
            <div style={styles.serverErrors}>
              <h5>Erreurs du serveur :</h5>
              <ul>
                {serverErrors.map((error, index) => (
                  <li key={index} style={styles.errorText}>{error.msg}</li>
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
    maxWidth: "960px",
    margin: "60px auto",
    padding: "40px",
    background: "linear-gradient(145deg, #ffffff, #f5f7fa)",
    borderRadius: "20px",
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.08)",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    animation: "fadeIn 0.8s ease-in-out",
    border: "1px solid rgba(230, 230, 230, 0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
    paddingBottom: "15px",
    borderBottom: "1px solid rgba(200, 200, 200, 0.3)",
  },
  headerTitle: {
    color: "#2a2d3e",
    fontSize: "28px",
    fontWeight: "600",
    letterSpacing: "-0.5px",
    margin: 0,
  },
  form: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
  row: {
    marginBottom: "30px",
  },
  formGroup: {
    marginBottom: "25px",
    position: "relative",
  },
  label: {
    fontWeight: "500",
    marginBottom: "10px",
    color: "#4a4a4a",
    fontSize: "14px",
    letterSpacing: "0.2px",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    border: "1px solid #e0e4e8",
    borderRadius: "12px",
    padding: "14px 16px",
    width: "100%",
    outline: "none",
    backgroundColor: "#fff",
    fontSize: "15px",
    color: "#333",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
    "&:focus": {
      borderColor: "#6a82fb",
      boxShadow: "0 0 0 3px rgba(106, 130, 251, 0.2)",
    },
    "&:hover": {
      borderColor: "#c0c7d1",
    },
  },
  inputSelect: {
    border: "1px solid #e0e4e8",
    borderRadius: "12px",
    padding: "14px 16px",
    width: "100%",
    backgroundColor: "#fff",
    fontSize: "15px",
    color: "#333",
    outline: "none",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
    "&:focus": {
      borderColor: "#6a82fb",
      boxShadow: "0 0 0 3px rgba(106, 130, 251, 0.2)",
    },
    "&:hover": {
      borderColor: "#c0c7d1",
    },
  },
  textarea: {
    border: "1px solid #e0e4e8",
    borderRadius: "12px",
    padding: "14px 16px",
    minHeight: "120px",
    width: "100%",
    resize: "vertical",
    outline: "none",
    backgroundColor: "#fff",
    fontSize: "15px",
    color: "#333",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
    "&:focus": {
      borderColor: "#6a82fb",
      boxShadow: "0 0 0 3px rgba(106, 130, 251, 0.2)",
    },
    "&:hover": {
      borderColor: "#c0c7d1",
    },
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #e0e4e8",
    borderRadius: "12px",
    maxHeight: "200px",
    overflowY: "auto",
    zIndex: 1000,
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
    marginTop: "5px",
  },
  dropdownItem: {
    padding: "10px 16px",
    fontSize: "14px",
    color: "#333",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#f0f2f5",
    },
  },
  submitButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "500",
    borderRadius: "12px",
    marginTop: "30px",
    background: "linear-gradient(45deg, #6a82fb,rgb(242, 243, 182))",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.3s ease",
    boxShadow: "0 4px 15px rgba(106, 130, 251, 0.4)",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(106, 130, 251, 0.5)",
    },
  },
  smallButton: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "8px",
    backgroundColor: "#a0aec0",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    "&:hover": {
      backgroundColor: "#718096",
      transform: "translateY(-1px)",
    },
  },
  errorText: {
    color: "#f56565",
    fontSize: "13px",
    marginTop: "6px",
    fontWeight: "400",
  },
  serverErrors: {
    marginTop: "25px",
    background: "#fef2f2",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid #fed7d7",
  },
  loading: {
    textAlign: "center",
    marginTop: "100px",
    fontSize: "20px",
    color: "#718096",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
  denied: {
    marginTop: "100px",
    padding: "50px",
    background: "#fff5f5",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.08)",
    maxWidth: "500px",
    margin: "100px auto",
  },
};

// Add this to your CSS file or a <style> tag in your app for the animations
const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default AddFeedback;