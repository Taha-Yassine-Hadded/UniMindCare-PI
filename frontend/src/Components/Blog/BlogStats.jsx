import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { Container, Row, Col, Card } from 'reactstrap';
import { H5 } from '../../AbstractElements';
import CountUp from 'react-countup';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FaFileAlt, FaComments, FaHeart, FaChartLine } from 'react-icons/fa';

// Updated color constants
const PRIMARY_COLOR = '#3B82F6';  // Deep blue
const SECONDARY_COLOR = '#F97316'; // Orange
const TERTIARY_COLOR = '#8B5CF6';  // Purple
const QUATERNARY_COLOR = '#FDBA74'; // Light peach
const ICON_COLOR = '#1E3A8A';      // Darker blue for icons

// Updated color palette for charts
const CHART_COLORS = ['#3B82F6', '#F97316', '#8B5CF6', '#FDBA74', '#93C5FD', '#FB923C'];

// Styled Components
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

const TotalPostsCardHeader = styled.div`
  background: linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #93C5FD 100%);
  color: white;
  padding: 15px;
`;

const TotalCommentsCardHeader = styled.div`
  background: linear-gradient(135deg, ${SECONDARY_COLOR} 0%, ${QUATERNARY_COLOR} 100%);
  color: white;
  padding: 15px;
`;

const TotalLikesCardHeader = styled.div`
  background: linear-gradient(135deg, ${TERTIARY_COLOR} 0%, #C4B5FD 100%);
  color: white;
  padding: 15px;
`;

const AvgCommentsCardHeader = styled.div`
  background: linear-gradient(135deg, ${QUATERNARY_COLOR} 0%, #FEE2E2 100%);
  color: white;
  padding: 15px;
`;

const ChartCardHeader = styled.div`
  background: linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%);
  color: #333;
  padding: 15px;
`;

const CardContent = styled.div`
  padding: 20px;
`;

const StatValue = styled.h2`
  font-size: 2.5rem;
  font-weight: bold;
  margin: 10px 0;
  color: #333;
`;

const PostItem = styled.div`
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

const StatsHeader = styled.div`
  margin-bottom: 30px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 15px;
`;

const IconWrapper = styled.div`
  font-size: 2rem;
  margin-right: 15px;
  color: ${ICON_COLOR};
`;

const FlexContainer = styled.div`
  display: flex;
  align-items: center;
