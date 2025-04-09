import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom'; // Added for URL query params
import 'react-toastify/dist/ReactToastify.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './AppointmentCalendar.css';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

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

const AppointmentCalendar = ({ role, userId, selectedPsychologistId }) => {
  const [events, setEvents] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [psychologists, setPsychologists] = useState([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState(selectedPsychologistId || '');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'book', 'modify', 'cancel', 'block', 'confirm', 'addAvailability', 'deleteAvailability'
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    priority: 'regular',
    reason: '',
    startTime: '',
    endTime: '',
  });
  const location = useLocation(); // Added to access URL query params

  // Extract highlight parameter from URL
  const queryParams = new URLSearchParams(location.search);
  const highlightAppointmentId = queryParams.get('highlight');

  // Join Socket.IO room when userId is available
  useEffect(() => {
    if (userId) {
      socket.emit('join', userId);
      return () => {
        socket.off('new_notification');
      };
    }
  }, [userId]);

  // Handle real-time notifications
  useEffect(() => {
    socket.on('new_notification', (notification) => {
      console.log('New notification received:', notification);

      // Ensure the notification is for the current user
      if (notification.recipient._id !== userId) return;

      const appointment = notification.appointment;
      const sender = notification.sender;

      if (role === 'student') {
        if (notification.type === 'appointment_confirmed') {
          setEvents((prevEvents) =>
            prevEvents.map((event) =>
              event.id === appointment._id
                ? {
                    ...event,
                    status: 'confirmed',
                    title: `Appointment with Dr. ${appointment.psychologistId?.Name || 'Unknown'}`,
                  }
                : event
            )
          );
          toast.success(`Appointment on ${new Date(appointment.date).toLocaleString()} confirmed`);
        } else if (notification.type === 'appointment_modified') {
          setEvents((prevEvents) =>
            prevEvents.map((event) =>
              event.id === appointment._id
                ? {
                    ...event,
                    start: new Date(appointment.date),
                    end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
                    status: 'pending',
                    title: `Appointment with Dr. ${appointment.psychologistId?.Name || 'Unknown'}`,
                  }
                : event
            )
          );
          toast.info(`Appointment on ${new Date(appointment.date).toLocaleString()} modified by Dr. ${sender.Name}`);
        } else if (notification.type === 'appointment_cancelled') {
          setEvents((prevEvents) => prevEvents.filter((event) => event.id !== appointment._id));
          toast.warn(`Appointment on ${new Date(appointment.date).toLocaleString()} cancelled`);
        }
      } else if (role === 'psychiatre') {
        if (notification.type === 'appointment_booked') {
          setEvents((prevEvents) => [
            ...prevEvents,
            {
              id: appointment._id,
              title: `Appointment with ${appointment.studentId?.Name || 'Student'}`,
              start: new Date(appointment.date),
              end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
              status: 'pending',
              studentId: appointment.studentId,
              priority: appointment.priority,
              resource: 'appointment',
            },
          ]);
          toast.success(`New appointment booked by ${appointment.studentId?.Name || 'Student'} on ${new Date(appointment.date).toLocaleString()}`);
        } else if (notification.type === 'appointment_modified') {
          setEvents((prevEvents) =>
            prevEvents.map((event) =>
              event.id === appointment._id
                ? {
                    ...event,
                    start: new Date(appointment.date),
                    end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
                    status: 'pending',
                    title: `Appointment with ${appointment.studentId?.Name || 'Student'}`,
                  }
                : event
            )
          );
          toast.info(`Appointment on ${new Date(appointment.date).toLocaleString()} modified by ${sender.Name}`);
        } else if (notification.type === 'appointment_cancelled') {
          setEvents((prevEvents) => prevEvents.filter((event) => event.id !== appointment._id));
          toast.warn(`Appointment on ${new Date(appointment.date).toLocaleString()} cancelled`);
        }
      }
    });

    return () => {
      socket.off('new_notification');
    };
  }, [role, userId]);

  // Load list of psychologists for student to choose from
  useEffect(() => {
    if (role === 'student') {
      const fetchPsychologists = async () => {
        try {
          const response = await axios.get('http://localhost:5000/api/appointments/psychiatres');
          setPsychologists(response.data);

          if (selectedPsychologistId && response.data.some((psy) => psy._id === selectedPsychologistId)) {
            setSelectedPsychologist(selectedPsychologistId);
          } else if (response.data.length > 0 && !selectedPsychologist) {
            setSelectedPsychologist(response.data[0]._id);
          }
        } catch (err) {
          console.error('Error fetching psychologists:', err);
          toast.error('Could not load list of psychologists');
        }
      };
      fetchPsychologists();
    }
  }, [role, selectedPsychologistId]);

  // Fetch calendar data based on role and selected psychologist
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (role === 'student') {
          if (!selectedPsychologist) {
            setLoading(false);
            return;
          }

          const availabilityResponse = await axios.get(
            `http://localhost:5000/api/availability?psychologistId=${selectedPsychologist}`
          );

          const appointmentsResponse = await axios.get(
            `http://localhost:5000/api/appointments?studentId=${userId}&psychologistId=${selectedPsychologist}`
          );

          setAvailability(
            availabilityResponse.data.map((slot) => ({
              id: slot._id,
              title: '',
              start: new Date(slot.startTime),
              end: new Date(slot.endTime),
              status: slot.status,
              reason: slot.reason,
              resource: 'availability',
            }))
          );

          setEvents(
            appointmentsResponse.data.map((appointment) => ({
              id: appointment._id,
              title: `Appointment with Dr. ${appointment.psychologistId?.Name || 'Unknown'}`,
              start: new Date(appointment.date),
              end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
              status: appointment.status,
              psychologistId: appointment.psychologistId,
              priority: appointment.priority,
              resource: 'appointment',
            }))
          );
        } else if (role === 'psychiatre') {
          const availabilityResponse = await axios.get(
            `http://localhost:5000/api/availability?psychologistId=${userId}`
          );

          const appointmentsResponse = await axios.get(
            `http://localhost:5000/api/appointments?psychologistId=${userId}`
          );

          setAvailability(
            availabilityResponse.data.map((slot) => ({
              id: slot._id,
              title: '',
              start: new Date(slot.startTime),
              end: new Date(slot.endTime),
              status: slot.status,
              reason: slot.reason,
              resource: 'availability',
            }))
          );

          setEvents(
            appointmentsResponse.data.map((appointment) => ({
              id: appointment._id,
              title: `Appointment with ${appointment.studentId?.Name || 'Student'}`,
              start: new Date(appointment.date),
              end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
              status: appointment.status,
              studentId: appointment.studentId,
              priority: appointment.priority,
              resource: 'appointment',
            }))
          );
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        toast.error('Error loading calendar data');
        setLoading(false);
      }
    };

    fetchData();
  }, [role, userId, selectedPsychologist]);

  // Highlight the event when the component mounts or highlight ID changes
  useEffect(() => {
    if (highlightAppointmentId && events.length > 0) {
      const eventToHighlight = events.find((event) => event.id === highlightAppointmentId);
      if (eventToHighlight) {
        handleSelectEvent(eventToHighlight); // Open the modal for the highlighted event
        toast.info(`Viewing appointment on ${new Date(eventToHighlight.start).toLocaleString()}`);
      }
    }
  }, [highlightAppointmentId, events]);

  // Handle slot selection (for booking or adding availability)
  const handleSelectSlot = ({ start, end }) => {
    if (start < new Date()) {
      toast.error('Cannot select time slots in the past');
      return;
    }

    const existingAvailability = availability.find(
      (slot) => slot.start <= end && slot.end >= start
    );

    if (existingAvailability) {
      setSelectedEvent(existingAvailability);

      if (role === 'psychiatre') {
        if (existingAvailability.status === 'available') {
          setModalType('modifyAvailability');
          setFormData({
            startTime: existingAvailability.start.toISOString(),
            endTime: existingAvailability.end.toISOString(),
            status: existingAvailability.status,
            reason: existingAvailability.reason || '',
          });
        } else {
          setModalType('unblockAvailability');
          setFormData({
            reason: existingAvailability.reason || '',
          });
        }
        setShowModal(true);
      } else if (role === 'student') {
        if (existingAvailability.status === 'available') {
          setModalType('book');
          setFormData({
            date: start.toISOString(),
            priority: 'regular',
            reason: '',
          });
          setShowModal(true);
        } else {
          toast.info('This time slot is not available for booking');
        }
      }
    } else {
      setSelectedSlot({ start, end });

      if (role === 'student') {
        toast.info('This time slot is not available for booking');
      } else if (role === 'psychiatre') {
        setModalType('addAvailability');
        setFormData({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: 'available',
          reason: '',
        });
        setShowModal(true);
      }
    }
  };

  // Handle event selection (for modifying or canceling appointments)
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);

    if (event.resource === 'availability') {
      if (role === 'psychiatre') {
        if (event.status === 'available') {
          setModalType('modifyAvailability');
          setFormData({
            startTime: event.start.toISOString(),
            endTime: event.end.toISOString(),
            status: event.status,
            reason: event.reason || '',
          });
        } else {
          setModalType('unblockAvailability');
          setFormData({
            reason: event.reason || '',
          });
        }
        setShowModal(true);
      }
    } else {
      if (role === 'student') {
        setModalType('modifyAppointment');
        setFormData({
          date: event.start.toISOString(),
          reason: '',
        });
        setShowModal(true);
      } else if (role === 'psychiatre') {
        if (event.status === 'pending') {
          setModalType('reviewAppointment');
          setFormData({
            reason: '',
          });
        } else if (event.status === 'confirmed') {
          setModalType('modifyAppointment');
          setFormData({
            date: event.start.toISOString(),
            reason: '',
          });
        } else {
          setModalType('cancelAppointment');
          setFormData({
            reason: '',
          });
        }
        setShowModal(true);
      }
    }
  };

 // Replace the existing isSlotAvailable function with this one:
