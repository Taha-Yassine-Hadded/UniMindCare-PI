import React, { Fragment, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumbs, H4, LI, UL } from '../../AbstractElements';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import BlogComments from './BlogComments';
import axios from 'axios';
import { FaHeart } from 'react-icons/fa';
import Swal from 'sweetalert2';

// Importer les 10 images par défaut
import defaultImage1 from '../../assets/images/default-image-1.jpg';
import defaultImage2 from '../../assets/images/default-image-2.jpg';
import defaultImage3 from '../../assets/images/default-image-3.jpg';
import defaultImage4 from '../../assets/images/default-image-4.jpg';
import defaultImage5 from '../../assets/images/default-image-5.jpg';

// Créer un tableau des images par défaut
const defaultImages = [
  defaultImage1,
  defaultImage2,
  defaultImage3,
  defaultImage4,
  defaultImage5,
];

// Fonction pour sélectionner une image aléatoire basée sur l'ID du post
const getRandomImageForPost = (postId) => {
  const seed = postId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomIndex = seed % defaultImages.length;
  return defaultImages[randomIndex];
};

const BlogSingleContain = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.log('Aucun token trouvé, utilisateur non connecté');
        setCurrentUser(null);
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Utilisateur connecté:', response.data);
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error.response?.data || error.message);
        setCurrentUser(null);
      }
    };

    fetchCurrentUser();
  }, []);

  console.log('Valeur de currentUser:', currentUser);

  // Récupérer la publication
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/posts/${id}`);
        console.log('Publication récupérée:', response.data);
        setPost(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération du post:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  // Fonction pour liker ou unlike une publication
  const handleLike = async () => {
    if (!currentUser) {
      Swal.fire({
        icon: 'warning',
        title: 'Non connecté',
        text: 'Veuillez vous connecter pour liker une publication.',
      });
      return;
    }

    try {
      console.log(`Envoi de la requête de like pour le post ${id}`);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/posts/${id}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Réponse de la requête de like:', response.data);
      setPost(response.data.post);

      // Vérifier si un nouveau badge a été attribué
      if (response.data.newBadge) {
        Swal.fire({
          icon: 'success',
          title: 'Parfait !',
          text: `Vous êtes maintenant ${response.data.newBadge.name} !`,
        });
      }
    } catch (error) {
      console.error('Erreur lors du like:', error.response?.data || error.message);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors du like.',
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const styless = {
    backgroundImage: `url(${post?.imageUrl ? `http://localhost:5000${post.imageUrl}` : getRandomImageForPost(id)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'block',
  };

  if (loading) {
    return (
      <Fragment>
        <Container>
          <Row>
            <Col>
              <div className="text-center mt-5">
                <h3>Chargement de l'article...</h3>
              </div>
            </Col>
          </Row>
        </Container>
      </Fragment>
    );
  }

  if (!post) {
    return (
      <Fragment>
        <Container>
          <Row>
            <Col>
              <div className="text-center mt-5">
                <h3>Article non trouvé</h3>
              </div>
            </Col>
          </Row>
        </Container>
      </Fragment>
    );
  }

  const isLiked = currentUser && Array.isArray(post.likes) && post.likes.some((like) => like.toString() === currentUser._id.toString());
  console.log(`Post ${post._id} - isLiked: ${isLiked}, Likes: ${post.likes?.length || 0}`);

  return (
    <Fragment>
      <Breadcrumbs mainTitle={post.title} parent="Blog" title="Blog Single" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <div className="blog-single">
              <div className="blog-box blog-details">
                <div
                  className="banner-wrraper img-fluid w-100 bg-img-cover"
                  style={styless}
                ></div>
                <Card>
                  <CardBody>
                    <div className="blog-details">
                      <UL
                        attrUL={{
                          className: 'blog-social flex-row simple-list',
                          style: { display: 'flex', alignItems: 'center' },
                        }}
                      >
                        <LI>{formatDate(post.createdAt)}</LI>
                        <LI>
                          <i className="icofont icofont-user"></i>
                          {post.isAnonymous ? (post.anonymousPseudo || 'Anonyme') : (post.author?.Name || 'Inconnu')}
                          {!post.isAnonymous && post.author?.badges?.length > 0 && (
                            <span style={{ marginLeft: '10px' }}>
                              {post.author.badges.map((badge, index) => (
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
                        </LI>
                        <li
                          style={{ pointerEvents: 'auto' }}
                          onClick={() => {
                            console.log('Clic sur l\'icône de cœur');
                            handleLike();
                          }}
                        >
                          <FaHeart
                            style={{
                              cursor: 'pointer',
                              marginRight: '5px',
                              color: isLiked ? 'red' : 'grey',
                            }}
                          />
                          {post.likes?.length || 0}
                          <span> Likes</span>
                        </li>
                        <LI>
                          <i className="icofont icofont-ui-chat"></i>
                          {post.comments?.length || 0} Comments
                        </LI>
                      </UL>
                      <H4>{post.title}</H4>
                      <div className="single-blog-content-top">
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
              <BlogComments postId={id} />
            </div>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default BlogSingleContain;