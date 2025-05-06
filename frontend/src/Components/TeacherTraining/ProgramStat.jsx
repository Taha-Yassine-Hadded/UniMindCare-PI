import React, { Fragment, useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Nav, NavItem, NavLink, TabContent, TabPane, Spinner } from 'reactstrap';
import { Breadcrumbs, H5, P } from '../../AbstractElements';
import { useNavigate } from 'react-router-dom';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import ContentDistributionChart from './common/ContentDistributionChart';
import QuizPerformanceChart from './common/QuizPerformanceChart';
import Swal from 'sweetalert2';
import CountUp from 'react-countup';
import styled from 'styled-components';
import { FaBookOpen, FaFileAlt, FaThumbsUp, FaChartLine } from 'react-icons/fa';

// Create a style element for global styles
const createGlobalStyles = () => {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = `
    .chart-container {
      height: 195vh !important; /* Increased from 130vh by 1.5x */
      min-height: 1200px; /* Increased from 800px by 1.5x */
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .chart-container > div {
      width: 100%;
      height: 100%;
    }
    
    .chart-card {
      height: 225vh; /* Increased from 150vh by 1.5x */
      display: flex;
      flex-direction: column;
    }
    
    .chart-card .card-body {
      flex: 1;
      overflow: hidden;
      padding: 0;
    }
    
    .stat-card {
      transition: transform 0.3s ease;
    }
    
    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    
    .stats-container {
      margin-top: 20px;
      padding: 20px;
    }
    
    .custom-scrollbar {
      overflow-y: auto;
      max-height: 600px; /* Doubled from 300px */
      padding-right: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    .content-type-list {
      max-height: 195vh; /* Increased from 130vh by 1.5x */
      overflow-y: auto;
    }
  `;
  return styleElement;
};

// Styled Components for enhanced visual appeal
const StatsCard = styled(Card)`
  border-radius: 15px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
  overflow: hidden;
  border: none;
  height: 100%;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  }
`;

const ProgramsCardHeader = styled.div`
  background: linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%);
  color: white;
  padding: 15px;
`;

const ContentsCardHeader = styled.div`
  background: linear-gradient(135deg, #F97316 0%, #FDBA74 100%);
  color: white;
  padding: 15px;
`;

const RecommendationsCardHeader = styled.div`
  background: linear-gradient(135deg, #8B5CF6 0%, #C4B5FD 100%);
  color: white;
  padding: 15px;
`;

const QuizScoreCardHeader = styled.div`
  background: linear-gradient(135deg, #10B981 0%, #A7F3D0 100%);
  color: white;
  padding: 15px;
`;

const ChartCard = styled(Card)`
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  border: none;
  overflow: hidden;
  height: 225vh; /* Increased from 150vh by 1.5x */
  display: flex;
  flex-direction: column;
`;

const ChartCardHeader = styled(CardHeader)`
  background: linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%);
  color: #333;
  padding: 15px;
  border-bottom: none;
`;

const CardContent = styled(CardBody)`
  padding: 20px;
  flex: 1;
  overflow: hidden;
`;

const ChartContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatValue = styled.h2`
  font-size: 2.5rem;
  font-weight: bold;
  margin: 10px 0;
  color: #333;
`;

const FlexContainer = styled.div`
  display: flex;
  align-items: center;
`;

const IconWrapper = styled.div`
  font-size: 2rem;
  margin-right: 15px;
  color: white;
`;

const ContentTypeItem = styled.div`
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background-color: #f8f9fa;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e9ecef;
    transform: scale(1.02);
  }
`;

