import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, FormGroup, Label, Input, InputGroup, InputGroupText } from 'reactstrap';
import { H6, Image, LI, UL } from '../../AbstractElements';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaSearch, FaHeart, FaUser, FaTrash } from 'react-icons/fa'; // Add FaTrash for delete icon
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

// Styles CSS personnalisés
const cardStyles = {
  card: {
    height: '480px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '15px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    background: 'linear-gradient(145deg, #ffffff, #f0f4f8)',
    overflow: 'hidden',
  },
  cardHover: {
    transform: 'translateY(-10px)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
  },
  image: {
    width: '100%',
    height: '220px',
    objectFit: 'cover',
    borderTopLeftRadius: '15px',
    borderTopRightRadius: '15px',
    transition: 'transform 0.3s ease',
  },
  imageHover: {
    transform: 'scale(1.05)',
  },
  content: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    background: '#fff',
    borderBottomLeftRadius: '15px',
    borderBottomRightRadius: '15px',
  },
  dateContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  date: {
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'nowrap',
    background: 'linear-gradient(90deg, #6a11cb, #2575fc)',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  badge: {
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '8px 12px',
    background: '#f7c948',
    color: '#333',
    borderRadius: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '10px',
    transition: 'color 0.3s ease',
  },
  titleHover: {
    color: '#2575fc',
  },
  body: {
    flex: '1 1 auto',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    marginBottom: '15px',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  footer: {
    marginTop: 'auto',
    minHeight: '50px',
    borderTop: '1px solid #eee',
    paddingTop: '10px',
  },
  sortContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    gap: '15px',
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
  },
  searchInput: {
    width: '300px',
    borderRadius: '25px',
    border: '1px solid #ddd',
    padding: '10px 15px',
    boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.05)',
    transition: 'border-color 0.3s ease',
  },
  searchInputFocus: {
    borderColor: '#2575fc',
    outline: 'none',
  },
  formGroup: {
    marginBottom: 0,
    display: 'flex',
    alignItems: 'center',
  },
  label: {
    marginBottom: 0,
    marginRight: '10px',
    fontWeight: '500',
    color: '#333',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  select: {
    borderRadius: '25px',
    padding: '8px 15px',
    border: '1px solid #ddd',
    background: '#fff',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
    transition: 'border-color 0.3s ease',
  },
  selectFocus: {
    borderColor: '#2575fc',
    outline: 'none',
  },
  likeIcon: {
    marginRight: '5px',
    color: '#ff4d4f',
    transition: 'color 0.3s ease',
  },
  likeIconHover: {
    color: '#e63946',
  },
  deleteIcon: {
    marginRight: '5px',
    color: '#dc3545',
    transition: 'color 0.3s ease',
    cursor: 'pointer',
  },
  deleteIconHover: {
    color: '#c82333',
  },
  userContainer: {
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'normal',
    overflow: 'visible',
    maxWidth: '100%',
    color: '#555',
    fontSize: '14px',
  },
  userIcon: {
    marginRight: '5px',
    color: '#6a11cb',
  },
};

