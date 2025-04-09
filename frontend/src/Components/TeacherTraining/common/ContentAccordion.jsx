import React, { useState } from 'react';
import { Accordion, Col } from 'react-bootstrap';
import { Card, CardBody } from 'reactstrap';
import ContentAccordionDynamic from './ContentAccordionDynamic';

const ContentAccordion = ({ contents, onDelete, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(null);
  const toggle = (id) => (isOpen === id ? setIsOpen(null) : setIsOpen(id));

  return (
    <Col sm="12" lg="12">
      <Accordion defaultActiveKey="0">
          <CardBody>
            <div className="default-according" id="accordion1">
              <ContentAccordionDynamic 
                toggle={toggle} 
                isOpen={isOpen} 
                contents={contents} 
                onDelete={onDelete}
                onRefresh={onRefresh}
              />
            </div>
          </CardBody>
      </Accordion>
    </Col>
  );
};

export default ContentAccordion;