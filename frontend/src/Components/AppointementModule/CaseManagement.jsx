import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tabs, Tab, Table, Button, Dropdown, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import io from 'socket.io-client';
import './CaseManagement.css';
import { useNavigate } from 'react-router-dom';

// Initialize Socket.IO client
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
});
const CaseManagement = ({ psychologistId }) => {
  const navigate = useNavigate();
  const [pendingCases, setPendingCases] = useState([]);
  const [inProgressCases, setInProgressCases] = useState([]);
  const [archivedCases, setArchivedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDesc, setSortDesc] = useState(true); // if true, "emergency" sorted to top

  // Join Socket.IO room when psychologistId is available
  useEffect(() => {
    if (psychologistId) {
      socket.emit('join', psychologistId);
      return () => {
        socket.off('new_notification');
      };
    }
  }, [psychologistId]);

  // Handle real-time notifications
  useEffect(() => {
    socket.on('new_notification', (notification) => {
      console.log('New notification received:', notification);

      // Ensure the notification is for the current psychologist
      if (notification.recipient._id !== psychologistId) return;

      const appointment = notification.appointment;
      const studentId = appointment.studentId._id;
      const sender = notification.sender;

      if (notification.type === 'appointment_booked') {
        // Add or update a case with a new pending appointment
        setPendingCases((prevCases) => {
          const existingCaseIndex = prevCases.findIndex((c) => c.studentId._id === studentId);
          const newAppointment = {
            _id: appointment._id,
            date: appointment.date,
            priority: appointment.priority,
            status: appointment.status,
          };

          if (existingCaseIndex !== -1) {
            // Update existing case
            const updatedCases = [...prevCases];
            updatedCases[existingCaseIndex] = {
              ...updatedCases[existingCaseIndex],
              pendingAppointments: [
                ...updatedCases[existingCaseIndex].pendingAppointments,
                newAppointment,
              ],
              casePriority: appointment.priority, // Update priority based on latest appointment
            };
            return updatedCases;
          } else {
            // Create new case
            return [
              ...prevCases,
              {
                _id: appointment._id, // Use appointment ID as a temporary case ID (backend will provide actual case ID)
                studentId: appointment.studentId,
                status: 'pending',
                priority: appointment.priority,
                casePriority: appointment.priority,
                pendingAppointments: [newAppointment],
                confirmedAppointments: [],
                appointments: [newAppointment],
              },
            ];
          }
        });
        toast.success(`New appointment booked by ${sender.Name} on ${new Date(appointment.date).toLocaleString()}`);
      } else if (notification.type === 'appointment_confirmed') {
        // Move appointment from pending to confirmed
        setPendingCases((prevCases) => {
          const caseIndex = prevCases.findIndex((c) => c.studentId._id === studentId);
          if (caseIndex === -1) return prevCases;

          const updatedCases = [...prevCases];
          const targetCase = updatedCases[caseIndex];
          const updatedPending = targetCase.pendingAppointments.filter(
            (app) => app._id !== appointment._id
          );
          const updatedConfirmed = [
            ...targetCase.confirmedAppointments,
            {
              _id: appointment._id,
              date: appointment.date,
              priority: appointment.priority,
              status: 'confirmed',
            },
          ];

          updatedCases[caseIndex] = {
            ...targetCase,
            pendingAppointments: updatedPending,
            confirmedAppointments: updatedConfirmed,
            appointments: [...updatedPending, ...updatedConfirmed],
            status: updatedPending.length === 0 ? 'in_progress' : targetCase.status,
          };

          return updatedCases;
        });

        // Add to inProgressCases if no pending appointments remain
        setInProgressCases((prevCases) => {
          const caseIndex = pendingCases.findIndex((c) => c.studentId._id === studentId);
          if (caseIndex === -1 || pendingCases[caseIndex].pendingAppointments.length > 1) {
            return prevCases; // Case still has pending appointments or doesn't exist
          }

          const targetCase = pendingCases[caseIndex];
          const existingCaseIndex = prevCases.findIndex((c) => c.studentId._id === studentId);

          if (existingCaseIndex !== -1) {
            // Update existing in-progress case
            const updatedCases = [...prevCases];
            updatedCases[existingCaseIndex] = {
              ...updatedCases[existingCaseIndex],
              confirmedAppointments: [
                ...updatedCases[existingCaseIndex].confirmedAppointments,
                {
                  _id: appointment._id,
                  date: appointment.date,
                  priority: appointment.priority,
                  status: 'confirmed',
                },
              ],
              appointments: [
                ...updatedCases[existingCaseIndex].confirmedAppointments,
                {
                  _id: appointment._id,
                  date: appointment.date,
                  priority: appointment.priority,
                  status: 'confirmed',
                },
              ],
            };
            return updatedCases;
          } else {
            // Move case to in-progress
            return [
              ...prevCases,
              {
                ...targetCase,
                status: 'in_progress',
                pendingAppointments: [],
                confirmedAppointments: [
                  {
                    _id: appointment._id,
                    date: appointment.date,
                    priority: appointment.priority,
                    status: 'confirmed',
                  },
                ],
                appointments: [
                  {
                    _id: appointment._id,
                    date: appointment.date,
                    priority: appointment.priority,
                    status: 'confirmed',
                  },
                ],
              },
            ];
          }
        });

        // Remove from pendingCases if no pending appointments remain
        setPendingCases((prevCases) =>
          prevCases.filter((c) => c.studentId._id !== studentId || c.pendingAppointments.length > 0)
        );

        toast.success(`Appointment with ${sender.Name} confirmed`);
      } else if (notification.type === 'appointment_modified') {
        // Update the appointment in the pending case
        setPendingCases((prevCases) => {
          const caseIndex = prevCases.findIndex((c) => c.studentId._id === studentId);
          if (caseIndex === -1) return prevCases;

          const updatedCases = [...prevCases];
          const targetCase = updatedCases[caseIndex];
          const updatedPending = targetCase.pendingAppointments.map((app) =>
            app._id === appointment._id
              ? {
                  ...app,
                  date: appointment.date,
                  status: 'pending',
                  priority: appointment.priority,
                }
              : app
          );

          updatedCases[caseIndex] = {
            ...targetCase,
            pendingAppointments: updatedPending,
            appointments: [...updatedPending, ...targetCase.confirmedAppointments],
            casePriority: appointment.priority,
          };

          return updatedCases;
        });
        toast.info(`Appointment with ${sender.Name} modified to ${new Date(appointment.date).toLocaleString()}`);
      } else if (notification.type === 'appointment_cancelled') {
        // Remove the appointment from the case
        setPendingCases((prevCases) => {
          const caseIndex = prevCases.findIndex((c) => c.studentId._id === studentId);
          if (caseIndex === -1) return prevCases;

          const updatedCases = [...prevCases];
          const targetCase = updatedCases[caseIndex];
          const updatedPending = targetCase.pendingAppointments.filter(
            (app) => app._id !== appointment._id
          );

          updatedCases[caseIndex] = {
            ...targetCase,
            pendingAppointments: updatedPending,
            appointments: [...updatedPending, ...targetCase.confirmedAppointments],
          };

          return updatedCases;
        });

        // Remove the case from pendingCases if no pending appointments remain
        setPendingCases((prevCases) =>
          prevCases.filter((c) => c.studentId._id !== studentId || c.pendingAppointments.length > 0)
        );

        toast.warn(`Appointment with ${sender.Name} cancelled`);
      }
    });

    return () => {
      socket.off('new_notification');
    };
  }, [psychologistId]);

  // Fetch all cases, then separate appointments within each case.
  const fetchCases = async () => {
    try {
      // Get non-archived cases from the backend
      const resAll = await axios.get('http://localhost:5000/api/cases', {
        params: { psychologistId },
      });
  
      // Process each case: split appointments based on status and set casePriority
      const processedCases = resAll.data.map((c) => {
        // First filter appointments to only include those for this psychologist
        const relevantAppointments = c.appointments
          ? c.appointments.filter(app => {
              // Check different ways the psychologistId might be stored
              return (
                (app.psychologistId === psychologistId) ||
                (app.psychologistId?._id === psychologistId) ||
                (typeof app.psychologistId === 'object' && 
                 app.psychologistId !== null && 
                 app.psychologistId._id === psychologistId)
              );
            })
          : [];
  
        // Now split the filtered appointments by status
        const pendingAppointments = relevantAppointments
          .filter((app) => app.status === 'pending');
          
        const confirmedAppointments = relevantAppointments
          .filter((app) => app.status === 'confirmed');
  
        // Determine the case priority from relevant appointments only
        let casePriority = c.priority; // fallback value
        if (relevantAppointments.length > 0) {
          const sortedApps = [...relevantAppointments].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          casePriority = sortedApps[0].priority;
        }
        
        return { 
          ...c, 
          pendingAppointments, 
          confirmedAppointments, 
          appointments: relevantAppointments, // Replace with filtered appointments
          casePriority 
        };
      });
  
      // Filter to only include cases that have appointments for this psychologist
      const casesWithAppointments = processedCases.filter(c => 
        c.appointments.length > 0
      );
  
      // For Pending tab: show cases that have at least one pending appointment
      const pending = casesWithAppointments.filter((c) => c.pendingAppointments.length > 0);
  
      // For In-Progress tab: show cases that have no pending appointments,
      // at least one confirmed appointment, and status is in_progress
      const inProgress = casesWithAppointments.filter(
        (c) =>
          c.pendingAppointments.length === 0 &&
          c.confirmedAppointments.length > 0 &&
          c.status === 'in_progress'
      );
  
      // Get archived/resolved cases
      const resArchived = await axios.get('http://localhost:5000/api/cases/archived', {
        params: { psychologistId },
      });
  
      // Filter archived cases to only include appointments for this psychologist
      const filteredArchivedCases = resArchived.data.map(c => {
        const relevantAppointments = c.appointments
          ? c.appointments.filter(app => {
              return (
                (app.psychologistId === psychologistId) ||
                (app.psychologistId?._id === psychologistId) ||
                (typeof app.psychologistId === 'object' && 
                 app.psychologistId !== null && 
                 app.psychologistId._id === psychologistId)
              );
            })
          : [];
          
        return {
          ...c,
          appointments: relevantAppointments,
          casePriority: c.priority
        };
      }).filter(c => c.appointments.length > 0); // Only include cases with relevant appointments
  
      setPendingCases(pending);
      setInProgressCases(inProgress);
      setArchivedCases(filteredArchivedCases);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching cases:', err);
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
    const filtered = cases.filter((c) =>
      c.studentId?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return sortByPriority(filtered);
  };

  // Confirm appointment: call backend to update status and then refresh
  const handleConfirmAppointment = async (appointmentId) => {
    try {
      await axios.put(`http://localhost:5000/api/appointments/confirm/${appointmentId}`); // Updated endpoint to match your backend
      toast.success('Appointment confirmed');
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error confirming appointment');
    }
  };

  // Resolve case: update case to resolved/archived then refresh
  const handleResolveCase = async (caseId) => {
    try {
      await axios.put(`http://localhost:5000/api/cases/${caseId}/resolve`);
      toast.success('Case resolved and archived');
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error resolving case');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Container fluid className="case-management">
      <ToastContainer position="top-right" autoClose={4000} />
      <Row className="my-3">
        <Col>
          <h2>Case Management</h2>
        </Col>
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
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSortDesc(!sortDesc)}
                >
                  Priority {sortDesc ? '⇩' : '⇧'}
                </th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filterAndSort(pendingCases).map((c) => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.casePriority}</td>
                  <td>
                    {c.pendingAppointments.map((app) => (
                      <div key={app._id}>
                        {new Date(app.date).toLocaleString()} - {app.priority}{' '}
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
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSortDesc(!sortDesc)}
                >
                  Priority {sortDesc ? '⇩' : '⇧'}
                </th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filterAndSort(inProgressCases).map((c) => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.casePriority}</td>
                  <td>
                    {c.confirmedAppointments.map((app) => (
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
                        <Dropdown.Item onClick={() => navigate(`${process.env.PUBLIC_URL}/session-notes/${c._id}`)}>
  Manage Session Notes
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
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSortDesc(!sortDesc)}
                >
                  Priority {sortDesc ? '⇩' : '⇧'}
                </th>
                <th>Appointments</th>
              </tr>
            </thead>
            <tbody>
              {filterAndSort(archivedCases).map((c) => (
                <tr key={c._id}>
                  <td>{c.studentId?.Name}</td>
                  <td>{c.status}</td>
                  <td>{c.casePriority}</td>
                  <td>
                    {c.appointments?.map((app) => (
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