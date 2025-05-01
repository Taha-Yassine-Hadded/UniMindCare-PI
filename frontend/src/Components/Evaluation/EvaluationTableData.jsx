import React, { useState, useEffect } from 'react';
import { Table, Input, Button } from 'reactstrap';
import { useNavigate } from 'react-router-dom';

const EvaluationTableData = () => {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:5000/api/evaluation', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des évaluations');
        }

        const data = await response.json();
        console.log('Données récupérées:', data); // Log pour débogage
        setEvaluations(data.evaluations || []);
        setFilteredEvaluations(data.evaluations || []);
      } catch (err) {
        setError(err.message);
        console.error('Erreur fetchEvaluations:', err); // Log pour débogage
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [navigate]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvaluations(evaluations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = evaluations.filter((evaluation) =>
      evaluation.nomEtudiant.toLowerCase().includes(query)
    );
    setFilteredEvaluations(filtered);
  }, [searchQuery, evaluations]);

  const handleViewDetails = (id) => {
    navigate(`/evaluations/details/${id}`);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Chargement des évaluations...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c' }}>{error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Input
          type="text"
          placeholder="Rechercher par nom d'étudiant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '300px',
            padding: '10px',
            borderRadius: '20px',
            border: '1px solid #dfe6e9',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
            fontSize: '14px',
            paddingLeft: '40px',
            transition: 'border-color 0.3s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#1E90FF')}
          onBlur={(e) => (e.target.style.borderColor = '#dfe6e9')}
        />
        <span
          style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#adb5bd',
            fontSize: '18px',
          }}
        >
          🔍
        </span>
      </div>
      <Table responsive hover style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)' }}>
        <thead>
          <tr>
            <th>Nom de l'étudiant</th>
            <th>Classe</th>
            <th>Matière</th>
            <th>Date</th>
            <th>Réaction à la correction</th>
            <th>Gestion du stress</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredEvaluations.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#adb5bd' }}>
                {searchQuery ? 'Aucune évaluation correspondante' : 'Aucune évaluation disponible'}
              </td>
            </tr>
          ) : (
            filteredEvaluations.map((evaluation) => (
              <tr key={evaluation._id} style={{ transition: 'background 0.2s ease' }}>
                <td>{evaluation.nomEtudiant}</td>
                <td>{evaluation.classe}</td>
                <td>{evaluation.matiere}</td>
                <td>{evaluation.dateEvaluation}</td>
                <td>{evaluation.reactionCorrection}</td>
                <td>{evaluation.gestionStress}</td>
                <td>
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => handleViewDetails(evaluation._id)}
                    style={{
                      borderRadius: '20px',
                      padding: '5px 15px',
                      fontSize: '12px',
                      background: 'linear-gradient(45deg, #1E90FF, #00c4ff)',
                      border: 'none',
                      boxShadow: '0 2px 5px rgba(30, 144, 255, 0.3)',
                      transition: 'transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                  >
                    Détails
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default EvaluationTableData;