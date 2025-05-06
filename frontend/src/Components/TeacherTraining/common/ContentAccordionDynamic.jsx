import React, { Fragment, useState } from 'react';
import { Card, CardBody, Collapse, Table, Button, Badge } from 'reactstrap';
import AccordianHeadingCommon from '../../UiKits/Accordian/common/AccordianHeadingCommon';
import ContentService from '../../../Services/TeacherTraining/ContentService';
import Swal from 'sweetalert2';
import CommonModal from '../../UiKits/Modals/common/modal';
import jsPDF from 'jspdf';

const ContentAccordionDynamic = ({ isOpen, toggle, contents, onDelete, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Updated categories - separated videos from articles and files
  const categories = [
    { id: 1, title: 'Videos', icon: 'fa fa-video-camera', types: ['video'] },
    { id: 2, title: 'Articles & Documents', icon: 'fa fa-file-text-o', types: ['article', 'link', 'pdf'] },
    { id: 3, title: 'Meetings', icon: 'fa fa-calendar', types: ['meet'] },
    { id: 4, title: 'Quizzes', icon: 'fa fa-question-circle', types: ['quiz'] }
  ];

  const getContentByType = (types) => {
    return contents.filter(content => types.includes(content.type));
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
          if (onRefresh) {
            onRefresh();
          }
          if (onDelete) {
            onDelete(contentId);
          }
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
    doc.setTextColor(0, 0, 0);
    doc.text(`Quiz: ${quiz.title || 'Untitled'}`, 10, yOffset);
    yOffset += 10;
  
    if (quiz.questions && quiz.questions.length > 0) {
      doc.setFontSize(12);
      quiz.questions.forEach((question, index) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${question.text || 'Question not specified'}`, 10, yOffset);
        yOffset += 6;
  
        doc.setFont('helvetica', 'normal');
        question.options?.forEach((option, optIndex) => {
          doc.setTextColor(0, 0, 0);
          doc.text(`   ${String.fromCharCode(97 + optIndex)}. ${option}`, 10, yOffset);
          yOffset += 5;
        });
  
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
  
  // Helper function to get a type badge for content
  const getTypeBadge = (type) => {
    switch (type) {
      case 'video':
        return <Badge color="danger">Video</Badge>;
      case 'article':
        return <Badge color="info">Article</Badge>;
      case 'link':
        return <Badge color="primary">Web Link</Badge>;
      case 'pdf':
        return <Badge color="warning">PDF</Badge>;
      case 'meet':
        return <Badge color="success">Meeting</Badge>;
      case 'quiz':
        return <Badge color="dark">Quiz</Badge>;
      default:
        return <Badge color="secondary">{type}</Badge>;
    }
  };

  // Function to truncate long URLs
  const truncateUrl = (url, maxLength = 50) => {
    if (!url) return '';
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  };

  return (
    <Fragment>
      {categories.map((category) => (
        <Card key={category.id} className="mb-3">
          <AccordianHeadingCommon
            toggle={toggle}
            BtnSpanText={
              <>
                <i className={category.icon} style={{ marginRight: '8px' }}></i>
                {category.title} ({getContentByType(category.types).length})
              </>
            }
            BtnOnClickParameter={category.id}
            CardHeaderClassName="bg-primary" // Set all headers to blue (bg-primary)
          />
          <Collapse isOpen={isOpen === category.id}>
            <CardBody>
              {getContentByType(category.types).length > 0 ? (
                <>
                  {/* Videos display */}
                  {category.id === 1 && (
                    <div className="row">
                      {getContentByType(category.types).map((content) => (
                        <div key={content._id || content.id} className="col-md-6 col-lg-4 mb-4">
                          <div className="card h-100 shadow-sm">
                            <div className="embed-responsive embed-responsive-16by9">
                              {content.contentUrl ? (
                                <iframe
                                  className="card-img-top"
                                  style={{ height: "200px" }}
                                  src={getEmbedUrl(content.contentUrl)}
                                  title={content.title}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              ) : (
                                <div className="text-center py-5 bg-light">Video not available</div>
                              )}
                            </div>
                            <div className="card-body">
                              <h6 className="card-title">{content.title || 'Untitled'}</h6>
                              {content.description && (
                                <p className="card-text small text-muted">{content.description}</p>
                              )}
                            </div>
                            <div className="card-footer bg-white d-flex justify-content-between">
                              <Button
                                color="primary"
                                size="sm"
                                onClick={() => window.open(content.contentUrl, '_blank')}
                              >
                                <i className="fa fa-play me-1"></i> Watch
                              </Button>
                              <Button
                                color="danger"
                                size="sm"
                                onClick={() => handleDelete(content._id || content.id)}
                              >
                                <i className="fa fa-trash"></i>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Articles & Documents display */}
                  {category.id === 2 && (
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th style={{width: "40px"}}></th>
                          <th>Title</th>
                          <th>URL</th>
                          <th style={{width: "100px"}}>Type</th>
                          <th style={{width: "130px"}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getContentByType(category.types).map((content) => (
                          <tr key={content._id || content.id}>
                            <td>
                              <i className={`fa fa-${
                                content.type === 'pdf' ? 'file-pdf-o text-danger' : 
                                content.type === 'article' || content.type === 'link' ? 'file-text-o text-primary' : 
                                'file-o text-muted'
                              }`}></i>
                            </td>
                            <td>
                              <div>
                                <strong>{content.title || 'Untitled'}</strong>
                                {content.description && (
                                  <div className="small text-muted mt-1">{content.description.substring(0, 60)}{content.description.length > 60 ? '...' : ''}</div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="text-truncate" style={{maxWidth: "250px"}}>
                                <a 
                                  href={content.contentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-primary small"
                                >
                                  {truncateUrl(content.contentUrl)}
                                </a>
                              </div>
                            </td>
                            <td>{getTypeBadge(content.type)}</td>
                            <td>
                              <div className="d-flex">
                                <Button
                                  color="primary"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => window.open(content.contentUrl, '_blank')}
                                  title="Open"
                                >
                                  <i className="fa fa-external-link"></i>
                                </Button>
                                {content.type === 'pdf' && (
                                  <Button
                                    color="success"
                                    size="sm"
                                    className="me-2"
                                    onClick={() => handleDownloadPDF(content)}
                                    title="Download"
                                  >
                                    <i className="fa fa-download"></i>
                                  </Button>
                                )}
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={() => handleDelete(content._id || content.id)}
                                  title="Delete"
                                >
                                  <i className="fa fa-trash"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}

                  {/* Meetings & Quizzes display (keep existing table format) */}
                  {(category.id === 3 || category.id === 4) && (
                    <Table responsive>
                      <thead>
                        <tr>
                          <th>Title</th>
                          {category.types.includes('quiz') ? (
                            <th>Questions</th>
                          ) : category.types.includes('meet') ? (
                            <>
                              <th>Scheduled Date</th>
                              <th>Join Meeting</th>
                            </>
                          ) : null}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getContentByType(category.types).map((content) => (
                          <tr key={content._id || content.id}>
                            <td>{content.title || 'Untitled'}</td>
                            {category.types.includes('quiz') ? (
                              <td>{content.questions?.length || 0} questions</td>
                            ) : category.types.includes('meet') ? (
                              <>
                                <td>{content.scheduledDate ? new Date(content.scheduledDate).toLocaleString() : 'N/A'}</td>
                                <td>
                                  {content.meetingLink ? (
                                    <Button
                                      color="success"
                                      size="sm"
                                      href={content.meetingLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <i className="fa fa-video-camera me-1"></i> Join
                                    </Button>
                                  ) : (
                                    'N/A'
                                  )}
                                </td>
                              </>
                            ) : null}
                            <td>
                              {category.types.includes('quiz') && (
                                <>
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
                                </>
                              )}
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
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <i className={`${category.icon} fa-3x text-muted mb-3`}></i>
                  <p>No {category.title.toLowerCase()} found.</p>
                </div>
              )}
            </CardBody>
          </Collapse>
        </Card>
      ))}

      <CommonModal
        isOpen={modal}
        title={selectedQuiz ? `Quiz: ${selectedQuiz.title || 'Untitled'}` : 'Quiz Details'}
        toggler={toggleModal}
        size="lg"
        primaryBtnText="Close"
        onPrimaryBtnClick={toggleModal}
        showSecondaryBtn={false}
        bodyClass="p-4"
      >
        {selectedQuiz && (
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <h6>Questions:</h6>
          {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
            selectedQuiz.questions.map((question, index) => (
              <div key={index} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
                <strong>{index + 1}. {question.text || 'Question not specified'}</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                  {question.options && question.options.map((option, optIndex) => (
                    <li key={optIndex}>
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p>No questions available for this quiz.</p>
          )}
          </div>
        )}
      </CommonModal>
    </Fragment>
  );
};

export default ContentAccordionDynamic;