import { Facebook, Instagram, Linkedin, Twitter } from "react-feather";
import { Form, FormGroup, Input, InputGroup, Label, Row, Col } from "reactstrap";
import { Btn, H4, H6, LI, P, UL } from "../../../AbstractElements";
import { CreateAccount, EmailAddress, Password, PrivacyPolicy, SignIn, YourName } from "../../../Constant";
import { useNavigate } from "react-router-dom";

const RegisterFrom = () => {
  const navigate = useNavigate();

  const handleFaceIDRegistration = () => {
    navigate(`${process.env.PUBLIC_URL}/authentication/register-faceid`);
  };

  return (
    <div className="login-main">
      <Form className="theme-form login-form">
        <div className="login-header text-center">
          <H4>Create your account</H4>
          <P>Enter your personal details to create account</P>
        </div>
        <FormGroup>
          <Label>{YourName}</Label>
          <Row>
            <Col sm="6">
              <Input className="form-control" type="text" required="" placeholder="First Name" />
            </Col>
            <Col sm="6">
              <Input className="form-control" type="text" required="" placeholder="Last Name" />
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <Label>{EmailAddress}</Label>
          <InputGroup>
            <Input className="form-control" type="email" required="" placeholder="Test@gmail.com" />
          </InputGroup>
        </FormGroup>
        <FormGroup className="position-relative form-group pass-hide">
          <Label>{Password}</Label>
          <Input className="form-control" type="password" name="login[password]" required="" placeholder="*********" />
          <div className="show-hide">
            <span className="show"></span>
          </div>
        </FormGroup>
        <FormGroup>
          <div className="checkbox">
            <Input id="checkbox1" type="checkbox" />
            <Label className="text-muted" for="checkbox1">
              Agree with
              <a className="ms-2" href="#javascript">{PrivacyPolicy}</a>
            </Label>
          </div>
        </FormGroup>
        <FormGroup>
          <Btn attrBtn={{ color: "primary", className: "w-100", type: "submit" }}>{CreateAccount}</Btn>
        </FormGroup>
        
        {/* Bouton pour FaceID */}
        <FormGroup>
          <Btn attrBtn={{ color: "secondary", className: "w-100", type: "button", onClick: handleFaceIDRegistration }}>
            Register with FaceID
          </Btn>
        </FormGroup>

        <div className="login-social-title">
          <H6>Or Sign in with</H6>
        </div>
        <FormGroup>
          <UL attrUL={{ className: "simple-list login-social flex-row" }}>
            <LI>
              <a href="https://in.linkedin.com/">
                <Linkedin/>
              </a>
            </LI>
            <LI>
              <a href="https://twitter.com/i/flow/login">
                <Twitter/>
              </a>
            </LI>
            <LI>
              <a href="https://www.instagram.com/">
                <Instagram/>
              </a>
            </LI>
            <LI>
              <a href="https://www.facebook.com/">
                <Facebook/>
              </a>
            </LI>
          </UL>
        </FormGroup>
        <P attrPara={{ className: "mt-4 mb-0 text-center" }}>
          Already have an account?
          <a href={`${process.env.PUBLIC_URL}/login`} className="ms-2">
            {SignIn}
          </a>
        </P>
      </Form>
    </div>
  );
};

export default RegisterFrom;
