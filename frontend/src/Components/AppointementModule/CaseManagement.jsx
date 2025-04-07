//// filepath: c:\Users\salma\UniMindCare-PI\frontend\src\Components\AppointementModule\CaseManagement.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tabs, Tab, Table, Button, Dropdown } from 'react-bootstrap';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import './CaseManagement.css';

const CaseManagement = ({ psychologistId }) => {
  const [pendingCases, setPendingCases] = useState([]);
  const [inProgressCases, setInProgressCases] = useState([]);
  const [archivedCases, setArchivedCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all cases, then separate appointments within each case
  const fetchCases = async () => {
    try {
      // Get non-archived cases from the backend
      const resAll = await axios.get('http://localhost:5000/api/cases', {
        params: { psychologistId }
      });
      
      // Process each case: split appointments based on status
      const processedCases = resAll.data.map(c => {
        const pendingAppointments = c.appointments
          ? c.appointments.filter(app => app.status === 'pending')
          : [];
        const confirmedAppointments = c.appointments
          ? c.appointments.filter(app => app.status === 'confirmed')
          : [];
          
        return { ...c, pendingAppointments, confirmedAppointments };
      });
      
      // For Pending tab: show cases that have at least one pending appointment
      const pending = processedCases.filter(c => c.pendingAppointments.length > 0);
      
      // For In-Progress tab: show cases that have no pending appointments and at least one confirmed appointment,
      // and a case overall is marked as in_progress
      const inProgress = processedCases.filter(c => 
        c.pendingAppointments.length === 0 &&
        c.confirmedAppointments.length > 0 &&
        c.status === 'in_progress'
      );
      
      // Get archived/resolved cases as before
      const resArchived = await axios.get('http://localhost:5000/api/cases/archived', {
        params: { psychologistId }
      });
      
      setPendingCases(pending);
      setInProgressCases(inProgress);
      setArchivedCases(resArchived.data);
      setLoading(false);
    } catch (err) {
      toast.error('Error fetching cases');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [psychologistId]);
  
  // Confirm appointment: call backend to update status and then refresh
  const handleConfirmAppointment = async (appointmentId) => {
    try {
      await axios.put(`http://localhost:5000/api/cases/confirm-appointment/${appointmentId}`);
      toast.success('Appointment confirmed');
      fetchCases();
    } catch (err) {
      toast.error('Error confirming appointment');
    }
  };

  // Resolve case: update case to resolved/archived then refresh
  const handleResolveCase = async (caseId) => {
    try {
      await axios.put(`http://localhost:5000/api/cases/${caseId}/resolve`);
      toast.success('Case resolved and archived');
      fetchCases();
    } catch (err) {
      toast.error('Error resolving case');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Container fluid className="case-management">
      <ToastContainer position="top-right" autoClose={4000} />
      <Row className="my-3">
        <Col><h2>Case Management</h2></Col>
      </Row>
  
      <Tabs defaultActiveKey="pending" className="mb-3">
        {/* Pending Cases */}
        <Tab eventKey="pending" title="Pending">
          <Table bordered hover>
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingCases.map(c => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.priority}</td>
                  <td>
                    {c.pendingAppointments.map(app => (
                      <div key={app._id}>
                        {new Date(app.date).toLocaleString()} - {app.priority}
                        {" "}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleConfirmAppointment(app._id)}
                        >
                          Confirm
                        </Button>
                      </div>
                    ))}
                  </td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
  
        {/* In-Progress Cases */}
        <Tab eventKey="inProgress" title="In-Progress">
          <Table bordered hover>
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inProgressCases.map(c => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.priority}</td>
                  <td>
                    {c.confirmedAppointments.map(app => (
                      <div key={app._id}>
                        {new Date(app.date).toLocaleString()} - {app.priority}
                      </div>
                    ))}
                  </td>
                  <td>
                    <Dropdown>
                      <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                        Actions
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handleResolveCase(c._id)}>
                          Mark as Resolved
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
  
        {/* Archived / Resolved Cases */}
        <Tab eventKey="archived" title="Archived">
          <Table bordered hover>
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Appointments</th>
              </tr>
            </thead>
            <tbody>
              {archivedCases.map(c => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.priority}</td>
                  <td>
                    {c.appointments?.map(app => (
                      <div key={app._id}>
                        {new Date(app.date).toLocaleString()} - {app.priority}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default CaseManagement;