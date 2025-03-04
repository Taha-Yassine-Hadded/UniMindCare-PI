import React, { useState } from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import axios from 'axios';

const FormPost = ({ onPostSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit appelé avec :', { title, content });
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.error('Aucun token trouvé, utilisateur non connecté');
      alert('Veuillez vous connecter pour publier.');
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/posts', { title, content }, {
        headers: {
          Authorization: `Bearer ${token}` // Inclut le token dans les headers
        }
      });
      console.log('Publication créée:', response.data);
      setTitle('');
      setContent('');
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
    </Form>
  );
};

export default FormPost;