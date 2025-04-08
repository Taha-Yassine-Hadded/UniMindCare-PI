// BlogPost/FormPost.js
import React, { useState } from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Swal from 'sweetalert2';
import Dropzone from 'react-dropzone-uploader';
import 'react-dropzone-uploader/dist/styles.css'; // Importer les styles de Dropzone
import { useNavigate } from 'react-router-dom'; // Importer useNavigate

const FormPost = ({ onPostSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [image, setImage] = useState(null); // État pour stocker le fichier image
  const [tags, setTags] = useState(''); // Nouveau champ pour les tags
  const navigate = useNavigate();

  // Fonction appelée lorsque les fichiers changent dans Dropzone
  const handleChangeStatus = ({ meta, file }, status) => {
    if (status === 'done') {
      setImage(file); // Stocker le fichier dans l'état
    } else if (status === 'removed') {
      setImage(null); // Réinitialiser l'état si le fichier est supprimé
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Champ requis',
        text: 'Le titre est obligatoire.',
      });
      return;
    }

    if (!content.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Champ requis',
        text: 'Le contenu est obligatoire.',
      });
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'Non connecté',
        text: 'Veuillez vous connecter pour publier.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('isAnonymous', isAnonymous);
    if (image) formData.append('image', image); // Ajoute l'image si elle existe
    formData.append('tags', JSON.stringify(tags.split(',').map(tag => tag.trim()))); // Convertir les tags en tableau

    try {
      const response = await axios.post(
        'http://localhost:5000/api/posts',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setTitle('');
      setContent('');
      setIsAnonymous(false);
      setImage(null);

      window.alert = function () {};

      Swal.fire({
        icon: 'success',
        title: 'Publication réussie !',
        text: 'Votre post a été publié avec succès.',
      });
      if (onPostSuccess) onPostSuccess();
      navigate(`${process.env.PUBLIC_URL}/blog/blogDetail`);
        } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur lors de la publication',
        text: error.response?.data?.message || 'Une erreur est survenue, veuillez réessayer.',
      });
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
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
      <FormGroup>
                  <Label for="tags">Tags (séparés par des virgules)</Label>
                  <Input
                    type="text"
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="ex: anxiété, dépression, stress"
                  />
                </FormGroup>
      <FormGroup>
        <Label for="image">Image (facultatif)</Label>
        <div className="m-0 dz-message needsclick">
          <Dropzone
            onChangeStatus={handleChangeStatus} // Gérer les changements de statut des fichiers
            maxFiles={1} // Limiter à un seul fichier
            multiple={false} // Désactiver l'upload multiple
            canCancel={true} // Permettre de supprimer le fichier
            inputContent="Glissez une image ici ou cliquez pour sélectionner" // Texte personnalisé
            styles={{
              dropzone: { width: '100%', height: 100 }, // Ajuster la taille de la zone
              dropzoneActive: { borderColor: 'green' }, // Style quand la zone est active
            }}
            accept="image/*" // Accepter uniquement les images
          />
        </div>
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