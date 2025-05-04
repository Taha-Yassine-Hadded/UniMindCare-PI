import React, { Fragment } from 'react';
import { Card, CardHeader, Col, Container, Row } from 'reactstrap';
import { Breadcrumbs, H4 } from '../../AbstractElements';
import EvaluationTableData from './EvaluationTableData';

const EvaluationHistoryContain = () => {
  return (
    <Fragment>
      <Breadcrumbs
        mainTitle="Historique des évaluations"
        parent="Évaluations"
        title="Historique des évaluations"
      />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardHeader className="pb-0">
                <H4>Historique des évaluations</H4>
              </CardHeader>
              <EvaluationTableData />
            </Card>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default EvaluationHistoryContain;