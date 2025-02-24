import React from 'react';
import { Card, CardHeader, CardBody, Form, FormGroup, Input, Label, Row } from 'reactstrap';
import { Image, H3, P } from '../../../AbstractElements';
import userImg from '../../../assets/images/user/7.jpg';

const MyProfileEdit = () => {
  const storedUser = JSON.parse(localStorage.getItem('user'));

  return (
    <Card>
      <CardHeader>
        <H3 attrH3={{ className: 'card-title mb-0' }}>My Profile</H3>
      </CardHeader>
      <CardBody>
        <Form>
          <Row className="mb-2">
            <div className="profile-title text-center">
              <Image attrImage={{ className: 'img-70 rounded-circle', alt: '', src: storedUser && storedUser.imageUrl ? storedUser.imageUrl : userImg }} />
              <div>
                <H3 attrH3={{ className: 'mb-1 f-20 txt-primary' }}>{storedUser ? storedUser.Name : 'Nom'}</H3>
                <P attrPara={{ className: 'mb-0' }}>Role: {storedUser ? storedUser.Role : 'Rôle'}</P>
              </div>
            </div>
          </Row>
          <FormGroup className="mb-3">
            <Label>Email Address</Label>
            <Input type="email" defaultValue={storedUser ? storedUser.Email : ''} disabled />
          </FormGroup>
        </Form>
      </CardBody>
    </Card>
  );
};

export default MyProfileEdit;