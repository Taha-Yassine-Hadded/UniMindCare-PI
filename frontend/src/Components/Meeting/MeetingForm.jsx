import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const MeetingForm = () => {
    const [formData, setFormData] = useState({
        meetLink: '',
        date: '',
        reason: '',
        duration: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.meetLink) return 'Le lien Google Meet est requis.';
        if (!/^https?:\/\/(meet\.google\.com|.*\.zoom\.us|.*\.webex\.com)\//.test(formData.meetLink)) return 'Veuillez entrer un lien de réunion valide (Google Meet, Zoom, ou Webex).';
        if (!formData.date) return 'La date et l’heure sont requises.';
        if (!formData.reason) return 'La raison de la réunion est requise.';
        if (!formData.duration || formData.duration <= 0) return 'La durée doit être supérieure à 0.';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            console.log('Token retrieved:', token); // Debug
            if (!token) {
                setError('Vous devez être connecté pour planifier une réunion.');
                navigate('/login');
                return;
            }
            const meetingData = {
                meetLink: formData.meetLink,
                date: new Date(formData.date).toISOString(),
                reason: formData.reason,
                duration: parseInt(formData.duration),
            };
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/meeting`,
                meetingData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-auth-faceid': 'true', // Ajout pour correspondre à PrivateRoute
                    },
                }
            );
            alert('Réunion planifiée avec succès !');
            setFormData({ meetLink: '', date: '', reason: '', duration: '' });
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Non autorisé : Veuillez vous reconnecter.');
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                navigate('/login');
            } else if (err.response?.status === 403) {
                setError('Seuls les enseignants peuvent planifier des réunions.');
            } else {
                setError(err.response?.data?.message || 'Échec de la planification de la réunion. Veuillez réessayer.');
            }
            console.error('Erreur lors de la création de la réunion:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="meeting-form-container">
            <style>
                {`
                    .meeting-form-container {
                        max-width: 600px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #f9f9f9;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .meeting-form-container h2 {
                        text-align: center;
                        margin-bottom: 20px;
                        color: #333;
                    }
                    .form-group {
                        margin-bottom: 20px;
                    }
                    .form-group label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: bold;
                        color: #555;
                    }
                    .form-group input,
                    .form-group textarea {
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 16px;
                    }
                    .form-group textarea {
                        resize: vertical;
                        min-height: 100px;
                    }
                    .form-group input[type="number"] {
                        width: 100px;
                    }
                    .error {
                        color: red;
                        margin-bottom: 10px;
                        text-align: center;
                    }
                    .submit-button {
                        width: 100%;
                        padding: 12px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background 0.3s;
                    }
                    .submit-button:hover {
                        background: #0056b3;
                    }
                    .submit-button:disabled {
                        background: #cccccc;
                        cursor: not-allowed;
                    }
                `}
            </style>
            <h2>Planifier une réunion</h2>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="meetLink">Lien Google Meet</label>
                    <input
                        type="url"
                        id="meetLink"
                        name="meetLink"
                        value={formData.meetLink}
                        onChange={handleChange}
                        placeholder="https://meet.google.com/..."
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="date">Date et heure</label>
                    <input
                        type="datetime-local"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reason">Raison de la réunion</label>
                    <textarea
                        id="reason"
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        placeholder="Entrez la raison de la réunion"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="duration">Durée (en minutes)</label>
                    <input
                        type="number"
                        id="duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        min="1"
                        required
                    />
                </div>
                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Envoi en cours...' : 'Planifier la réunion'}
                </button>
            </form>
        </div>
    );
};

export default MeetingForm;