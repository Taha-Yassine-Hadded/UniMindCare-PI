import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Input, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Breadcrumbs } from '../../../../AbstractElements';
import HeadingCommon from '../../../../Common/Component/HeadingCommon';

const BlogAdmin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [badComments, setBadComments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
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
    fetchUsers();
  }, [navigate]);

  // Fetch all users including their inappropriate comment counts
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/admin', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
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

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const userName = user.Name || '';
    const userEmail = user.Email || '';
    
    const searchTermLower = searchTerm.toLowerCase();
    return userName.toLowerCase().includes(searchTermLower) ||
           userEmail.toLowerCase().includes(searchTermLower);
  });

  return (
    <React.Fragment>
      <Breadcrumbs mainTitle="Administration des utilisateurs" parent="Admin" title="Gestion utilisateurs" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <HeadingCommon CardHeaderClassName="pb-0" Heading="Gestion des utilisateurs" />
              <div className="card-body">
                <div className="d-flex justify-content-between mb-3">
                  <Input 
                    type="text" 
                    placeholder="Rechercher par nom ou email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '300px' }}
                  />
                  <Button color="primary" onClick={() => fetchUsers()}>Rafraîchir</Button>
                </div>
                
                {loading ? (
                  <div className="text-center my-3">Chargement des utilisateurs...</div>
                ) : (
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
    </React.Fragment>
  );
};

export default BlogAdmin;