import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Nav, NavItem, NavLink, TabContent, TabPane, Button, Offcanvas, OffcanvasHeader, OffcanvasBody, FormGroup, Label, Input, Progress } from 'reactstrap';
import { Breadcrumbs } from '../../AbstractElements';
import { useParams } from 'react-router-dom';
import ContentService from '../../Services/TeacherTraining/ContentService';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import AuthService from '../../Services/TeacherTraining/AuthService';
import Swal from 'sweetalert2';
import { gapi } from 'gapi-script';

const ViewProgramDetails = () => {
  const { id } = useParams();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [programTitle, setProgramTitle] = useState('Program Details');
  const [programDescription, setProgramDescription] = useState('');
  const [recommendedBy, setRecommendedBy] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [gapiInitialized, setGapiInitialized] = useState(false);
  const [eventExistsMap, setEventExistsMap] = useState({}); // Track which events exist in the calendar

  // Google Calendar API Configuration
  const CLIENT_ID = '987721626341-tl8m999je3hd9g5v84vfdqtevrbjhhtj.apps.googleusercontent.com';
  const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
  const SCOPES = "https://www.googleapis.com/auth/calendar.events";

  const fetchCurrentUser = async () => {
    try {
      const userData = await AuthService.getCurrentUser();
      setCurrentUserId(userData.userId);
    } catch (err) {
      console.error('Error fetching current user:', err);
      setError('Failed to load user data. Please try again.');
    }
  };

  const fetchProgramDetails = async () => {
    try {
      const programData = await ProgramService.getProgramDetails(id);
      setProgramTitle(programData.title || 'Program Details');
      setProgramDescription(programData.description || 'No description available.');
      setRecommendedBy(programData.recommendedBy || []);
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
      setContents(contentData);
    } catch (err) {
      console.error('Error fetching program contents:', err);
      setError('Failed to load program contents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if an event exists in the user's calendar
  const checkExistingEvents = async () => {
    if (!gapiInitialized || !gapi.auth2.getAuthInstance().isSignedIn.get()) {
      return; // Skip if not signed in or GAPI not initialized
    }

    try {
      const meetings = getContentByType('meet');
      if (meetings.length === 0) return;

      // Define a time range for fetching events (e.g., from now to 1 month in the future)
      const timeMin = new Date().toISOString();
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 1); // 1 month from now

      const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const calendarEvents = response.result.items || [];
      const newEventExistsMap = {};

      // Check each meeting against the calendar events
      meetings.forEach(meeting => {
        const meetingStart = meeting.scheduledDate ? new Date(meeting.scheduledDate).toISOString() : null;
        const meetingTitle = meeting.title || 'Meeting';
        const meetingDescription = `Join the meeting: ${meeting.meetingLink || 'N/A'}`;

        const eventExists = calendarEvents.some(event => {
          const eventStart = event.start?.dateTime;
          const eventTitle = event.summary;
          const eventDescription = event.description || '';

          return (
            eventTitle === meetingTitle &&
            eventStart === meetingStart &&
            eventDescription.includes(meeting.meetingLink || 'N/A')
          );
        });

        newEventExistsMap[meeting._id || meeting.id] = eventExists;
      });

      setEventExistsMap(newEventExistsMap);
    } catch (err) {
      console.error('Error checking existing events:', err);
      Swal.fire('Error!', 'Failed to check existing calendar events. Please try again.', 'error');
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchProgramDetails();
    fetchProgramContents();

    const initClient = () => {
      gapi.client.init({
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      }).then(() => {
        console.log('Google API client initialized');
        setGapiInitialized(true);

        // Check if the user is signed in and fetch events if they are
        if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
          checkExistingEvents();
        }

        // Listen for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen(signedIn => {
          if (signedIn) {
            checkExistingEvents();
          } else {
            setEventExistsMap({}); // Reset when signed out
          }
        });
      }).catch(err => {
        console.error('Error initializing Google API client:', err);
        Swal.fire('Error!', 'Failed to initialize Google API client. Please refresh the page.', 'error');
      });
    };

    gapi.load('client:auth2', initClient);
  }, [id]);

  const getContentByType = (type) => {
    return contents.filter(content => content.type === type);
  };

  const getEmbedUrl = (url) => {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const handleRecommend = async () => {
    try {
      await ProgramService.recommendProgram(id);
      Swal.fire('Recommended!', 'You have recommended this program.', 'success');
      fetchProgramDetails();
    } catch (err) {
      console.error('Error recommending program:', err);
      Swal.fire('Error!', 'Failed to recommend the program.', 'error');
    }
  };

  const handleUnrecommend = async () => {
    try {
      await ProgramService.unrecommendProgram(id);
      Swal.fire('Unrecommended!', 'You have removed your recommendation.', 'success');
      fetchProgramDetails();
    } catch (err) {
      console.error('Error unrecommending program:', err);
      Swal.fire('Error!', 'Failed to remove your recommendation.', 'error');
    }
  };

  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setAnswers({});
    setOffcanvasOpen(true);
  };

  const toggleOffcanvas = () => {
    setOffcanvasOpen(!offcanvasOpen);
    if (offcanvasOpen) {
      setSelectedQuiz(null);
      setAnswers({});
    }
  };

  const handleAnswerChange = (questionIndex, option) => {
    setAnswers({ ...answers, [questionIndex]: option });
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;

    let score = 0;
    const totalQuestions = selectedQuiz.questions.length;

    selectedQuiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) score += 1;
    });

    const result = (score / totalQuestions) * 100;

    try {
      await ContentService.submitQuizResult(selectedQuiz._id, result);
      Swal.fire({
        title: 'Quiz Submitted!',
        html: `You scored <strong>${score}</strong> out of <strong>${totalQuestions}</strong> (<strong>${result.toFixed(2)}%</strong>)!`,
        icon: 'success',
        confirmButtonText: 'OK'
      });
      fetchProgramContents();
    } catch (err) {
      console.error('Error submitting quiz result:', err);
      Swal.fire('Error!', 'Failed to submit your quiz result.', 'error');
    }

    toggleOffcanvas();
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

  const handleAddToCalendar = (content) => {
    if (!gapiInitialized) {
      Swal.fire('Error!', 'Google API client is not yet initialized. Please wait a moment and try again.', 'error');
      return;
    }

    const signInAndAddEvent = () => {
      if (!gapi.auth2) {
        Swal.fire('Error!', 'Google Auth API is not available. Please refresh the page and try again.', 'error');
        return;
      }

      gapi.auth2.getAuthInstance().signIn().then(() => {
        const event = {
          'summary': content.title || 'Meeting',
          'location': content.meetingLink || 'Online',
          'description': `Join the meeting: ${content.meetingLink || 'N/A'}`,
          'start': {
            'dateTime': content.scheduledDate ? new Date(content.scheduledDate).toISOString() : new Date().toISOString(),
            'timeZone': 'America/Los_Angeles',
          },
          'end': {
            'dateTime': content.scheduledDate ? new Date(new Date(content.scheduledDate).getTime() + 60 * 60 * 1000).toISOString() : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
            'timeZone': 'America/Los_Angeles',
          },
          'reminders': {
            'useDefault': false,
            'overrides': [
              { 'method': 'email', 'minutes': 24 * 60 },
              { 'method': 'popup', 'minutes': 10 }
            ]
          }
        };

        const request = gapi.client.calendar.events.insert({
          'calendarId': 'primary',
          'resource': event,
        });

        request.execute((eventResponse) => {
          if (eventResponse.htmlLink) {
            Swal.fire({
              title: 'Event Added!',
              text: 'The meeting has been added to your Google Calendar.',
              icon: 'success',
              confirmButtonText: 'OK'
            });
            window.open(eventResponse.htmlLink, '_blank');

            // Update the eventExistsMap to reflect the newly added event
            setEventExistsMap(prev => ({
              ...prev,
              [content._id || content.id]: true,
            }));
          } else {
            Swal.fire('Error!', 'Failed to add event to calendar.', 'error');
          }
        });
      }).catch(err => {
        console.error('Error signing in:', err);
        if (err.error === 'popup_blocked_by_browser') {
          Swal.fire('Error!', 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.', 'error');
        } else if (err.error === 'idpiframe_initialization_failed') {
          Swal.fire('Error!', 'Google sign-in failed due to a browser issue. Please ensure third-party cookies are enabled and try again.', 'error');
        } else {
          Swal.fire('Error!', `Failed to sign in to Google: ${err.error || 'Unknown error'}. Please try again.`, 'error');
        }
      });
    };

    if (gapi.auth2 && gapi.auth2.getAuthInstance().isSignedIn.get()) {
      signInAndAddEvent();
    } else {
      signInAndAddEvent();
    }
  };

  const hasRecommended = currentUserId && recommendedBy.includes(currentUserId);

  const getUserQuizResult = (quiz) => {
    if (!currentUserId || !quiz.results || !Array.isArray(quiz.results)) return null;
    const userResult = quiz.results.find(result => result.userId.toString() === currentUserId);
    return userResult ? userResult.result : null;
  };

  const getProgressBarColor = (score) => {
    if (score > 70) return 'success';
    else if (score >= 50 && score <= 70) return 'warning';
    else return 'danger';
  };

  const renderContentItem = (content, contentElement) => {
    return (
      <div key={content._id || content.id} style={{ marginBottom: '20px', padding: '15px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h6 style={{ margin: 0 }}>{content.title || 'Untitled'}</h6>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {content.createdAt ? new Date(content.createdAt).toLocaleString() : 'N/A'}
          </span>
        </div>
        {content.description && content.description.trim() !== '' && (
          <p style={{ marginTop: '5px', color: '#555' }}>{content.description}</p>
        )}
        <div style={{ marginTop: '10px' }}>
          {contentElement}
        </div>
      </div>
    );
  };

  return (
    <Fragment>
      <Breadcrumbs mainTitle="Program Content" parent="Teacher Training" title="Program Content" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4>{programTitle}</h4>
                  {currentUserId && (
                    hasRecommended ? (
                      <Button color="warning" size="sm" onClick={handleUnrecommend}>
                        <i className="fa fa-thumbs-down"></i> Unrecommend
                      </Button>
                    ) : (
                      <Button color="success" size="sm" onClick={handleRecommend}>
                        <i className="fa fa-thumbs-up"></i> Recommend
                      </Button>
                    )
                  )}
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
                      {/* Add the new Articles tab */}
                      <NavItem>
                        <NavLink
                          className={activeTab === '5' ? 'active bg-primary text-white' : ''}
                          onClick={() => setActiveTab('5')}
                          style={activeTab === '5' ? { color: 'white' } : { color: '#333' }}
                        >
                          <i className="icofont icofont-newspaper" style={activeTab === '5' ? { color: 'white' } : { color: '#333' }}></i> Articles
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
                          <div className="mt-3">
                            {getContentByType('pdf').map((content) =>
                              renderContentItem(
                                content,
                                content.contentUrl ? (
                                  <Button color="primary" size="sm" onClick={() => handleDownloadPDF(content)} title="Download PDF">
                                    <i className="fa fa-download"></i> Download PDF
                                  </Button>
                                ) : (
                                  <span>PDF not available</span>
                                )
                              )
                            )}
                          </div>
                        ) : (
                          <p className="mt-3">No files found.</p>
                        )}
                      </TabPane>

                      <TabPane tabId="2">
                        {getContentByType('video').length > 0 ? (
                          <div className="mt-3">
                            {getContentByType('video').map((content) =>
                              renderContentItem(
                                content,
                                content.contentUrl ? (
                                  <iframe
                                    width="640"
                                    height="360"
                                    src={getEmbedUrl(content.contentUrl)}
                                    title={content.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  ></iframe>
                                ) : (
                                  <span>Video URL not available</span>
                                )
                              )
                            )}
                          </div>
                        ) : (
                          <p className="mt-3">No videos found.</p>
                        )}
                      </TabPane>

                      {/* New Articles Tab */}
                      <TabPane tabId="5">
                        {getContentByType('article').length > 0 ? (
                          <div className="mt-3">
                            {getContentByType('article').map((content) =>
                              renderContentItem(
                                content,
                                <div>
                                  {content.description && (
                                    <div className="article-preview mb-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                                      <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#555' }}>
                                        {content.description}
                                      </p>
                                    </div>
                                  )}
                                  {content.contentUrl ? (
                                    <Button
                                      color="primary"
                                      size="sm"
                                      onClick={() => window.open(content.contentUrl, '_blank', 'noopener,noreferrer')}
                                      title="Read Article"
                                    >
                                      <i className="fa fa-external-link"></i> Read Full Article
                                    </Button>
                                  ) : (
                                    <span>Article URL not available</span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="mt-3">No articles found.</p>
                        )}
                      </TabPane>

                      <TabPane tabId="3">
                        {getContentByType('meet').length > 0 ? (
                          <div className="mt-3">
                            {getContentByType('meet').map((content) => {
                              const eventExists = eventExistsMap[content._id || content.id] || false;
                              return renderContentItem(
                                content,
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  {content.meetingLink ? (
                                    <Button
                                      color="primary"
                                      size="sm"
                                      href={content.meetingLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Join Meeting"
                                    >
                                      <i className="fa fa-link"></i> Join Meeting
                                    </Button>
                                  ) : (
                                    <span>N/A</span>
                                  )}
                                  {eventExists ? (
                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                      Event already in calendar
                                    </span>
                                  ) : (
                                    <Button
                                      color="secondary"
                                      size="sm"
                                      onClick={() => handleAddToCalendar(content)}
                                      title="Add to Calendar"
                                      disabled={!gapiInitialized}
                                    >
                                      <i className="fa fa-calendar"></i> Add to Calendar
                                    </Button>
                                  )}
                                  <span style={{ fontSize: '12px', color: '#666' }}>
                                    Scheduled: {content.scheduledDate ? new Date(content.scheduledDate).toLocaleString() : 'N/A'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3">No meetings found.</p>
                        )}
                      </TabPane>

                      <TabPane tabId="4">
                        {getContentByType('quiz').length > 0 ? (
                          <div className="mt-3">
                            {getContentByType('quiz').map((content) => {
                              const userResult = getUserQuizResult(content);
                              return renderContentItem(
                                content,
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '14px', color: '#666' }}>
                                    {content.questions.length} questions
                                  </span>
                                  {userResult !== null ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                        Your Score: {userResult.toFixed(2)}%
                                      </span>
                                      <Progress
                                        value={userResult}
                                        color={getProgressBarColor(userResult)}
                                        style={{ width: '150px', height: '10px' }}
                                      />
                                    </div>
                                  ) : (
                                    <Button
                                      color="primary"
                                      size="sm"
                                      onClick={() => handleStartQuiz(content)}
                                      title="Start Quiz"
                                    >
                                      <i className="fa fa-play"></i> Start Quiz
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3">No quizzes found.</p>
                        )}
                      </TabPane>
                    </TabContent>
                  </>
                )}

                <Offcanvas
                  isOpen={offcanvasOpen}
                  toggle={toggleOffcanvas}
                  direction="end"
                  style={{ width: '700px' }}
                  className="quiz-offcanvas"
                >
                  <OffcanvasHeader toggle={toggleOffcanvas}>
                    {selectedQuiz ? `Quiz: ${selectedQuiz.title || 'Untitled'}` : 'Quiz'}
                  </OffcanvasHeader>
                  <OffcanvasBody style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 100px)' }}>
                    {selectedQuiz && (
                      <div>
                        <h6>Questions:</h6>
                        {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {selectedQuiz.questions.map((question, index) => (
                              <div key={index} style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ fontWeight: 'bold' }}>
                                  {index + 1}. {question.text || 'Question not specified'}
                                </div>
                                {question.options && question.options.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
                                    {question.options.map((option, optIndex) => (
                                      <FormGroup check key={optIndex}>
                                        <Label check>
                                          <Input
                                            type="radio"
                                            name={`question-${index}`}
                                            value={option}
                                            checked={answers[index] === option}
                                            onChange={() => handleAnswerChange(index, option)}
                                          />
                                          {' '}{option}
                                        </Label>
                                      </FormGroup>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ marginTop: '10px', color: '#999' }}>No options available for this question.</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>No questions available for this quiz.</p>
                        )}
                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                          <Button
                            color="primary"
                            onClick={handleSubmitQuiz}
                            disabled={Object.keys(answers).length !== selectedQuiz?.questions.length}
                          >
                            Submit Quiz
                          </Button>
                        </div>
                      </div>
                    )}
                  </OffcanvasBody>
                </Offcanvas>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default ViewProgramDetails;