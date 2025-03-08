import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'reactstrap';
import { H6, Image, LI, P, UL } from '../../AbstractElements'; // Chemin corrigé
import axios from 'axios';

const BlogDetailContain = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/posts');
        console.log('Publications récupérées:', response.data);
        setPosts(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des publications:', error.response?.data || error.message);
      }
    };
    fetchPosts();
  }, []);

  // Fonction pour formater la date comme dans l’image (jour et mois)
  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0'); // Jour sur 2 chiffres
    const month = d.toLocaleString('fr-FR', { month: 'long' }); // Mois complet en français
    return { day, month };
  };

  return (
    <Fragment>
      <Container fluid={true} className="blog-page">
        <Row>
          {posts.length > 0 ? (
            posts.map((post) => (
              <Col sm="6" xl="3" className="box-col-6 des-xl-50" key={post._id}>
                <Card>
                  <div className="blog-box blog-grid">
                    <div className="blog-wrraper">
                      <Image
                        attrImage={{
                          className: 'img-fluid top-radius-blog',
                          src: post.imageUrl || 'https://via.placeholder.com/300x200', // Image par défaut si aucune image
                          alt: post.title || 'Publication',
                        }}
                      />
                    </div>
                    <div className="blog-details-second">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="blog-post-date">
                          <span className="blg-month">{formatDate(post.createdAt).month}</span>
                          <span className="blg-date">{formatDate(post.createdAt).day}</span>
                        </div>
                        <span className="badge bg-warning text-dark">
                          {formatDate(post.createdAt).day}
                        </span>
                      </div>
                      <H6 attrH6={{ className: 'blog-bottom-details' }}>
                        {post.title || 'Titre non disponible'}
                      </H6>
                      <P>{post.content || 'Contenu non disponible'}</P>
                      <div className="detail-footer">
                        <UL attrUL={{ className: 'social-list simple-list flex-row' }}>
                          <LI>
                            <i className="fa fa-user-o"></i>{post.isAnonymous ? 'Anonyme' : post.author?.Name || 'Inconnu'}
                          </LI>
                          <LI>
                            <i className="fa fa-comments-o"></i>{post.comments?.length || 5} Hits
                          </LI>
                          <LI>
                            <i className="fa fa-thumbs-o-up"></i>{post.likes || 2} Like
                          </LI>
                        </UL>
                      </div>
                    </div>
                  </div>
                </Card>
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