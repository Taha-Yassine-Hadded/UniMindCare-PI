import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Nav, NavItem, NavLink, TabContent, TabPane, Table, Button } from 'reactstrap';
import { Breadcrumbs } from '../../AbstractElements';
import { useParams } from 'react-router-dom';
import ContentService from '../../Services/TeacherTraining/ContentService';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import Swal from 'sweetalert2';
import CommonModal from "../UiKits/Modals/common/modal";
import jsPDF from 'jspdf';

const ViewProgramDetails = () => {
  const { id } = useParams();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [programTitle, setProgramTitle] = useState('Program Details');
  const [programDescription, setProgramDescription] = useState('');
  const [activeTab, setActiveTab] = useState('1');
  const [modal, setModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const fetchProgramDetails = async () => {
    try {
      const programData = await ProgramService.getProgramDetails(id);
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

  useEffect(() => {
    fetchProgramDetails();
    fetchProgramContents();
  }, [id]);

  const getContentByType = (type) => {
    return contents.filter(content => content.type === type);
  };

  const getEmbedUrl = (url) => {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  const handleDelete = async (contentId) => {
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
          await ContentService.deleteContent(contentId);
          Swal.fire(
            'Deleted!',
            'The content has been deleted.',
            'success'
          );
          fetchProgramContents();
        } catch (err) {
          console.error('Error deleting content:', err);
          Swal.fire(
            'Error!',
            'Failed to delete the content.',
            'error'
          );
        }
      }
    });
  };

  const handleViewQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setModal(true);
  };

  const toggleModal = () => {
    setModal(!modal);
    if (!modal) {
      setSelectedQuiz(null);
    }
  };

  const handleDownloadQuiz = (quiz) => {
    const doc = new jsPDF();
    let yOffset = 10;

    doc.setFontSize(16);
    doc.text(`Quiz: ${quiz.title || 'Untitled'}`, 10, yOffset);
    yOffset += 10;

    if (quiz.questions && quiz.questions.length > 0) {
      doc.setFontSize(12);
      quiz.questions.forEach((question, index) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${question.text || 'Question not specified'}`, 10, yOffset);
        yOffset += 6;

        doc.setFont('helvetica', 'normal');
        if (question.options && question.options.length > 0) {
          question.options.forEach((option, optIndex) => {
            const isCorrect = option === question.correctAnswer;
            if (isCorrect) {
              doc.setTextColor(0, 128, 0);
            } else {
              doc.setTextColor(0, 0, 0);
            }
            doc.text(`   ${String.fromCharCode(97 + optIndex)}. ${option}`, 10, yOffset);
            yOffset += 5;
          });
        }
        yOffset += 5;
      });
    } else {
      doc.setFontSize(12);
      doc.text('No questions available for this quiz.', 10, yOffset);
    }

    doc.save(`${quiz.title || 'quiz'}.pdf`);
  };

  const handleDownloadPDF = (content) => {
    if (content.contentUrl) {
      const link = document.createElement('a');
      link.href = content.contentUrl;
      link.download = '';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Swal.fire('Error!', 'PDF URL not available.', 'error');
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
                  <>
                    <Nav tabs>
                      <NavItem>
                        <NavLink
                          className={activeTab === '1' ? 'active bg-primary text-white' : ''}
                          onClick={() => setActiveTab('1')}
                          style={activeTab === '1' ? { color: 'white' } : { color: '#333' }}
                        >
                          <i className="icofont icofont-file-document" style={activeTab === '1' ? { color: 'white' } : { color: '#333' }}></i> Files
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={activeTab === '2' ? 'active bg-primary text-white' : ''}
                          onClick={() => setActiveTab('2')}
                          style={activeTab === '2' ? { color: 'white' } : { color: '#333' }}
                        >
                          <i className="icofont icofont-video-alt" style={activeTab === '2' ? { color: 'white' } : { color: '#333' }}></i> Videos
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={activeTab === '3' ? 'active bg-primary text-white' : ''}
                          onClick={() => setActiveTab('3')}
                          style={activeTab === '3' ? { color: 'white' } : { color: '#333' }}
                        >
                          <i className="icofont icofont-calendar" style={activeTab === '3' ? { color: 'white' } : { color: '#333' }}></i> Meetings
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={activeTab === '4' ? 'active bg-primary text-white' : ''}
                          onClick={() => setActiveTab('4')}
                          style={activeTab === '4' ? { color: 'white' } : { color: '#333' }}
                        >
                          <i className="icofont icofont-question-circle" style={activeTab === '4' ? { color: 'white' } : { color: '#333' }}></i> Quizzes
                        </NavLink>
                      </NavItem>
                    </Nav>

                    <TabContent activeTab={activeTab}>
                      <TabPane className="fade show" tabId="1">
                        {getContentByType('pdf').length > 0 ? (
                          <Table responsive className="mt-3">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Content</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getContentByType('pdf').map((content) => (
                                <tr key={content._id || content.id}>
                                  <td>{content.title || 'Untitled'}</td>
                                  <td>
                                    {content.contentUrl ? (
                                      <Button
                                        color="primary"
                                        size="sm"
                                        onClick={() => handleDownloadPDF(content)}
                                        title="Download PDF"
                                      >
                                        <i className="fa fa-download"></i> Download PDF
                                      </Button>
                                    ) : (
                                      'PDF not available'
                                    )}
                                  </td>
                                  <td>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onClick={() => handleDelete(content._id || content.id)}
                                      title="Delete"
                                    >
                                      <i className="fa fa-trash"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <p className="mt-3">No files found.</p>
                        )}
                      </TabPane>

                      <TabPane tabId="2">
                        {getContentByType('video').length > 0 ? (
                          <Table responsive className="mt-3">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Content</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getContentByType('video').map((content) => (
                                <tr key={content._id || content.id}>
                                  <td>{content.title || 'Untitled'}</td>
                                  <td>
                                    {content.contentUrl ? (
                                      <iframe
                                        width="320"
                                        height="240"
                                        src={getEmbedUrl(content.contentUrl)}
                                        title={content.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      ></iframe>
                                    ) : (
                                      'Video URL not available'
                                    )}
                                  </td>
                                  <td>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onClick={() => handleDelete(content._id || content.id)}
                                      title="Delete"
                                    >
                                      <i className="fa fa-trash"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <p className="mt-3">No videos found.</p>
                        )}
                      </TabPane>

                      <TabPane tabId="3">
                        {getContentByType('meet').length > 0 ? (
                          <Table responsive className="mt-3">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Scheduled Date</th>
                                <th>Join Meeting</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getContentByType('meet').map((content) => (
                                <tr key={content._id || content.id}>
                                  <td>{content.title || 'Untitled'}</td>
                                  <td>
                                    {content.scheduledDate ? new Date(content.scheduledDate).toLocaleString() : 'N/A'}
                                  </td>
                                  <td>
                                    {content.meetingLink ? (
                                      <Button
                                        color="primary"
                                        size="sm"
                                        href={content.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Join Meeting"
                                      >
                                        <i className="fa fa-link"></i>
                                      </Button>
                                    ) : (
                                      'N/A'
                                    )}
                                  </td>
                                  <td>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onClick={() => handleDelete(content._id || content.id)}
                                      title="Delete"
                                    >
                                      <i className="fa fa-trash"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <p className="mt-3">No meetings found.</p>
                        )}
                      </TabPane>

                      <TabPane tabId="4">
                        {getContentByType('quiz').length > 0 ? (
                          <Table responsive className="mt-3">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Questions</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getContentByType('quiz').map((content) => (
                                <tr key={content._id || content.id}>
                                  <td>{content.title || 'Untitled'}</td>
                                  <td>{content.questions.length} questions</td>
                                  <td>
                                    <Button
                                      color="warning"
                                      size="sm"
                                      className="me-2"
                                      onClick={() => handleViewQuiz(content)}
                                      title="View"
                                    >
                                      <i className="fa fa-eye"></i>
                                    </Button>
                                    <Button
                                      color="primary"
                                      size="sm"
                                      className="me-2"
                                      onClick={() => handleDownloadQuiz(content)}
                                      title="Download as PDF"
                                    >
                                      <i className="fa fa-download"></i>
                                    </Button>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onClick={() => handleDelete(content._id || content.id)}
                                      title="Delete"
                                    >
                                      <i className="fa fa-trash"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <p className="mt-3">No quizzes found.</p>
                        )}
                      </TabPane>
                    </TabContent>
                  </>
                )}

                <CommonModal
                  isOpen={modal}
                  title={selectedQuiz ? `Quiz: ${selectedQuiz.title || 'Untitled'}` : 'Quiz Details'}
                  toggler={toggleModal}
                  size="lg"
                  primaryBtnText="Close"
                  onPrimaryBtnClick={toggleModal}
                  showSecondaryBtn={false}
                >
                  {selectedQuiz && (
                    <div>
                      <h6>Questions:</h6>
                      {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
                        <ol>
                          {selectedQuiz.questions.map((question, index) => (
                            <li key={index} style={{ marginBottom: '20px' }}>
                              <strong>{question.text || 'Question not specified'}</strong>
                              <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                                {question.options && question.options.map((option, optIndex) => (
                                  <li key={optIndex}>
                                    <span
                                      style={{
                                        color: option === question.correctAnswer ? 'green' : 'black',
                                        fontWeight: option === question.correctAnswer ? 'bold' : 'normal'
                                      }}
                                    >
                                      {option}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p>No questions available for this quiz.</p>
                      )}
                    </div>
                  )}
                </CommonModal>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default ViewProgramDetails;