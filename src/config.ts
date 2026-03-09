// API Configuration
// Để sử dụng backend local: http://localhost:3000
// Để sử dụng backend trên Railway: https://your-railway-app.up.railway.app

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://fundflow-production-xxxx.up.railway.app'); // Thay xxxx bằng ID thực tế từ Railway

export { API_BASE_URL };