const ProgramStat = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const navigate = useNavigate();

  // Add global styles when component mounts
  useEffect(() => {
    const styleElement = createGlobalStyles();
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

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
        const isPsychiatre = userData.Role && userData.Role.includes("psychiatre");
        setUserRole(isPsychiatre ? "psychiatre" : null);

        // If the user is not a psychiatrist, redirect to the error page
        if (!isPsychiatre) {
          navigate("/tivo/error/error-page2", { replace: true });
        }
      } catch (err) {
        console.error("Error retrieving user data:", err);
        setUserRole(null);
        // Redirect to error page on error
        navigate("/tivo/error/error-page2", { replace: true });
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
    } catch (error) {
      console.error('Error fetching programs:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to retrieve programs: ' + error.message,
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

  // Calculate total content count by type
  const calculateContentStats = () => {
    const stats = {
      totalPrograms: programs.length,
      totalContents: 0,
      totalContentsWithType: {
        pdf: 0,
        video: 0,
        article: 0,
        quiz: 0,
        meet: 0
      },
      totalRecommendations: 0,
      averageQuizScore: 0,
      quizAttempts: 0
    };

    // Calculate content statistics
    programs.forEach(program => {
      if (program.contents && Array.isArray(program.contents)) {
        stats.totalContents += program.contents.length;
        
        // Count content by type
        program.contents.forEach(content => {
          if (content.type && stats.totalContentsWithType.hasOwnProperty(content.type)) {
            stats.totalContentsWithType[content.type]++;
          }
          
          // Count quiz attempts and calculate average score
          if (content.type === 'quiz' && content.results && Array.isArray(content.results)) {
            stats.quizAttempts += content.results.length;
            content.results.forEach(result => {
              stats.averageQuizScore += result.result || 0;
            });
          }
        });
      }
      
      // Count recommendations
      if (program.recommendedBy && Array.isArray(program.recommendedBy)) {
        stats.totalRecommendations += program.recommendedBy.length;
      }
    });
    
    // Calculate average quiz score
    if (stats.quizAttempts > 0) {
      stats.averageQuizScore = (stats.averageQuizScore / stats.quizAttempts).toFixed(2);
    }
    
    return stats;
  };

  const stats = calculateContentStats();

  return (
    <Fragment>
      <Breadcrumbs mainTitle="Program Analytics Dashboard" parent="Teacher Training" title="Program Statistics" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <div className="mb-4 d-flex justify-content-between align-items-center">
              <H5>Program Performance Analytics</H5>
            </div>
            
            {loading ? (
              <div className="text-center my-5">
                <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                <P className="mt-3">Loading program statistics...</P>
              </div>
            ) : (
              <Fragment>
                {/* Key Statistics with Animated Counters */}
                <Row className="mb-4">
                  <Col lg="3" md="6" sm="6" className="mb-4">
                    <StatsCard className="stat-card">
                      <ProgramsCardHeader>
                        <FlexContainer>
                          <IconWrapper>
                            <FaBookOpen />
                          </IconWrapper>
                          <h6 className="mb-0">Total Programs</h6>
                        </FlexContainer>
                      </ProgramsCardHeader>
                      <CardContent className="text-center">
                        <StatValue>
                          <CountUp end={stats.totalPrograms} duration={2.5} />
                        </StatValue>
                      </CardContent>
                    </StatsCard>
                  </Col>
                  
                  <Col lg="3" md="6" sm="6" className="mb-4">
                    <StatsCard className="stat-card">
                      <ContentsCardHeader>
                        <FlexContainer>
                          <IconWrapper>
                            <FaFileAlt />
                          </IconWrapper>
                          <h6 className="mb-0">Total Contents</h6>
                        </FlexContainer>
                      </ContentsCardHeader>
                      <CardContent className="text-center">
                        <StatValue>
                          <CountUp end={stats.totalContents} duration={2.5} />
                        </StatValue>
                      </CardContent>
                    </StatsCard>
                  </Col>
                  
                  <Col lg="3" md="6" sm="6" className="mb-4">
                    <StatsCard className="stat-card">
                      <RecommendationsCardHeader>
                        <FlexContainer>
                          <IconWrapper>
                            <FaThumbsUp />
                          </IconWrapper>
                          <h6 className="mb-0">Recommendations</h6>
                        </FlexContainer>
                      </RecommendationsCardHeader>
                      <CardContent className="text-center">
                        <StatValue>
                          <CountUp end={stats.totalRecommendations} duration={2.5} />
                        </StatValue>
                      </CardContent>
                    </StatsCard>
                  </Col>
                  
                  <Col lg="3" md="6" sm="6" className="mb-4">
                    <StatsCard className="stat-card">
                      <QuizScoreCardHeader>
                        <FlexContainer>
                          <IconWrapper>
                            <FaChartLine />
                          </IconWrapper>
                          <h6 className="mb-0">Avg. Quiz Score</h6>
                        </FlexContainer>
                      </QuizScoreCardHeader>
                      <CardContent className="text-center">
                        <StatValue>
                          <CountUp 
                            end={parseFloat(stats.averageQuizScore)} 
                            duration={2.5} 
                            decimals={2}
                            decimal="."
                            suffix="%"
                          />
                        </StatValue>
                      </CardContent>
                    </StatsCard>
                  </Col>
                </Row>
                
                {/* Chart Tabs */}
                <Nav tabs className="border-tab nav-primary mb-3">
                  <NavItem>
                    <NavLink 
                      className={activeTab === '1' ? 'active' : ''}
                      onClick={() => setActiveTab('1')}
                    >
                      <i className="fa fa-pie-chart me-2"></i>Content Distribution
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink 
                      className={activeTab === '2' ? 'active' : ''}
                      onClick={() => setActiveTab('2')}
                    >
                      <i className="fa fa-bar-chart me-2"></i>Average Quiz Performance
                    </NavLink>
                  </NavItem>
                </Nav>
                
                <TabContent activeTab={activeTab}>
                  <TabPane tabId="1">
                    <Row>
                      <Col lg="8" md="12" className="mb-4">
                        <ChartCard className="chart-card">
                          <ChartCardHeader>
                            <h6 className="mb-0">Content Type Distribution</h6>
                            <small className="text-muted">Distribution of content types across programs</small>
                          </ChartCardHeader>
                          <CardContent>
                            <div className="chart-container">
                              <ContentDistributionChart programs={programs} />
                            </div>
                          </CardContent>
                        </ChartCard>
                      </Col>
                      
                      <Col lg="4" md="12" className="mb-4">
                        <ChartCard>
                          <ChartCardHeader>
                            <h6 className="mb-0">Content Types</h6>
                            <small className="text-muted">Breakdown by type</small>
                          </ChartCardHeader>
                          <CardContent>
                            <div className="content-type-list custom-scrollbar">
                              {Object.entries(stats.totalContentsWithType).map(([type, count]) => (
                                <ContentTypeItem key={type} className="d-flex justify-content-between align-items-center">
                                  <div className="d-flex align-items-center">
                                    <i className={getIconByContentType(type)} style={{ 
                                      fontSize: '18px', 
                                      color: getColorByContentType(type),
                                      marginRight: '10px'
                                    }}></i>
                                    <div>
                                      <h6 className="mb-0 text-uppercase">{type}</h6>
                                      <small className="text-muted">{getContentTypeDescription(type)}</small>
                                    </div>
                                  </div>
                                  <span className="badge bg-light text-dark" style={{ fontSize: '16px' }}>{count}</span>
                                </ContentTypeItem>
                              ))}
                            </div>
                          </CardContent>
                        </ChartCard>
                      </Col>
                    </Row>
                  </TabPane>
                  
                  <TabPane tabId="2">
                    <Row>
                      <Col lg="8" md="12" className="mb-4">
                        <ChartCard className="chart-card">
                          <ChartCardHeader>
                            <h6 className="mb-0">Average Quiz Performance Across Programs</h6>
                            <small className="text-muted">Average scores across different programs</small>
                          </ChartCardHeader>
                          <CardContent>
                            <div className="chart-container">
                              <QuizPerformanceChart programs={programs} />
                            </div>
                          </CardContent>
                        </ChartCard>
                      </Col>
                      
                      <Col lg="4" md="12" className="mb-4">
                        <ChartCard>
                          <ChartCardHeader>
                            <h6 className="mb-0">Quiz Performance Metrics</h6>
                            <small className="text-muted">Key performance indicators</small>
                          </ChartCardHeader>
                          <CardContent className="stats-container">
                            <div className="mb-4">
                              <h6>Total Quizzes</h6>
                              <div className="d-flex align-items-center">
                                <div className="progress flex-grow-1 me-3" style={{ height: '8px' }}>
                                  <div 
                                    className="progress-bar bg-primary" 
                                    role="progressbar" 
                                    style={{ width: `${(stats.totalContentsWithType.quiz / stats.totalContents) * 100}%` }}
                                    aria-valuenow={stats.totalContentsWithType.quiz} 
                                    aria-valuemin="0" 
                                    aria-valuemax={stats.totalContents}
                                  ></div>
                                </div>
                                <span className="fw-bold">{stats.totalContentsWithType.quiz}</span>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <h6>Quiz Attempts</h6>
                              <div className="d-flex align-items-center">
                                <div className="progress flex-grow-1 me-3" style={{ height: '8px' }}>
                                  <div 
                                    className="progress-bar bg-success" 
                                    role="progressbar" 
                                    style={{ width: '75%' }}
                                    aria-valuenow={stats.quizAttempts} 
                                    aria-valuemin="0" 
                                    aria-valuemax="100"
                                  ></div>
                                </div>
                                <span className="fw-bold">{stats.quizAttempts}</span>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <h6>Average Score</h6>
                              <div className="d-flex align-items-center">
                                <div className="progress flex-grow-1 me-3" style={{ height: '8px' }}>
                                  <div 
                                    className="progress-bar bg-warning" 
                                    role="progressbar" 
                                    style={{ width: `${stats.averageQuizScore}%` }}
                                    aria-valuenow={stats.averageQuizScore} 
                                    aria-valuemin="0" 
                                    aria-valuemax="100"
                                  ></div>
                                </div>
                                <span className="fw-bold">{stats.averageQuizScore}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </ChartCard>
                      </Col>
                    </Row>
                  </TabPane>
                </TabContent>
              </Fragment>
            )}
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

// Helper function to get icon for content type
const getIconByContentType = (type) => {
  switch (type) {
    case 'pdf': return 'fa fa-file-pdf-o';
    case 'video': return 'fa fa-video-camera';
    case 'article': return 'fa fa-newspaper-o';
    case 'quiz': return 'fa fa-question-circle';
    case 'meet': return 'fa fa-handshake-o';
    default: return 'fa fa-file-o';
  }
};

// Helper function to get color for content type
const getColorByContentType = (type) => {
  switch (type) {
    case 'pdf': return '#DC2626'; // red
    case 'video': return '#2563EB'; // blue
    case 'article': return '#0891B2'; // cyan
    case 'quiz': return '#D97706'; // amber
    case 'meet': return '#059669'; // emerald
    default: return '#6B7280'; // gray
  }
};

// Helper function to get content type description
const getContentTypeDescription = (type) => {
  switch (type) {
    case 'pdf': return 'Document resources';
    case 'video': return 'Video lessons';
    case 'article': return 'Educational articles';
    case 'quiz': return 'Assessment quizzes';
    case 'meet': return 'Interactive sessions';
    default: return 'Miscellaneous content';
  }
};

export default ProgramStat;