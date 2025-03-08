import React, { Fragment, useState } from 'react';
import { Col, Container, Row, TabContent, TabPane } from 'reactstrap';
import NavAuth from '../Auth/Nav';
import LoginTab from '../Components/Pages/Auth/Login';

const LoginSample = () => {
    const [selected, setSelected] = useState('simpleLogin');

    const callbackNav = ((select) => {
        setSelected(select);
    });

    return (
        <Fragment>
            <Container fluid={true} className="p-0">
                <Row className='mx-0'>
                    <Col xs="12" className='px-0'>
                        <div className="login-main1 login-tab1 login-main" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                            <NavAuth callbackNav={callbackNav} selected={selected} />
                            <TabContent activeTab={selected} className="content-login">
                                    <LoginTab/>
                            </TabContent>
                        </div>
                    </Col>
                </Row>
            </Container>
        </Fragment>
    );
};

export default LoginSample;