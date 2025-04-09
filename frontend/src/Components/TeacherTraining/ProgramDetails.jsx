import React, { Fragment, useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, CardBody } from 'reactstrap';
import { Breadcrumbs, Btn } from '../../AbstractElements';
import { useParams } from 'react-router-dom';
import ContentService from '../../Services/TeacherTraining/ContentService';
import ProgramService from '../../Services/TeacherTraining/ProgramService'; // Import ProgramService
import CommonModal from "../UiKits/Modals/common/modal";
import NewContent from "./NewContent";
import ContentAccordion from './common/ContentAccordion';

const ProgramDetails = () => {
  const { id } = useParams();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [programTitle, setProgramTitle] = useState('Program Details');
  const [programDescription, setProgramDescription] = useState('');
  const [modal, setModal] = useState(false);

  const toggle = () => setModal(!modal);
  const formRef = useRef(null);

  const fetchProgramDetails = async () => {
    try {
      const programData = await ProgramService.getProgramDetails(id); // Use ProgramService
      console.log(programData);
      setProgramTitle(programData.title || 'Program Details');
      setProgramDescription(programData.description || 'No description available.');
    } catch (err) {
      console.error('Error fetching program details:', err);
      setError('Failed to load program details. Please try again.');
    }
  };

  const fetchProgramContents = async () => {
    try {
      setLoading(true);
      setError(null);
      const contentData = await ContentService.getProgramContents(id);
      console.log('Fetched contents:', contentData);
      setContents(contentData);
    } catch (err) {
      console.error('Error fetching program contents:', err);
      setError('Failed to load program contents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = (contentId) => {
    console.log('handleDeleteContent called with ID:', contentId);
  };

  useEffect(() => {
    fetchProgramDetails();
    fetchProgramContents();
  }, [id]);

  const handleContentAdded = () => {
    fetchProgramContents();
    setModal(false);
  };

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  };

  return (
    <Fragment>
      <Breadcrumbs
        mainTitle="Program Content"
        parent="Teacher Training"
        title="Program Content"
      />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4>{programTitle}</h4>
                  <Btn attrBtn={{ color: "success", onClick: toggle }}>
                    <i className="fa fa-plus"></i> Add Content
                  </Btn>
                </div>

                <div className="mb-4">
                  <h6>Description</h6>
                  <p>{programDescription}</p>
                </div>

                {loading ? (
                  <p>Loading contents...</p>
                ) : error ? (
                  <p className="text-danger">{error}</p>
                ) : (
                  <ContentAccordion
                    contents={contents}
                    onDelete={handleDeleteContent}
                    onRefresh={fetchProgramContents}
                  />
                )}

                <CommonModal
                  isOpen={modal}
                  title="Add New Content"
                  toggler={toggle}
                  size="lg"
                  primaryBtnText="Save"
                  secondaryBtnText="Cancel"
                  onPrimaryBtnClick={handleSave}
                  onSecondaryBtnClick={toggle}
                >
                  <NewContent
                    trainingProgramId={id}
                    onContentAdded={handleContentAdded}
                    toggler={toggle}
                    ref={formRef}
                  />
                </CommonModal>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default ProgramDetails;