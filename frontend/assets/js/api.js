// Centralized API configuration and service helper for Student Management System
// - When served BY the Flask backend itself (port 5000) use the same origin.
// - When opened via Live Server / file:// target the Flask API on port 5000,
//   using the SAME hostname as the current page (e.g. 127.0.0.1) so the
//   session cookie stays same-site and is sent with every request.
const API_BASE_URL = location.port === '5000'
  ? `${location.origin}/api`
  : `http://${location.hostname || 'localhost'}:5000/api`;

const api = {
  // Auth
  login: async (role, username, password) => {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role, username, password })
    });
    return res.json();
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE_URL}/current-user`, {
      credentials: 'include'
    });
    return res.json();
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Backend logout call failed', e);
    }
  },

  // Dashboard Stats
  getStats: async () => {
    const res = await fetch(`${API_BASE_URL}/stats`, {
      credentials: 'include'
    });
    return res.json();
  },

  // Students CRUD
  getStudents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/students?${query}`, {
      credentials: 'include'
    });
    return res.json();
  },

  getStudent: async (studentId) => {
    const res = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}`, {
      credentials: 'include'
    });
    return res.json();
  },

  addStudent: async (studentData) => {
    const res = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(studentData)
    });
    return res.json();
  },

  updateStudent: async (studentId, studentData) => {
    const res = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(studentData)
    });
    return res.json();
  },

  deleteStudent: async (studentId) => {
    const res = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return res.json();
  },

  changeStudentStatus: async (studentId, status) => {
    const res = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  resetStudentPassword: async (studentId, password) => {
    const res = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password })
    });
    return res.json();
  },

  getStudentProfile: async (studentId) => {
    const res = await fetch(`${API_BASE_URL}/student/profile?student_id=${encodeURIComponent(studentId || '')}`, {
      credentials: 'include'
    });
    return res.json();
  },

  // Courses
  getCourses: async () => {
    const res = await fetch(`${API_BASE_URL}/courses`, {
      credentials: 'include'
    });
    return res.json();
  },

  addCourse: async (courseData) => {
    const res = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(courseData)
    });
    return res.json();
  },

  deleteCourse: async (courseId) => {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return res.json();
  },

  // Users Management
  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/users?${query}`, {
      credentials: 'include'
    });
    return res.json();
  },

  getUser: async (userId) => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      credentials: 'include'
    });
    return res.json();
  },

  createUser: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  updateUser: async (userId, userData) => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  deleteUser: async (userId) => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return res.json();
  },

  // Profile
  getProfile: async () => {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      credentials: 'include'
    });
    return res.json();
  },

  updateProfilePassword: async (oldPassword, newPassword) => {
    const res = await fetch(`${API_BASE_URL}/profile/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ oldPassword, newPassword })
    });
    return res.json();
  },

  // Attendance
  getMyAttendance: async () => {
    const res = await fetch(`${API_BASE_URL}/student/attendance`, {
      credentials: 'include'
    });
    return res.json();
  },

  getAttendanceCourses: async () => {
    const res = await fetch(`${API_BASE_URL}/attendance/courses`, {
      credentials: 'include'
    });
    return res.json();
  },

  getCourseStudents: async (courseId, date) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    const res = await fetch(`${API_BASE_URL}/attendance/courses/${courseId}/students?${params.toString()}`, {
      credentials: 'include'
    });
    return res.json();
  },

  markAttendance: async (courseId, records, date) => {
    const res = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ courseId, date, records })
    });
    return res.json();
  }
};
