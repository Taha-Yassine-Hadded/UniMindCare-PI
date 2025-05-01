import React from 'react';
import { Card, Row, Col, Badge, Button } from 'react-bootstrap';
import { format } from 'date-fns';

const NoteViewer = ({ note, onClose, onEdit }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <Badge bg="warning">Draft</Badge>;
      case 'completed':
        return <Badge bg="success">Completed</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };
  
  const getTemplateBadge = (type) => {
    switch (type) {
      case 'initial_assessment':
        return <Badge bg="info">Initial Assessment</Badge>;
      case 'standard':
        return <Badge bg="primary">Standard</Badge>;
      case 'progress_update':
        return <Badge bg="secondary">Progress Update</Badge>;
      case 'crisis_intervention':
        return <Badge bg="danger">Crisis Intervention</Badge>;
      case 'follow_up':
        return <Badge bg="success">Follow-up</Badge>;
      default:
        return <Badge bg="light" text="dark">{type}</Badge>;
    }
  };
  
  return (
    <Card className="mt-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">{note.title || 'Untitled Note'}</h5>
            <div>
              {getTemplateBadge(note.templateType)}
              {' '}
              {getStatusBadge(note.status)}
            </div>
          </div>
          <div>
            <span className="text-muted">
              {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-4">
          <Col md={6}>
            <h6>Objectives</h6>
            <p className="text-pre-wrap">{note.objectives || 'None specified'}</p>
          </Col>
          <Col md={6}>
            <h6>Observations</h6>
            <p className="text-pre-wrap">{note.observations || 'None specified'}</p>
          </Col>
        </Row>
        
        <Row className="mb-4">
          <Col md={6}>
            <h6>Assessment</h6>
            <p className="text-pre-wrap">{note.assessments || 'None specified'}</p>
          </Col>
          <Col md={6}>
            <h6>Treatment</h6>
            <p className="text-pre-wrap">{note.treatment || 'None specified'}</p>
          </Col>
        </Row>
        
        <Row className="mb-4">
          <Col md={6}>
            <h6>Actions</h6>
            <p className="text-pre-wrap">{note.actions || 'None specified'}</p>
          </Col>
          <Col md={6}>
            <h6>Follow-up Plan</h6>
            <p className="text-pre-wrap">{note.followUpPlan || 'None specified'}</p>
          </Col>
        </Row>
        
        {note.privateNotes && (
          <Row className="mb-3">
            <Col>
              <Card bg="light">
                <Card.Body>
                  <Card.Title>Private Notes</Card.Title>
                  <Card.Text className="text-pre-wrap">
                    {note.privateNotes}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
        
        <div className="d-flex justify-content-between mt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={onEdit}>
            Edit Note
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default NoteViewer;