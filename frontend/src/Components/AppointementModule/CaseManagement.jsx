import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tabs, Tab, Table, Button, Dropdown, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import './CaseManagement.css';

const CaseManagement = ({ psychologistId }) => {
  const [pendingCases, setPendingCases] = useState([]);
  const [inProgressCases, setInProgressCases] = useState([]);
  const [archivedCases, setArchivedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDesc, setSortDesc] = useState(true); // if true, "emergency" sorted to top

  // Fetch all cases, then separate appointments within each case.
  const fetchCases = async () => {
    try {
      // Get non-archived cases from the backend
      const resAll = await axios.get('http://localhost:5000/api/cases', {
        params: { psychologistId }
      });

      // Process each case: split appointments based on status and set casePriority
      const processedCases = resAll.data.map((c) => {
        const pendingAppointments = c.appointments
          ? c.appointments.filter(app => app.status === 'pending')
          : [];
        const confirmedAppointments = c.appointments
          ? c.appointments.filter(app => app.status === 'confirmed')
          : [];
        // Determine the case priority by using the latest appointment's priority.
        let casePriority = c.priority; // fallback value
        if (c.appointments && c.appointments.length > 0) {
          const sortedApps = [...c.appointments].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          casePriority = sortedApps[0].priority;
        }
        return { ...c, pendingAppointments, confirmedAppointments, casePriority };
      });

      // For Pending tab: show cases that have at least one pending appointment
      const pending = processedCases.filter(c => c.pendingAppointments.length > 0);

      // For In-Progress tab: show cases that have no pending appointments,
      // at least one confirmed appointment, and status is in_progress
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

  // Helper function to sort based on casePriority (assumes values "emergency" or "regular")
  const sortByPriority = (array) => {
    return [...array].sort((a, b) => {
      const aVal = a.casePriority === 'emergency' ? 1 : 0;
      const bVal = b.casePriority === 'emergency' ? 1 : 0;
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
  };

  // Apply search filter on student name and then sort by casePriority
  const filterAndSort = (cases) => {
    const filtered = cases.filter(c =>
      c.studentId?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return sortByPriority(filtered);
  };

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

      {/* Search bar */}
      <Row className="mb-3">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>Search Student</InputGroup.Text>
            <Form.Control 
              type="text" 
              placeholder="Enter student name" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={6} className="d-flex align-items-center">
          {/* Optionally, you can use a separate sort button here */}
        </Col>
      </Row>

      <Tabs defaultActiveKey="pending" className="mb-3">
        {/* Pending Cases */}
        <Tab eventKey="pending" title="Pending">
          <Table bordered hover>
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => setSortDesc(!sortDesc)}
                >
                  Priority {sortDesc ? '⇩' : '⇧'}
                </th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filterAndSort(pendingCases).map(c => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.casePriority}</td>
                  <td>
                    {c.pendingAppointments.map(app => (
                      <div key={app._id}>
                        {new Date(app.date).toLocaleString()} - {app.priority}{" "}
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
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => setSortDesc(!sortDesc)}
                >
                  Priority {sortDesc ? '⇩' : '⇧'}
                </th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filterAndSort(inProgressCases).map(c => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.casePriority}</td>
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
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => setSortDesc(!sortDesc)}
                >
                  Priority {sortDesc ? '⇩' : '⇧'}
                </th>
                <th>Appointments</th>
              </tr>
            </thead>
            <tbody>
              {filterAndSort(archivedCases).map(c => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.casePriority}</td>
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