const isSlotAvailable = (start, end) => {
  // For debugging - log all relevant information
  console.log("--- AVAILABILITY CHECK ---");
  console.log("Checking if slot is available:", 
    new Date(start).toLocaleString(), "to", new Date(end).toLocaleString());
  console.log("Available slots:", availability.length);
  
  // Convert input dates to timestamps for reliable comparison
  const startTime = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const endTime = end instanceof Date ? end.getTime() : new Date(end).getTime();
  
  // Loop through all availability slots
  for (const slot of availability) {
    // Skip non-available slots
    if (slot.status !== 'available') continue;
    
    // Ensure slot times are properly converted to Date objects
    const slotStart = slot.start instanceof Date ? slot.start.getTime() : new Date(slot.start).getTime();
    const slotEnd = slot.end instanceof Date ? slot.end.getTime() : new Date(slot.end).getTime();
    
    console.log(`Checking slot: ${new Date(slotStart).toLocaleString()} to ${new Date(slotEnd).toLocaleString()}`);
    
    // Check if appointment fits within the available slot
    if (slotStart <= startTime && slotEnd >= endTime) {
      console.log("✅ FOUND AVAILABLE SLOT!");
      return true;
    }
  }
  
  console.log("❌ NO AVAILABLE SLOTS FOUND");
  return false;
};

  // Handle form submission based on modal type
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      switch (modalType) {
        case 'book':
          const bookResponse = await axios.post(
            'http://localhost:5000/api/cases/book-appointment',
            {
              studentId: userId,
              psychologistId: selectedPsychologist,
              date: formData.date,
              priority: formData.priority,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setEvents([
            ...events,
            {
              id: bookResponse.data.appointment._id,
              title: `Appointment with Dr. ${
                psychologists.find((psy) => psy._id === selectedPsychologist)?.Name || 'Unknown'
              }`,
              start: new Date(formData.date),
              end: new Date(new Date(formData.date).getTime() + 60 * 60 * 1000),
              status: 'pending',
              resource: 'appointment',
              priority: formData.priority,
            },
          ]);
          toast.success('Appointment request submitted!');
          break;

        case 'modifyAppointment':
          const newStart = new Date(formData.date);
          const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);

          if (newStart < new Date()) {
            toast.error('Cannot modify appointment to a past date');
            return;
          }

          if (role === 'student' && !isSlotAvailable(newStart, newEnd)) {
            console.error("Availability check failed for:", newStart, newEnd);
            console.log("Available slots:", availability.map(slot => ({
              start: new Date(slot.start).toLocaleString(),
              end: new Date(slot.end).toLocaleString(),
              status: slot.status
            })));
            toast.error("Please select a time within the psychologist's available slots.");
            return;
          }

          await axios.put(
            `http://localhost:5000/api/appointments/${selectedEvent.id}`,
            {
              date: formData.date,
              senderId: userId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setEvents(
            events.map((event) =>
              event.id === selectedEvent.id
                ? {
                    ...event,
                    start: newStart,
                    end: newEnd,
                    status: role === 'student' ? 'pending' : 'confirmed',
                  }
                : event
            )
          );
          toast.success('Appointment modified! ' + (role === 'student' ? 'Awaiting confirmation.' : ''));
          break;

        case 'cancelAppointment':
          await axios.delete(
            `http://localhost:5000/api/appointments/${selectedEvent.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              data: { reasonForCancellation: formData.reason, senderId: userId },
            }
          );
          setEvents(events.filter((event) => event.id !== selectedEvent.id));
          toast.success('Appointment cancelled successfully');
          break;

        case 'addAvailability':
          const availabilityResponse = await axios.post(
            'http://localhost:5000/api/availability',
            {
              psychologistId: userId,
              startTime: formData.startTime,
              endTime: formData.endTime,
              status: 'available',
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setAvailability([
            ...availability,
            {
              id: availabilityResponse.data._id,
              title: '',
              start: new Date(formData.startTime),
              end: new Date(formData.endTime),
              status: 'available',
              resource: 'availability',
            },
          ]);
          toast.success('Availability added to your calendar');
          break;

        case 'modifyAvailability':
          await axios.put(
            `http://localhost:5000/api/availability/${selectedEvent.id}`,
            {
              startTime: formData.startTime,
              endTime: formData.endTime,
              status: formData.status === 'block' ? 'blocked' : 'available',
              reason: formData.status === 'block' ? formData.reason : null,
              psychologistId: userId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setAvailability(
            availability.map((slot) =>
              slot.id === selectedEvent.id
                ? {
                    ...slot,
                    title: '',
                    status: formData.status === 'block' ? 'blocked' : 'available',
                    reason: formData.status === 'block' ? formData.reason : null,
                    start: new Date(formData.startTime),
                    end: new Date(formData.endTime),
                  }
                : slot
            )
          );
          toast.success(formData.status === 'block' ? 'Time slot blocked' : 'Availability updated');
          break;

        case 'unblockAvailability':
          await axios.put(
            `http://localhost:5000/api/availability/${selectedEvent.id}`,
            {
              status: 'available',
              reason: null,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setAvailability(
            availability.map((slot) =>
              slot.id === selectedEvent.id
                ? {
                    ...slot,
                    title: '',
                    status: 'available',
                    reason: null,
                  }
                : slot
            )
          );
          toast.success('Time slot is now available');
          break;

        case 'deleteAvailability':
          await axios.delete(`http://localhost:5000/api/availability/${selectedEvent.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAvailability(availability.filter((slot) => slot.id !== selectedEvent.id));
          toast.success('Time slot removed successfully');
          break;

        case 'reviewAppointment':
          await axios.put(
            `http://localhost:5000/api/appointments/confirm/${selectedEvent.id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setEvents(
            events.map((event) =>
              event.id === selectedEvent.id ? { ...event, status: 'confirmed' } : event
            )
          );
          toast.success('Appointment confirmed');
          break;
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error(err.response?.data?.message || 'An error occurred');
    }
  };

  // Custom event styling based on status, priority, and highlight
  const eventPropGetter = (event) => {
    let style = {
      borderRadius: '4px',
      border: '2px solid',
      display: 'block',
      boxShadow: '0 2px 3px rgba(0,0,0,0.1)',
      zIndex: 5,
    };

    if (event.resource === 'availability') {
      style = {
        ...style,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: 'transparent',
        display: 'none',
        pointerEvents: 'none',
      };
    } else {
      switch (event.status) {
        case 'confirmed':
          style.backgroundColor = '#28a745';
          style.borderColor = '#1e7e34';
          style.color = '#212529';
          style.opacity = 1;
          break;
        case 'pending':
          style.backgroundColor = '#fdfd96';
          style.borderColor = '#fdfd96';
          style.color = '#212529';
          style.opacity = 1;
          break;
        case 'cancelled':
          style.backgroundColor = '#f8d7da';
          style.borderColor = '#dc3545';
          style.color = '#721c24';
          style.opacity = 0.8;
          break;
        default:
          style.backgroundColor = '#007bff';
          style.borderColor = '#0056b3';
          style.color = '#212529';
          style.opacity = 1;
      }

      if (event.priority === 'emergency') {
        style.borderBottom = '4px solid #dc3545';
      }

      // Highlight the event if it matches the query param
      if (event.id === highlightAppointmentId) {
        style.boxShadow = '0 0 10px 5px rgba(255, 215, 0, 0.7)'; // Gold glow effect
        style.zIndex = 10; // Ensure highlighted event is on top
      }
    }

    return { style };
  };

  // Custom component for time slot cells
  const TimeSlotWrapper = ({ value, children }) => {
    const slotStart = new Date(value);
    const slotEnd = new Date(new Date(value).setMinutes(value.getMinutes() + 30));

    let availableSlot = null;
    let blockedSlot = null;

    for (const slot of availability) {
      if (slot.start <= slotEnd && slot.end >= slotStart) {
        if (slot.status === 'available') {
          availableSlot = slot;
        } else if (slot.status === 'blocked') {
          blockedSlot = slot;
        }
      }
    }

    let cellClass = '';
    if (blockedSlot) {
      cellClass = 'blocked-time-slot';
    } else if (availableSlot) {
      cellClass = 'available-time-slot';
    }

    return <div className={`rbc-time-slot ${cellClass}`}>{children}</div>;
  };

  // Custom component for date cells in month view
  const DateCellWrapper = ({ value, children }) => {
    const date = new Date(value);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    let hasAvailable = false;
    let hasBlocked = false;

    for (const slot of availability) {
      if (slot.start <= dayEnd && slot.end >= dayStart) {
        if (slot.status === 'available') {
          hasAvailable = true;
        } else if (slot.status === 'blocked') {
          hasBlocked = true;
        }
      }
    }

    let cellClass = '';
    if (hasBlocked) {
      cellClass = 'blocked-date-cell';
    } else if (hasAvailable) {
      cellClass = 'available-date-cell';
    }

    return <div className={`rbc-day-bg ${cellClass}`}>{children}</div>;
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading calendar...</p>
      </div>
    );

  return (
    <div className="appointment-calendar">
      <ToastContainer position="top-right" autoClose={5000} />

      {role === 'student' && (
        <div className="psychologist-selector mb-4">
          <Form.Group>
            <Form.Label>
              <strong>Select a Psychologist</strong>
            </Form.Label>
            <Form.Control
              as="select"
              value={selectedPsychologist}
              onChange={(e) => setSelectedPsychologist(e.target.value)}
            >
              <option value="" disabled>
                Select a psychologist
              </option>
              {psychologists.map((psy) => (
                <option key={psy._id} value={psy._id}>
                  Dr. {psy.Name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </div>
      )}

      <div className="calendar-legend mb-3">
        <div className="d-flex flex-wrap">
          <div className="legend-section me-4">
            <h6>Availability</h6>
            <div className="d-flex flex-column">
              <div className="legend-item mb-1">
                <div className="legend-color legend-available"></div>
                <span>Available Time</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-blocked"></div>
                <span>Blocked Time</span>
              </div>
            </div>
          </div>

          <div className="legend-section me-4">
            <h6>Appointment Status</h6>
            <div className="d-flex flex-column">
              <div className="legend-item mb-1">
                <div
                  className="legend-color"
                  style={{
                    backgroundColor: '#fdfd96',
                    border: '2px solid #fdfd96',
                    borderRadius: '4px',
                  }}
                ></div>
                <span>Pending</span>
              </div>
              <div className="legend-item mb-1">
                <div
                  className="legend-color"
                  style={{
                    backgroundColor: '#28a745',
                    border: '2px solid #1e7e34',
                    borderRadius: '4px',
                  }}
                ></div>
                <span>Confirmed</span>
              </div>
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{
                    backgroundColor: '#f8d7da',
                    border: '2px solid #dc3545',
                    borderRadius: '4px',
                    opacity: 0.8,
                  }}
                ></div>
                <span>Cancelled</span>
              </div>
            </div>
          </div>

          <div className="legend-section">
            <h6>Priority</h6>
            <div className="d-flex flex-column">
              <div className="legend-item mb-1">
                <span className="priority-indicator">⚠️</span>
                <span>Urgent</span>
              </div>
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{
                    backgroundColor: '#fdfd96',
                    border: '2px solid #fdfd96',
                    borderRadius: '4px',
                  }}
                ></div>
                <span>Regular</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="my-calendar">
        <Calendar
          localizer={localizer}
          events={[...events, ...availability]}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          defaultView={Views.MONTH}
          views={['month', 'week', 'day']}
          min={new Date(new Date().setHours(0, 0, 0, 0))}
          max={new Date(new Date().setHours(23, 59, 59, 999))}
          components={{
            dateCellWrapper: DateCellWrapper,
            timeSlotWrapper: TimeSlotWrapper,
            event: (props) => {
              const statusColor =
                props.event.status === 'pending'
                  ? '#fdfd96'
                  : props.event.status === 'confirmed'
                  ? '#28a745'
                  : props.event.status === 'cancelled'
                  ? '#f8d7da'
                  : '#007bff';
              const borderColor =
                props.event.status === 'pending'
                  ? '#fdfd96'
                  : props.event.status === 'confirmed'
                  ? '#1e7e34'
                  : props.event.status === 'cancelled'
                  ? '#dc3545'
                  : '#0056b3';
              const textColor =
                props.event.status === 'pending'
                  ? '#212529'
                  : props.event.status === 'confirmed'
                  ? '#212529'
                  : props.event.status === 'cancelled'
                  ? '#721c24'
                  : '#212529';
              const priorityBorder =
                props.event.priority === 'emergency' ? '4px solid #dc3545' : 'none';
              const highlightStyle =
                props.event.id === highlightAppointmentId
                  ? { boxShadow: '0 0 10px 5px rgba(255, 215, 0, 0.7)', zIndex: 10 }
                  : {};

              const inlineStyle = {
                backgroundColor: statusColor,
                border: `2px solid ${borderColor}`,
                borderBottom: priorityBorder,
                color: textColor,
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                borderRadius: '4px',
                opacity: props.event.status === 'cancelled' ? 0.8 : 1,
                ...highlightStyle,
              };

              return (
                <div
                  data-resource={props.event.resource || ''}
                  data-status={props.event.status || ''}
                  data-priority={props.event.priority || ''}
                  className={`rbc-event ${props.event.resource || ''}`}
                  style={inlineStyle}
                >
                  {props.event.resource === 'appointment' && (
                    <div className="rbc-event-content">
                      {props.event.priority === 'emergency' && (
                        <span className="priority-indicator">⚠️</span>
                      )}
                      {props.title}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalType === 'book' && 'Book an Appointment'}
            {modalType === 'modifyAppointment' && 'Modify Appointment'}
            {modalType === 'cancelAppointment' && 'Cancel Appointment'}
            {modalType === 'addAvailability' && 'Add Availability'}
            {modalType === 'modifyAvailability' && 'Modify Availability'}
            {modalType === 'unblockAvailability' && 'Unblock Time Slot'}
            {modalType === 'deleteAvailability' && 'Remove Time Slot'}
            {modalType === 'reviewAppointment' && 'Review Appointment'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {(modalType === 'book' || modalType === 'modifyAppointment') && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Date and Time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={moment(formData.date).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </Form.Group>

                {modalType === 'book' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Priority</Form.Label>
                    <Form.Control
                      as="select"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value,
                        })
                      }
                    >
                      <option value="regular">Regular Appointment</option>
                      <option value="emergency">Emergency - Need Urgent Help</option>
                    </Form.Control>
                  </Form.Group>
                )}

                {modalType === 'modifyAppointment' && role === 'student' && (
                  <p className="text-muted">
                    Please select a time within the psychologist's available slots.
                  </p>
                )}
              </>
            )}

            {(modalType === 'addAvailability' || modalType === 'modifyAvailability') && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={moment(formData.startTime).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startTime: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>End Time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={moment(formData.endTime).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        endTime: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </Form.Group>

                {modalType === 'modifyAvailability' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Control
                      as="select"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="available">Available</option>
                      <option value="block">Block this time</option>
                    </Form.Control>
                  </Form.Group>
                )}

                {modalType === 'modifyAvailability' && formData.status === 'block' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Reason for Blocking</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.reason || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reason: e.target.value,
                        })
                      }
                      placeholder="Optional: Add reason for blocking this time"
                    />
                  </Form.Group>
                )}
              </>
            )}

            {modalType === 'deleteAvailability' && (
              <p>Are you sure you want to remove this time slot from your schedule?</p>
            )}

            {modalType === 'cancelAppointment' && (
              <Form.Group className="mb-3">
                <Form.Label>Reason for Cancellation</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.reason || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Optional: Provide a reason for cancellation"
                />
              </Form.Group>
            )}

            {modalType === 'reviewAppointment' && (
              <p>Would you like to accept or decline this appointment request?</p>
            )}

            {modalType === 'unblockAvailability' && (
              <p>Do you want to make this time slot available for appointments?</p>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {modalType === 'reviewAppointment' && (
            <>
              <Button variant="success" onClick={handleSubmit}>
                Accept Appointment
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setModalType('cancelAppointment');
                  setFormData({ ...formData, reason: '' });
                }}
              >
                Decline Appointment
              </Button>
            </>
          )}

          {modalType !== 'reviewAppointment' && (
            <Button
              variant={
                modalType === 'cancelAppointment' || modalType === 'deleteAvailability'
                  ? 'danger'
                  : 'primary'
              }
              onClick={handleSubmit}
            >
              {modalType === 'book' && 'Book Appointment'}
              {modalType === 'modifyAppointment' && 'Save Changes'}
              {modalType === 'cancelAppointment' && 'Cancel Appointment'}
              {modalType === 'addAvailability' && 'Add Availability'}
              {modalType === 'modifyAvailability' && 'Save Changes'}
              {modalType === 'unblockAvailability' && 'Make Available'}
              {modalType === 'deleteAvailability' && 'Remove Time Slot'}
            </Button>
          )}

          {modalType === 'modifyAppointment' && (
            <Button
              variant="danger"
              onClick={() => {
                setModalType('cancelAppointment');
                setFormData({ ...formData, reason: '' });
              }}
            >
              Cancel Appointment
            </Button>
          )}

          {modalType === 'modifyAvailability' && (
            <Button
              variant="danger"
              onClick={() => {
                setModalType('deleteAvailability');
              }}
            >
              Remove Time Slot
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AppointmentCalendar;