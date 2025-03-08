// BlogPost/FormPost.js
import React, { useState } from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import axios from 'axios';

const FormPost = ({ onPostSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false); // État pour l'anonymat

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit appelé avec :', { title, content, isAnonymous });
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé, utilisateur non connecté');
      alert('Veuillez vous connecter pour publier.');
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/posts', { title, content, isAnonymous }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Publication créée:', response.data);
      setTitle('');
      setContent('');
      setIsAnonymous(false); // Réinitialiser l'état
      if (onPostSuccess) onPostSuccess();
    } catch (error) {
      console.error('Erreur lors de la création de la publication:', error.response?.data || error.message);
    }
  };

  return (
    <Form id="form-post" onSubmit={handleSubmit}>
      <FormGroup>
        <Label for="title">Titre</Label>
        <Input
          type="text"
          name="title"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label for="content">Contenu</Label>
        <Input
          type="textarea"
          name="content"
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </FormGroup>
      <FormGroup check>
        <Label check>
          <Input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />{' '}
          Publier anonymement
        </Label>
      </FormGroup>
    </Form>
  );
};

export default FormPost;