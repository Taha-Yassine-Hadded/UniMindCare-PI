export const processUserData = (users) => {
  const userCountByDate = {};

  // If no users, return empty array
  if (!users || users.length === 0) return [];

  // Find the min and max dates from the users' createdAt
  const dates = users.map(user => new Date(user.createdAt));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Initialize all days with 0 users
  let currentDate = new Date(minDate);
  currentDate.setDate(currentDate.getDate()); // Start from the earliest date
  while (currentDate <= maxDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    userCountByDate[dateStr] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Count users per date
  users.forEach((user) => {
    const date = new Date(user.createdAt).toISOString().split('T')[0];
    if (userCountByDate[date] !== undefined) {
      userCountByDate[date]++;
    } else {
      userCountByDate[date] = 1; // Handle dates outside the initial range
    }
  });

  // Convert to an array of { x: date, y: count } for ApexCharts
  const data = Object.keys(userCountByDate).map((date) => ({
    x: date,
    y: userCountByDate[date],
  }));

  // Sort by date
  data.sort((a, b) => new Date(a.x) - new Date(b.x));

  return data;
};