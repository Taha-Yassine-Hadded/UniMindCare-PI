import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-toastify/dist/ReactToastify.css';
import './AppointmentCalendar.css';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

const AppointmentCalendar = ({ role, userId, selectedPsychologistId }) => {
    const [events, setEvents] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [psychologists, setPsychologists] = useState([]);
    const [selectedPsychologist, setSelectedPsychologist] = useState(selectedPsychologistId || '');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'book', 'modify', 'cancel', 'block', 'confirm', 'addAvailability'
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        date: '',
        priority: 'regular',
        reason: '',
        startTime: '',
        endTime: '',
    });

    // Load list of psychologists for student to choose from
    useEffect(() => {
        if (role === 'student') {
            const fetchPsychologists = async () => {
                try {
                    const response = await axios.get('http://localhost:5000/api/appointments/psychiatres');
                    setPsychologists(response.data);

                    // Ensure the pre-selected psychologist (from URL) is set
                    if (selectedPsychologistId && response.data.some(psy => psy._id === selectedPsychologistId)) {
                        setSelectedPsychologist(selectedPsychologistId);
                    } else if (response.data.length > 0 && !selectedPsychologist) {
                        // Fallback to the first psychologist if no pre-selection
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
                        return; // Wait until a psychologist is selected
                    }

                    // For students: fetch the selected psychologist's availability and the student's appointments
                    const availabilityResponse = await axios.get(
                        `http://localhost:5000/api/availability?psychologistId=${selectedPsychologist}`
                    );

                    const appointmentsResponse = await axios.get(
                        `http://localhost:5000/api/appointments?studentId=${userId}`
                    );

                    // Format availability data for the calendar
                    setAvailability(availabilityResponse.data.map(slot => ({
                        id: slot._id,
                        title: slot.status === 'blocked' ? 'Not Available' : 'Available',
                        start: new Date(slot.startTime),
                        end: new Date(slot.endTime),
                        status: slot.status,
                        resource: 'availability'
                    })));

                    // Format appointments data for the calendar
                    setEvents(appointmentsResponse.data.map(appointment => ({
                        id: appointment._id,
                        title: role === 'student'
                            ? `Appointment with Dr. ${appointment.psychologistId?.Name || 'Unknown'}`
                            : `Appointment with ${appointment.studentId?.Name || 'Student'}`,
                        start: new Date(appointment.date),
                        end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
                        status: appointment.status,
                        studentId: appointment.studentId,
                        priority: appointment.priority,
                        resource: 'appointment'
                    })));
                } else if (role === 'psychiatre') {
                    // For psychologists: fetch their availability and all appointments
                    const availabilityResponse = await axios.get(
                        `http://localhost:5000/api/availability?psychologistId=${userId}`
                    );

                    const appointmentsResponse = await axios.get(
                        `http://localhost:5000/api/appointments?psychologistId=${userId}`
                    );

                    setAvailability(availabilityResponse.data.map(slot => ({
                        id: slot._id,
                        title: slot.status === 'blocked' ? 'Blocked' : 'Available',
                        start: new Date(slot.startTime),
                        end: new Date(slot.endTime),
                        status: slot.status,
                        reason: slot.reason,
                        resource: 'availability'
                    })));

                    setEvents(appointmentsResponse.data.map(appointment => ({
                        id: appointment._id,
                        title: `Appointment with ${appointment.studentId?.Name || 'Student'}`,
                        start: new Date(appointment.date),
                        end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
                        status: appointment.status,
                        studentId: appointment.studentId,
                        priority: appointment.priority,
                        resource: 'appointment'
                    })));
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

    // Handle slot selection (for booking or adding availability)
    const handleSelectSlot = ({ start, end }) => {
        // Don't allow selecting slots in the past
        if (start < new Date()) {
            toast.error("Cannot select time slots in the past");
            return;
        }

        setSelectedSlot({ start, end });

        if (role === 'student') {
            // Check if this slot overlaps with an available time slot
            const isAvailable = availability.some(slot =>
                slot.status === 'available' &&
                moment(start).isSameOrAfter(moment(slot.start)) &&
                moment(end).isSameOrBefore(moment(slot.end))
            );

            if (isAvailable) {
                setModalType('book');
                setFormData({
                    date: start.toISOString(),
                    priority: 'regular',
                    reason: ''
                });
                setShowModal(true);
            } else {
                toast.info('This time slot is not available for booking');
            }
        } else if (role === 'psychiatre') {
            // Psychologists can add availability or block time slots
            setModalType('addAvailability');
            setFormData({
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                status: 'available',
                reason: ''
            });
            setShowModal(true);
        }
    };

    // Handle event selection (for modifying or canceling appointments)
    const handleSelectEvent = (event) => {
        setSelectedEvent(event);

        if (event.resource === 'availability') {
            // Handling availability slots
            if (role === 'psychiatre') {
                if (event.status === 'available') {
                    setModalType('modifyAvailability');
                    setFormData({
                        startTime: event.start.toISOString(),
                        endTime: event.end.toISOString(),
                        status: event.status,
                        reason: event.reason || ''
                    });
                } else {
                    setModalType('unblockAvailability');
                    setFormData({
                        reason: event.reason || ''
                    });
                }
                setShowModal(true);
            }
        } else {
            // Handling appointment events
            if (role === 'student') {
                // Students can modify or cancel their appointments
                setModalType('modifyAppointment');
                setFormData({
                    date: event.start.toISOString(),
                    reason: ''
                });
                setShowModal(true);
            } else if (role === 'psychiatre') {
                // Psychologists can confirm or cancel appointments
                if (event.status === 'pending') {
                    setModalType('confirmAppointment');
                } else {
                    setModalType('cancelAppointment');
                }
                setFormData({
                    reason: ''
                });
                setShowModal(true);
            }
        }
    };

    // Handle form submission based on modal type
    const handleSubmit = async () => {
        try {
            switch (modalType) {
                case 'book':
                    // Student books an appointment
                    const bookResponse = await axios.post('http://localhost:5000/api/appointments/book', {
                        studentId: userId,
                        psychologistId: selectedPsychologist,
                        date: formData.date,
                        priority: formData.priority
                    });

                    setEvents([...events, {
                        id: bookResponse.data._id,
                        title: `Appointment with Dr. ${psychologists.find(psy => psy._id === selectedPsychologist)?.Name || 'Unknown'}`,
                        start: new Date(formData.date),
                        end: new Date(new Date(formData.date).getTime() + 60 * 60 * 1000),
                        status: 'pending',
                        resource: 'appointment'
                    }]);

                    toast.success('Appointment request submitted!');
                    break;

                case 'modifyAppointment':
                    // Student modifies an appointment
                    await axios.put(`http://localhost:5000/api/appointments/${selectedEvent.id}`, {
                        date: formData.date
                    });

                    setEvents(events.map(event =>
                        event.id === selectedEvent.id
                            ? {
                                ...event,
                                start: new Date(formData.date),
                                end: new Date(new Date(formData.date).getTime() + 60 * 60 * 1000),
                                status: 'pending'
                            }
                            : event
                    ));

                    toast.success('Appointment modified! Awaiting confirmation.');
                    break;

                case 'cancelAppointment':
                    // Student or Psychologist cancels an appointment
                    await axios.delete(`http://localhost:5000/api/appointments/${selectedEvent.id}`, {
                        data: { reasonForCancellation: formData.reason }
                    });

                    setEvents(events.filter(event => event.id !== selectedEvent.id));

                    toast.success('Appointment cancelled successfully');
                    break;

                case 'addAvailability':
                    // Psychologist adds availability
                    const availabilityResponse = await axios.post('http://localhost:5000/api/availability', {
                        psychologistId: userId,
                        startTime: formData.startTime,
                        endTime: formData.endTime,
                        status: 'available'
                    });

                    setAvailability([...availability, {
                        id: availabilityResponse.data._id,
                        title: 'Available',
                        start: new Date(formData.startTime),
                        end: new Date(formData.endTime),
                        status: 'available',
                        resource: 'availability'
                    }]);

                    toast.success('Availability added to your calendar');
                    break;

                case 'modifyAvailability':
                    // Psychologist modifies availability
                    await axios.put(`http://localhost:5000/api/availability/${selectedEvent.id}`, {
                        startTime: formData.startTime,
                        endTime: formData.endTime,
                        status: formData.status === 'block' ? 'blocked' : 'available',
                        reason: formData.status === 'block' ? formData.reason : null
                    });

                    if (formData.status === 'block') {
                        // If blocking an available slot
                        setAvailability(availability.map(slot =>
                            slot.id === selectedEvent.id
                                ? {
                                    ...slot,
                                    title: 'Blocked',
                                    status: 'blocked',
                                    reason: formData.reason,
                                    start: new Date(formData.startTime),
                                    end: new Date(formData.endTime)
                                }
                                : slot
                        ));
                        toast.success('Time slot blocked');
                    } else {
                        // Updating available slot
                        setAvailability(availability.map(slot =>
                            slot.id === selectedEvent.id
                                ? {
                                    ...slot,
                                    start: new Date(formData.startTime),
                                    end: new Date(formData.endTime)
                                }
                                : slot
                        ));
                        toast.success('Availability updated');
                    }
                    break;

                case 'unblockAvailability':
                    // Psychologist unblocks a time slot
                    await axios.put(`http://localhost:5000/api/availability/${selectedEvent.id}`, {
                        status: 'available',
                        reason: null
                    });

                    setAvailability(availability.map(slot =>
                        slot.id === selectedEvent.id
                            ? {
                                ...slot,
                                title: 'Available',
                                status: 'available',
                                reason: null
                            }
                            : slot
                    ));

                    toast.success('Time slot is now available');
                    break;

                case 'confirmAppointment':
                    // Psychologist confirms an appointment
                    await axios.put(`http://localhost:5000/api/appointments/confirm/${selectedEvent.id}`);

                    setEvents(events.map(event =>
                        event.id === selectedEvent.id
                            ? { ...event, status: 'confirmed' }
                            : event
                    ));

                    toast.success('Appointment confirmed');
                    break;
            }

            setShowModal(false);
        } catch (err) {
            console.error('Error submitting form:', err);
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    };

    // Custom event styling based on status
    const eventPropGetter = (event) => {
        let style = {
            borderRadius: '4px',
            opacity: 0.9,
            border: '0px',
            display: 'block',
            color: 'white'
        };

        if (event.resource === 'availability') {
            // Styling for availability slots
            if (event.status === 'blocked') {
                style.backgroundColor = '#6c757d'; // Gray for blocked slots
                style.opacity = 0.7;
                style.background = 'repeating-linear-gradient(45deg, #6c757d, #6c757d 10px, #5a6268 10px, #5a6268 20px)';
            } else {
                style.backgroundColor = '#20c997'; // Teal for available slots
                style.border = '1px dashed #0f9d7a';
            }
        } else {
            // Styling for appointments
            switch (event.status) {
                case 'confirmed':
                    style.backgroundColor = '#28a745'; // Green for confirmed
                    break;
                case 'pending':
                    style.backgroundColor = '#ffc107'; // Yellow for pending
                    style.color = '#212529';
                    break;
                case 'cancelled':
                    style.backgroundColor = '#dc3545'; // Red for cancelled
                    style.opacity = 0.6;
                    break;
                default:
                    style.backgroundColor = '#007bff'; // Blue default
            }

            // Highlight emergency appointments
            if (event.priority === 'emergency') {
                style.border = '2px solid #dc3545';
                style.fontWeight = 'bold';
            }
        }

        return { style };
    };

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading calendar...</p>
        </div>
    );

    return (
        <div className="appointment-calendar">
            <ToastContainer position="top-right" autoClose={5000} />

            {/* Psychologist selector for students */}
            {role === 'student' && (
                <div className="psychologist-selector mb-4">
                    <Form.Group>
                        <Form.Label><strong>Select a Psychologist</strong></Form.Label>
                        <Form.Control
                            as="select"
                            value={selectedPsychologist}
                            onChange={(e) => setSelectedPsychologist(e.target.value)}
                        >
                            <option value="" disabled>Select a psychologist</option>
                            {psychologists.map(psy => (
                                <option key={psy._id} value={psy._id}>
                                    Dr. {psy.Name}
                                </option>
                            ))}
                        </Form.Control>
                    </Form.Group>
                </div>
            )}

            {/* Calendar legend */}
            <div className="calendar-legend mb-3">
                <div className="d-flex justify-content-between flex-wrap">
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: '#20c997' }}></span>
                        <span>Available</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: '#6c757d', opacity: 0.7 }}></span>
                        <span>Blocked</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: '#ffc107' }}></span>
                        <span>Pending Appointment</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: '#28a745' }}></span>
                        <span>Confirmed Appointment</span>
                    </div>
                </div>
            </div>

            {/* Calendar view */}
            <div className="calendar-container">
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
                    defaultView={Views.WEEK}
                    views={['month', 'week', 'day']}
                    min={new Date(new Date().setHours(8, 0, 0, 0))}
                    max={new Date(new Date().setHours(18, 0, 0, 0))}
                />
            </div>

            {/* Dynamic Modal for various actions */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {modalType === 'book' && 'Book an Appointment'}
                        {modalType === 'modifyAppointment' && 'Modify Appointment'}
                        {modalType === 'cancelAppointment' && 'Cancel Appointment'}
                        {modalType === 'addAvailability' && 'Add Availability'}
                        {modalType === 'modifyAvailability' && 'Modify Availability'}
                        {modalType === 'unblockAvailability' && 'Unblock Time Slot'}
                        {modalType === 'confirmAppointment' && 'Confirm Appointment'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {/* Book or Modify Appointment Form */}
                        {(modalType === 'book' || modalType === 'modifyAppointment') && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Date and Time</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={moment(formData.date).format('YYYY-MM-DDTHH:mm')}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            date: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                </Form.Group>

                                {modalType === 'book' && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Priority</Form.Label>
                                        <Form.Control
                                            as="select"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                priority: e.target.value
                                            })}
                                        >
                                            <option value="regular">Regular Appointment</option>
                                            <option value="emergency">Emergency - Need Urgent Help</option>
                                        </Form.Control>
                                    </Form.Group>
                                )}
                            </>
                        )}

                        {/* Add/Modify Availability Form */}
                        {(modalType === 'addAvailability' || modalType === 'modifyAvailability') && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Start Time</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={moment(formData.startTime).format('YYYY-MM-DDTHH:mm')}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            startTime: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>End Time</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={moment(formData.endTime).format('YYYY-MM-DDTHH:mm')}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            endTime: new Date(e.target.value).toISOString()
                                        })}
                                    />
                                </Form.Group>

                                {modalType === 'modifyAvailability' && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Status</Form.Label>
                                        <Form.Control
                                            as="select"
                                            value={formData.status}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                status: e.target.value
                                            })}
                                        >
                                            <option value="available">Available</option>
                                            <option value="block">Block this time</option>
                                        </Form.Control>
                                    </Form.Group>
                                )}

                                {(modalType === 'modifyAvailability' && formData.status === 'block') && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Reason for Blocking</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={formData.reason || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                reason: e.target.value
                                            })}
                                            placeholder="Optional: Add reason for blocking this time"
                                        />
                                    </Form.Group>
                                )}
                            </>
                        )}

                        {/* Cancellation Forms */}
                        {(modalType === 'cancelAppointment') && (
                            <Form.Group className="mb-3">
                                <Form.Label>Reason for Cancellation</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={formData.reason || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        reason: e.target.value
                                    })}
                                    placeholder="Optional: Provide a reason for cancellation"
                                />
                            </Form.Group>
                        )}

                        {/* Confirm Appointment */}
                        {modalType === 'confirmAppointment' && (
                            <p>Are you sure you want to confirm this appointment?</p>
                        )}

                        {/* Unblock Availability */}
                        {modalType === 'unblockAvailability' && (
                            <p>Do you want to make this time slot available for appointments?</p>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>

                    <Button
                        variant={
                            modalType === 'cancelAppointment' ? 'danger' :
                            modalType === 'confirmAppointment' ? 'success' :
                            'primary'
                        }
                        onClick={handleSubmit}
                    >
                        {modalType === 'book' && 'Book Appointment'}
                        {modalType === 'modifyAppointment' && 'Save Changes'}
                        {modalType === 'cancelAppointment' && 'Cancel Appointment'}
                        {modalType === 'addAvailability' && 'Add Availability'}
                        {modalType === 'modifyAvailability' && 'Save Changes'}
                        {modalType === 'unblockAvailability' && 'Make Available'}
                        {modalType === 'confirmAppointment' && 'Confirm Appointment'}
                    </Button>

                    {/* Extra buttons for certain modal types */}
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
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AppointmentCalendar;