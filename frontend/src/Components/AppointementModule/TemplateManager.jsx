import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Form, Modal, Spinner, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const TemplateManager = () => {
  const [templates, setTemplates] = useState({ global: [], custom: [] });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'standard',
    isDefault: false,
    structure: {}
  });
  const [error, setError] = useState(null);
  
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('http://localhost:5000/api/notes/templates');
      setTemplates({
        global: data.global,
        custom: data.custom
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setNewTemplate(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleCreateTemplate = async () => {
    try {
      await axios.post('http://localhost:5000/api/notes/templates', newTemplate);
      setShowCreateModal(false);
      setNewTemplate({
        name: '',
        type: 'standard',
        isDefault: false,
        structure: {}
      });
      toast.success('Template created successfully');
      fetchTemplates();
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error(err.response?.data?.message || 'Failed to create template');
    }
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading templates...</span>
        </Spinner>
      </div>
    );
  }
  
  return (
    <div className="template-manager">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Note Templates</h2>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          Create Custom Template
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <h4>Global Templates</h4>
      <Row className="mb-4">
        {templates.global.map(template => (
          <Col md={4} key={template._id} className="mb-3">
            <Card className="h-100">
              <Card.Header>{template.name}</Card.Header>
              <Card.Body>
                <Card.Text>
                  <strong>Type:</strong> {template.type}<br />
                  <strong>Fields:</strong> {Object.keys(template.structure).length}
                </Card.Text>
              </Card.Body>
              <Card.Footer className="bg-white">
                <Button variant="outline-primary" size="sm" className="w-100">
                  View Structure
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      
      <h4>Custom Templates</h4>
      <Row>
        {templates.custom.length === 0 ? (
          <Col>
            <p className="text-muted">You have not created any custom templates yet.</p>
          </Col>
        ) : (
          templates.custom.map(template => (
            <Col md={4} key={template._id} className="mb-3">
              <Card className="h-100">
                <Card.Header>
                  {template.name}
                  {template.isDefault && (
                    <Badge bg="success" className="ms-2">Default</Badge>
                  )}
                </Card.Header>
                <Card.Body>
                  <Card.Text>
                    <strong>Type:</strong> {template.type}<br />
                    <strong>Fields:</strong> {Object.keys(template.structure).length}
                  </Card.Text>
                </Card.Body>
                <Card.Footer className="bg-white d-flex justify-content-between">
                  <Button variant="outline-secondary" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline-danger" size="sm">
                    Delete
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))
        )}
      </Row>
      
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create Custom Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Template Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={newTemplate.name}
                onChange={handleInputChange}
                placeholder="Enter template name"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Template Type</Form.Label>
              <Form.Select
                name="type"
                value={newTemplate.type}
                onChange={handleInputChange}
              >
                <option value="standard">Standard Session</option>
                <option value="initial_assessment">Initial Assessment</option>
                <option value="progress_update">Progress Update</option>
                <option value="crisis_intervention">Crisis Intervention</option>
                <option value="follow_up">Follow-up</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Set as default template for this type"
                name="isDefault"
                checked={newTemplate.isDefault}
                onChange={handleInputChange}
              />
            </Form.Group>
            
            <hr />
            
            <p>Template structure implementation would go here...</p>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateTemplate}>
            Create Template
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TemplateManager;