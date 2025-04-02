// BlogDetailContain.js
import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'reactstrap';
import { H6, Image, LI, UL } from '../../AbstractElements';
import axios from 'axios';
import { Link } from 'react-router-dom';

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
  // Convertir l'ID en une valeur numérique pour déterminer l'index
  const seed = postId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomIndex = seed % defaultImages.length; // Utiliser le modulo pour choisir une image
  return defaultImages[randomIndex];
};

// Ajoute des styles CSS personnalisés
const cardStyles = {
  card: {
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  image: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  content: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '15px',
  },
  dateContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    minHeight: '40px',
  },
  date: {
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'nowrap',
  },
  badge: {
    fontSize: '14px',
    padding: '5px 10px',
  },
  title: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '10px',
  },
  body: {
    flex: '1 1 auto',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    marginBottom: '10px',
  },
  footer: {
    marginTop: 'auto',
  },
};

const BlogDetailContain = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/posts');
        setPosts(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération:', error.response?.data || error.message);
      }
    };
    fetchPosts();
  }, []);

  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('fr-FR', { month: 'long' });
    return { day, month };
  };

  return (
    <Fragment>
      <Container fluid={true} className="blog-page">
        <Row>
          {posts.length > 0 ? (
            posts.map((post) => (
              <Col sm="6" xl="3" className="box-col-6 des-xl-50" key={post._id}>
                <Link to={`${process.env.PUBLIC_URL}/blog/${post._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Card style={cardStyles.card}>
                    <div className="blog-box blog-grid">
                      <div className="blog-wrraper">
                        <Image
                          attrImage={{
                            className: 'img-fluid top-radius-blog',
                            style: cardStyles.image,
                            src: post.imageUrl ? `http://localhost:5000${post.imageUrl}` : getRandomImageForPost(post._id), // Utiliser une image basée sur l'ID
                            alt: post.title || 'Publication',
                          }}
                        />
                      </div>
                      <div className="blog-details-second" style={cardStyles.content}>
                        <div style={cardStyles.dateContainer}>
                          <div className="blog-post-date" style={cardStyles.date}>
                            <span className="blg-month">{formatDate(post.createdAt).month}</span>
                            <span className="blg-date">{formatDate(post.createdAt).day}</span>
                          </div>
                          <span className="badge bg-warning text-dark" style={cardStyles.badge}>
                            {formatDate(post.createdAt).day}
                          </span>
                        </div>
                        <H6 attrH6={{ className: 'blog-bottom-details', style: cardStyles.title }}>
                          {post.title || 'Titre non disponible'}
                        </H6>
                        <div
                          style={cardStyles.body}
                          dangerouslySetInnerHTML={{ __html: post.content || 'Contenu non disponible' }}
                        />
                        <div className="detail-footer" style={cardStyles.footer}>
                          <UL attrUL={{ className: 'social-list simple-list flex-row' }}>
                            <LI>
                              <i className="fa fa-user-o"></i>
                              {post.isAnonymous ? post.anonymousPseudo : post.author?.Name || 'Inconnu'}
                            </LI>
                            <LI>
                              <i className="fa fa-comments-o"></i>{post.comments?.length} Hits
                            </LI>
                            <LI>
                              <i className="fa fa-thumbs-o-up"></i>{post.likes || 2} Like
                            </LI>
                          </UL>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </Col>
            ))
          ) : (
            <Col sm="6" xl="3">
              <p className="text-center">Aucune publication disponible.</p>
            </Col>
          )}
        </Row>
      </Container>
    </Fragment>
  );
};

export default BlogDetailContain;