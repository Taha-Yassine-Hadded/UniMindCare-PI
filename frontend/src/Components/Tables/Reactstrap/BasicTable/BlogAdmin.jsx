import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Input, Modal, ModalHeader, ModalBody, ModalFooter, ButtonGroup } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Breadcrumbs } from '../../../../AbstractElements';
import HeadingCommon from '../../../../Common/Component/HeadingCommon';
import Swal from 'sweetalert2';

const BlogAdmin = () => {
  const [users, setUsers] = useState([]);
  const [stressPosts, setStressPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [badComments, setBadComments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeTab, setActiveTab] = useState("inappropriate"); // "inappropriate" or "stress"
  const navigate = useNavigate();

  // Fetch user role to verify admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.data.Role || !response.data.Role.includes('admin')) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error verifying admin access:', error);
        navigate('/login');
      }
    };

    checkAdminAccess();
    fetchData();
  }, [navigate]);

  // Ajoutez cet effet après votre premier useEffect
useEffect(() => {
  // Appel fetchData chaque fois que activeTab change
  fetchData();
}, [activeTab]); // Déclencher quand activeTab change

  // Fetch all data based on active tab
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (activeTab === "inappropriate") {
        const response = await axios.get('http://localhost:5000/api/users/admin', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUsers(response.data);
      } else {
        const response = await axios.get('http://localhost:5000/api/posts/admin/stress-detected', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setStressPosts(response.data);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle between inappropriate comments and stress detection tabs
  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      
    }
  };

  // Toggle user status (enabled/disabled)
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/users/${userId}/status`, 
        { enabled: !currentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Update local state after successful API call
      setUsers(users.map(user => 
        user._id === userId ? {...user, enabled: !user.enabled} : user
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  // Fetch inappropriate comments for a specific user
  const fetchBadComments = async (userId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/users/${userId}/bad-comments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setBadComments(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching inappropriate comments:', error);
    }
  };

  // Handle user details button click
  const handleViewDetails = (user) => {
    setSelectedUser(user);
    fetchBadComments(user._id);
  };

  // Handle view post details
  const handleViewPost = (post) => {
    setSelectedPost(post);
    setPostModalOpen(true);
  };

  // Alert psychologists about a post
  const alertPsychologists = async (postId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.post(`http://localhost:5000/api/posts/admin/alert-psychologists/${postId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'Alerte envoyée',
        text: response.data.message
      });

      // Update the post in state to reflect it has been alerted
      setStressPosts(stressPosts.map(post => 
        post._id === postId ? {...post, distressAlerted: true, distressAlertedAt: new Date()} : post
      ));
    } catch (error) {
      console.error('Error alerting psychologists:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible d\'envoyer l\'alerte aux psychiatres'
      });
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const userName = user.Name || '';
    const userEmail = user.Email || '';
    
    const searchTermLower = searchTerm.toLowerCase();
    return userName.toLowerCase().includes(searchTermLower) ||
           userEmail.toLowerCase().includes(searchTermLower);
  });

  // Filter stress posts based on search term
  const filteredPosts = stressPosts.filter(post => {
    const postTitle = post.title || '';
    const authorName = post.author?.Name || '';
    
    const searchTermLower = searchTerm.toLowerCase();
    return postTitle.toLowerCase().includes(searchTermLower) ||
           authorName.toLowerCase().includes(searchTermLower);
  });

  return (
    <React.Fragment>
      <Breadcrumbs mainTitle="Administration du blog" parent="Admin" title="Modération du contenu" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <HeadingCommon CardHeaderClassName="pb-0" Heading="Modération du contenu" />
              <div className="card-body">
                <div className="d-flex justify-content-between mb-3">
                  <ButtonGroup className="mb-3">
                    <Button 
                      color={activeTab === "inappropriate" ? "primary" : "light"} 
                      onClick={() => toggleTab("inappropriate")}
                    >
                      Commentaires inappropriés
                    </Button>
                    <Button 
                      color={activeTab === "stress" ? "primary" : "light"} 
                      onClick={() => toggleTab("stress")}
                    >
                      Détection de détresse
                    </Button>
                  </ButtonGroup>
                  
                  <div className="d-flex align-items-center">
                    <Input 
                      type="text" 
                      placeholder={activeTab === "inappropriate" ? "Rechercher un utilisateur..." : "Rechercher un post..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '300px', marginRight: '10px' }}
                    />
                    <Button color="primary" onClick={() => fetchData()}>Rafraîchir</Button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center my-3">Chargement...</div>
                ) : activeTab === "inappropriate" ? (
                  // Inappropriate Comments Tab
                  <div className="table-responsive">
                    <Table className="table-hover">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Email</th>
                          <th>Rôle</th>
                          <th>Commentaires inappropriés</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <tr key={user._id}>
                              <td>{user.Name || 'Inconnu'}</td>
                              <td>{user.Email || 'Non disponible'}</td>
                              <td>{user.Role}</td>
                              <td>
                                {user.inappropriateCommentsCount > 0 ? (
                                  <Badge color="danger">{user.inappropriateCommentsCount}</Badge>
                                ) : (
                                  <Badge color="success">0</Badge>
                                )}
                              </td>
                              <td>
                                <Badge color={user.enabled ? 'success' : 'danger'}>
                                  {user.enabled ? 'Actif' : 'Désactivé'}
                                </Badge>
                              </td>
                              <td>
                                <Button 
                                  color={user.enabled ? 'danger' : 'success'} 
                                  size="sm" 
                                  onClick={() => toggleUserStatus(user._id, user.enabled)}
                                >
                                  {user.enabled ? 'Désactiver' : 'Activer'}
                                </Button>
                                {user.inappropriateCommentsCount > 0 && (
                                  <Button 
                                    color="info" 
                                    size="sm" 
                                    className="ms-2"
                                    onClick={() => handleViewDetails(user)}
                                  >
                                    Détails
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center">
                              Aucun utilisateur trouvé
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  // Stress Detection Tab
                  <div className="table-responsive">
                    <Table className="table-hover">
                      <thead>
                        <tr>
                          <th>Titre</th>
                          <th>Auteur</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPosts.length > 0 ? (
                          filteredPosts.map((post) => (
                            <tr key={post._id}>
                              <td>{post.title}</td>
<td>
  {post.realAuthor?.name || (post.author?.Name || 'Inconnu')}
  {post.isAnonymous && (
    <Badge color="secondary" pill className="ms-2">
      Publié comme: {post.anonymousPseudo}
    </Badge>
  )}
</td>                              <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                              <td>
                                <Badge color={post.distressAlerted ? 'info' : 'warning'}>
                                  {post.distressAlerted ? 'Alerte envoyée' : 'Détresse détectée'}
                                </Badge>
                              </td>
                              <td>
                                <Button 
                                  color="primary" 
                                  size="sm"
                                  onClick={() => handleViewPost(post)}
                                >
                                  Voir
                                </Button>
                                {!post.distressAlerted && (
                                  <Button 
                                    color="warning" 
                                    size="sm" 
                                    className="ms-2"
                                    onClick={() => alertPsychologists(post._id)}
                                  >
                                    Alerter psychiatre
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center">
                              Aucune publication avec signes de détresse trouvée
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Modal for displaying inappropriate comments */}
      <Modal isOpen={modalOpen} toggle={() => setModalOpen(!modalOpen)} size="lg">
        <ModalHeader toggle={() => setModalOpen(!modalOpen)}>
          Commentaires inappropriés - {selectedUser?.Name}
        </ModalHeader>
        <ModalBody>
          {badComments.length > 0 ? (
            <Table striped>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Publication</th>
                  <th>Commentaire</th>
                  <th>Raison du signalement</th>
                </tr>
              </thead>
              <tbody>
                {badComments.map((comment) => (
                  <tr key={comment._id}>
                    <td>{new Date(comment.createdAt).toLocaleDateString()}</td>
                    <td>
                      <a href={`/blog/${comment.postId}`} target="_blank" rel="noreferrer">
                        {comment.postTitle}
                      </a>
                    </td>
                    <td>{comment.content}</td>
                    <td>{comment.flagReason || 'Contenu inapproprié'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>Aucun commentaire inapproprié trouvé.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setModalOpen(false)}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal for displaying stress post details */}
      <Modal isOpen={postModalOpen} toggle={() => setPostModalOpen(!postModalOpen)} size="lg">
        <ModalHeader toggle={() => setPostModalOpen(!postModalOpen)}>
          Détails de la publication
        </ModalHeader>
        <ModalBody>
          {selectedPost && (
            <div>
              <h5>{selectedPost.title}</h5>
              <p>
  <strong>Auteur:</strong> {selectedPost.realAuthor?.name || selectedPost.author?.Name || 'Inconnu'}
  {selectedPost.isAnonymous && (
    <Badge color="secondary" pill className="ms-2">
      Publié comme: {selectedPost.anonymousPseudo}
    </Badge>
  )}
</p>
              <p><strong>Date:</strong> {new Date(selectedPost.createdAt).toLocaleString()}</p>
              <div className="mt-3">
                <h6>Contenu:</h6>
                <div 
                  className="p-3 bg-light border rounded" 
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                  style={{ maxHeight: '300px', overflow: 'auto', color: 'black' }}
                />
              </div>
              {selectedPost.distressAlerted && (
                <div className="mt-3">
                  <Badge color="info" pill className="p-2">
                    Alerte envoyée le {new Date(selectedPost.distressAlertedAt).toLocaleString()}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {selectedPost && !selectedPost.distressAlerted && (
            <Button 
              color="warning" 
              onClick={() => {
                alertPsychologists(selectedPost._id);
                setPostModalOpen(false);
              }}
            >
              Alerter un psychiatre
            </Button>
          )}
        
          <Button color="secondary" onClick={() => setPostModalOpen(false)}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default BlogAdmin;