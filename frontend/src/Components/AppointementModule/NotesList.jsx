import React, { useState } from 'react';
import { Card, Table, Badge, Button, Modal, Spinner, ButtonGroup } from 'react-bootstrap';
import { format } from 'date-fns';
import axios from 'axios';
import { toast } from 'react-toastify';
import NoteViewer from './NoteViewer';
import NoteEditor from './NoteEditor';

const NotesList = ({ notes, token, onNoteUpdated, onNoteDeleted }) => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [viewMode, setViewMode] = useState('view'); // 'view' or 'edit'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Handlers inchangés
  const handleViewNote = (note) => {
    setSelectedNote(note);
    setViewMode('view');
  };
  
  const handleEditNote = (note) => {
    setSelectedNote(note);
    setViewMode('edit');
  };
  
  const handleCloseNote = () => {
    setSelectedNote(null);
  };
  
  const handleNoteUpdated = () => {
    onNoteUpdated();
    setSelectedNote(null);
    toast.success('Note updated successfully');
  };
  
  const confirmDelete = (note) => {
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };
  
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    
    setLoading(true);
    try {
      // Ajouter l'authentification avec token
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      await axios.delete(`http://localhost:5000/api/notes/${noteToDelete._id}`, config);
      setShowDeleteModal(false);
      setNoteToDelete(null);
      
      // If currently viewing this note, close it
      if (selectedNote && selectedNote._id === noteToDelete._id) {
        setSelectedNote(null);
      }
      
      onNoteDeleted();
      toast.success('Note deleted successfully');
    } catch (err) {
      console.error('Error deleting note:', err);
      toast.error(err.response?.status === 401 
                 ? 'Authentication error. Please login again.' 
                 : 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };
  
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
  
  if (notes.length === 0) {
    return (
      <Card className="text-center p-5">
        <Card.Body>
          <Card.Title>No Session Notes</Card.Title>
          <Card.Text>
            There are no session notes for this case yet.
          </Card.Text>
        </Card.Body>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notes.map(note => (
                <tr key={note._id}>
                  <td>{format(new Date(note.createdAt), 'MMM d, yyyy')}</td>
                  <td>{note.title || 'Untitled Note'}</td>
                  <td>{getTemplateBadge(note.templateType)}</td>
                  <td>{getStatusBadge(note.status)}</td>
                  <td>
                    {/* Utilisation de ButtonGroup pour aligner les boutons horizontalement */}
                    <ButtonGroup size="sm">
                      <Button
                        variant="outline-primary"
                        onClick={() => handleViewNote(note)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => handleEditNote(note)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        onClick={() => confirmDelete(note)}
                      >
                        Delete
                      </Button>
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      
      {selectedNote && viewMode === 'view' && (
        <NoteViewer
          note={selectedNote}
          token={token}
          onClose={handleCloseNote}
          onEdit={() => setViewMode('edit')}
        />
      )}
      
      {selectedNote && viewMode === 'edit' && (
        <NoteEditor
          noteId={selectedNote._id}
          token={token}
          onNoteUpdated={handleNoteUpdated}
          onCancel={handleCloseNote}
          mode="edit"
        />
      )}
      
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this note? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteNote} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Delete Note'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NotesList;