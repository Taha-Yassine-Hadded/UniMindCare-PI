import React, { Fragment, useState } from 'react';
import { Container, Row, Col, Card, CardBody, Button, Form, FormGroup, Label, Input, InputGroup, InputGroupText } from 'reactstrap';
import { Breadcrumbs } from '../../AbstractElements';
import ContentService from '../../Services/TeacherTraining/ContentService';
import Swal from 'sweetalert2';

const NewContent = ({ trainingProgramId, onContentAdded, toggler }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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

  // Validation functions
  const isValidYouTubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  };

  const isValidGoogleMeetUrl = (url) => {
    const meetRegex = /^https:\/\/meet\.google\.com\/[a-zA-Z0-9-]+$/;
    return meetRegex.test(url);
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const isValidQuiz = (questions) => {
    if (questions.length < 5) {
      return { valid: false, message: 'Quiz must contain at least 5 questions.' };
    }
    for (const question of questions) {
      if (!question.options.includes(question.correctAnswer)) {
        return { valid: false, message: `Correct answer for question "${question.text}" must match one of the options.` };
      }
    }
    return { valid: true };
  };

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
    if (
      currentQuestion.text &&
      currentQuestion.correctAnswer &&
      currentQuestion.options.every(opt => opt) &&
      currentQuestion.options.includes(currentQuestion.correctAnswer)
    ) {
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, currentQuestion]
      }));
      setCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: '' });
      setError('');
    } else {
      setError(
        currentQuestion.options.includes(currentQuestion.correctAnswer)
          ? 'Please fill all question fields.'
          : 'Correct answer must match one of the options.'
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate based on content type
    if (formData.type === 'video') {
      if (!formData.contentUrl || !isValidYouTubeUrl(formData.contentUrl)) {
        setError('Please provide a valid YouTube URL (e.g., youtube.com or youtu.be).');
        return;
      }
    } else if (formData.type === 'article') {
      if (!formData.contentUrl || !isValidUrl(formData.contentUrl)) {
        setError('Please provide a valid URL for the web article.');
        return;
      }
    } else if (formData.type === 'meet') {
      if (!formData.meetingLink || !isValidGoogleMeetUrl(formData.meetingLink)) {
        setError('Please provide a valid Google Meet URL (e.g., https://meet.google.com/xxx-xxxx-xxx).');
        return;
      }
      if (!formData.scheduledDate) {
        setError('Scheduled date is required for meetings.');
        return;
      }
    } else if (formData.type === 'pdf' && !file) {
      setError('Please upload a PDF file.');
      return;
    } else if (formData.type === 'quiz') {
      const quizValidation = isValidQuiz(formData.questions);
      if (!quizValidation.valid) {
        setError(quizValidation.message);
        return;
      }
    }

    try {
      const contentData = new FormData();
      contentData.append('title', formData.title);
      contentData.append('description', formData.description || '');
      contentData.append('type', formData.type);

      if (formData.type === 'video') {
        contentData.append('contentUrl', formData.contentUrl);
      } else if (formData.type === 'article') {
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
        description: '',
        type: 'video',
        contentUrl: '',
        meetingLink: '',
        scheduledDate: '',
        questions: []
      });
      setFile(null);
      setCurrentQuestion({ text: '', options: ['', '', '', ''], correctAnswer: '' });

      // Show success alert, close modal, and refresh
      Swal.fire({
        title: 'Content Created Successfully!',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      }).then(() => {
        if (toggler) toggler();
        if (onContentAdded) onContentAdded();
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
        <Label for="description">Description (Optional)</Label>
        <Input
          type="textarea"
          name="description"
          id="description"
          value={formData.description}
          onChange={handleChange}
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
          <option value="article">Web Article</option>
          <option value="meet">Meeting</option>
          <option value="pdf">PDF</option>
          <option value="quiz">Quiz</option>
        </Input>
      </FormGroup>

      {formData.type === 'video' && (
        <FormGroup>
          <Label for="contentUrl">Video URL (YouTube)</Label>
          <Input
            type="url"
            name="contentUrl"
            id="contentUrl"
            value={formData.contentUrl}
            onChange={handleChange}
            placeholder="e.g., https://www.youtube.com/watch?v=xxxx"
            required
          />
        </FormGroup>
      )}

      {formData.type === 'article' && (
        <FormGroup>
          <Label for="contentUrl">Article URL</Label>
          <InputGroup>
            <InputGroupText>
              <i className="fa fa-newspaper-o"></i>
            </InputGroupText>
            <Input
              type="url"
              name="contentUrl"
              id="contentUrl"
              value={formData.contentUrl}
              onChange={handleChange}
              placeholder="e.g., https://example.com/article"
              required
            />
          </InputGroup>
          <small className="text-muted">
            Enter the full URL to the web article you want to include
          </small>
        </FormGroup>
      )}

      {formData.type === 'meet' && (
        <>
          <FormGroup>
            <Label for="meetingLink">Meeting Link (Google Meet)</Label>
            <Input
              type="url"
              name="meetingLink"
              id="meetingLink"
              value={formData.meetingLink}
              onChange={handleChange}
              placeholder="e.g., https://meet.google.com/xxx-xxxx-xxx"
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
              placeholder="Must match one of the options"
            />
          </FormGroup>
          <Button color="secondary" onClick={addQuestion} className="mb-3">
            Add Question
          </Button>
          {formData.questions.length > 0 && (
            <div>
              <h6>Added Questions ({formData.questions.length}/5):</h6>
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