import React, { Fragment, useState } from 'react';
import { Input, Label, FormGroup, Form, CardBody, CardFooter } from 'reactstrap';
import axios from 'axios';
import { Btn } from '../../../../AbstractElements';

const DefaultLayout = () => {
  const [formData, setFormData] = useState({
    nomEtudiant: '',
    classe: '',
    matiere: '',
    dateEvaluation: '',
    engagement: '',
    concentration: 1,
    interaction: '',
    reactionCorrection: '',
    gestionStress: '',
    presence: '',
    expressionEmotionnelle: '',
    participationOrale: '',
    difficultes: '',
    pointsPositifs: '',
    axesAmelioration: '',
    suiviRecommande: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Données envoyées :', formData);
    try {
      const response = await axios.post('http://localhost:5000/api/evaluation', formData);
      console.log('Réponse :', response.data);
      alert('Évaluation ajoutée avec succès');
      setFormData({ /* réinitialisation */ });
    } catch (error) {
      console.error('Erreur :', error.response?.data || error.message);
      alert('Erreur lors de l\'envoi');
    }
  };

  return (
    <Fragment>
      <CardBody>
        <Form className="theme-form" onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Nom de l'étudiant</Label>
            <Input type="text" name="nomEtudiant" value={formData.nomEtudiant} onChange={handleChange} required />
          </FormGroup>
          <FormGroup>
            <Label>Classe</Label>
            <Input type="text" name="classe" value={formData.classe} onChange={handleChange} required />
          </FormGroup>
          <FormGroup>
            <Label>Matière</Label>
            <Input type="text" name="matiere" value={formData.matiere} onChange={handleChange} required />
          </FormGroup>
          <FormGroup>
            <Label>Date de l'évaluation</Label>
            <Input type="date" name="dateEvaluation" value={formData.dateEvaluation} onChange={handleChange} required />
          </FormGroup>
          <FormGroup>
            <Label>Engagement</Label>
            <Input type="select" name="engagement" value={formData.engagement} onChange={handleChange} required>
              <option value="">Sélectionnez</option>
              <option value="Très impliqué">Très impliqué</option>
              <option value="Moyennement impliqué">Moyennement impliqué</option>
              <option value="Peu impliqué">Peu impliqué</option>
              <option value="Pas du tout impliqué">Pas du tout impliqué</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Concentration (1 à 5)</Label>
            <Input type="number" name="concentration" value={formData.concentration} onChange={handleChange} min="1" max="5" required />
          </FormGroup>
          <FormGroup>
            <Label>Interaction</Label>
            <Input type="select" name="interaction" value={formData.interaction} onChange={handleChange} required>
              <option value="">Sélectionnez</option>
              <option value="Positives">Positives</option>
              <option value="Neutres">Neutres</option>
              <option value="Négatives">Négatives</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Réaction à la correction</Label>
            <Input type="select" name="reactionCorrection" value={formData.reactionCorrection} onChange={handleChange} required>
              <option value="">Sélectionnez</option>
              <option value="Accepte bien">Accepte bien</option>
              <option value="Résiste légèrement">Résiste légèrement</option>
              <option value="Résiste fortement">Résiste fortement</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Gestion du stress</Label>
            <Input type="select" name="gestionStress" value={formData.gestionStress} onChange={handleChange} required>
              <option value="">Sélectionnez</option>
              <option value="Calme">Calme</option>
              <option value="Anxieux">Anxieux</option>
              <option value="Très stressé">Très stressé</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Présence</Label>
            <Input type="select" name="presence" value={formData.presence} onChange={handleChange} required>
              <option value="">Sélectionnez</option>
              <option value="Toujours à l’heure">Toujours à l’heure</option>
              <option value="Souvent en retard">Souvent en retard</option>
              <option value="Absences fréquentes">Absences fréquentes</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Suivi recommandé</Label>
            <Input type="checkbox" name="suiviRecommande" checked={formData.suiviRecommande} onChange={handleChange} />
          </FormGroup>
          <CardFooter>
            <Btn attrBtn={{ color: 'primary', type: 'submit' }}>Soumettre</Btn>
            <Btn attrBtn={{ color: 'secondary' }} onClick={() => setFormData({ /* réinitialisation */ })}>
              Réinitialiser
            </Btn>
          </CardFooter>
        </Form>
      </CardBody>
    </Fragment>
  );
};

export default DefaultLayout;