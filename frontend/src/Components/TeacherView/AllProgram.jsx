import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Input, Label, FormGroup, InputGroup, InputGroupText, Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Breadcrumbs, Image, H6, LI, UL, P } from '../../AbstractElements';
import { useNavigate, Link } from 'react-router-dom';
import ProgramService from '../../Services/TeacherTraining/ProgramService';

const AllProgram = () => {
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('creationDate');
  const [userRole, setUserRole] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(prevState => !prevState);
  const navigate = useNavigate();

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        const userResponse = await fetch("http://localhost:5000/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!userResponse.ok) throw new Error(`HTTP Error ${userResponse.status}`);
        const userData = await userResponse.json();
        const isTeacher = userData.Role && userData.Role.includes("teacher");
        setUserRole(isTeacher ? "teacher" : null);

        // If the user is not a teacher, redirect to the error page
        if (!isTeacher) {
          navigate("/tivo/error/error-page2", { replace: true });
        }
      } catch (err) {
        console.error("Error retrieving user data:", err);
        setUserRole(null);
        // Redirect to error page on error
        navigate("/tivo/error/error-page2", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [navigate]);

  // Fetch programs function
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const programData = await ProgramService.getAllPrograms();
      setPrograms(programData);
      setFilteredPrograms(programData);
      console.log(programData);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch programs only if the user is a teacher
  useEffect(() => {
    if (userRole === "teacher") {
      fetchPrograms();
    }
  }, [userRole]);

  // Handle search and sorting whenever searchTerm or sortOption changes
  useEffect(() => {
    let updatedPrograms = [...programs];

    // Filter by search term (case-insensitive)
    if (searchTerm) {
      updatedPrograms = updatedPrograms.filter(program =>
        program.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort based on the selected option
    if (sortOption === 'mostRecommended') {
      updatedPrograms.sort((a, b) => (b.recommendedBy?.length || 0) - (a.recommendedBy?.length || 0));
    } else if (sortOption === 'creationDate') {
      updatedPrograms.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
    }

    setFilteredPrograms(updatedPrograms);
  }, [searchTerm, sortOption, programs]);

  const handleViewDetails = (programId, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`${process.env.PUBLIC_URL}/teacher-training/view-details/${programId}`);
  };

  // Format the creation date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Show loading state while fetching user role
  if (loading) {
    return (
      <Container fluid style={styles.loading}>
        <div>Loading...</div>
      </Container>
    );
  }

  // Get sort option display name
  const getSortDisplayName = () => {
    switch (sortOption) {
      case 'creationDate':
        return 'Newest First';
      case 'mostRecommended':
        return 'Most Recommended';
      default:
        return 'Sort By';
    }
  };

  return (
    <Fragment>
      <Breadcrumbs mainTitle="Program List" parent="Teacher Training" title="Program List" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardBody>
                {/* Enhanced Search and Sort Controls */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
                  <div className="search-container" style={styles.searchContainer}>
                    <InputGroup className="search-form" style={styles.searchGroup}>
                      <InputGroupText style={styles.searchIcon}>
                        <i className="fa fa-search"></i>
                      </InputGroupText>
                      <Input
                        type="text"
                        style={styles.searchInput}
                        placeholder="Search programs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <Button
                          color="link"
                          style={styles.clearButton}
                          onClick={() => setSearchTerm('')}
                        >
                          <i className="fa fa-times"></i>
                        </Button>
                      )}
                    </InputGroup>
                    {searchTerm && (
                      <div style={styles.searchResults}>
                        <small>{filteredPrograms.length} program(s) found</small>
                      </div>
                    )}
                  </div>
                  
                  <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown} direction="down">
                    <DropdownToggle caret style={styles.sortDropdownToggle}>
                      <i className="fa fa-sort-amount-down me-1"></i> {getSortDisplayName()}
                    </DropdownToggle>
                    <DropdownMenu end style={styles.sortDropdownMenu}>
                      <DropdownItem
                        active={sortOption === 'creationDate'}
                        onClick={() => setSortOption('creationDate')}
                      >
                        <i className="fa fa-calendar-alt me-2"></i> Newest First
                      </DropdownItem>
                      <DropdownItem
                        active={sortOption === 'mostRecommended'}
                        onClick={() => setSortOption('mostRecommended')}
                      >
                        <i className="fa fa-thumbs-up me-2"></i> Most Recommended
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>

                <Fragment>
                  {loading ? (
                    <div style={styles.loading}>Loading programs...</div>
                  ) : (
                    <Row>
                      {filteredPrograms.length > 0 ? (
                        filteredPrograms.map((program, i) => (
                          <Col xl="2" className='xl-50 box-col-6' sm="6" key={program._id || i}>
                            <Card>
                              <div className="learning-box product-box">
                                <div className="product-img">
                                  <Image 
                                    attrImage={{ 
                                      className: 'img-fluid top-radius-blog', 
                                      src: program.imgUrl 
                                        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${program.imgUrl}` 
                                        : require('../../assets/images/default-prog.jpg'),
                                      alt: program.title 
                                    }} 
                                  />
                                  <div className="product-hover">
                                    <UL attrUL={{ className: 'simple-list d-flex flex-row' }}>
                                      <LI>
                                        <Link 
                                          to={`${process.env.PUBLIC_URL}/teacher-training/view-details/${program._id}`}
                                          onClick={(e) => handleViewDetails(program._id, e)}
                                        >
                                          <i className="icon-eye"></i>
                                        </Link>
                                      </LI>
                                    </UL>
                                  </div>
                                </div>
                                <div className="details-main">
                                  <Link to={`${process.env.PUBLIC_URL}/teacher-training/view-details/${program._id}`}>
                                    <div className='bottom-details'>
                                      <H6>{program.title}</H6>
                                    </div>
                                  </Link>
                                  <P>{program.description}</P>
                                  <P className="text-muted">
                                    <small>Created on: {formatDate(program.creationDate)}</small>
                                  </P>
                                </div>
                              </div>
                            </Card>
                          </Col>
                        ))
                      ) : (
                        <Col>
                          <div style={styles.noResults}>
                            <i className="fa fa-search" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                            <P>No programs found</P>
                            <P className="text-muted">Try adjusting your search or filters</P>
                          </div>
                        </Col>
                      )}
                    </Row>
                  )}
                </Fragment>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

// Enhanced styles
const styles = {
  loading: {
    textAlign: "center",
    marginTop: "100px",
    fontSize: "20px",
    color: "#718096",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
  searchContainer: {
    position: 'relative',
    maxWidth: '450px',
    width: '100%',
  },
  searchGroup: {
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.08)',
    borderRadius: '50px',
    overflow: 'hidden',
    border: '1px solid #e6e6e6',
    transition: 'all 0.3s ease',
  },
  searchIcon: {
    background: 'transparent',
    border: 'none',
    color: '#7366ff',
    paddingLeft: '18px',
  },
  searchInput: {
    border: 'none',
    boxShadow: 'none',
    padding: '12px 15px 12px 5px',
    fontSize: '14px',
    background: 'transparent',
  },
  clearButton: {
    background: 'transparent',
    border: 'none',
    color: '#999',
    padding: '0 15px',
  },
  searchResults: {
    color: '#666',
    marginTop: '8px',
    marginLeft: '10px',
  },
  sortDropdownToggle: {
    backgroundColor: '#f8f9fa',
    color: '#7366ff',
    borderColor: '#e9ecef',
    borderRadius: '50px',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  sortDropdownMenu: {
    minWidth: '200px',
    padding: '8px 0',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
    border: 'none',
    borderRadius: '10px',
  },
  noResults: {
    textAlign: 'center',
    padding: '50px 0',
    color: '#718096',
  },
};

export default AllProgram;