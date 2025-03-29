import React, { Fragment } from 'react';
import { Col, Container, Row } from 'reactstrap';
<<<<<<< HEAD
import EditMyProfile from './EditmyProfile';
import MyProfileEdit from './MyProfile';
import { Breadcrumbs } from '../../../AbstractElements';

const UsersEditContain = () => {
  return (
    <Fragment>
      <Breadcrumbs mainTitle="User Edit" parent="Users" title="User Edit" />
      <Container fluid={true}>
        <div className="edit-profile">
          <Row>
            <Col xl="4" lg="5">
              <MyProfileEdit />
            </Col>
            <Col xl="8" lg="7">
              <EditMyProfile />
=======
import { Routes, Route, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '../../../AbstractElements';
import MyProfileEdit from './MyProfile';
import EditMyProfile from './EditmyProfile';
import ManageContactInfo from './ManageContactInfo';
import ChangePassword from './ChangePassword';

const UsersEditContain = () => {
  const location = useLocation();
  const isDefaultPage = location.pathname === `${process.env.PUBLIC_URL}/users/useredit`;

  return (
    <Fragment>
      <Breadcrumbs mainTitle="My Profile" parent="Users" title="My Profile" />
      <Container fluid={true}>
        <div className="edit-profile">
          <Row>
            {/* Left Container: MyProfileEdit with Navigation Buttons */}
            <Col xl="4" lg="5">
              <MyProfileEdit />
            </Col>

            {/* Right Container: Default EditMyProfile, Switch to Other Components */}
            <Col xl="8" lg="7">
              <div className="right-container">
                <Routes>
                  {/* Default Route: Show EditMyProfile (Two-Factor Auth) */}
                  <Route path="/" element={<EditMyProfile />} />
                  {/* Routes for the other components */}
                  <Route path="manage-contact-info" element={<ManageContactInfo />} />
                  <Route path="change-password" element={<ChangePassword />} />
                </Routes>
              </div>
>>>>>>> full-Integration
            </Col>
          </Row>
        </div>
      </Container>
    </Fragment>
  );
};
<<<<<<< HEAD
=======

>>>>>>> full-Integration
export default UsersEditContain;