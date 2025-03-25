import { Col, Container, Row } from 'reactstrap';
import LoginForm from './LoginForm';
import imgg from '../../../assets/images/login/login_bg.jpg';

const LoginSweetalert = () => {
    return (
            <section>
                <Container className="p-0" fluid={true}>
                    <Row className="mx-0">
                    <Col xl="7" style={{ 
    backgroundImage: `url(${imgg})`, 
    backgroundRepeat: 'no-repeat', 
    backgroundSize: 'cover', 
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    margin: '0 auto',
    boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.5)',
    padding: '30px 12px'
}} >
                            <div className="login-card">
                                <LoginForm />
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>
    );
};

export default LoginSweetalert;