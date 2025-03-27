import { Col, Container, Row } from 'reactstrap';
import RegisterFrom from './RegisterFrom';
import imgg from '../../../assets/images/login/login_bg.png';
import { Image } from '../../../AbstractElements';
import { Link } from 'react-router-dom';
import {dynamicImage} from "../../../Services/index"
const RegisterSimple = () => {
    return (
            <section>
                <Container fluid={true} className="p-0">
                    <Row className="m-0">
                        <Col xs='12' className="p-0">
                            <div className="login-card img-fluid bg-img-cover" style={{ 
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
}}>
                                <div>
                                    <Link className="logo" to={`${process.env.PUBLIC_URL}/dashboard/default`}>
                                        <Image attrImage={{ className: 'img-fluid', src: dynamicImage('logo/logo2.png'), alt: '' }} />
                                    </Link>
                                </div>
                                <RegisterFrom />
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>
    );
};

export default RegisterSimple;