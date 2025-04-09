import React, { Fragment, useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import { Btn, Breadcrumbs, Image, H6, LI, UL, P } from '../../AbstractElements';
import { useNavigate, Link } from 'react-router-dom';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import CommonModal from "../UiKits/Modals/common/modal";
import NewProgram from "./NewProgram";

const ProgramList = () => {
  const [modal, setModal] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const toggle = () => setModal(!modal);
  const formRef = useRef(null);

  // Fetch programs function
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const programData = await ProgramService.getMyPrograms();
      setPrograms(programData);
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

                  {loading ? (
                    <div>Loading programs...</div>
                  ) : (
                    <Row>
                      {programs.length > 0 ? (
                        programs.map((program, i) => (
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
                                        <Link to="#">
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

export default ProgramList;