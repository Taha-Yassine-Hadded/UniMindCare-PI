import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const NoteEditor = ({ 
  noteId,
  caseId,
  studentId,
  suggestedTemplate,
  token,  // Ajout du token
  onNoteCreated,
  onNoteUpdated,
  onCancel,
  mode = 'create'
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState(suggestedTemplate?.type || 'standard');
  const [templateStructure, setTemplateStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    objectives: '',
    observations: '',
    assessments: '',
    treatment: '',
    actions: '',
    followUpPlan: '',
    privateNotes: '',
    status: 'draft'
  });
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Configuration des requêtes avec token
  const getConfig = () => ({
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Fetch all available templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/notes/templates', getConfig());
        setTemplates(data.all);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Could not load templates');
        setLoading(false);
      }
    };
    
    fetchTemplates();
  }, [token]);
  
  // If editing, fetch the existing note data
  useEffect(() => {
    if (mode === 'edit' && noteId) {
      const fetchNote = async () => {
        try {
          setLoading(true);
          const { data } = await axios.get(`http://localhost:5000/api/notes/${noteId}`, getConfig());
          setFormData({
            title: data.title || '',
            objectives: data.objectives || '',
            observations: data.observations || '',
            assessments: data.assessments || '',
            treatment: data.treatment || '',
            actions: data.actions || '',
            followUpPlan: data.followUpPlan || '',
            privateNotes: data.privateNotes || '',
            status: data.status || 'draft'
          });
          setSelectedTemplateType(data.templateType || 'standard');
          setLoading(false);
        } catch (err) {
          console.error('Error fetching note data:', err);
          setError('Could not load note data');
          setLoading(false);
        }
      };
      
      fetchNote();
    }
  }, [noteId, mode, token]);
  
  // Fetch template structure when template type changes
  useEffect(() => {
    const fetchTemplateStructure = async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/api/notes/templates/type/${selectedTemplateType}`, getConfig());
        setTemplateStructure(data.structure);
      } catch (err) {
        console.error(`Error fetching template structure for ${selectedTemplateType}:`, err);
        setError(`Could not load template structure for ${selectedTemplateType}`);
      }
    };
    
    if (selectedTemplateType) {
      fetchTemplateStructure();
    }
  }, [selectedTemplateType, token]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear validation errors for this field
    setValidationErrors(prevErrors => 
      prevErrors.filter(err => err.field !== name)
    );
  };
  
  const handleTemplateChange = (e) => {
    setSelectedTemplateType(e.target.value);
  };
  
  const validateForm = () => {
    if (!templateStructure) return false;
    
    const errors = [];
    
    // Validate required fields based on template structure
    Object.entries(templateStructure).forEach(([field, config]) => {
      if (config.required && (!formData[field] || formData[field].trim() === '')) {
        errors.push({
          field,
          message: `${config.label} is required`
        });
      }
    });
    
    // Validate title
    if (!formData.title || formData.title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Note title is required'
      });
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };
  
  const handleSubmit = async (e, isDraft = true) => {
    e.preventDefault();
    
    const finalStatus = isDraft ? 'draft' : 'completed';
    const updatedFormData = {
      ...formData,
      status: finalStatus
    };
    
    if (!isDraft) {
      // Only validate completed notes
      const isValid = validateForm();
      if (!isValid) {
        return;
      }
    }
    
    setSaving(true);
    
    try {
      const config = getConfig();
      
      if (mode === 'create') {
        // Create new note
        await axios.post('http://localhost:5000/api/notes', {
          ...updatedFormData,
          caseId,
          studentId,
          templateType: selectedTemplateType
        }, config);
        
        onNoteCreated && onNoteCreated();
      } else {
        // Update existing note
        await axios.put(`http://localhost:5000/api/notes/${noteId}`, updatedFormData, config);
        onNoteUpdated && onNoteUpdated();
      }
    } catch (err) {
      console.error('Error saving note:', err);
      
      // Handle validation errors from backend
      if (err.response?.data?.missingFields) {
        setValidationErrors(
          err.response.data.missingFields.map(f => ({
            field: f.field,
            message: `${f.label} is required`
          }))
        );
      } else {
        setError('Failed to save the note. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };
  
  const getTemplateName = (type) => {
    const template = templates.find(t => t.type === type);
    return template ? template.name : type;
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }
  
  return (
    <Card className="mb-4">
      <Card.Header as="h5">
        {mode === 'create' ? 'Create New Session Note' : 'Edit Session Note'}
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={(e) => handleSubmit(e, true)}>
          <Row className="mb-3">
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Note Title</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  isInvalid={validationErrors.some(e => e.field === 'title')}
                  placeholder="Enter a title for this session note"
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.find(e => e.field === 'title')?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Template Type</Form.Label>
                <Form.Select
                  name="templateType"
                  value={selectedTemplateType}
                  onChange={handleTemplateChange}
                  disabled={mode === 'edit'} // Cannot change template type when editing
                >
                  {templates.filter(t => t.isGlobal).map(template => (
                    <option key={template._id} value={template.type}>
                      {template.name}
                    </option>
                  ))}
                </Form.Select>
                {mode === 'create' && suggestedTemplate && (
                  <Form.Text className="text-muted">
                    Suggested template based on case history: {getTemplateName(suggestedTemplate.type)}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>
          
          {templateStructure && Object.entries(templateStructure).map(([field, config]) => (
            <Form.Group className="mb-3" key={field}>
              <Form.Label>
                {config.label} {config.required && <span className="text-danger">*</span>}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name={field}
                value={formData[field] || ''}
                onChange={handleChange}
                placeholder={config.placeholder}
                isInvalid={validationErrors.some(e => e.field === field)}
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.find(e => e.field === field)?.message}
              </Form.Control.Feedback>
            </Form.Group>
          ))}
          
          <Form.Group className="mb-3">
            <Form.Label>Private Notes (only visible to you)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="privateNotes"
              value={formData.privateNotes || ''}
              onChange={handleChange}
              placeholder="Enter any private notes that will only be visible to you"
            />
          </Form.Group>
          
          <div className="d-flex justify-content-between mt-4">
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <div>
              <Button
                variant="outline-primary"
                className="me-2"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                variant="primary"
                onClick={(e) => handleSubmit(e, false)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Complete & Save'}
              </Button>
            </div>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default NoteEditor;