`;

const BlogStats = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalComments: 0,
    totalLikes: 0,
    avgCommentsPerPost: 0,
    mostVisitedPosts: [],
    mostEngagingPosts: [],
    mostCommentedPosts: [],
    popularTags: [],
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching stats from /api/posts/stats');
        const response = await axios.get('http://localhost:5000/api/posts/stats');
        console.log('Stats response:', response.data);
        setStats(response.data);
        setError(null);
      } catch (error) {
        console.error('Erreur lors de la récupération des stats:', error.response?.data || error.message);
        setError('Impossible de récupérer les statistiques. Veuillez réessayer plus tard.');
      }
    };

    fetchStats();
  }, []);

  if (error) {
    return (
      <Container fluid={true} className="blog-stats-page">
        <Row>
          <Col sm="12">
            <StatsHeader>
              <H5>Statistiques du Blog</H5>
            </StatsHeader>
            <p style={{ color: 'red' }}>{error}</p>
          </Col>
        </Row>
      </Container>
    );
  }

  // Prepare data for charts
  const tagChartData = stats.popularTags.map(tag => ({
    name: tag.tag,
    value: tag.engagement
  }));

  const visitChartData = stats.mostVisitedPosts.map(post => ({
    name: post.title.length > 15 ? post.title.substring(0, 15) + '...' : post.title,
    visits: post.views
  }));

  const commentChartData = stats.mostCommentedPosts.map(post => ({
    name: post.title.length > 15 ? post.title.substring(0, 15) + '...' : post.title,
    comments: post.commentCount
  }));

  return (
    <Container fluid={true} className="blog-stats-page">
      <Row>
        <Col sm="12">
          <StatsHeader>
            <H5>Statistiques du Blog</H5>
          </StatsHeader>
          
          <Row className="mb-4">
            {/* Key Statistics with Icons and Animations */}
            <Col lg="3" md="6" sm="6" className="mb-4">
              <StatsCard>
                <TotalPostsCardHeader>
                  <FlexContainer>
                    <IconWrapper>
                      <FaFileAlt />
                    </IconWrapper>
                    <h6 className="mb-0">Nombre total de publications</h6>
                  </FlexContainer>
                </TotalPostsCardHeader>
                <CardContent className="text-center">
                  <StatValue>
                    <CountUp end={stats.totalPosts} duration={2.5} />
                  </StatValue>
                </CardContent>
              </StatsCard>
            </Col>
            
            <Col lg="3" md="6" sm="6" className="mb-4">
              <StatsCard>
                <TotalCommentsCardHeader>
                  <FlexContainer>
                    <IconWrapper>
                      <FaComments />
                    </IconWrapper>
                    <h6 className="mb-0">Nombre total de commentaires</h6>
                  </FlexContainer>
                </TotalCommentsCardHeader>
                <CardContent className="text-center">
                  <StatValue>
                    <CountUp end={stats.totalComments} duration={2.5} />
                  </StatValue>
                </CardContent>
              </StatsCard>
            </Col>
            
            <Col lg="3" md="6" sm="6" className="mb-4">
              <StatsCard>
                <TotalLikesCardHeader>
                  <FlexContainer>
                    <IconWrapper>
                      <FaHeart />
                    </IconWrapper>
                    <h6 className="mb-0">Nombre total de likes</h6>
                  </FlexContainer>
                </TotalLikesCardHeader>
                <CardContent className="text-center">
                  <StatValue>
                    <CountUp end={stats.totalLikes} duration={2.5} />
                  </StatValue>
                </CardContent>
              </StatsCard>
            </Col>
            
            <Col lg="3" md="6" sm="6" className="mb-4">
              <StatsCard>
                <AvgCommentsCardHeader>
                  <FlexContainer>
                    <IconWrapper>
                      <FaChartLine />
                    </IconWrapper>
                    <h6 className="mb-0">Moyenne de commentaires par post</h6>
                  </FlexContainer>
                </AvgCommentsCardHeader>
                <CardContent className="text-center">
                  <StatValue>
                    <CountUp 
                      end={parseFloat(stats.avgCommentsPerPost)} 
                      duration={2.5} 
                      decimals={2}
                      decimal="."
                    />
                  </StatValue>
                </CardContent>
              </StatsCard>
            </Col>
          </Row>
          
          <Row>
            {/* Bar Chart for Most Visited Posts */}
            <Col lg="6" md="6" className="mb-4">
              <StatsCard>
                <ChartCardHeader>
                  <h6 className="mb-0">Publications les plus visitées</h6>
                </ChartCardHeader>
                <CardContent>
                  {visitChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={visitChartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="visits" fill={PRIMARY_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Aucune donnée disponible</p>
                  )}
                </CardContent>
              </StatsCard>
            </Col>
            
            {/* Line Chart for Most Commented Posts */}
            <Col lg="6" md="6" className="mb-4">
              <StatsCard>
                <ChartCardHeader>
                  <h6 className="mb-0">Publications les plus commentées</h6>
                </ChartCardHeader>
                <CardContent>
                  {commentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={commentChartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="comments" stroke={TERTIARY_COLOR} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Aucune donnée disponible</p>
                  )}
                </CardContent>
              </StatsCard>
            </Col>
            
            {/* Pie Chart for Popular Tags */}
            <Col lg="6" md="6" className="mb-4">
              <StatsCard>
                <ChartCardHeader>
                  <h6 className="mb-0">Sujets les plus populaires</h6>
                </ChartCardHeader>
                <CardContent>
                  {tagChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={tagChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {tagChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Aucune donnée disponible</p>
                  )}
                </CardContent>
              </StatsCard>
            </Col>
            
            {/* List of Most Engaging Posts */}
            <Col lg="6" md="6" className="mb-4">
              <StatsCard>
                <ChartCardHeader>
                  <h6 className="mb-0">Publications les plus engageantes</h6>
                </ChartCardHeader>
                <CardContent>
                  {stats.mostEngagingPosts.length > 0 ? (
                    <div>
                      {stats.mostEngagingPosts.map(post => (
                        <PostItem key={post.id}>
                          <h6>{post.title}</h6>
                          <div className="d-flex justify-content-between">
                            <small>Engagement:</small>
                            <strong style={{ color: SECONDARY_COLOR }}>{post.engagement}</strong>
                          </div>
                        </PostItem>
                      ))}
                    </div>
                  ) : (
                    <p>Aucune donnée disponible</p>
                  )}
                </CardContent>
              </StatsCard>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default BlogStats;