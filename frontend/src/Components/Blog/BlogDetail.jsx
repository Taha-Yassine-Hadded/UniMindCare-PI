// BlogDetailContain.js
import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, FormGroup, Label, Input, InputGroup, InputGroupText } from 'reactstrap';
import { H6, Image, LI, UL } from '../../AbstractElements';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaSearch, FaHeart } from 'react-icons/fa';
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

// Ajoute des styles CSS personnalisés
// Ajoute des styles CSS personnalisés
const cardStyles = {
  card: {
    height: '450px', // Augmenter la hauteur pour donner plus d'espace
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
    minHeight: '60px', 
  },
  sortContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '10px',
  },
  searchInput: {
    width: '250px',
  },
  formGroup: {
    marginBottom: 0,
    display: 'flex',
    alignItems: 'center',
  },
  label: {
    marginBottom: 0,
    marginRight: '10px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  likeIcon: {
    marginRight: '5px',
  },
  userContainer: {
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'normal', // Permettre au texte de s'étendre sur plusieurs lignes
    overflow: 'visible', // Éviter que le texte soit coupé
    maxWidth: '100%', // S'assurer que le conteneur ne dépasse pas la largeur disponible
  },
  userIcon: {
    marginRight: '5px', // Espace entre l'icône et le texte
  },
};

const BlogDetailContain = () => {
  const [posts, setPosts] = useState([]);
  const [sortOption, setSortOption] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');
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
              console.log('Post dans BlogDetailContain:', post); // Log pour inspecter les données
              return (
                <Col sm="6" xl="3" className="box-col-6 des-xl-50" key={post._id}>
                  <Link to={`${process.env.PUBLIC_URL}/blog/${post._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Card style={cardStyles.card}>
                      <div className="blog-box blog-grid">
                        <div className="blog-wrraper">
                          <Image
                            attrImage={{
                              className: 'img-fluid top-radius-blog',
                              style: cardStyles.image,
                              src: post.imageUrl ? `http://localhost:5000${post.imageUrl}` : getRandomImageForPost(post._id),
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
                            <ul style={{ display: 'flex', listStyle: 'none', padding: 0, margin: 0 }}>
                            <li style={{ marginRight: '15px', color: 'black !important', visibility: 'visible', fontSize: '16px' }}>
  <div style={cardStyles.userContainer}>
    <i className="fa fa-user-o" style={cardStyles.userIcon}></i>
    {(() => {
      const isAnonymousBool = post.isAnonymous === true || post.isAnonymous === 'true';
      console.log('Affichage auteur - Post:', post.title, 'isAnonymous:', post.isAnonymous, 'isAnonymousBool:', isAnonymousBool, 'anonymousPseudo:', post.anonymousPseudo, 'author:', post.author);
      return isAnonymousBool ? (post.anonymousPseudo || 'Anonyme') : (post.author?.Name || 'Inconnu');
    })()}
  </div>
</li>
                              <li style={{ marginRight: '15px' }}>
                                <i className="fa fa-comments-o"></i>{post.comments?.length || 0} 
                              </li>
                              <li>
                                <FaHeart style={cardStyles.likeIcon} />
                                {post.likes?.length || 0} 
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </Col>
              );
            })
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