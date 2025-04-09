import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Input, Label, FormGroup } from 'reactstrap';
import { Breadcrumbs, Image, H6, LI, UL, P } from '../../AbstractElements';
import { useNavigate, Link } from 'react-router-dom';
import ProgramService from '../../Services/TeacherTraining/ProgramService';

const AllProgram = () => {
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]); // Filtered and sorted programs
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State for search input
  const [sortOption, setSortOption] = useState('creationDate'); // State for sort option (default: creationDate)

  const navigate = useNavigate();

  // Fetch programs function
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const programData = await ProgramService.getAllPrograms();
      setPrograms(programData);
      setFilteredPrograms(programData); // Initialize filteredPrograms with all programs
      console.log(programData);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch programs on component mount
  useEffect(() => {
    fetchPrograms();
  }, []);

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

  return (
    <Fragment>
      <Breadcrumbs mainTitle="Program List" parent="Teacher Training" title="Program List" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardBody>
                {/* Search and Sort Controls */}
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

                <Fragment>
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
                          <P>No programs found</P>
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

export default AllProgram;