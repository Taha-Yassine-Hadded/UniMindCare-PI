import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Tabs, Tab, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import NoteEditor from './NoteEditor';
import NotesList from './NotesList';
import NoteViewer from './NoteViewer';
import './notesModule.css';

const FLASK_API_URL = "http://localhost:5015/predict";

const SessionNoteManagement = ({ caseId, token, userData }) => {
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [suggestedTemplate, setSuggestedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [creatingNote, setCreatingNote] = useState(false);

  // Prediction state
  const [predictionResult, setPredictionResult] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);

  useEffect(() => {
    console.log('SessionNoteManagement - Props:', { caseId, token, userData });

    if (!caseId) {
      setError('No case ID provided');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Authentication token missing. Please login again.');
      setLoading(false);
      navigate('/login', { state: { from: `/session-notes/${caseId}` } });
      return;
    }

    const fetchData = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        };

        console.log('Fetching case data for caseId:', caseId);
        const caseResponse = await axios.get(`http://localhost:5000/api/cases/${caseId}`, config);
        setCaseData(caseResponse.data);

        console.log('Fetching session notes for caseId:', caseId);
        const notesResponse = await axios.get(`http://localhost:5000/api/notes/case/${caseId}`, config);
        setNotes(notesResponse.data);

        console.log('Fetching suggested template for caseId:', caseId);
        const templateResponse = await axios.get(`http://localhost:5000/api/notes/case/${caseId}/suggested-template`, config);
        setSuggestedTemplate(templateResponse.data.suggestedTemplate);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        let errorMessage = 'Failed to load data';
        if (err.response) {
          if (err.response.status === 401) {
            errorMessage = 'Authentication failed. Please login again.';
            navigate('/login', { state: { from: `/session-notes/${caseId}` } });
          } else if (err.response.status === 403) {
            errorMessage = "You don't have permission to access this resource.";
          } else if (err.response.status === 404) {
            errorMessage = 'The requested case or notes could not be found.';
          } else {
            errorMessage = err.response.data?.message || 'An error occurred while loading data';
          }
        }
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId, token, navigate]);

  const handleCreateNote = () => {
    setCreatingNote(true);
    setActiveTab('editor');
  };

  const handleNoteCreated = () => {
    setCreatingNote(false);
    const fetchNotes = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        };
        const response = await axios.get(`http://localhost:5000/api/notes/case/${caseId}`, config);
        setNotes(response.data);
        toast.success('Note created successfully');
      } catch (err) {
        console.error('Error fetching notes after creation:', err);
        if (err.response?.status === 401) {
          navigate('/login', { state: { from: `/session-notes/${caseId}` } });
        }
        toast.error('Failed to refresh notes list');
      }
    };
    fetchNotes();
    setActiveTab('notes');
  };

  const handleCancelCreate = () => {
    setCreatingNote(false);
    setActiveTab('notes');
  };

  // Prediction handler
  const handlePredictStatus = async () => {
    setPredicting(true);
    setPredictionError(null);
    setPredictionResult(null);
    try {
      // Concatène toutes les notes pour la prédiction globale
      const notesText = notes.map(n => n.content || n.text || "").join("\n\n");
      const response = await fetch(FLASK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: notesText }),
      });
      if (!response.ok) throw new Error("Prediction failed");
      const data = await response.json();
      setPredictionResult(data);
    } catch (err) {
      setPredictionError("Prediction failed. Make sure the Flask API is running.");
    }
    setPredicting(false);
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading case information...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Data</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button
              variant="outline-danger"
              onClick={() => navigate(`${process.env.PUBLIC_URL}/appointment/case-management`)}
            >
              Return to Case Management
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Case Information</h4>
              <Button
                variant="outline-primary"
                onClick={() => navigate(`${process.env.PUBLIC_URL}/appointment/case-management`)}
              >
                Back to Cases
              </Button>
            </Card.Header>
            <Card.Body>
              <h5>{caseData?.studentId?.Name || 'Unknown Student'}</h5>
              <p>
                <strong>Status:</strong> {caseData?.status || 'Unknown'}<br />
                <strong>Priority:</strong> {caseData?.casePriority || 'Regular'}<br />
                <strong>Last Contact:</strong>{' '}
                {caseData?.lastContact ? new Date(caseData.lastContact).toLocaleDateString() : 'None'}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h4>Session Notes</h4>
            {!creatingNote && (
              <Button variant="success" onClick={handleCreateNote}>
                Create New Note
              </Button>
            )}
          </div>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="notes" title="Notes List">
          {notes.length > 0 ? (
            <NotesList
              notes={notes}
              token={token}
              onNoteUpdated={() => {
                const fetchNotes = async () => {
                  try {
                    const config = {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    };
                    const response = await axios.get(`http://localhost:5000/api/notes/case/${caseId}`, config);
                    setNotes(response.data);
                  } catch (err) {
                    console.error('Error refreshing notes:', err);
                    if (err.response?.status === 401) {
                      navigate('/login', { state: { from: `/session-notes/${caseId}` } });
                    }
                    toast.error('Failed to refresh notes list');
                  }
                };
                fetchNotes();
              }}
              onNoteDeleted={() => {
                const fetchNotes = async () => {
                  try {
                    const config = {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    };
                    const response = await axios.get(`http://localhost:5000/api/notes/case/${caseId}`, config);
                    setNotes(response.data);
                  } catch (err) {
                    console.error('Error refreshing notes:', err);
                    if (err.response?.status === 401) {
                      navigate('/login', { state: { from: `/session-notes/${caseId}` } });
                    }
                    toast.error('Failed to refresh notes list');
                  }
                };
                fetchNotes();
              }}
            />
          ) : (
            <Card className="text-center p-5">
              <Card.Body>
                <Card.Title>No Session Notes</Card.Title>
                <Card.Text>
                  There are no session notes for this case yet. Create your first note by clicking the "Create New Note"
                  button.
                </Card.Text>
              </Card.Body>
            </Card>
          )}
        </Tab>

        <Tab eventKey="editor" title="Note Editor" disabled={!creatingNote}>
          {creatingNote && (
            <NoteEditor
              caseId={caseId}
              studentId={caseData?.studentId?._id}
              suggestedTemplate={suggestedTemplate}
              token={token}
              onNoteCreated={handleNoteCreated}
              onCancel={handleCancelCreate}
              mode="create"
            />
          )}
        </Tab>

        <Tab eventKey="status" title="Status Prediction">
          <div className="mb-3">
            <Button variant="primary" onClick={handlePredictStatus} disabled={predicting || notes.length === 0}>
              {predicting ? "Predicting..." : "Predict Status for All Notes"}
            </Button>
          </div>
          {predictionError && <Alert variant="danger">{predictionError}</Alert>}
          {predictionResult && (
            <Card>
              <Card.Body>
                <h5>Predicted Status</h5>
                <p>
                  <strong>Status:</strong>{" "}
                  <span style={{
                    color:
                      predictionResult.label === "improved"
                        ? "green"
                        : predictionResult.label === "worsened"
                        ? "red"
                        : "orange"
                  }}>
                    {predictionResult.label}
                  </span>
                </p>
              </Card.Body>
            </Card>
          )}
          {!predicting && !predictionResult && (
            <div>No prediction yet. Click the button above to predict the overall status based on all notes.</div>
          )}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default SessionNoteManagement;