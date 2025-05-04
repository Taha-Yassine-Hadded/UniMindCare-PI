import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiLink, FiCalendar, FiMessageSquare, FiClock, FiArrowLeft } from 'react-icons/fi';

const MeetingForm = () => {
    const [formData, setFormData] = useState({
        meetLink: '',
        date: '',
        reason: '',
        duration: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
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
                        'x-auth-faceid': 'true',
                    },
                }
            );
            setSuccess('Réunion planifiée avec succès !');
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
                        max-width: 700px;
                        margin: 60px auto;
                        padding: 50px;
                        border-radius: 25px;
                        background: linear-gradient(145deg, #ffffff, #f0f4f8);
                        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
                        position: relative;
                        animation: slideIn 0.7s ease-out;
                        border: 1px solid rgba(52, 152, 219, 0.2);
                    }
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .back-button {
                        position: absolute;
                        top: 25px;
                        left: 25px;
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 26px;
                        color: #3498db;
                        transition: transform 0.3s ease, color 0.3s ease;
                    }
                    .back-button:hover {
                        transform: translateX(-6px);
                        color: #2980b9;
                    }
                    .meeting-form-container h2 {
                        text-align: center;
                        margin-bottom: 40px;
                        font-size: 32px;
                        font-weight: 700;
                        letter-spacing: 1.5px;
                        background: linear-gradient(90deg, #3498db, rgb(37, 35, 199));
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    .form-group {
                        margin-bottom: 35px;
                        position: relative;
                    }
                    .form-group label {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 12px;
                        font-weight: 600;
                        font-size: 14px; /* Reduced from 16px */
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #2c3e50;
                    }
                    .form-group label svg {
                        font-size: 20px;
                        color: #3498db;
                        transition: color 0.3s ease;
                    }
                    .form-group label:hover svg {
                        color: #1abc9c;
                    }
                    .form-group input,
                    .form-group textarea {
                        width: 100%;
                        padding: 14px 15px 14px 45px;
                        border: 1px solid #dfe6e9;
                        border-radius: 12px;
                        font-size: 16px;
                        background: #f9fbfc;
                        color: #2c3e50;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    }
                    .form-group input:focus,
                    .form-group textarea:focus {
                        border-color: #3498db;
                        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.2);
                        transform: translateY(-2px);
                        background: #ffffff;
                    }
                    .form-group textarea {
                        resize: vertical;
                        min-height: 100px; /* Reduced from 150px */
                    }
                    .form-group input[type="number"] {
                        width: 150px;
                        appearance: textfield;
                    }
                    .form-group input[type="number"]::-webkit-inner-spin-button,
                    .form-group input[type="number"]::-webkit-outer-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    .form-group::before {
                        content: '';
                        position: absolute;
                        left: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 18px;
                        color: #3498db;
                    }
                    .error {
                        color: #e74c3c;
                        margin-bottom: 25px;
                        text-align: center;
                        font-size: 15px;
                        padding: 12px;
                        border-radius: 10px;
                        background: #ffebee;
                        animation: shake 0.5s ease-in-out;
                    }
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20%, 60% { transform: translateX(-5px); }
                        40%, 80% { transform: translateX(5px); }
                    }
                    .success {
                        color: #27ae60;
                        margin-bottom: 25px;
                        text-align: center;
                        font-size: 15px;
                        padding: 12px;
                        border-radius: 10px;
                        background: #e8f5e9;
                        animation: fadeIn 0.5s ease-in-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .submit-button {
                        width: 100%;
                        padding: 16px;
                        background: linear-gradient(135deg, #3498db, rgb(40, 16, 179));
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 17px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        cursor: pointer;
                        box-shadow: 0 5px 20px rgba(78, 47, 229, 0.4);
                        transition: all 0.3s ease;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 8px;
                    }
                    .submit-button:hover {
                        background: linear-gradient(135deg, rgb(26, 31, 188), #16a085);
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(34, 26, 188, 0.5);
                    }
                    .submit-button:disabled {
                        background: #bdc3c7;
                        cursor: not-allowed;
                        transform: none;
                        box-shadow: none;
                    }
                    .submit-button:disabled:hover {
                        background: #bdc3c7;
                        box-shadow: none;
                    }
                    .spinner {
                        border: 3px solid #ffffff;
                        border-top: 3px solid transparent;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            <button className="back-button" onClick={() => navigate(-1)} title="Retour">
                <FiArrowLeft />
            </button>
            <h2>Planifier une réunion</h2>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>
                        <FiLink /> Lien de la réunion
                    </label>
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
                    <label>
                        <FiCalendar /> Date et heure
                    </label>
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
                    <label>
                        <FiMessageSquare /> Raison de la réunion
                    </label>
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
                    <label>
                        <FiClock /> Durée (en minutes)
                    </label>
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
                    {loading ? (
                        <>
                            <span className="spinner"></span> Envoi en cours...
                        </>
                    ) : (
                        'Planifier la réunion'
                    )}
                </button>
            </form>
        </div>
    );
};

export default MeetingForm;