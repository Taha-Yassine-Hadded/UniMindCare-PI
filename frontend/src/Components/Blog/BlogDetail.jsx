import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap'; // Ajout de Card et CardBody
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

  return (
    <Fragment>
      <Container fluid={true} className="blog-page">
        <Row className="g-3">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Col key={post._id} md="4" sm="6">
                <Card className="blog-card shadow-sm h-100">
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-primary text-white">
                        {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </span>
                      <small className="text-muted">Par {post.author?.Name || 'Anonyme'}</small> {/* Accède à Name ou utilise 'Anonyme' si null/undefined */}
                    </div>
                    <h5 className="card-title">{post.title}</h5>
                    <p className="card-text">{post.content.slice(0, 100)}...</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">
                        <i className="bi bi-chat-dots"></i> 5 Comments
                      </span>
                      <span className="text-muted">
                        <i className="bi bi-heart"></i> 2 Likes
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))
          ) : (
            <Col>
              <p className="text-center">Aucune publication disponible.</p>
            </Col>
          )}
        </Row>
      </Container>
    </Fragment>
  );
};

export default BlogDetailContain;