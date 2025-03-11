// BlogPost/FormPost.js
import React, { useState } from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import axios from 'axios';
import ReactQuill from 'react-quill'; // Importer React-Quill
import 'react-quill/dist/quill.snow.css'; // Importer les styles

const FormPost = ({ onPostSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // Contenu sous forme HTML
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      alert('Veuillez vous connecter pour publier.');
      return;
    }
    try {
      const response = await axios.post(
        'http://localhost:5000/api/posts',
        { title, content, isAnonymous },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setTitle('');
      setContent('');
      setIsAnonymous(false);
      if (onPostSuccess) onPostSuccess();
    } catch (error) {
      console.error('Erreur lors de la création:', error.response?.data || error.message);
    }
  };

  // Modules pour personnaliser la barre d'outils de React-Quill
  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'], // Supprime la mise en forme
    ],
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
        <ReactQuill
          value={content}
          onChange={setContent}
          modules={modules}
          theme="snow"
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