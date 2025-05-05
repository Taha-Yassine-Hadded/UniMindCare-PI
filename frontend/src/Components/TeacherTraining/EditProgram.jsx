import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Form, FormGroup, Label, Input, FormFeedback, Row, Col, Button } from 'reactstrap';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import Swal from 'sweetalert2';

const EditProgram = forwardRef(({ program, onProgramUpdated, toggler }, ref) => {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  // Load program data when component mounts or program changes
  useEffect(() => {
    if (program) {
      setFormData({
        title: program.title || '',
        description: program.description || ''
      });
      
      // Set image preview if program has an image
      if (program.imgUrl) {
        setImagePreview(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${program.imgUrl}`);
      } else {
        setImagePreview(null);
      }
    }
  }, [program]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear errors when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file is an image
      if (!file.type.match('image.*')) {
        setErrors({
          ...errors,
          image: 'Please select an image file (png, jpg, jpeg)'
        });
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors({
          ...errors,
          image: 'Image size should be less than 2MB'
        });
        return;
      }

      // Clear any previous errors
      if (errors.image) {
        setErrors({ ...errors, image: null });
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Store the file for upload
      setImageFile(file);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate() || !program) {
      return;
    }
    
    try {
      setUploading(true);
      
      // Create FormData object for file upload
      const programFormData = new FormData();
      programFormData.append('title', formData.title);
      programFormData.append('description', formData.description);
      
      // Append image file if exists
      if (imageFile) {
        programFormData.append('programImage', imageFile);
      }
      
      // Call service method to update the program
      await ProgramService.updateProgram(program._id, programFormData);
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Training program updated successfully.'
      });
      
      if (onProgramUpdated) {
        onProgramUpdated();
      }
      
      if (toggler) {
        toggler();
      }
    } catch (err) {
      console.error('Error updating program:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update program. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  // Forward handleSubmit to parent component
  useImperativeHandle(ref, () => ({
    dispatchEvent(event) {
      if (event.type === 'submit') {
        handleSubmit(event);
      }
    }
  }));

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md="8">
          <FormGroup>
            <Label for="title">Title <span className="text-danger">*</span></Label>
            <Input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              invalid={!!errors.title}
            />
            {errors.title && <FormFeedback>{errors.title}</FormFeedback>}
          </FormGroup>
          
          <FormGroup>
            <Label for="description">Description <span className="text-danger">*</span></Label>
            <Input
              id="description"
              name="description"
              type="textarea"
              rows="5"
              value={formData.description}
              onChange={handleChange}
              invalid={!!errors.description}
            />
            {errors.description && <FormFeedback>{errors.description}</FormFeedback>}
          </FormGroup>
        </Col>
        
        <Col md="4">
          <FormGroup>
            <Label for="programImage">Program Image</Label>
            <div className="custom-file mb-3">
              <Input
                id="programImage"
                name="programImage"
                type="file"
                className="custom-file-input"
                onChange={handleImageChange}
                invalid={!!errors.image}
              />
              {errors.image && <FormFeedback>{errors.image}</FormFeedback>}
            </div>
            
            {/* Image Preview */}
            {imagePreview ? (
              <div className="text-center mt-3">
                <img 
                  src={imagePreview} 
                  alt="Program cover" 
                  className="img-fluid rounded border" 
                  style={{ maxHeight: '200px', objectFit: 'cover' }}
                />
                <p className="mt-2 text-muted small">Current image shown. Upload a new one to replace it.</p>
              </div>
            ) : (
              <div className="text-center mt-3 p-3 bg-light rounded">
                <i className="fa fa-image fa-3x text-muted"></i>
                <p className="mt-2 text-muted">No image selected</p>
              </div>
            )}
            <small className="form-text text-muted mt-2">
              Recommended size: 800x500 pixels. Max size: 2MB
            </small>
          </FormGroup>
        </Col>
      </Row>
      
      {/* Submit button */}
      <div className="d-flex justify-content-end mt-4">
        <Button 
          color="secondary" 
          className="me-2" 
          onClick={toggler}
          disabled={uploading}
          type="button"
        >
          Cancel
        </Button>
        <Button 
          color="primary" 
          type="submit"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Updating...
            </>
          ) : (
            'Update Program'
          )}
        </Button>
      </div>
    </Form>
  );
});

export default EditProgram;