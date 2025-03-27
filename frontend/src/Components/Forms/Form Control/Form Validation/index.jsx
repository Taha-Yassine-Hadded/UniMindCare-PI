import { H4, Breadcrumbs } from '../../../../AbstractElements';
import { BrowserDefaults, CustomStyles, SupportedElements, Tooltips } from '../../../../Constant';
import BrowserDefault from './BrowserDefault';
import Custom from './custom';
import SupportElement from './SupportElement';
import Tooltipform from './Tooltipform';
import { CardBody, CardHeader, Card, Col, Container, Row } from 'reactstrap';
import React, { Fragment } from 'react';

const FormValidationContain = () => {
  const desc= 'For Custom Bootstrap Form Validation Messages, You’ll Need To Add The novalidate Boolean Attribute To Your <form>. This Disables The Browser Default Feedback Tooltips, But Still Provides Access To The Form Validation APIs In JavaScript. Try To Submit The Form Below; Our JavaScript Will Intercept The Submit Button And Relay Feedback To You.When Attempting To Submit, You’ll See The :invalid And :valid Styles Applied To Your Form Controls.';
  const disp = '';
  return (
    <Fragment>
      <Breadcrumbs mainTitle="Form Validation" parent="Form Control" title="Form Validation" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
           
            <Card>
              <CardHeader className="pb-0">
                <H4>Questionnaire</H4>
                <span>{disp}</span>
              </CardHeader>
              <CardBody>
                <SupportElement />
              </CardBody>
            </Card>
           
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};
export default FormValidationContain;