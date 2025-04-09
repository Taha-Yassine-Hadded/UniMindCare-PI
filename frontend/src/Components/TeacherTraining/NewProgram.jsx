import React, { Fragment, useState } from 'react';
import { Container, Row, Col, Card, CardBody, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { Breadcrumbs } from '../../AbstractElements';
import ProgramService from '../../Services/TeacherTraining/ProgramService';
import Swal from 'sweetalert2';

const NewProgram = ({ onProgramAdded, toggler }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: ""
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const newProgram = await ProgramService.createProgram(formData);
      console.log(newProgram)
      
      // Reset form
      setFormData({
        title: "",
        description: ""
      });

      // Show success alert and close modal
      Swal.fire({
        title: "Program Created Successfully!",
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
      }).then(() => {
        if (toggler) toggler(); // Close the modal
        if (onProgramAdded) onProgramAdded(); // Notify parent component
      });

    } catch (err) {
      console.error("Error creating program:", err);
      setError(err.message || "Failed to create program. Please try again.");
    }
  };

  return (
          <Form onSubmit={handleSubmit}>
                  <FormGroup>
                    <Label for="title">Title</Label>
                    <Input
                      type="text"
                      name="title"
                      id="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label for="description">Description</Label>
                    <Input
                      type="textarea"
                      name="description"
                      id="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                    />
                  </FormGroup>

                  {error && (
                    <div className="text-danger mb-3">{error}</div>
                  )}

                  <Button color="primary" type="submit">
                    Create Program
                  </Button>
                </Form>
  );
};

export default NewProgram;