import { useState, useEffect } from 'react';
import { Col, Container, Row, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginSample = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');

    // Check if token is passed in URL on component mount (for Google login)
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get('token');
        
        if (token) {
            if (rememberMe) {
                localStorage.setItem('token', token);  // Store token in localStorage
            } else {
                sessionStorage.setItem('token', token);  // Store token in sessionStorage
            }
            navigate('/tivo/dashboard/default');  // Redirect to the default dashboard
        }
    }, [navigate, rememberMe]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/users/signin', { email, password });
            const token = response.data.token;

            if (rememberMe) {
                localStorage.setItem('token', token); 
                // Store token in localStorage
            } else {
                sessionStorage.setItem('token', token);
                // Store token in sessionStorage
            }

            setError('');  // Clear error message on successful login
            navigate('/tivo/dashboard/default');  // Navigate to the default dashboard page after successful login

        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:5000/users/auth/google';  // Redirect to Google authentication
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        setError('');  // Clear error message when email changes
    };

    return (
        <section>
            <Container className="p-0" fluid={true}>
                <Row className="mx-0">
                    <Col className="px-0" xl="12" >
                        <div className="login-card">
                            <div className="logo-section text-center">
                                <Link className="logo" to={`${process.env.PUBLIC_URL}/dashboard/default`}>
                                    <img src={require('../../../assets/images/logo/logo2.png')} alt="Logo" className="img-fluid" />
                                </Link>
                            </div>
                            <div className="login-main1 login-tab1 login-main">
                                <Form onSubmit={handleLogin} className="theme-form">
                                    <FormGroup>
                                        <Label for="email">Email</Label>
                                        <Input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={handleEmailChange}
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label for="password">Password</Label>
                                        <Input
                                            type="password"
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            required
                                        />
                                    </FormGroup>

                                    {/* Remember Me & Forgot Password on the Same Line */}
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <FormGroup className="mb-0 d-flex align-items-center">
                                            <Input
                                                type="checkbox"
                                                id="rememberMe"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <Label for="rememberMe" className="ms-2 mb-0">Remember Me</Label>
                                        </FormGroup>
                                        <Link to={`${process.env.PUBLIC_URL}/authentication/forget-pwd`} className="text-primary">Forgot Password?</Link>

                                    </div>

                                    {error && <p className="text-danger">{error}</p>}

                                    {/* Buttons with Same Width as Input Fields */}
                                    <Button type="submit" color="primary" className="w-100 mb-2">
                                        Sign In
                                    </Button>
                                    <Button color="danger" className="w-100" onClick={handleGoogleLogin}>
                                        Sign In with Google
                                    </Button>

                                    {/* Create Account Link */}
                                    <div className="text-center mt-3">
                                        <span>Don't have an account? </span>
                                        <Link to={`${process.env.PUBLIC_URL}/authentication/register-simpleimg`} className="text-primary">Create Account</Link>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
};

export default LoginSample;