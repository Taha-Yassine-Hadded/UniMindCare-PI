import React, { Fragment, useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, CardBody, Spinner, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Breadcrumbs, Btn, H6, P } from '../../AbstractElements';
import { useParams } from 'react-router-dom';
import ContentService from '../../Services/TeacherTraining/ContentService';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import CommonModal from "../UiKits/Modals/common/modal";
import NewContent from "./NewContent";
import ContentAccordion from './common/ContentAccordion';
import Swal from 'sweetalert2';

const ProgramDetails = () => {
  const { id } = useParams();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [programTitle, setProgramTitle] = useState('Program Details');
  const [programDescription, setProgramDescription] = useState('');
  const [modal, setModal] = useState(false);
  
  // States for content suggestion feature
  const [suggestModal, setSuggestModal] = useState(false);
  const [videoRecommendations, setVideoRecommendations] = useState([]);
  const [articleRecommendations, setArticleRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationType, setRecommendationType] = useState('video'); // 'video' or 'article'

  const toggle = () => setModal(!modal);
  const toggleSuggestModal = () => setSuggestModal(!suggestModal);
  const formRef = useRef(null);

  const getScoreColor = (score) => {
    if (score >= 0.8) return "#28a745"; // High match - green
    if (score >= 0.6) return "#17a2b8"; // Good match - teal
    if (score >= 0.4) return "#fd7e14"; // Moderate match - orange
    return "#6c757d"; // Low match - gray
  };

  useEffect(() => {
    // Add hover effect styles
    const style = document.createElement('style');
    style.innerHTML = `
      .hover-effect:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
      }
      .play-overlay:hover {
        background-color: rgba(0,0,0,0.5) !important;
      }
      .play-overlay:hover .play-button i {
        transform: scale(1.2);
        transition: transform 0.3s ease;
      }
      .recommendation-card {
        break-inside: avoid;
      }
      .recommendation-list {
        column-gap: 30px;
      }
      @media (min-width: 992px) {
        .recommendation-list {
          column-count: 1;
        }
      }
      .btn-success-soft {
        background-color: rgba(40, 167, 69, 0.15);
        color: #28a745;
        border: none;
      }
      .btn-success-soft:hover {
        background-color: rgba(40, 167, 69, 0.25);
        color: #28a745;
      }
      .add-content-btn:hover {
        transform: translateY(-2px);
        transition: transform 0.2s ease;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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

  // Function to suggest content based on selected type
  const handleSuggestContent = async (type) => {
    setRecommendationType(type);
    setLoadingRecommendations(true);
    setSuggestModal(true);
    
    try {
      let endpoint = '';
      let port = '';
      
      if (type === 'video') {
        endpoint = 'recommend';
        port = '8002';
      } else if (type === 'article') {
        endpoint = 'recommend-articles';
        port = '8001';
      }
      
      const response = await fetch(`http://localhost:${port}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: programTitle,
          description: programDescription,
          top_k: 5
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (type === 'video') {
        setVideoRecommendations(data.recommendations);
        setArticleRecommendations([]);
      } else {
        setArticleRecommendations(data.recommendations);
        setVideoRecommendations([]);
      }
    } catch (error) {
      console.error(`Error fetching ${type} recommendations:`, error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to get ${type} recommendations. Please ensure the recommendation service is running.`,
      });
      if (type === 'video') {
        setVideoRecommendations([]);
      } else {
        setArticleRecommendations([]);
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Handle adding video as content
  const handleAddVideoAsContent = async (video) => {
    try {
      const contentData = new FormData();
      contentData.append('title', video.video_title);
      contentData.append('description', video.video_description || '');
      contentData.append('type', 'video');
      contentData.append('contentUrl', video.video_url);
      
      // Show loading indicator
      Swal.fire({
        title: 'Adding content...',
        text: 'Please wait while we add this video to your program',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Call the ContentService to add the content
      const newContent = await ContentService.createContent(id, contentData);
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Video Added!',
        text: 'The video has been added to your program content.',
        timer: 2500,
        showConfirmButton: false
      });
      
      // Refresh content list
      fetchProgramContents();
      
    } catch (error) {
      console.error('Error adding video as content:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add video as content. Please try again.',
      });
    }
  };
  
  // Handle adding article as content
  const handleAddArticleAsContent = async (article) => {
    try {
      const contentData = new FormData();
      contentData.append('title', article.title);
      contentData.append('description', article.snippet || '');
      contentData.append('type', 'article'); // Change from 'link' to 'article'
      contentData.append('contentUrl', article.url);
      
      // Show loading indicator
      Swal.fire({
        title: 'Adding content...',
        text: 'Please wait while we add this article to your program',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Call the ContentService to add the content
      const newContent = await ContentService.createContent(id, contentData);
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Article Added!',
        text: 'The article has been added to your program content.',
        timer: 2500,
        showConfirmButton: false
      });
      
      // Close the modal after adding
      toggleSuggestModal();
      
      // Refresh content list
      fetchProgramContents();
      
    } catch (error) {
      console.error('Error adding article as content:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add article as content. Please try again.',
      });
    }
  };

  // Extract YouTube video ID from URL
  const extractYoutubeId = (url) => {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
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
                  <div>
                    {/* Updated to use dropdown for different recommendation types */}
                    <UncontrolledDropdown className="me-2 d-inline-block">
                      <DropdownToggle color="info" caret>
                        <i className="fa fa-lightbulb-o me-1"></i> Suggest Content
                      </DropdownToggle>
                      <DropdownMenu end>
                        <DropdownItem header>Choose Content Type</DropdownItem>
                        <DropdownItem onClick={() => handleSuggestContent('video')}>
                          <i className="fa fa-video-camera me-2"></i> Suggest Videos
                        </DropdownItem>
                        <DropdownItem onClick={() => handleSuggestContent('article')}>
                          <i className="fa fa-newspaper-o me-2"></i> Suggest Articles
                        </DropdownItem>
                      </DropdownMenu>
                    </UncontrolledDropdown>
                    <Btn attrBtn={{ color: "success", onClick: toggle }}>
                      <i className="fa fa-plus"></i> Add Content
                    </Btn>
                  </div>
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

                {/* Add Content Modal */}
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

                {/* Content Suggestions Modal */}
                <CommonModal
                  isOpen={suggestModal}
                  title={null} 
                  toggler={toggleSuggestModal}
                  size="xl"
                  primaryBtnText="Close"
                  secondaryBtnText={null}
                  onPrimaryBtnClick={toggleSuggestModal}
                >
                  <div className="recommendation-modal">
                    {/* Custom styled header */}
                    <div className="custom-modal-header mb-4 position-relative">
                      <div 
                        className="bg-primary text-white p-4 rounded-top" 
                        style={{
                          background: "linear-gradient(135deg, #5e50f9 0%, #6610f2 100%)",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                        }}
                      >
                        <h4 className="modal-title">
                          <i className={`fa ${recommendationType === 'video' ? 'fa-video-camera' : 'fa-newspaper-o'} me-2`}></i>
                          Smart {recommendationType === 'video' ? 'Video' : 'Article'} Recommendations
                        </h4>
                        <p className="mb-0 mt-1 text-white-50">
                          For program: <strong>{programTitle}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Loading state */}
                    {loadingRecommendations ? (
                      <div className="text-center my-5 py-5">
                        <div className="mb-3">
                          <Spinner 
                            color="primary" 
                            style={{
                              width: '3rem', 
                              height: '3rem',
                              boxShadow: '0 0 15px rgba(94, 80, 249, 0.5)'
                            }}
                          />
                        </div>
                        <p className="mt-4 lead">Analyzing program content and finding relevant {recommendationType}s...</p>
                        <p className="text-muted">Our AI is searching for the best educational content that matches your program</p>
                      </div>
                    ) : (
                      <>
                        {/* VIDEO RECOMMENDATIONS */}
                        {recommendationType === 'video' && videoRecommendations.length > 0 ? (
                          <div>
                            <div className="alert alert-info mb-4" role="alert">
                              <div className="d-flex">
                                <div className="me-3">
                                  <i className="fa fa-info-circle fa-2x"></i>
                                </div>
                                <div>
                                  <h6 className="alert-heading">Personalized Video Recommendations</h6>
                                  <p className="mb-0">
                                    Based on your program's title and description, we've found these educational videos that might enhance your teaching materials.
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Results counter and match quality indicator */}
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <div>
                                <span className="badge bg-primary rounded-pill">
                                  {videoRecommendations.length} videos found
                                </span>
                              </div>
                              <div className="text-muted small">
                                <i className="fa fa-filter me-1"></i> Showing best matches first
                              </div>
                            </div>

                            {/* Video recommendations cards */}
                            <div className="recommendation-list">
                              {videoRecommendations.map((video, index) => (
                                <Card 
                                  key={index} 
                                  className="mb-4 recommendation-card border-0 shadow-sm hover-effect"
                                  style={{
                                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                    borderRadius: "8px",
                                    overflow: "hidden"
                                  }}
                                >
                                  {/* Video card content - same as before */}
                                  <CardBody className="p-0">
                                    <Row className="g-0">
                                      <Col md="5" className="position-relative">
                                        {/* Video thumbnail with overlay play button */}
                                        <div 
                                          className="video-thumbnail h-100 position-relative" 
                                          style={{
                                            background: "#f8f9fa",
                                            minHeight: "220px"
                                          }}
                                        >
                                          {video.video_url && extractYoutubeId(video.video_url) ? (
                                            <>
                                              <div className="ratio ratio-16x9 h-100">
                                                <img 
                                                  src={`https://img.youtube.com/vi/${extractYoutubeId(video.video_url)}/maxresdefault.jpg`}
                                                  alt={video.video_title}
                                                  className="img-fluid"
                                                  style={{objectFit: "cover"}}
                                                />
                                              </div>
                                              <div 
                                                className="play-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                                                onClick={() => window.open(video.video_url, '_blank', 'noopener,noreferrer')}
                                                style={{
                                                  backgroundColor: "rgba(0,0,0,0.3)",
                                                  cursor: "pointer",
                                                  transition: "all 0.3s ease"
                                                }}
                                              >
                                                <div className="play-button">
                                                  <i 
                                                    className="fa fa-play-circle-o" 
                                                    style={{
                                                      fontSize: "3.5rem", 
                                                      color: "white",
                                                      textShadow: "0 2px 10px rgba(0,0,0,0.5)"
                                                    }}
                                                  ></i>
                                                </div>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="h-100 bg-light text-center d-flex align-items-center justify-content-center">
                                              <i className="fa fa-video-camera fa-3x text-secondary"></i>
                                            </div>
                                          )}
                                          
                                          {/* Match score badge */}
                                          <div 
                                            className="match-score position-absolute top-0 end-0 m-2"
                                            style={{
                                              backgroundColor: getScoreColor(video.similarity_score),
                                              color: "white",
                                              padding: "4px 10px",
                                              borderRadius: "4px",
                                              fontWeight: "bold",
                                              fontSize: "0.9rem"
                                            }}
                                          >
                                            {(video.similarity_score * 100).toFixed(0)}% Match
                                          </div>
                                        </div>
                                      </Col>
                                      <Col md="7">
                                        <div className="p-4">
                                          <h5 className="video-title fw-bold mb-2">{video.video_title}</h5>
                                          
                                          <div className="video-meta mb-2 text-muted d-flex align-items-center">
                                            <i className="fa fa-tag me-1"></i>
                                            <span className="small">
                                              {video.program_title || "Educational Content"}
                                            </span>
                                          </div>
                                          
                                          <P className="video-description mb-3">
                                            {video.video_description}
                                          </P>
                                          
                                          {/* Keywords tags with improved styling */}
                                          {video.keywords && (
                                            <div className="keywords-container mb-3">
                                              {video.keywords.split(',').map((keyword, i) => (
                                                <span 
                                                  key={i} 
                                                  className="keyword-tag me-1 mb-1"
                                                  style={{
                                                    display: "inline-block",
                                                    background: "rgba(94, 80, 249, 0.1)",
                                                    color: "#5e50f9",
                                                    padding: "3px 10px",
                                                    borderRadius: "50px",
                                                    fontSize: "0.8rem"
                                                  }}
                                                >
                                                  {keyword.trim()}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {/* Action buttons */}
                                          <div className="d-flex justify-content-end mt-3">
                                            <Btn 
                                              attrBtn={{ 
                                                color: "outline-primary", 
                                                size: "sm",
                                                className: "me-2",
                                                onClick: () => {
                                                  navigator.clipboard.writeText(video.video_url);
                                                  Swal.fire({
                                                    icon: 'success',
                                                    title: 'URL Copied!',
                                                    text: 'Video URL copied to clipboard',
                                                    toast: true,
                                                    position: 'bottom-end',
                                                    showConfirmButton: false,
                                                    timer: 3000
                                                  });
                                                }
                                              }}
                                            >
                                              <i className="fa fa-copy me-1"></i> Copy URL
                                            </Btn>
                                            <Btn 
                                              attrBtn={{ 
                                                color: "success", 
                                                size: "sm",
                                                className: "me-2 add-content-btn",
                                                onClick: () => handleAddVideoAsContent(video)
                                              }}
                                            >
                                              <i className="fa fa-plus-circle me-1"></i> Add as Content
                                            </Btn>
                                            <Btn 
                                              attrBtn={{ 
                                                color: "primary", 
                                                size: "sm", 
                                                onClick: () => window.open(video.video_url, '_blank', 'noopener,noreferrer')
                                              }}
                                            >
                                              <i className="fa fa-external-link me-1"></i> Watch Video
                                            </Btn>
                                          </div>
                                        </div>
                                      </Col>
                                    </Row>
                                  </CardBody>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* ARTICLE RECOMMENDATIONS */}
                        {recommendationType === 'article' && articleRecommendations.length > 0 ? (
                          <div>
                            <div className="alert alert-info mb-4" role="alert">
                              <div className="d-flex">
                                <div className="me-3">
                                  <i className="fa fa-info-circle fa-2x"></i>
                                </div>
                                <div>
                                  <h6 className="alert-heading">Personalized Article Recommendations</h6>
                                  <p className="mb-0">
                                    Based on your program's title and description, we've found these educational articles that might enhance your teaching materials.
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Results counter and match quality indicator */}
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <div>
                                <span className="badge bg-primary rounded-pill">
                                  {articleRecommendations.length} articles found
                                </span>
                              </div>
                              <div className="text-muted small">
                                <i className="fa fa-filter me-1"></i> Showing best matches first
                              </div>
                            </div>

                            {/* Article recommendations cards */}
                            <div className="recommendation-list">
                              {articleRecommendations.map((article, index) => (
                                <Card 
                                  key={index} 
                                  className="mb-4 recommendation-card border-0 shadow-sm hover-effect"
                                  style={{
                                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                    borderRadius: "8px",
                                    overflow: "hidden"
                                  }}
                                >
                                  <CardBody className="p-0">
                                    <Row className="g-0">
                                      <Col md="3" className="position-relative bg-light d-flex align-items-center justify-content-center">
                                        <div className="p-4 text-center">
                                          <i className="fa fa-file-text-o fa-4x text-primary mb-3"></i>
                                          <div 
                                            className="match-score"
                                            style={{
                                              backgroundColor: getScoreColor(article.similarity_score),
                                              color: "white",
                                              padding: "8px 15px",
                                              borderRadius: "50px",
                                              fontWeight: "bold",
                                              display: "inline-block"
                                            }}
                                          >
                                            {(article.similarity_score * 100).toFixed(0)}% Match
                                          </div>
                                        </div>
                                      </Col>
                                      <Col md="9">
                                        <div className="p-4">
                                          <h5 className="article-title fw-bold mb-2">{article.title}</h5>
                                          
                                          <div className="article-meta mb-3 text-muted d-flex align-items-center">
                                            <i className="fa fa-globe me-1"></i>
                                            <span className="small me-3">
                                              {article.source || "Unknown Source"}
                                            </span>
                                          </div>
                                          
                                          <P className="article-description mb-3">
                                            {article.snippet}
                                          </P>
                                          
                                          {/* Action buttons for articles */}
                                          <div className="d-flex justify-content-end mt-3">
                                            <Btn 
                                              attrBtn={{ 
                                                color: "outline-primary", 
                                                size: "sm",
                                                className: "me-2",
                                                onClick: () => {
                                                  navigator.clipboard.writeText(article.url);
                                                  Swal.fire({
                                                    icon: 'success',
                                                    title: 'URL Copied!',
                                                    text: 'Article URL copied to clipboard',
                                                    toast: true,
                                                    position: 'bottom-end',
                                                    showConfirmButton: false,
                                                    timer: 3000
                                                  });
                                                }
                                              }}
                                            >
                                              <i className="fa fa-copy me-1"></i> Copy URL
                                            </Btn>
                                            <Btn 
                                              attrBtn={{ 
                                                color: "success", 
                                                size: "sm",
                                                className: "me-2 add-content-btn",
                                                onClick: () => handleAddArticleAsContent(article)
                                              }}
                                            >
                                              <i className="fa fa-plus-circle me-1"></i> Add as Content
                                            </Btn>
                                            <Btn 
                                              attrBtn={{ 
                                                color: "primary", 
                                                size: "sm", 
                                                onClick: () => window.open(article.url, '_blank', 'noopener,noreferrer')
                                              }}
                                            >
                                              <i className="fa fa-external-link me-1"></i> Read Article
                                            </Btn>
                                          </div>
                                        </div>
                                      </Col>
                                    </Row>
                                  </CardBody>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* No results */}
                        {((recommendationType === 'video' && videoRecommendations.length === 0) || 
                         (recommendationType === 'article' && articleRecommendations.length === 0)) && 
                         !loadingRecommendations ? (
                          <div className="text-center my-5 py-4">
                            <div className="empty-state mb-3">
                              <i className="fa fa-search fa-3x text-info mb-3" style={{opacity: 0.7}}></i>
                            </div>
                            <h5 className="text-muted mb-3">No relevant {recommendationType} recommendations found</h5>
                            <p className="text-muted col-md-8 mx-auto">
                              Our system couldn't find strong matches for this program. Try updating the program description with more specific keywords related to your teaching goals.
                            </p>
                            <Btn 
                              attrBtn={{ 
                                color: "outline-primary", 
                                className: "mt-2",
                                onClick: toggleSuggestModal
                              }}
                            >
                              Close
                            </Btn>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
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