import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const QuizPerformanceChart = ({ programs }) => {
  // Aggregate quiz data across all programs
  const quizzes = [];
  programs.forEach(program => {
    if (program.contents && Array.isArray(program.contents)) {
      const programQuizzes = program.contents.filter(content => content.type === 'quiz');
      programQuizzes.forEach(quiz => {
        quizzes.push({
          ...quiz,
          programTitle: program.title, // Add program title for labeling
        });
      });
    }
  });

  // 1. Average Quiz Scores
  const quizLabels = quizzes.map(quiz => `${quiz.programTitle}: ${quiz.title || 'Untitled Quiz'}`);
  const quizAverages = quizzes.map(quiz => {
    if (quiz.results && Array.isArray(quiz.results) && quiz.results.length > 0) {
      const totalScore = quiz.results.reduce((sum, result) => sum + result.result, 0);
      return (totalScore / quiz.results.length).toFixed(2);
    }
    return 0;
  });

  const averageQuizData = {
    labels: quizLabels,
    datasets: [
      {
        label: 'Average Score (%)',
        data: quizAverages,
        backgroundColor: '#36A2EB',
        borderColor: '#36A2EB',
        borderWidth: 1,
      },
    ],
  };

  const averageQuizOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Average Score (%)' },
      },
      x: {
        title: { display: true, text: 'Quizzes' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  // 2. Score Distribution Across All Quizzes
  const scoreRanges = { '0-50': 0, '51-70': 0, '71-100': 0 };
  quizzes.forEach(quiz => {
    if (quiz.results && Array.isArray(quiz.results)) {
      quiz.results.forEach(result => {
        if (result.result <= 50) scoreRanges['0-50']++;
        else if (result.result <= 70) scoreRanges['51-70']++;
        else scoreRanges['71-100']++;
      });
    }
  });

  const scoreDistributionData = {
    labels: Object.keys(scoreRanges),
    datasets: [
      {
        label: 'Number of Users',
        data: Object.values(scoreRanges),
        backgroundColor: '#4BC0C0',
        borderColor: '#4BC0C0',
        borderWidth: 1,
      },
    ],
  };

  const scoreDistributionOptions = {
    responsive: true,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Number of Users' } },
      x: { title: { display: true, text: 'Score Range (%)' } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  return (
    <div>
      <h6>Average Quiz Performance Across All Programs</h6>
      {quizzes.length > 0 ? (
        <Bar data={averageQuizData} options={averageQuizOptions} height={200} />
      ) : (
        <p>No quiz data available to display.</p>
      )}

      <h6 className="mt-4">Quiz Score Distribution Across All Programs</h6>
      {Object.values(scoreRanges).some(count => count > 0) ? (
        <Bar data={scoreDistributionData} options={scoreDistributionOptions} height={200} />
      ) : (
        <p>No quiz results available to display.</p>
      )}
    </div>
  );
};

export default QuizPerformanceChart;