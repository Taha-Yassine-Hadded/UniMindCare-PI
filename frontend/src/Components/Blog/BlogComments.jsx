import React, { Fragment, useState, useEffect } from 'react';
import { Row, Col, Card, CardBody, Form, FormGroup, Input, Button } from 'reactstrap';
import { H4, H6, Image, LI, P, UL } from '../../AbstractElements';
import axios from 'axios';
import Swal from 'sweetalert2'; // Ajout de Swal pour des alertes cohérentes

const BlogComments = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/posts/${postId}`);
        setComments(response.data.comments || []);
      } catch (error) {
        console.error('Erreur lors de la récupération des commentaires:', error);
      }
    };
    fetchComments();
  }, [postId]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Champ requis',
        text: 'Le commentaire ne peut pas être vide.',
      });
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'Non connecté',
        text: 'Veuillez vous connecter pour commenter.',
      });
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/posts/${postId}/comments`,
        { content: newComment, isAnonymous },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(response.data.comments);
      setNewComment('');
      setIsAnonymous(false);
      Swal.fire({
        icon: 'success',
        title: 'Commentaire ajouté !',
        text: 'Votre commentaire a été publié avec succès.',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.response?.data?.message || 'Une erreur est survenue, veuillez réessayer.',
      });
    }
  };

  const handleLike = async (commentId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      Swal.fire({ icon: 'warning', title: 'Non connecté', text: 'Veuillez vous connecter pour réagir.' });
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/posts/${postId}/comments/${commentId}/like`,
        {},
       { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(response.data.comments);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors du like.' });
    }
  };

  const handleDislike = async (commentId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      Swal.fire({ icon: 'warning', title: 'Non connecté', text: 'Veuillez vous connecter pour réagir.' });
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/posts/${postId}/comments/${commentId}/dislike`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(response.data.comments);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors du dislike.' });
    }
  };

  return (
    <Card className="comment-box">
      <CardBody>
        <H4>Commentaires</H4>
        <UL attrUL={{ className: 'simple-list' }}>
          {comments.length > 0 ? (
            comments.map((item, index) => (
              <LI key={index}>
                <div className="d-md-flex">
                  <Image
                    attrImage={{
                      className: 'align-self-center',
                      src: 'https://via.placeholder.com/50', // Remplacez par une image d'utilisateur si disponible
                      alt: 'User',
                    }}
                  />
                  <div className="flex-grow-1">
                    <H6 attrH6={{ className: 'mt-0' }}>
                      {item.isAnonymous ? item.anonymousPseudo : item.author?.Name || 'Inconnu'}
                    </H6>
                    <P>{item.content}</P>
                    <small>{new Date(item.createdAt).toLocaleDateString('fr-FR')}</small>
                    <div className="mt-2">
                      <Button
                        color="link"
                        className="p-0 me-2"
                        onClick={() => handleLike(item._id)}
                      >
                        <i className="fa fa-thumbs-up"></i> {item.likes?.length || 0}
                      </Button>
                      <Button
                        color="link"
                        className="p-0"
                        onClick={() => handleDislike(item._id)}
                      >
                        <i className="fa fa-thumbs-down"></i> {item.dislikes?.length || 0}
                      </Button>
                    </div>
                  </div>
                </div>
              </LI>
            ))
          ) : (
            <LI><P>Aucun commentaire pour le moment.</P></LI>
          )}
        </UL>

        <Form onSubmit={handleCommentSubmit}>
          <FormGroup>
            <Input
              type="textarea"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajoutez votre commentaire..."
            />
          </FormGroup>
          <FormGroup check>
            <Input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            {' '}Publier en tant qu'anonyme
          </FormGroup>
          <Button color="primary" type="submit">Publier</Button>
        </Form>
      </CardBody>
    </Card>
  );
};

export default BlogComments;