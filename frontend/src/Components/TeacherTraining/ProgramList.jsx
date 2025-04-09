import React, { Fragment, useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, CardBody, Input, Label, FormGroup } from 'reactstrap';
import { Btn, Breadcrumbs, Image, H6, LI, UL, P } from '../../AbstractElements';
import { useNavigate, Link } from 'react-router-dom';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import CommonModal from "../UiKits/Modals/common/modal";
import NewProgram from "./NewProgram";
import Swal from 'sweetalert2';
import ContentDistributionChart from './common/ContentDistributionChart'; // Import the chart component
import QuizPerformanceChart from './common/QuizPerformanceChart'; // Import the chart component

const ProgramList = () => {
  const [modal, setModal] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [loading, setLoading] = useState(true); // Updated to true initially for role fetching
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('creationDate');
  const [userRole, setUserRole] = useState(null); // State for user role

  const navigate = useNavigate();
  const toggle = () => setModal(!modal);
  const formRef = useRef(null);

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
        if (!userResponse.ok) throw new Error(`Erreur HTTP ${userResponse.status}`);
        const userData = await userResponse.json();
        const isPsychiatre = userData.Role && userData.Role.includes("psychiatre");
        setUserRole(isPsychiatre ? "psychiatre" : null);

        // If the user is not a psychiatrist, redirect to the error page
        if (!isPsychiatre) {
          navigate("/tivo/error/error-page2", { replace: true });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des données utilisateur :", err);
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
      const programData = await ProgramService.getMyPrograms();
      setPrograms(programData);
      setFilteredPrograms(programData);
      console.log(programData);
    } catch (error) {
      console.error('Error fetching programs:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Échec de la récupération des programmes : ' + error.message,
        confirmButtonText: 'OK',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch programs only if the user is a psychiatrist
  useEffect(() => {
    if (userRole === "psychiatre") {
      fetchPrograms();
    }
  }, [userRole]);

  // Handle search and sorting
  useEffect(() => {
    let updatedPrograms = [...programs];

    if (searchTerm) {
      updatedPrograms = updatedPrograms.filter(program =>
        program.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortOption === 'mostRecommended') {
      updatedPrograms.sort((a, b) => (b.recommendedBy?.length || 0) - (a.recommendedBy?.length || 0));
    } else if (sortOption === 'creationDate') {
      updatedPrograms.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
    }

    setFilteredPrograms(updatedPrograms);
  }, [searchTerm, sortOption, programs]);

  const handleProgramAdded = () => {
    fetchPrograms();
    setModal(false);
  };

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  };

  const handleViewDetails = (programId, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`${process.env.PUBLIC_URL}/teacher-training/program-details/${programId}`);
  };

  const handleDelete = async (programId, e) => {
    e.preventDefault();
    e.stopPropagation();

    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await ProgramService.deleteProgram(programId);
          Swal.fire(
            'Deleted!',
            'The program has been deleted.',
            'success'
          );
          fetchPrograms();
        } catch (err) {
          console.error('Error deleting program:', err);
          Swal.fire(
            'Error!',
            'Failed to delete the program.',
            'error'
          );
        }
      }
    });
  };

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
        <div>Chargement...</div>
      </Container>
    );
  }

  // If userRole is not "psychiatre", the redirection has already happened in useEffect
  // So, we only render the content if userRole is "psychiatre"
  return (
    <Fragment>
      <Breadcrumbs mainTitle="My Programs" parent="Teacher Training" title="My Programs" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardBody>
                <Fragment>
                  <Btn attrBtn={{ color: "success", onClick: toggle, className: "mb-3" }}>
                    <i className="fa fa-plus"></i> Add Program
                  </Btn>

                  <Row className="mb-4">
                    <Col md="6">
                      <FormGroup>
                        <Label for="searchProgram">Search by Title</Label>
                        <Input
                          type="text"
                          id="searchProgram"
                          placeholder="Enter program title..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <Label for="sortPrograms">Sort By</Label>
                        <Input
                          type="select"
                          id="sortPrograms"
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                        >
                          <option value="creationDate">Creation Date (Newest First)</option>
                          <option value="mostRecommended">Most Recommended</option>
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  {loading ? (
                    <div>Loading programs...</div>
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
                                      src: `${require('../../assets/images/default-prog.jpg')}`,
                                      alt: program.title 
                                    }} 
                                  />
                                  <div className="product-hover">
                                    <UL attrUL={{ className: 'simple-list d-flex flex-row' }}>
                                      <LI>
                                        <Link 
                                          to={`${process.env.PUBLIC_URL}/teacher-training/program-details/${program._id}`}
                                          onClick={(e) => handleViewDetails(program._id, e)}
                                        >
                                          <i className="icon-eye"></i>
                                        </Link>
                                      </LI>
                                      <LI>
                                        <Link 
                                          to="#"
                                          onClick={(e) => handleDelete(program._id, e)}
                                        >
                                          <i className="icon-trash"></i>
                                        </Link>
                                      </LI>
                                    </UL>
                                  </div>
                                </div>
                                <div className="details-main">
                                  <Link to={`${process.env.PUBLIC_URL}/teacher-training/program-details/${program._id}`}>
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
                          <P>No programs found</P>
                        </Col>
                      )}
                    </Row>
                  )}

                  {/* Add Charts Section */}
                  <div className="mt-5">
                    <h5>Program Statistics</h5>
                    <Row>
                      <Col md="6">
                        <ContentDistributionChart programs={programs} />
                      </Col>
                      <Col md="6">
                        <QuizPerformanceChart programs={programs} />
                      </Col>
                    </Row>
                  </div>

                  <CommonModal
                    isOpen={modal}
                    title="Add New Training Program"
                    toggler={toggle}
                    size="lg"
                    primaryBtnText="Save"
                    secondaryBtnText="Cancel"
                    onPrimaryBtnClick={handleSave}
                    onSecondaryBtnClick={toggle}
                  >
                    <NewProgram 
                      onProgramAdded={handleProgramAdded} 
                      toggler={toggle} 
                      ref={formRef} 
                    />
                  </CommonModal>
                </Fragment>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

// Reuse styles for the loading state
const styles = {
  loading: {
    textAlign: "center",
    marginTop: "100px",
    fontSize: "20px",
    color: "#718096",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
};

export default ProgramList;