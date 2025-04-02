// BlogSingleContain.js
import React, { Fragment, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumbs, H4, LI, P, UL } from '../../AbstractElements';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import BlogComments from './BlogComments';
import axios from 'axios';

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

const BlogSingleContain = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/posts/${id}`);
        setPost(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération du post:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Style pour l'image de couverture
  const styless = {
    backgroundImage: `url(${post?.imageUrl ? `http://localhost:5000${post.imageUrl}` : getRandomImageForPost(id)})`, // Utiliser une image basée sur l'ID
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
                        }}
                      >
                        <LI>{formatDate(post.createdAt)}</LI>
                        <LI>
                          <i className="icofont icofont-user"></i>
                          {post.isAnonymous ? post.anonymousPseudo : (post.author?.Name || 'Inconnu')}
                        </LI>
                        <LI>
                          <i className="icofont icofont-thumbs-up"></i>
                          {post.likes || 0}
                          <span> Hits</span>
                        </LI>
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