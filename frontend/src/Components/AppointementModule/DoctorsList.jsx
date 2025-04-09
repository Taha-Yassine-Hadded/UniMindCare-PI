import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Added this import
import './DoctorsList.css';
import defaultProfile from '../../assets/images/default-profile.png';
import { 
  Container, Row, Col, Card, Badge, Button, InputGroup, Input,
  Progress, InputGroupText
} from 'reactstrap';
import { FaSearch, FaCalendarAlt } from 'react-icons/fa';

const DoctorsList = () => {
    const navigate = useNavigate(); // Add this hook for navigation
    const [psychiatres, setPsychiatres] = useState([]);
    const [filteredPsychiatres, setFilteredPsychiatres] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedGender, setSelectedGender] = useState('all');

    // Fetch psychiatrists on component mount
    useEffect(() => {
        const fetchPsychiatres = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/appointments/psychiatres');
                setPsychiatres(response.data);
                setFilteredPsychiatres(response.data);
                setLoading(false);
            } catch (err) {
                setError('Failed to load psychiatrists. Please try again later.');
                setLoading(false);
                console.error('Error fetching psychiatrists:', err);
            }
        };

        fetchPsychiatres();
    }, []);

    // Handle search and filters
    useEffect(() => {
        let result = psychiatres;
        
        // Apply search filter
        if (searchTerm) {
            result = result.filter((psychiatre) => 
                psychiatre.Name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply gender filter (assuming you have a gender field)
        if (selectedGender !== 'all') {
            result = result.filter((psychiatre) => 
                psychiatre.gender === selectedGender
            );
        }
        
        setFilteredPsychiatres(result);
    }, [searchTerm, selectedGender, psychiatres]);

    // Handle "Make an appointment" button click - UPDATED
    const handleMakeAppointment = (psychiatreId) => {
        console.log(`Navigating to booking page for psychiatrist ID: ${psychiatreId}`);
        // Navigate to student dashboard with the selected psychiatrist ID
        navigate(`${process.env.PUBLIC_URL}/appointment/student-dashboard?psychologistId=${psychiatreId}`);
    };

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading psychiatrists...</p>
        </div>
    );
    
    if (error) return (
        <div className="error-container">
            <div className="error-icon">!</div>
            <p>{error}</p>
            <Button color="primary" onClick={() => window.location.reload()}>
                Try Again
            </Button>
        </div>
    );

    return (
        <Container fluid className="doctors-list-container">
            {/* Simplified Filters */}
            <div className="filters-section d-flex align-items-center justify-content-between">
                {/* Therapists Button */}
                <div className="therapist-filter">
                    <Button 
                        color="primary" 
                        outline 
                        className="therapist-filter-btn"
                        active
                    >
                        PSYCHOLOGIST
                    </Button>
                </div>

                {/* Gender Filter */}
                <div className="gender-filter-container d-flex align-items-center">
                    <div className="gender-buttons d-flex">
                        <Button 
                            color={selectedGender === 'all' ? 'primary' : 'light'}
                            onClick={() => setSelectedGender('all')}
                            className="gender-btn"
                        >
                            All
                        </Button>
                        <Button 
                            color={selectedGender === 'male' ? 'primary' : 'light'}
                            onClick={() => setSelectedGender('male')}
                            className="gender-btn"
                        >
                            Men
                        </Button>
                        <Button 
                            color={selectedGender === 'female' ? 'primary' : 'light'}
                            onClick={() => setSelectedGender('female')}
                            className="gender-btn"
                        >
                            Women
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="search-bar-container">
                    <InputGroup className="search-bar">
                        <InputGroupText>
                            <FaSearch />
                        </InputGroupText>
                        <Input
                            placeholder="Search by name "
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </div>
            </div>
            
            {/* Results Count */}
            <div className="results-summary">
                <span>Showing {filteredPsychiatres.length} professionals</span>
                {searchTerm && <Badge color="info" className="search-badge">Search: "{searchTerm}"</Badge>}
            </div>

            {/* Psychiatrists List - Horizontal Cards */}
            <div className="doctors-grid">
                {filteredPsychiatres.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h4>No psychiatrists found</h4>
                        <p>Try adjusting your search criteria or filters</p>
                    </div>
                ) : (
                    filteredPsychiatres.map((psychiatre) => (
                        <Card key={psychiatre._id} className="horizontal-doctor-card">
                            <Row noGutters>
                                {/* Doctor Image */}
                                <Col md="3" className="doctor-image-col">
                                    <div className="doctor-image-container">
                                        <img
                                            src={psychiatre.imageUrl || defaultProfile}
                                            alt={psychiatre.Name}
                                            className="doctor-image"
                                        />
                                    </div>
                                </Col>
                                {/* Name and Badges Block */}
                                <Col md="3" className="name-badges-col">
                                    <div className="name-badges-block">
                                        <h4 className="doctor-name">{psychiatre.Name}</h4>
                                        <div className="doctor-speciality">
                                            <Badge color="dark" pill>Therapist</Badge>
                                            <Badge color="dark" pill>Mental Health</Badge>
                                        </div>
                                    </div>
                                </Col>
                                {/* Rating Block */}
                                <Col md="3" className="rating-col">
                                    <div className="rating-block">
                                        <div className="stat-item">
                                            <div className="stat-label">
                                                <span>Doctor rating</span>
                                            </div>
                                            <div className="progress-container">
                                                <Progress 
                                                    value={80} 
                                                    className="rating-progress dashed-progress"
                                                    style={{ backgroundColor: '#e9ecef' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                                {/* Appointment Button Block */}
                                <Col md="3" className="appointment-col">
                                    <div className="appointment-section">
                                        <Button
                                            color="primary"
                                            className="appointment-button"
                                            onClick={() => handleMakeAppointment(psychiatre._id)}
                                        >
                                            <FaCalendarAlt className="button-icon" />
                                            Make an appointment
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    ))
                )}
            </div>
        </Container>
    );
};

export default DoctorsList;