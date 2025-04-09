import { Col, Container, Row } from 'reactstrap';
import RegisterWithFaceID from './RegisterWithFaceID'; // Use the FaceID registration form here
import imgg from '../../../assets/images/login/login_bg.png';
import { Image } from '../../../AbstractElements';
import { Link } from 'react-router-dom';
import { dynamicImage } from "../../../Services/index";

const FaceIDRegisterSimple = () => {
  return (
    <section>
      <Container fluid={true} className="p-0">
        <Row className="m-0">
          <Col xs="12" className="p-0">
            <div
              className="login-card img-fluid bg-img-cover"
              style={{
                backgroundImage: `url(${imgg})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'block',
              }}
            >
              <div>
                <Link
                  className="logo"
                  to={`${process.env.PUBLIC_URL}/dashboard/default`}
                >
                  <Image
                    attrImage={{
                      className: 'img-fluid',
                      src: dynamicImage('logo/logo2.png'),
                      alt: '',
                    }}
                  />
                </Link>
              </div>
              <RegisterWithFaceID /> {/* Render FaceID registration form here */}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default FaceIDRegisterSimple;
