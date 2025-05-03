import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Container, Row, Col, Card, CardHeader, CardBody, Spinner, Table, Badge,
  ButtonGroup, Button, ListGroup, ListGroupItem, Nav, NavItem, NavLink, UncontrolledTooltip,
  Progress, Alert, CardFooter, Dropdown, DropdownToggle, DropdownMenu, DropdownItem
} from 'reactstrap';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, 
  Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, subMonths, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CSVLink } from 'react-csv';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Enregistrer les composants ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement, PointElement, LineElement);

const EmotionStatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentData, setRecentData] = useState([]);
  const [timeRange, setTimeRange] = useState('all'); // 'today', 'week', 'month', 'all'
  const [selectedGesture, setSelectedGesture] = useState(null);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [chartType, setChartType] = useState('doughnut'); // 'doughnut', 'pie', 'bar'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(prevState => !prevState);
  const toggleHeaderDropdown = () => setHeaderDropdownOpen(prevState => !prevState);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Pour les besoins de démonstration, nous utilisons des données fictives
        // au lieu de se connecter à l'API qui ne renvoie pas de données
        const mockData = {
          gestureStats: [
            { _id: 'main_tete', count: 42 },
            { _id: 'main_yeux', count: 28 },
            { _id: 'main_ventre', count: 16 },
            { _id: 'main_cou', count: 12 },
            { _id: null, count: 7 }
          ],
          keywordStats: [
            { _id: 'mal', count: 58 },
            { _id: 'tête', count: 45 },
            { _id: 'douleur', count: 32 },
            { _id: 'ventre', count: 24 },
            { _id: 'yeux', count: 22 },
            { _id: 'fatigué', count: 18 }
          ],
          speechStats: [
            { _id: "j'ai mal à la tête", count: 36 },
            { _id: "je me sens mal", count: 24 },
            { _id: "j'ai mal au ventre", count: 18 },
            { _id: "mes yeux me font mal", count: 14 },
            { _id: "je suis fatigué", count: 12 }
          ],
          dailyStats: Array(14).fill().map((_, i) => ({
            _id: {
              year: 2025,
              month: 4,
              day: 10 + i
            },
            count: Math.floor(Math.random() * 20) + 5
          }))
        };
        
        // Données de test pour la table
        const mockRecentData = Array(20).fill().map((_, idx) => ({
          _id: `mock-id-${idx}`,
          timestamp: format(subDays(new Date(), Math.floor(Math.random() * 14)), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          gesture: ['main_tete', 'main_yeux', 'main_ventre', 'main_cou', null][Math.floor(Math.random() * 5)],
          speech_text: ["j'ai mal à la tête", "je me sens mal", "j'ai mal au ventre", "mes yeux me font mal", "je suis fatigué", null][Math.floor(Math.random() * 6)],
          keywords: [
            ['mal', 'tête'], 
            ['mal'], 
            ['mal', 'ventre'], 
            ['yeux', 'mal'], 
            ['fatigué'],
            []
          ][Math.floor(Math.random() * 6)]
        }));
        
        setStats(mockData);
        setRecentData(mockRecentData);
        setError(null);
      } catch (err) {
        console.error("Erreur lors de la récupération des données:", err);
        setError("Impossible de charger les données. Veuillez réessayer plus tard.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  // Filtrer les données en fonction de la plage de temps sélectionnée
  const filteredRecentData = useMemo(() => {
    if (!recentData.length) return [];
    
    const today = new Date();
    
    switch(timeRange) {
      case 'today':
        return recentData.filter(item => {
          const itemDate = parseISO(item.timestamp);
          return isSameDay(itemDate, today);
        });
      case 'week':
        const weekAgo = subDays(today, 7);
        return recentData.filter(item => {
          const itemDate = parseISO(item.timestamp);
          return itemDate >= weekAgo;
        });
      case 'month':
        const monthAgo = subMonths(today, 1);
        return recentData.filter(item => {
          const itemDate = parseISO(item.timestamp);
          return itemDate >= monthAgo;
        });
      default:
        return recentData;
    }
  }, [recentData, timeRange]);

  // Filtrer les données en fonction du geste sélectionné
  const filteredByGesture = useMemo(() => {
    if (!selectedGesture) return filteredRecentData;
    return filteredRecentData.filter(item => item.gesture === selectedGesture);
  }, [filteredRecentData, selectedGesture]);

  // Filtrer les données en fonction du mot-clé sélectionné
  const filteredData = useMemo(() => {
    if (!selectedKeyword) return filteredByGesture;
    return filteredByGesture.filter(item => 
      item.keywords && item.keywords.includes(selectedKeyword)
    );
  }, [filteredByGesture, selectedKeyword]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      transition: { duration: 0.4 } 
    },
    hover: { 
      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
      y: -5,
      transition: { duration: 0.3 }
    }
  };

  // Fonction pour obtenir l'étiquette d'un geste
  const getGestureLabel = (gesture) => {
    if (!gesture) return 'Non spécifié';
    
    const labels = {
      'main_tete': 'Main sur la tête',
      'main_ventre': 'Main sur le ventre',
      'main_cou': 'Main sur le cou',
      'main_yeux': 'Main sur les yeux',
    };
    return labels[gesture] || gesture;
  };

  // Fonction pour obtenir la couleur d'un badge en fonction du geste
  const getGestureBadgeColor = (gesture) => {
    if (!gesture) return 'secondary';
    
    const colors = {
      'main_tete': 'warning',
      'main_ventre': 'info',
      'main_cou': 'primary',
      'main_yeux': 'danger',
    };
    return colors[gesture] || 'secondary';
  };

  // Fonction pour obtenir l'icône d'un geste
  const getGestureIcon = (gesture) => {
    if (!gesture) return 'fa-question-circle';
    
    const icons = {
      'main_tete': 'fa-head-side',
      'main_ventre': 'fa-stomach',
      'main_cou': 'fa-neck',
      'main_yeux': 'fa-eye',
    };
    
    // Utilisation d'icônes plus génériques car FontAwesome peut ne pas avoir toutes ces icônes spécifiques
    return icons[gesture] || 'fa-hand-paper-o';
  };

  // Préparation des données pour les graphiques
  const prepareGestureChartData = () => {
    if (!stats || !stats.gestureStats) return null;

    // Filtrer les items avec gesture null
    const filteredStats = stats.gestureStats.filter(item => item._id !== null);
    
    const chartColors = {
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(153, 102, 255, 0.6)',
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(153, 102, 255, 1)',
      ]
    };

    return {
      labels: filteredStats.map(item => getGestureLabel(item._id)),
      datasets: [
        {
          label: 'Nombre d\'occurrences',
          data: filteredStats.map(item => item.count),
          backgroundColor: chartColors.backgroundColor,
          borderColor: chartColors.borderColor,
          borderWidth: 1,
        }
      ]
    };
  };

  const prepareKeywordChartData = () => {
    if (!stats || !stats.keywordStats) return null;

    return {
      labels: stats.keywordStats.map(item => item._id || 'Inconnu'),
      datasets: [
        {
          label: 'Nombre d\'occurrences',
          data: stats.keywordStats.map(item => item.count),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        }
      ]
    };
  };
  
  const prepareSpeechChartData = () => {
    if (!stats || !stats.speechStats) return null;

    // Limiter à 5 phrases pour éviter l'encombrement
    const topPhrases = stats.speechStats.slice(0, 5);

    return {
      labels: topPhrases.map(item => item._id || 'Inconnu'),
      datasets: [
        {
          label: 'Fréquence',
          data: topPhrases.map(item => item.count),
          backgroundColor: 'rgba(255, 159, 64, 0.6)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        }
      ]
    };
  };

  const prepareDailyChartData = () => {
    if (!stats || !stats.dailyStats) return null;

    const formatDate = (dateObj) => {
      return format(new Date(dateObj._id.year, dateObj._id.month - 1, dateObj._id.day), 'dd MMM', { locale: fr });
    };

    return {
      labels: stats.dailyStats.map(formatDate),
      datasets: [
        {
          label: 'Détections par jour',
          data: stats.dailyStats.map(item => item.count),
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.4,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  };

  // Préparation des données pour l'export CSV
  const prepareCSVData = () => {
    // En-têtes des colonnes
    const headers = [
      { label: "Date", key: "date" },
      { label: "Heure", key: "time" },
      { label: "Geste", key: "gesture" },
      { label: "Discours", key: "speech" },
      { label: "Mots-clés", key: "keywords" }
    ];

    // Données formatées pour CSV
    const data = filteredData.map(item => {
      const date = parseISO(item.timestamp);
      return {
        date: format(date, 'dd/MM/yyyy'),
        time: format(date, 'HH:mm:ss'),
        gesture: item.gesture ? getGestureLabel(item.gesture) : 'Non spécifié',
        speech: item.speech_text || 'N/A',
        keywords: item.keywords ? item.keywords.join(', ') : 'Aucun'
      };
    });

    return { headers, data };
  };

  // Fonction pour exporter en PDF
  const exportToPDF = () => {
    const { data } = prepareCSVData();
    const doc = new jsPDF();
    
    // Titre du document
    doc.setFontSize(18);
    doc.text('Rapport des détections d\'émotions', 14, 22);
    
    // Sous-titre avec date et filtres
    doc.setFontSize(11);
    doc.setTextColor(100);
    const today = format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr });
    doc.text(`Généré le ${today}`, 14, 30);
    
    if (selectedGesture || selectedKeyword) {
      let filterText = 'Filtres appliqués: ';
      if (selectedGesture) filterText += `Geste: ${getGestureLabel(selectedGesture)}`;
      if (selectedKeyword) filterText += selectedGesture ? `, Mot-clé: ${selectedKeyword}` : `Mot-clé: ${selectedKeyword}`;
      doc.text(filterText, 14, 36);
    }
    
    // Statistiques générales
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Statistiques générales', 14, 46);
    
    const statsData = [
      ['Total des détections', summaryStats.total.toString()],
      ['Gestes détectés', summaryStats.gestures.toString()],
      ['Paroles détectées', summaryStats.speech.toString()],
      ['Moyenne quotidienne', summaryStats.dailyAvg.toString()]
    ];
    
    // Générer une petite table pour les statistiques
    doc.autoTable({
      startY: 50,
      head: [['Métrique', 'Valeur']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10 }
    });
    
    // Tableau principal des données
    doc.setFontSize(14);
    doc.text('Détails des détections', 14, doc.autoTable.previous.finalY + 15);
    
    // Transformer les données pour autoTable
    const tableData = data.map(item => [
      item.date,
      item.time,
      item.gesture,
      item.speech,
      item.keywords
    ]);
    
    // Générer le tableau
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Date', 'Heure', 'Geste', 'Discours', 'Mots-clés']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 60 },
        4: { cellWidth: 40 }
      }
    });
    
    // Pied de page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} sur ${pageCount} - UniMindCare Analytics`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Enregistrer le PDF
    doc.save('Rapport_Emotions_' + format(new Date(), 'yyyyMMdd_HHmmss') + '.pdf');
  };

  // Calculer des statistiques sommaires
  const summaryStats = useMemo(() => {
    if (!stats) return { total: 0, gestures: 0, speech: 0 };
    
    const totalGestures = stats.gestureStats.reduce((sum, item) => sum + item.count, 0);
    const totalSpeech = stats.speechStats.reduce((sum, item) => sum + item.count, 0);
    
    return {
      total: Math.max(totalGestures, totalSpeech), // Éviter de compter deux fois les entrées qui ont à la fois geste et parole
      gestures: totalGestures,
      speech: totalSpeech,
      // Calculer le top geste
      topGesture: stats.gestureStats.length > 0 
        ? { type: stats.gestureStats[0]._id, count: stats.gestureStats[0].count }
        : null,
      // Calculer le top mot-clé
      topKeyword: stats.keywordStats.length > 0
        ? { word: stats.keywordStats[0]._id, count: stats.keywordStats[0].count }
        : null,
      // Calculer les statistiques quotidiennes
      dailyAvg: stats.dailyStats.length > 0
        ? Math.round(stats.dailyStats.reduce((sum, item) => sum + item.count, 0) / stats.dailyStats.length)
        : 0
    };
  }, [stats]);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="position-relative" style={{ width: '80px', height: '80px' }}>
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
              <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            </div>
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
              <div className="spinner-grow spinner-grow-sm text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
          <h5 className="mt-4 text-primary fw-light">Analyse des données en cours...</h5>
          <p className="text-muted">Nous préparons vos statistiques d'émotions</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert color="danger" className="shadow-sm">
          <div className="d-flex align-items-center">
            <div className="bg-danger bg-opacity-25 rounded-circle p-3 me-3">
              <i className="fa fa-exclamation-triangle fs-3 text-danger"></i>
            </div>
            <div>
              <h4 className="alert-heading">Erreur lors du chargement des statistiques</h4>
              <p className="mb-0">{error}</p>
              <div className="mt-3">
                <Button color="outline-danger" onClick={() => window.location.reload()}>
                  <i className="fa fa-refresh me-2"></i>
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Container fluid className="mt-4 mb-5 px-4">
        <div className="mb-5">
          <motion.div variants={itemVariants} className="d-flex align-items-center justify-content-between mb-2">
            <h2 className="mb-0 display-6 fw-bold">
              <i className="fa fa-chart-line me-3 text-primary"></i>
              Tableau de bord des émotions
            </h2>
            <ButtonGroup className="shadow-sm">
              <Button 
                color={timeRange === 'today' ? 'primary' : 'light'} 
                onClick={() => setTimeRange('today')}
                className="fw-medium"
              >
                Aujourd'hui
              </Button>
              <Button 
                color={timeRange === 'week' ? 'primary' : 'light'} 
                onClick={() => setTimeRange('week')}
                className="fw-medium"
              >
                7 jours
              </Button>
              <Button 
                color={timeRange === 'month' ? 'primary' : 'light'} 
                onClick={() => setTimeRange('month')}
                className="fw-medium"
              >
                30 jours
              </Button>
              <Button 
                color={timeRange === 'all' ? 'primary' : 'light'} 
                onClick={() => setTimeRange('all')}
                className="fw-medium"
              >
                Tout
              </Button>
            </ButtonGroup>
          </motion.div>
          <motion.p variants={itemVariants} className="lead text-muted">
            Visualisez et analysez les signaux non-verbaux et verbaux détectés
          </motion.p>
        </div>

        {/* Cards de statistiques */}
        <Row className="mb-4 g-3">
          <Col md={3}>
            <motion.div variants={itemVariants}>
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="card border-0 shadow-sm h-100"
              >
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                      <i className="fa fa-signal text-primary"></i>
                    </div>
                    <h5 className="card-title mb-0">Total des détections</h5>
                  </div>
                  <h2 className="display-5 fw-bold text-primary mb-2">{summaryStats.total}</h2>
                  <p className="text-muted mb-4">Signaux détectés au total</p>
                  <div className="d-flex justify-content-between">
                    <div>
                      <span className="d-block text-muted small">Moyenne/jour</span>
                      <span className="fw-bold">{summaryStats.dailyAvg}</span>
                    </div>
                    <div>
                      <span className="d-block text-muted small">Aujourd'hui</span>
                      <span className="fw-bold">{
                        stats.dailyStats.find(day => 
                          day._id.day === new Date().getDate() && 
                          day._id.month === new Date().getMonth() + 1 && 
                          day._id.year === new Date().getFullYear()
                        )?.count || 0
                      }</span>
                    </div>
                    <div>
                      <span className="d-block text-muted small">Type de données</span>
                      <span className="fw-bold">2</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Col>
          
          <Col md={3}>
            <motion.div variants={itemVariants}>
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="card border-0 shadow-sm h-100"
              >
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                      <i className="fa fa-hand-paper-o text-warning"></i>
                    </div>
                    <h5 className="card-title mb-0">Gestes détectés</h5>
                  </div>
                  <h2 className="display-5 fw-bold text-warning mb-2">{summaryStats.gestures}</h2>
                  <p className="text-muted mb-3">Total des gestes détectés</p>
                  
                  {summaryStats.topGesture && (
                    <div className="bg-light rounded p-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-medium text-dark">Geste le plus fréquent</span>                        <Badge color="warning" pill className="px-3 py-2">
                          {summaryStats.topGesture.count}
                        </Badge>
                      </div>
                      <h6 className="mb-0 text-dark">{getGestureLabel(summaryStats.topGesture.type)}</h6>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </Col>
          
          <Col md={3}>
            <motion.div variants={itemVariants}>
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="card border-0 shadow-sm h-100"
              >
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                      <i className="fa fa-commenting-o text-info"></i>
                    </div>
                    <h5 className="card-title mb-0">Paroles détectées</h5>
                  </div>
                  <h2 className="display-5 fw-bold text-info mb-2">{summaryStats.speech}</h2>
                  <p className="text-muted mb-3">Total des paroles détectées</p>
                  
                  {summaryStats.topKeyword && (
                    <div className="bg-light rounded p-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-medium text-dark">Mot-clé le plus fréquent</span>
                        <Badge color="info" pill className="px-3 py-2">
                          {summaryStats.topKeyword.count}
                        </Badge>
                      </div>
                      <h6 className="mb-0 text-dark">{summaryStats.topKeyword.word}</h6>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </Col>
          
          <Col md={3}>
            <motion.div variants={itemVariants}>
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="card border-0 shadow-sm h-100"
              >
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                      <i className="fa fa-area-chart text-success"></i>
                    </div>
                    <h5 className="card-title mb-0">Évolution</h5>
                  </div>
                  
                  <div style={{ height: '120px' }}>
                    {stats && stats.dailyStats && stats.dailyStats.length > 0 ? (
                      <Line 
                        data={{
                          labels: stats.dailyStats.slice(-7).map(day => 
                            format(new Date(day._id.year, day._id.month - 1, day._id.day), 'dd/MM')
                          ),
                          datasets: [{
                            label: 'Détections',
                            data: stats.dailyStats.slice(-7).map(day => day.count),
                            borderColor: 'rgba(40, 167, 69, 1)',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4,
                            fill: true,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: { mode: 'index', intersect: false }
                          },
                          scales: {
                            x: { display: false },
                            y: { display: false, beginAtZero: true }
                          },
                          elements: {
                            point: { radius: 0 },
                            line: { borderWidth: 2 }
                          }
                        }}
                      />
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                        Aucune donnée disponible
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small text-muted">Tendance sur 7 jours</span>
                    </div>
                    <div>
                      {(() => {
                        if (!stats || !stats.dailyStats || stats.dailyStats.length < 2) return null;
                        
                        const last7Days = stats.dailyStats.slice(-7);
                        const prevAvg = last7Days.slice(0, 3).reduce((sum, day) => sum + day.count, 0) / 3;
                        const currAvg = last7Days.slice(-3).reduce((sum, day) => sum + day.count, 0) / 3;
                        const percentChange = Math.round((currAvg - prevAvg) / prevAvg * 100);
                        
                        return (
                          <div className="d-flex align-items-center">
                            <h5 className={`mb-0 me-2 ${percentChange >= 0 ? 'text-success' : 'text-danger'}`}>
                              {percentChange >= 0 ? '+' : ''}{percentChange}%
                            </h5>
                            <i className={`fa fa-${percentChange >= 0 ? 'arrow-up text-success' : 'arrow-down text-danger'}`}></i>
                            <span className="ms-auto text-muted small">
                              vs semaine précédente
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col lg="8">
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-0 mb-4">
                <CardHeader className="bg-white border-0 pt-4 pb-0">
                  <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <h5 className="mb-3">
                      <i className="fa fa-chart-line me-2 text-primary"></i>
                      Évolution des détections
                    </h5>
                    <div className="d-flex align-items-center mb-3">
                      <span className="me-3 text-muted">Afficher:</span>
                      <ButtonGroup size="sm">
                        <Button 
                          color={!selectedGesture && !selectedKeyword ? 'primary' : 'outline-primary'}
                          onClick={() => {
                            setSelectedGesture(null);
                            setSelectedKeyword(null);
                          }}
                        >
                          Tout
                        </Button>
                        <Button 
                          color={selectedGesture ? 'primary' : 'outline-primary'}
                          onClick={() => {
                            setSelectedGesture('main_tete');
                            setSelectedKeyword(null);
                          }}
                        >
                          Gestes
                        </Button>
                        <Button 
                          color={selectedKeyword ? 'primary' : 'outline-primary'}
                          onClick={() => {
                            setSelectedKeyword('mal');
                            setSelectedGesture(null);
                          }}
                        >
                          Mots-clés
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {stats && stats.dailyStats && stats.dailyStats.length > 0 ? (
                    <div style={{ height: '300px' }}>
                      <Line 
                        data={prepareDailyChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                title: (context) => `Détections le ${context[0].label}`,
                                label: (context) => `${context.raw} détections`
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                precision: 0
                              },
                              title: {
                                display: true,
                                text: 'Nombre de détections'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Date'
                              }
                            }
                          },
                          interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5">
                      <div className="bg-light rounded-circle p-4 mb-3">
                        <i className="fa fa-area-chart fs-2 text-muted"></i>
                      </div>
                      <p className="text-center text-muted">Aucune donnée disponible pour cette période</p>
                    </div>
                  )}
                </CardBody>
                <CardFooter className="bg-white border-0 pt-0 pb-3">
                  <div className="d-flex justify-content-between text-muted small px-2">
                    <span>Données mises à jour le {format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                    <span>
                      <i className="fa fa-info-circle me-1"></i>
                      Cliquez sur le graphique pour plus de détails
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          </Col>

          <Col lg="4">
            <Row className="g-3">
              <Col lg="12">
                <motion.div variants={itemVariants}>
                  <Card className="shadow-sm border-0 mb-4">
                    <CardHeader className="bg-white border-0 pt-4 pb-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-3">
                          <i className="fa fa-pie-chart me-2 text-success"></i>
                          Répartition des gestes
                        </h5>
                        <ButtonGroup size="sm">
                          <Button 
                            color={chartType === 'doughnut' ? 'success' : 'outline-success'} 
                            onClick={() => setChartType('doughnut')}
                            id="doughnutBtn"
                          >
                            <i className="fa fa-circle-o"></i>
                          </Button>
                          <Button 
                            color={chartType === 'pie' ? 'success' : 'outline-success'} 
                            onClick={() => setChartType('pie')}
                            id="pieBtn"
                          >
                            <i className="fa fa-pie-chart"></i>
                          </Button>
                          <Button 
                            color={chartType === 'bar' ? 'success' : 'outline-success'} 
                            onClick={() => setChartType('bar')}
                            id="barBtn"
                          >
                            <i className="fa fa-bar-chart"></i>
                          </Button>
                        </ButtonGroup>
                        <UncontrolledTooltip placement="top" target="doughnutBtn">
                          Graphique en anneau
                        </UncontrolledTooltip>
                        <UncontrolledTooltip placement="top" target="pieBtn">
                          Graphique en camembert
                        </UncontrolledTooltip>
                        <UncontrolledTooltip placement="top" target="barBtn">
                          Graphique en barres
                        </UncontrolledTooltip>
                      </div>
                    </CardHeader>
                    <CardBody>
                      {stats && stats.gestureStats && stats.gestureStats.filter(item => item._id !== null).length > 0 ? (
                        <div style={{ height: '300px' }}>
                          {chartType === 'doughnut' && (
                            <Doughnut 
                              data={prepareGestureChartData()}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'right',
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => `${context.label}: ${context.raw} (${Math.round(context.raw / summaryStats.gestures * 100)}%)`
                                    }
                                  }
                                },
                                cutout: '60%'
                              }}
                            />
                          )}
                          {chartType === 'pie' && (
                            <Pie 
                              data={prepareGestureChartData()}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'right',
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => `${context.label}: ${context.raw} (${Math.round(context.raw / summaryStats.gestures * 100)}%)`
                                    }
                                  }
                                }
                              }}
                            />
                          )}
                          {chartType === 'bar' && (
                            <Bar 
                              data={prepareGestureChartData()}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: 'y',
                                plugins: {
                                  legend: {
                                    display: false,
                                  }
                                },
                                scales: {
                                  y: {
                                    ticks: {
                                      autoSkip: false
                                    }
                                  },
                                  x: {
                                    beginAtZero: true,
                                    ticks: {
                                      precision: 0
                                    }
                                  }
                                }
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                          <div className="bg-light rounded-circle p-4 mb-3">
                            <i className="fa fa-hand-paper-o fs-2 text-muted"></i>
                          </div>
                          <p className="text-center text-muted">Aucun geste détecté pour cette période</p>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col lg="6">
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-0">
                <CardHeader className="bg-white border-0 pt-4 pb-0">
                  <h5 className="mb-3">
                    <i className="fa fa-bar-chart me-2 text-info"></i>
                    Mots-clés les plus fréquents
                  </h5>
                </CardHeader>
                <CardBody>
                  {stats && stats.keywordStats && stats.keywordStats.length > 0 ? (
                    <div style={{ height: '300px' }}>
                      <Bar 
                        data={prepareKeywordChartData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => `${context.raw} occurrences`
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                precision: 0
                              },
                              title: {
                                display: true,
                                text: 'Nombre d\'occurrences'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Mots-clés'
                              }
                            }
                          },
                          onClick: (e, elements) => {
                            if (elements.length > 0) {
                              const index = elements[0].index;
                              const keyword = stats.keywordStats[index]._id;
                              setSelectedKeyword(keyword === selectedKeyword ? null : keyword);
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5">
                      <div className="bg-light rounded-circle p-4 mb-3">
                        <i className="fa fa-tags fs-2 text-muted"></i>
                      </div>
                      <p className="text-center text-muted">Aucun mot-clé disponible pour cette période</p>
                    </div>
                  )}
                </CardBody>
                {stats && stats.keywordStats && stats.keywordStats.length > 0 && (
                  <div className="p-3">
                    <div className="d-flex flex-wrap">
                      {stats.keywordStats.map((keyword, index) => (
                        <Badge 
                          key={index} 
                          color={selectedKeyword === keyword._id ? "info" : "light"} 
                          className={`me-2 mb-2 px-3 py-2 ${selectedKeyword !== keyword._id && "text-dark"}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedKeyword(selectedKeyword === keyword._id ? null : keyword._id)}
                        >
                          {keyword._id}
                          <span className="ms-2 fw-bold">{keyword.count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </Col>

          <Col lg="6">
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-0">
                <CardHeader className="bg-white border-0 pt-4 pb-0">
                  <h5 className="mb-3">
                    <i className="fa fa-comment me-2 text-warning"></i>
                    Phrases détectées les plus fréquentes
                  </h5>
                </CardHeader>
                <CardBody>
                  {stats && stats.speechStats && stats.speechStats.length > 0 ? (
                    <div style={{ height: '300px' }}>
                      <Bar 
                        data={prepareSpeechChartData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          indexAxis: 'y',
                          plugins: {
                            legend: {
                              display: false,
                            }
                          },
                          scales: {
                            y: {
                              ticks: {
                                autoSkip: false
                              }
                            },
                            x: {
                              beginAtZero: true,
                              ticks: {
                                precision: 0
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5">
                      <div className="bg-light rounded-circle p-4 mb-3">
                        <i className="fa fa-comment-o fs-2 text-muted"></i>
                      </div>
                      <p className="text-center text-muted">Aucune phrase détectée disponible</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          </Col>
        </Row>

        <Row>
          <Col>
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-0 mb-5">
                <CardHeader className="bg-white border-0 pt-4 pb-0">
                  <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <h5 className="mb-3">
                      <i className="fa fa-table me-2 text-dark"></i>
                      Données détaillées
                      {(selectedGesture || selectedKeyword) && (
                        <Badge color="primary" pill className="ms-2 px-3 py-2">
                          {filteredData.length} résultats filtrés
                        </Badge>
                      )}
                    </h5>
                    <div className="mb-3">
                      {(selectedGesture || selectedKeyword) && (
                        <Button 
                          color="outline-secondary" 
                          size="sm" 
                          className="me-2"
                          onClick={() => {
                            setSelectedGesture(null);
                            setSelectedKeyword(null);
                          }}
                        >
                          <i className="fa fa-times me-1"></i> Réinitialiser les filtres
                        </Button>
                      )}
                      <Dropdown isOpen={headerDropdownOpen} toggle={toggleHeaderDropdown} direction="down">
                        <DropdownToggle color="primary" size="sm" caret>
                          <i className="fa fa-download me-1"></i> Exporter
                        </DropdownToggle>
                        <DropdownMenu end className="shadow-sm">
                          <DropdownItem header>Choisir le format</DropdownItem>
                          <CSVLink 
                            data={prepareCSVData().data} 
                            headers={prepareCSVData().headers}
                            filename={`EmotionsData_${format(new Date(), 'yyyyMMdd')}.csv`}
                            className="dropdown-item"
                            target="_blank"
                          >
                            <i className="fa fa-table me-2 text-success"></i>
                            Exporter en CSV
                          </CSVLink>
                         
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                  {(selectedGesture || selectedKeyword) && (
                    <div className="mb-3 bg-light p-3 rounded">
                      <div className="d-flex align-items-center">
                        <span className="me-2 text-muted">Filtres actifs:</span>
                        {selectedGesture && (
                          <Badge color={getGestureBadgeColor(selectedGesture)} className="me-2 px-3 py-2">
                            <i className="fa fa-hand-paper-o me-1"></i>
                            {getGestureLabel(selectedGesture)}
                            <span 
                              className="ms-2 cursor-pointer" 
                              onClick={() => setSelectedGesture(null)}
                              style={{ cursor: 'pointer' }}
                            >×</span>
                          </Badge>
                        )}
                        {selectedKeyword && (
                          <Badge color="info" className="me-2 px-3 py-2">
                            <i className="fa fa-tag me-1"></i>
                            {selectedKeyword}
                            <span 
                              className="ms-2 cursor-pointer" 
                              onClick={() => setSelectedKeyword(null)}
                              style={{ cursor: 'pointer' }}
                            >×</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardBody>
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <Table hover responsive size="sm" className="align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th className="ps-3" style={{ width: '170px' }}>Date et heure</th>
                          <th style={{ width: '150px' }}>Geste</th>
                          <th>Discours</th>
                          <th>Mots-clés</th>
                          <th className="text-end pe-3" style={{ width: '100px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData && filteredData.length > 0 ? (
                          filteredData.map((item) => (
                            <tr key={item._id} className="border-0">
                              <td className="ps-3">
                                <div className="d-flex flex-column">
                                  <span className="fw-semibold">{format(parseISO(item.timestamp), 'dd/MM/yyyy')}</span>
                                  <small className="text-muted">{format(parseISO(item.timestamp), 'HH:mm:ss')}</small>
                                </div>
                              </td>
                              <td>
                                {item.gesture ? (
                                  <Badge 
                                    color={getGestureBadgeColor(item.gesture)} 
                                    pill
                                    className="px-3 py-2"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedGesture(selectedGesture === item.gesture ? null : item.gesture)}
                                  >
                                    {getGestureLabel(item.gesture)}
                                  </Badge>
                                ) : (
                                  <Badge color="secondary" pill className="px-3 py-2">
                                    Non spécifié
                                  </Badge>
                                )}
                              </td>
                              <td>
                                {item.speech_text ? (
                                  <div className="bg-light p-2 rounded">
                                    <i className="fa fa-quote-left text-muted me-1 small"></i>
                                    {item.speech_text}
                                    <i className="fa fa-quote-right text-muted ms-1 small"></i>
                                  </div>
                                ) : (
                                  <span className="text-muted">N/A</span>
                                )}
                              </td>
                              <td>
                                {item.keywords && item.keywords.length > 0 ? (
                                  <div>
                                    {item.keywords.map((keyword, idx) => (
                                      <Badge 
                                        key={idx} 
                                        color={selectedKeyword === keyword ? "info" : "light"} 
                                        className={`text-${selectedKeyword === keyword ? "white" : "dark"} me-1 mb-1`}
                                        pill
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedKeyword(selectedKeyword === keyword ? null : keyword)}
                                      >
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted">Aucun mot-clé</span>
                                )}
                              </td>
                              <td className="text-end pe-3">
                                <Button color="light" size="sm" className="btn-icon">
                                  <i className="fa fa-ellipsis-v"></i>
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center py-5">
                              <div className="bg-light d-inline-block rounded-circle p-4 mb-3">
                                <i className="fa fa-search fs-2 text-muted"></i>
                              </div>
                              <p className="text-muted d-block">Aucune donnée ne correspond aux critères de recherche</p>
                              {(selectedGesture || selectedKeyword) && (
                                <Button 
                                  color="outline-primary" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGesture(null);
                                    setSelectedKeyword(null);
                                  }}
                                >
                                  <i className="fa fa-filter me-2"></i>
                                  Réinitialiser les filtres
                                </Button>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </CardBody>
                <CardFooter className="bg-white d-flex justify-content-between align-items-center">
                  <div className="small text-muted">
                    Affichage de {filteredData.length} enregistrements sur {recentData.length} au total
                  </div>
                  <div>
                    <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown} direction="up">
                      <DropdownToggle color="primary" size="sm" caret disabled={filteredData.length === 0}>
                        <i className="fa fa-download me-1"></i> Exporter
                      </DropdownToggle>
                      <DropdownMenu end className="shadow-sm">
                        <DropdownItem header>Choisir le format</DropdownItem>
                        <CSVLink 
                          data={prepareCSVData().data} 
                          headers={prepareCSVData().headers}
                          filename={`EmotionsData_${format(new Date(), 'yyyyMMdd')}.csv`}
                          className="dropdown-item"
                          target="_blank"
                        >
                          <i className="fa fa-table me-2 text-success"></i>
                          Exporter en CSV
                        </CSVLink>
                       
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </motion.div>
  );
};

export default EmotionStatsPage;