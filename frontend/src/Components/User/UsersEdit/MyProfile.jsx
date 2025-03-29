import React from 'react';
import { Card, CardHeader, CardBody, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Link, useLocation } from 'react-router-dom';
import { Image, H3, P } from '../../../AbstractElements';
import userImg from '../../../assets/images/user/7.jpg';

const MyProfileEdit = () => {
  const storedUser = JSON.parse(localStorage.getItem('user'));
  const location = useLocation();

  // Determine which button is active based on the current path
  const isTwoFactorActive = location.pathname === `${process.env.PUBLIC_URL}/users/useredit`;
  const isManageContactActive = location.pathname === `${process.env.PUBLIC_URL}/users/useredit/manage-contact-info`;
  const isChangePasswordActive = location.pathname === `${process.env.PUBLIC_URL}/users/useredit/change-password`;

  return (
    <Card>
      <CardHeader>
        <H3 attrH3={{ className: 'card-title mb-0' }}>User Informations</H3>
      </CardHeader>
      <CardBody>
        <Form>
          <Row className="mb-2">
            <div className="profile-title text-center">
              <Image
                attrImage={{
                  className: 'img-70 rounded-circle',
                  alt: '',
                  src: storedUser && storedUser.imageUrl ? storedUser.imageUrl : userImg,
                }}
              />
              <div>
                <H3 attrH3={{ className: 'mb-1 f-20 txt-primary' }}>
                  {storedUser ? storedUser.Name : 'Nom'}
                </H3>
                <P attrPara={{ className: 'mb-0' }}>
                  Role: {storedUser?.Role?.[0]?.toUpperCase() || 'Role'}
                </P>
                <P attrPara={{ className: 'mb-0' }}>
                  Identifier: {storedUser ? storedUser.Identifiant : 'Identifiant'}
                </P>
              </div>
            </div>
          </Row>
          <FormGroup className="mb-3">
            <Label>Email Address</Label>
            <Input type="email" defaultValue={storedUser ? storedUser.Email : ''} disabled />
          </FormGroup>

          {/* Navigation Buttons */}
          <div className="text-center">
            <Link to={`${process.env.PUBLIC_URL}/users/useredit`}>
              <button
                type="button"
                className={`btn btn-primary mb-2 d-block ${isTwoFactorActive ? 'active' : ''}`}
              >
                Two Factor Auth
              </button>
            </Link>
            <Link to={`${process.env.PUBLIC_URL}/users/useredit/manage-contact-info`}>
              <button
                type="button"
                className={`btn btn-primary mb-2 d-block ${isManageContactActive ? 'active' : ''}`}
              >
                Manage Contact Info
              </button>
            </Link>
            <Link to={`${process.env.PUBLIC_URL}/users/useredit/change-password`}>
              <button
                type="button"
                className={`btn btn-primary mb-2 d-block ${isChangePasswordActive ? 'active' : ''}`}
              >
                Change Password
              </button>
            </Link>
          </div>
        </Form>
      </CardBody>
    </Card>
  );
};

export default MyProfileEdit;