import React, { Fragment, useState } from 'react';
import { Card, CardBody, Collapse, Table, Button } from 'reactstrap';
import AccordianHeadingCommon from '../../UiKits/Accordian/common/AccordianHeadingCommon';
import ContentService from '../../../Services/TeacherTraining/ContentService';
import Swal from 'sweetalert2';
import CommonModal from '../../UiKits/Modals/common/modal';
import jsPDF from 'jspdf';

const ContentAccordionDynamic = ({ isOpen, toggle, contents, onDelete, onRefresh }) => {
  const [modal, setModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const categories = [
    { id: 1, title: 'Files and Videos', icon: 'fa fa-file-video-o', types: ['pdf', 'video'] },
    { id: 2, title: 'Meetings', icon: 'fa fa-calendar', types: ['meet'] },
    { id: 3, title: 'Quizzes', icon: 'fa fa-question-circle', types: ['quiz'] }
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
      link.rel = 'noopener noreferrer'; // Fixed the syntax error here
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Swal.fire('Error!', 'PDF URL not available.', 'error');
    }
  };

  return (
    <Fragment>
      {categories.map((category) => (
        <Card key={category.id}>
          <AccordianHeadingCommon
            toggle={toggle}
            BtnSpanText={
              <>
                <i className={category.icon} style={{ marginRight: '8px' }}></i>
                {category.title}
              </>
            }
            BtnOnClickParameter={category.id}
            CardHeaderClassName="bg-primary"
          />
          <Collapse isOpen={isOpen === category.id}>
            <CardBody>
              {getContentByType(category.types).length > 0 ? (
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
                      ) : (
                        <th>Content</th>
                      )}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getContentByType(category.types).map((content) => (
                      <tr key={content._id || content.id}>
                        <td>{content.title || 'Untitled'}</td>
                        <td>
                          {category.types.includes('quiz') ? (
                            content.questions.length + ' questions'
                          ) : category.types.includes('meet') ? (
                            content.scheduledDate ? new Date(content.scheduledDate).toLocaleString() : 'N/A'
                          ) : content.type === 'video' ? (
                            content.contentUrl ? (
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
                            )
                          ) : (
                            content.contentUrl ? (
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
                            )
                          )}
                        </td>
                        {category.types.includes('meet') && (
                          <td>
                            {content.meetingLink ? (
                              <Button
                                color="primary"
                                size="sm"
                                className="me-2"
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
                        )}
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
              ) : (
                <p>No {category.title.toLowerCase()} found.</p>
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