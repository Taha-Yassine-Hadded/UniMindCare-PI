import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const ContentDistributionChart = ({ programs }) => {
  // Aggregate content types across all programs
  const contentTypes = { pdf: 0, video: 0, meet: 0, quiz: 0 };

  programs.forEach(program => {
    if (program.contents && Array.isArray(program.contents)) {
      program.contents.forEach(content => {
        if (content.type in contentTypes) {
          contentTypes[content.type]++;
        }
      });
    }
  });

  const data = {
    labels: ['PDFs', 'Videos', 'Meetings', 'Quizzes'],
    datasets: [
      {
        label: 'Content Distribution',
        data: [contentTypes.pdf, contentTypes.video, contentTypes.meet, contentTypes.quiz],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { enabled: true },
    },
  };

  return (
    <div>
      <h6>Content Distribution Across All Programs</h6>
      {Object.values(contentTypes).some(count => count > 0) ? (
        <Pie data={data} options={options} height={200} />
      ) : (
        <p>No content available to display.</p>
      )}
    </div>
  );
};

export default ContentDistributionChart;