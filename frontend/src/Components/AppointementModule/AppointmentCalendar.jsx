import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
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
                        `http://localhost:5000/api/appointments?studentId=${userId}&psychologistId=${selectedPsychologist}`
                    );

                    // Format availability data for the calendar - Using empty title to show only borders
                    setAvailability(availabilityResponse.data.map(slot => ({
                        id: slot._id,
                        title: '', // Empty title to show only the border
                        start: new Date(slot.startTime),
                        end: new Date(slot.endTime),
                        status: slot.status,
                        reason: slot.reason,
                        resource: 'availability'
                    })));

                    // Format appointments data for the calendar
                    setEvents(appointmentsResponse.data.map(appointment => ({
                        id: appointment._id,
                        title: `Appointment with Dr. ${appointment.psychologistId?.Name || 'Unknown'}`,
                        start: new Date(appointment.date),
                        end: new Date(new Date(appointment.date).getTime() + 60 * 60 * 1000),
                        status: appointment.status,
                        psychologistId: appointment.psychologistId,
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

                    // Format availability data for the calendar - Using empty title to show only borders
                    setAvailability(availabilityResponse.data.map(slot => ({
                        id: slot._id,
                        title: '', // Empty title to show only the border
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

        // Check if this slot has existing availability
        const existingAvailability = availability.find(slot => 
            slot.start <= end && slot.end >= start
        );

        if (existingAvailability) {
            // If this slot already has availability, select that event instead
            setSelectedEvent(existingAvailability);
            
            if (role === 'psychiatre') {
                if (existingAvailability.status === 'available') {
                    setModalType('modifyAvailability');
                    setFormData({
                        startTime: existingAvailability.start.toISOString(),
                        endTime: existingAvailability.end.toISOString(),
                        status: existingAvailability.status,
                        reason: existingAvailability.reason || ''
                    });
                } else {
                    setModalType('unblockAvailability');
                    setFormData({
                        reason: existingAvailability.reason || ''
                    });
                }
                setShowModal(true);
            } else if (role === 'student') {
                // For students, check if the slot is available for booking
                if (existingAvailability.status === 'available') {
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
            }
        } else {
            // No existing availability - proceed as before
            setSelectedSlot({ start, end });

            if (role === 'student') {
                toast.info('This time slot is not available for booking');
            } else if (role === 'psychiatre') {
                setModalType('addAvailability');
                setFormData({
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    status: 'available',
                    reason: ''
                });
                setShowModal(true);
            }
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
                // Psychologists can review (accept/decline) pending appointments or modify/cancel confirmed ones
                if (event.status === 'pending') {
                    setModalType('reviewAppointment'); // New modal type for Accept/Decline
                    setFormData({
                        reason: ''
                    });
                } else if (event.status === 'confirmed') {
                    setModalType('modifyAppointment'); // Modify confirmed appointments
                    setFormData({
                        date: event.start.toISOString(),
                        reason: ''
                    });
                } else {
                    setModalType('cancelAppointment'); // For cancelled appointments (or other statuses)
                    setFormData({
                        reason: ''
                    });
                }
                setShowModal(true);
            }
        }
    };

    // Helper function to check if a time slot is available
    const isSlotAvailable = (start, end) => {
        // Check if the slot overlaps with any available slot
        return availability.some(slot => {
            if (slot.status !== 'available') return false; // Skip blocked slots
            return slot.start <= end && slot.end >= start;
        });
    };

    // Handle form submission based on modal type
    const handleSubmit = async () => {
        try {
            switch (modalType) {
                case 'book':
                    // Student books an appointment
                    const bookResponse = await axios.post('http://localhost:5000/api/cases/book-appointment', {
                        studentId: userId,
                        psychologistId: selectedPsychologist,
                        date: formData.date,
                        priority: formData.priority
                    });
                    console.log('Book response:', bookResponse.data);
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
                    // Modify an appointment (for students or psychologists)
                    const newStart = new Date(formData.date);
                    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000); // Assume 1-hour appointments

                    // Don't allow modifications to past dates
                    if (newStart < new Date()) {
                        toast.error("Cannot modify appointment to a past date");
                        return;
                    }

                    // For students, always check availability
                    if (role === 'student') {
                        const slotAvailable = isSlotAvailable(newStart, newEnd);
                        if (!slotAvailable) {
                            toast.error("Please select a time within the psychologist's available slots.");
                            return;
                        }
                    }

                    await axios.put(`http://localhost:5000/api/appointments/${selectedEvent.id}`, {
                        date: formData.date
                    });

                    setEvents(events.map(event =>
                        event.id === selectedEvent.id
                            ? {
                                ...event,
                                start: newStart,
                                end: newEnd,
                                status: role === 'student' ? 'pending' : 'confirmed' // Reset to pending for students, keep confirmed for psychologists
                            }
                            : event
                    ));

                    toast.success('Appointment modified! ' + (role === 'student' ? 'Awaiting confirmation.' : ''));
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
                        title: '',
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
                        setAvailability(availability.map(slot =>
                            slot.id === selectedEvent.id
                                ? {
                                    ...slot,
                                    title: '',
                                    status: 'blocked',
                                    reason: formData.reason,
                                    start: new Date(formData.startTime),
                                    end: new Date(formData.endTime)
                                }
                                : slot
                        ));
                        toast.success('Time slot blocked');
                    } else {
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
                                title: '',
                                status: 'available',
                                reason: null
                            }
                            : slot
                    ));

                    toast.success('Time slot is now available');
                    break;

                case 'deleteAvailability':
                    // Remove a time slot
                    await axios.delete(`http://localhost:5000/api/availability/${selectedEvent.id}`);
                    
                    setAvailability(availability.filter(slot => slot.id !== selectedEvent.id));
                    
                    toast.success('Time slot removed successfully');
                    break;

                case 'reviewAppointment':
                    // Psychologist accepts an appointment
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

    // Custom event styling based on status and priority
    const eventPropGetter = (event) => {
        let style = {
            borderRadius: '4px',
            border: '2px solid', // Solid border for all events
            display: 'block',
            boxShadow: '0 2px 3px rgba(0,0,0,0.1)',
            zIndex: 5, // Ensure events are above other elements
        };

        if (event.resource === 'availability') {
            // Keep availability events invisible
            style = {
                ...style,
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                color: 'transparent',
                display: 'none', // Hide them completely
                pointerEvents: 'none', // Make them non-interactive
            };
        } else {
            // Appointment styling based on status
            switch (event.status) {
                case 'confirmed':
                    style.backgroundColor = '#28a745'; // Green for confirmed
                    style.borderColor = '#1e7e34'; // Darker green border
                    style.color = '#212529';
                    style.opacity = 1; // Fully opaque
                    break;
                case 'pending':
                    style.backgroundColor = '#fdfd96'; // Yellow for pending
                    style.borderColor = '#fdfd96'; // Darker yellow border
                    style.color = '#fdfd96';
                    style.opacity = 1; // Fully opaque
                    break;
                case 'cancelled':
                    style.backgroundColor = '#f8d7da'; // Pink for cancelled (matching the image)
                    style.borderColor = '#dc3545'; // Red border
                    style.color = '#721c24'; // Darker text color for contrast
                    style.opacity = 0.8; // Slightly transparent for cancelled
                    break;
                default:
                    style.backgroundColor = '#007bff'; // Fallback blue (shouldn't be used)
                    style.borderColor = '#0056b3';
                    style.color = '#212529';
                    style.opacity = 1;
            }

            // Add priority styling
            if (event.priority === 'emergency') {
                style.borderBottom = '4px solid #dc3545'; // Red bottom border for urgent
            }
        }

        return { style };
    };

    // Custom component for time slot cells
    const TimeSlotWrapper = ({ value, children }) => {
        // Check if this time slot overlaps with any availability
        const slotStart = new Date(value);
        const slotEnd = new Date(new Date(value).setMinutes(value.getMinutes() + 30)); // Assume 30-min slots
        
        let availableSlot = null;
        let blockedSlot = null;
        
        // Find if this time slot is within any availability period
        for (const slot of availability) {
            if (slot.start <= slotEnd && slot.end >= slotStart) {
                if (slot.status === 'available') {
                    availableSlot = slot;
                } else if (slot.status === 'blocked') {
                    blockedSlot = slot;
                }
            }
        }
        
        // Determine the class to apply
        let cellClass = '';
        if (blockedSlot) {
            cellClass = 'blocked-time-slot';
        } else if (availableSlot) {
            cellClass = 'available-time-slot';
        }
        
        return (
            <div className={`rbc-time-slot ${cellClass}`}>
                {children}
            </div>
        );
    };

    // Custom component for date cells in month view
    const DateCellWrapper = ({ value, children }) => {
        const date = new Date(value);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        let hasAvailable = false;
        let hasBlocked = false;
        
        // Find if this day has any availability or blocked periods
        for (const slot of availability) {
            if (slot.start <= dayEnd && slot.end >= dayStart) {
                if (slot.status === 'available') {
                    hasAvailable = true;
                } else if (slot.status === 'blocked') {
                    hasBlocked = true;
                }
            }
        }
        
        // Determine the class to apply
        let cellClass = '';
        if (hasBlocked) {
            cellClass = 'blocked-date-cell';
        } else if (hasAvailable) {
            cellClass = 'available-date-cell';
        }
        
        return (
            <div className={`rbc-day-bg ${cellClass}`}>
                {children}
            </div>
        );
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
                                <div className="legend-color" style={{ backgroundColor: '#fdfd96', border: '2px solid #fef86c', borderRadius: '4px' }}></div>
                                <span>Pending</span>
                            </div>
                            <div className="legend-item mb-1">
                                <div className="legend-color" style={{ backgroundColor: '#b0f2b6', border: '2px solid #75da7e', borderRadius: '4px' }}></div>
                                <span>Confirmed</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-color" style={{ backgroundColor: '#ff9e93', border: '2px solid #ff847a', borderRadius: '4px', opacity: 0.8 }}></div>
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
                                <div className="legend-color" style={{
                                    backgroundColor: '#fdfd96',
                                    border: '2px solid #fef86c',
                                    borderRadius: '4px'
                                }}></div>
                                <span>Regular</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar view */}
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
                                props.event.status === 'pending' ? '#fdfd96' :
                                props.event.status === 'confirmed' ? '#28a745' :
                                props.event.status === 'cancelled' ? '#f8d7da' :
                                '#007bff'; // Fallback (shouldn't be used)

                            const borderColor =
                                props.event.status === 'pending' ? '#fdfd96' :
                                props.event.status === 'confirmed' ? '#1e7e34' :
                                props.event.status === 'cancelled' ? '#dc3545' :
                                '#0056b3';

                            const textColor =
                                props.event.status === 'pending' ? '#fdfd96' :
                                props.event.status === 'confirmed' ? '#212529' :
                                props.event.status === 'cancelled' ? '#721c24' :
                                '#212529';

                            const priorityBorder = props.event.priority === 'emergency' ? '4px solid #dc3545' : 'none';

                            const inlineStyle = {
                                backgroundColor: statusColor,
                                border: `2px solid ${borderColor}`,
                                borderBottom: priorityBorder,
                                color: textColor,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                borderRadius: '4px',
                                zIndex: 5,
                                opacity: props.event.status === 'cancelled' ? 0.8 : 1, // Slightly transparent for cancelled
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
                        }
                    }}
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
                        {modalType === 'deleteAvailability' && 'Remove Time Slot'}
                        {modalType === 'reviewAppointment' && 'Review Appointment'}
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

                                {modalType === 'modifyAppointment' && role === 'student' && (
                                    <p className="text-muted">
                                        Please select a time within the psychologist's available slots.
                                    </p>
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

                        {/* Delete Availability Confirmation */}
                        {modalType === 'deleteAvailability' && (
                            <p>Are you sure you want to remove this time slot from your schedule?</p>
                        )}

                        {/* Cancellation Forms */}
                        {modalType === 'cancelAppointment' && (
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

                        {/* Review Appointment (Accept/Decline) */}
                        {modalType === 'reviewAppointment' && (
                            <p>Would you like to accept or decline this appointment request?</p>
                        )}

                        {/* Unblock Availability */}
                        {modalType === 'unblockAvailability' && (
                            <p>Do you want to make this time slot available for appointments?</p>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                  
                    {/* For reviewAppointment, show Accept and Decline buttons */}
                    {modalType === 'reviewAppointment' && (
                        <>
                            <Button
                                variant="success"
                                onClick={handleSubmit}
                            >
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

                    {/* For other modal types, show the appropriate submit button */}
                    {modalType !== 'reviewAppointment' && (
                        <Button
                            variant={
                                modalType === 'cancelAppointment' || modalType === 'deleteAvailability' ? 'danger' :
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
                            {modalType === 'deleteAvailability' && 'Remove Time Slot'}
                            {modalType === 'confirmAppointment' && 'Confirm Appointment'}
                        </Button>
                    )}

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
                    
                    {/* Add Remove Time Slot button for Modify Availability */}
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