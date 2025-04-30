import React, { Fragment, useState, useEffect } from 'react';
import { Row, Col, Card, CardBody, Form, FormGroup, Input, Button } from 'reactstrap';
import { H4, H6, Image, LI, P, UL } from '../../AbstractElements';
import axios from 'axios';
import Swal from 'sweetalert2';

const BlogComments = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch the current user's data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('http://localhost:5000/api/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log('Current User:', response.data);
          setCurrentUser(response.data);
        } catch (error) {
          console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        }
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/posts/${postId}`);
        console.log('Comments:', response.data.comments);
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
      setComments(response.data.post.comments);
      setNewComment('');
      setIsAnonymous(false);
      Swal.fire({
        icon: 'success',
        title: 'Commentaire ajouté !',
        text: 'Votre commentaire a été publié avec succès.',
      });
  
      // Vérifier si un nouveau badge a été attribué
      if (response.data.newBadge) {
        Swal.fire({
          icon: 'success',
          title: 'Parfait !',
          text: `Vous êtes maintenant ${response.data.newBadge.name} !`,
        });
      }
    } catch (error) {
      // Check if the user's account has been disabled due to 3 inappropriate comments
      if (error.response && error.response.status === 403 && 
          error.response.data.strikes && error.response.data.strikes >= 3) {
        // Clear auth tokens
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        // Show SweetAlert before redirecting
        Swal.fire({
          icon: 'error',
          title: 'Compte désactivé',
          text: 'Votre compte a été désactivé après 3 commentaires inappropriés. Veuillez contacter l\'administrateur.',
          confirmButtonText: 'OK'
        }).then((result) => {
          // Redirect to login page after user clicks OK
          window.location.href = '/login';
        });
      } 
      // Handle other error cases where content is inappropriate but under 3 strikes
      else if (error.response && error.response.data.strikes) {
        Swal.fire({
          icon: 'warning',
          title: 'Contenu inapproprié',
          text: `${error.response.data.message} (${error.response.data.strikes}/3 avertissements)`,
        });
      }
      // Handle general errors
      else {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.response?.data?.message || 'Une erreur est survenue, veuillez réessayer.',
        });
      }
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
      setComments(response.data.post.comments);

      // Vérifier si un nouveau badge a été attribué
      if (response.data.newBadge) {
        Swal.fire({
          icon: 'success',
          title: 'Parfait !',
          text: `Vous êtes maintenant ${response.data.newBadge.name} !`,
        });
      }
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
      setComments(response.data.post.comments);

      // Vérifier si un nouveau badge a été attribué
      if (response.data.newBadge) {
        Swal.fire({
          icon: 'success',
          title: 'Parfait !',
          text: `Vous êtes maintenant ${response.data.newBadge.name} !`,
        });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors du dislike.' });
    }
  };

  const handleDelete = async (commentId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      Swal.fire({ icon: 'warning', title: 'Non connecté', text: 'Veuillez vous connecter pour supprimer un commentaire.' });
      return;
    }

    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous ne pourrez pas récupérer ce commentaire après suppression.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(
          `http://localhost:5000/api/posts/${postId}/comments/${commentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setComments(response.data.comments);
        Swal.fire({
          icon: 'success',
          title: 'Commentaire supprimé !',
          text: 'Votre commentaire a été supprimé avec succès.',
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.response?.data?.message || 'Une erreur est survenue lors de la suppression.',
        });
      }
    }
  };

  return (
    <Card className="comment-box">
      <CardBody>
        <H4>Commentaires</H4>
        <UL attrUL={{ className: 'simple-list' }}>
          {comments.length > 0 ? (
            comments.map((item, index) => (
              <LI key={index} style={{ marginBottom: '20px' }}>
                <div className="d-md-flex align-items-start">
                  <Image
                    attrImage={{
                      className: 'align-self-center',
                      src: 'https://via.placeholder.com/50',
                      alt: 'User',
                      style: { marginRight: '15px' },
                    }}
                  />
                  <div className="flex-grow-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <H6 attrH6={{ className: 'mt-0' }}>
                        {item.isAnonymous ? item.anonymousPseudo :  (item.author?.Name || 
   (currentUser && item.author?._id === currentUser._id ? currentUser.Name : 'Inconnu'))}
                        {!item.isAnonymous && item.author?.badges?.length > 0 && (
                          <span style={{ marginLeft: '10px' }}>
                            {item.author.badges.map((badge, index) => (
                              <span
                                key={index}
                                style={{
                                  background: '#f7c948',
                                  color: '#333',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  marginRight: '5px',
                                }}
                                title={badge.description}
                              >
                                {badge.name}
                              </span>
                            ))}
                          </span>
                        )}
                      </H6>
                      <small style={{ color: '#888' }}>
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </small>
                    </div>
                    <P style={{ margin: '5px 0' }}>{item.content}</P>
                    <div className="d-flex align-items-center">
                      <Button
                        color="link"
                        className="p-0 me-2"
                        onClick={() => handleLike(item._id)}
                        style={{ color: '#007bff' }}
                      >
                        <i className="fa fa-thumbs-up"></i> {(item.likes || []).length}
                      </Button>
                      <Button
                        color="link"
                        className="p-0 me-2"
                        onClick={() => handleDislike(item._id)}
                        style={{ color: '#dc3545' }}
                      >
                        <i className="fa fa-thumbs-down"></i> {(item.dislikes || []).length}
                      </Button>
                      {currentUser && item.author?._id === currentUser._id && (
                        <Button
                          color="link"
                          className="p-0 text-danger"
                          onClick={() => handleDelete(item._id)}
                        >
                          <i className="fa fa-trash"></i> Supprimer
                        </Button>
                      )}
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