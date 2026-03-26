const envApiBase = typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE_URL : '';

// In production (served by backend), use same-origin API routes.
// export const API_BASE_URL ='http://localhost:5656';
export const API_BASE_URL ='https://lead-automation.nexgenai.asia';
// export const API_BASE_URL ='http://93.127.129.102:5656';

