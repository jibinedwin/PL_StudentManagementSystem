// ==========================================================================
// JS/AUTH.JS - Client-side authentication helpers, role verification, session
// ==========================================================================

const Auth = {
  getCurrentUser() {
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Failed to parse current user session:', e);
      return null;
    }
  },

  setCurrentUser(userData) {
    sessionStorage.setItem('currentUser', JSON.stringify(userData));
  },

  clearSession() {
    sessionStorage.removeItem('currentUser');
  },

  // Enforces that user is logged in and has appropriate role
  requireRole(requiredRole) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = this.getBasePath() + 'index.html';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      if (user.role === 'admin') {
        window.location.href = this.getBasePath() + 'admin-dashboard.html';
      } else {
        window.location.href = this.getBasePath() + 'student-dashboard.html';
      }
      return null;
    }

    return user;
  },

  // Calculate relative root path back to /frontend/
  getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/dashboard/') ||
        path.includes('/students/') ||
        path.includes('/users/') ||
        path.includes('/profile/')) {
      return '../';
    }
    return './';
  },

  async logout() {
    try {
      await api.logout();
    } catch (e) {
      console.warn('API logout failed, continuing with local cleanup:', e);
    }
    this.clearSession();
    window.location.href = this.getBasePath() + 'index.html';
  }
};
