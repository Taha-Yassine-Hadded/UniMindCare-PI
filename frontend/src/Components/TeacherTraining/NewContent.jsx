import React, { Fragment, useState } from 'react';
import { Container, Row, Col, Card, CardBody, Button, Form, FormGroup, Label, Input, InputGroup, InputGroupText } from 'reactstrap';
import { Breadcrumbs } from '../../AbstractElements';
import ContentService from '../../Services/TeacherTraining/ContentService';
import Swal from 'sweetalert2';

const NewContent = ({ trainingProgramId, onContentAdded, toggler }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'video',
    contentUrl: '',
    meetingLink: '',
    scheduledDate: '',
    questions: []
  });

  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleQuestionChange = (e, index) => {
    const { name, value } = e.target;
    if (name === 'text' || name === 'correctAnswer') {
      setCurrentQuestion(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name.startsWith('option')) {
      const optionIndex = parseInt(name.split('-')[1]);
      const newOptions = [...currentQuestion.options];
      newOptions[optionIndex] = value;
      setCurrentQuestion(prev => ({
        ...prev,
        options: newOptions
      }));
    }
  };

  const addQuestion = () => {
    if (currentQuestion.text && currentQuestion.correctAnswer && currentQuestion.options.every(opt => opt)) {
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, currentQuestion]
      }));
      setCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: '' });
    } else {
      setError('Please fill all question fields');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const contentData = new FormData();
      contentData.append('title', formData.title);
      contentData.append('type', formData.type);
      
      if (formData.type === 'video') {
        contentData.append('contentUrl', formData.contentUrl);
      } else if (formData.type === 'meet') {
        contentData.append('meetingLink', formData.meetingLink);
        contentData.append('scheduledDate', formData.scheduledDate);
      } else if (formData.type === 'pdf' && file) {
        contentData.append('file', file);
      } else if (formData.type === 'quiz') {
        contentData.append('questions', JSON.stringify(formData.questions));
      }

      const newContent = await ContentService.createContent(trainingProgramId, contentData);
      console.log('Server response:', newContent);

      // Reset form
      setFormData({
        title: '',
        type: 'video',
        contentUrl: '',
        meetingLink: '',
        scheduledDate: '',
        questions: []
      });
      setFile(null);

      // Show success alert, close modal, and refresh
      Swal.fire({
        title: 'Content Created Successfully!',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      }).then(() => {
        if (toggler) toggler(); // Close modal
        if (onContentAdded) onContentAdded(); // Trigger refresh in parent
      });
    } catch (err) {
      console.error('Error creating content:', err);
      setError(err.message || 'Failed to create content. Please try again.');
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
        <Label for="type">Content Type</Label>
        <Input
          type="select"
          name="type"
          id="type"
          value={formData.type}
          onChange={handleChange}
        >
          <option value="video">Video</option>
          <option value="meet">Meeting</option>
          <option value="pdf">PDF</option>
          <option value="quiz">Quiz</option>
        </Input>
      </FormGroup>

      {formData.type === 'video' && (
        <FormGroup>
          <Label for="contentUrl">Content URL</Label>
          <Input
            type="url"
            name="contentUrl"
            id="contentUrl"
            value={formData.contentUrl}
            onChange={handleChange}
            required
          />
        </FormGroup>
      )}

      {formData.type === 'meet' && (
        <>
          <FormGroup>
            <Label for="meetingLink">Meeting Link</Label>
            <Input
              type="url"
              name="meetingLink"
              id="meetingLink"
              value={formData.meetingLink}
              onChange={handleChange}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label for="scheduledDate">Scheduled Date</Label>
            <Input
              type="datetime-local"
              name="scheduledDate"
              id="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleChange}
              required
            />
          </FormGroup>
        </>
      )}

      {formData.type === 'pdf' && (
        <FormGroup>
          <Label for="file">Upload PDF</Label>
          <Input
            type="file"
            name="file"
            id="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
        </FormGroup>
      )}

      {formData.type === 'quiz' && (
        <>
          <FormGroup>
            <Label>Add Question</Label>
            <Input
              type="text"
              name="text"
              placeholder="Question text"
              value={currentQuestion.text}
              onChange={handleQuestionChange}
            />
          </FormGroup>
          {currentQuestion.options.map((option, index) => (
            <FormGroup key={index}>
              <InputGroup>
                <InputGroupText>{`Option ${index + 1}`}</InputGroupText>
                <Input
                  type="text"
                  name={`option-${index}`}
                  value={option}
                  onChange={(e) => handleQuestionChange(e, index)}
                />
              </InputGroup>
            </FormGroup>
          ))}
          <FormGroup>
            <Label>Correct Answer</Label>
            <Input
              type="text"
              name="correctAnswer"
              value={currentQuestion.correctAnswer}
              onChange={handleQuestionChange}
            />
          </FormGroup>
          <Button color="secondary" onClick={addQuestion} className="mb-3">
            Add Question
          </Button>
          {formData.questions.length > 0 && (
            <div>
              <h6>Added Questions:</h6>
              {formData.questions.map((q, i) => (
                <p key={i}>{i + 1}. {q.text}</p>
              ))}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="text-danger mb-3">{error}</div>
      )}

      <Button color="primary" type="submit">
        Create Content
      </Button>
    </Form>
  );
};

export default NewContent;