const BlogDetailContain = () => {
  const [posts, setPosts] = useState([]);
  const [sortOption, setSortOption] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredLike, setHoveredLike] = useState(null);
  const [hoveredDelete, setHoveredDelete] = useState(null); // État pour gérer le survol des icônes de suppression

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

  // Récupérer les publications
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/posts');
        console.log('Publications récupérées:', response.data);
        setPosts(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des posts:', error.response?.data || error.message);
      }
    };
    fetchPosts();
  }, []);

  // Fonction pour supprimer une publication
  const handleDelete = async (postId) => {
    if (!currentUser) {
      Swal.fire({
        icon: 'warning',
        title: 'Non connecté',
        text: 'Veuillez vous connecter pour supprimer une publication.',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous ne pourrez pas récupérer cette publication après suppression.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await axios.delete(`http://localhost:5000/api/posts/${postId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Update the posts list with the updated data from the server
        setPosts(response.data.posts);

        Swal.fire({
          icon: 'success',
          title: 'Publication supprimée !',
          text: 'Votre publication a été supprimée avec succès.',
        });
      } catch (error) {
        console.error('Erreur lors de la suppression:', error.response?.data || error.message);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.response?.data?.message || 'Une erreur est survenue lors de la suppression.',
        });
      }
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('fr-FR', { month: 'long' });
    return { day, month };
  };

  const filterPosts = (postsToFilter) => {
    let filtered = [...postsToFilter];

    if (searchQuery) {
      filtered = filtered.filter((post) =>
        post.title?.toLowerCase().startsWith(searchQuery.toLowerCase())
      );
    }

    if (sortOption === 'myPosts') {
      if (!currentUser) {
        Swal.fire({
          icon: 'warning',
          title: 'Non connecté',
          text: 'Veuillez vous connecter pour voir vos publications.',
        });
        setSortOption('date');
        return postsToFilter;
      }

      filtered = filtered.filter((post) =>
        post.author?._id.toString() === currentUser._id.toString()
      );
    }

    return filtered;
  };

  const sortPosts = (postsToSort) => {
    const sortedPosts = [...postsToSort];

    if (sortOption === 'date' || sortOption === 'myPosts') {
      sortedPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      });
    } else if (sortOption === 'comments') {
      sortedPosts.sort((a, b) => {
        const commentsA = a.comments?.length || 0;
        const commentsB = b.comments?.length || 0;
        return commentsB - commentsA;
      });
    }

    return sortedPosts;
  };

  const filteredPosts = filterPosts(posts);
  const sortedPosts = sortPosts(filteredPosts);

  return (
    <Fragment>
      <Container fluid={true} className="blog-page">
        <Row>
          <Col sm="12">
            <div style={cardStyles.sortContainer}>
              <FormGroup style={cardStyles.formGroup}>
                <InputGroup style={cardStyles.inputGroup}>
                  <InputGroupText>
                    <FaSearch />
                  </InputGroupText>
                  <Input
                    type="text"
                    placeholder="Rechercher par titre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={cardStyles.searchInput}
                    onFocus={(e) => (e.target.style.borderColor = cardStyles.searchInputFocus.borderColor)}
                    onBlur={(e) => (e.target.style.borderColor = '1px solid #ddd')}
                  />
                </InputGroup>
              </FormGroup>

              <FormGroup style={cardStyles.formGroup}>
                <Label for="sortOption" style={cardStyles.label}>
                  Trier:
                </Label>
                <Input
                  type="select"
                  name="sortOption"
                  id="sortOption"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  style={cardStyles.select}
                  onFocus={(e) => (e.target.style.borderColor = cardStyles.selectFocus.borderColor)}
                  onBlur={(e) => (e.target.style.borderColor = '1px solid #ddd')}
                >
                  <option value="date">Date</option>
                  <option value="comments">Nombre de commentaires</option>
                  <option value="myPosts">Mes posts</option>
                </Input>
              </FormGroup>
            </div>
          </Col>
        </Row>

        <Row>
          {sortedPosts.length > 0 ? (
            sortedPosts.map((post) => {
              console.log('Post dans BlogDetailContain:', post);
              const isHovered = hoveredCard === post._id;
              const isLikeHovered = hoveredLike === post._id;
              const isDeleteHovered = hoveredDelete === post._id;
              const isAuthor = currentUser && post.author?._id.toString() === currentUser._id.toString();

              return (
                <Col sm="6" xl="3" className="box-col-6 des-xl-50" key={post._id}>
                  <Card
                    style={{
                      ...cardStyles.card,
                      ...(isHovered ? cardStyles.cardHover : {}),
                    }}
                    onMouseEnter={() => setHoveredCard(post._id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="blog-box blog-grid">
                      <div className="blog-wrraper">
                        <Link to={`${process.env.PUBLIC_URL}/blog/${post._id}`}>
                          <Image
                            attrImage={{
                              className: 'img-fluid top-radius-blog',
                              style: {
                                ...cardStyles.image,
                                ...(isHovered ? cardStyles.imageHover : {}),
                              },
                              src: post.imageUrl ? `http://localhost:5000${post.imageUrl}` : getRandomImageForPost(post._id),
                              alt: post.title || 'Publication',
                            }}
                          />
                        </Link>
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
                        <H6
                          attrH6={{
                            className: 'blog-bottom-details',
                            style: {
                              ...cardStyles.title,
                              ...(isHovered ? cardStyles.titleHover : {}),
                            },
                          }}
                        >
                          <Link to={`${process.env.PUBLIC_URL}/blog/${post._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            {post.title || 'Titre non disponible'}
                          </Link>
                        </H6>
                        <div
                          style={cardStyles.body}
                          dangerouslySetInnerHTML={{ __html: post.content || 'Contenu non disponible' }}
                        />
                        <div className="detail-footer" style={cardStyles.footer}>
                          <ul style={{ display: 'flex', listStyle: 'none', padding: 0, margin: 0, alignItems: 'center' }}>
                            <li style={{ marginRight: '15px', color: 'black !important', visibility: 'visible', fontSize: '16px' }}>
                              <div style={cardStyles.userContainer}>
                                <FaUser style={cardStyles.userIcon} />
                                {(() => {
                                  const isAnonymousBool = post.isAnonymous === true || post.isAnonymous === 'true';
                                  console.log('Affichage auteur - Post:', post.title, 'isAnonymous:', post.isAnonymous, 'isAnonymousBool:', isAnonymousBool, 'anonymousPseudo:', post.anonymousPseudo, 'author:', post.author);
                                  return isAnonymousBool ? (post.anonymousPseudo || 'Anonyme') : (post.author?.Name || 'Inconnu');
                                })()}
                              </div>
                            </li>
                            <li style={{ marginRight: '15px' }}>
                              <i className="fa fa-comments-o"></i> {post.comments?.length || 0}
                            </li>
                            <li
                              onMouseEnter={() => setHoveredLike(post._id)}
                              onMouseLeave={() => setHoveredLike(null)}
                            >
                              <FaHeart
                                style={{
                                  ...cardStyles.likeIcon,
                                  ...(isLikeHovered ? cardStyles.likeIconHover : {}),
                                }}
                              />
                              {post.likes?.length || 0}
                            </li>
                            {isAuthor && (
                              <li
                                onMouseEnter={() => setHoveredDelete(post._id)}
                                onMouseLeave={() => setHoveredDelete(null)}
                                onClick={() => handleDelete(post._id)}
                                style={{ marginLeft: '10px' }}
                              >
                                <FaTrash
                                  style={{
                                    ...cardStyles.deleteIcon,
                                    ...(isDeleteHovered ? cardStyles.deleteIconHover : {}),
                                  }}
                                />
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })
          ) : (
            <Col sm="12">
              <p className="text-center" style={{ color: '#666', fontSize: '16px' }}>
                Aucune publication disponible.
              </p>
            </Col>
          )}
        </Row>
      </Container>
    </Fragment>
  );
};

export default BlogDetailContain;