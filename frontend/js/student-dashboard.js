const STUDENTS_KEY = 'sms_students_data';

function getStoredStudents() {
  const data = localStorage.getItem(STUDENTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

function getCurrentUser() {
  const user = sessionStorage.getItem('currentUser');
  if (!user) return null;
  return JSON.parse(user);
}

async function loadStudentDashboard() {
  const currentUser = getCurrentUser();

  // If not logged in, or logged in as admin, redirect to appropriate location
  if (!currentUser || currentUser.role !== 'student') {
    if (currentUser && currentUser.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
    return;
  }

  let student = currentUser.data || null;

  // Attempt to fetch fresh student data from backend API
  try {
    if (currentUser.username) {
      const res = await api.getStudentProfile(student ? student.studentId : currentUser.username);
      if (res && res.status === 'success' && res.student) {
        student = res.student;
      }
    }
  } catch (err) {
    console.warn('Could not fetch from backend, using session cache:', err);
  }

  // Fallback to localStorage if API unavailable
  if (!student) {
    const students = getStoredStudents();
    const query = currentUser.username.trim().toLowerCase();
    student = students.find(s => 
      s.studentId.toLowerCase() === query ||
      `${s.firstName} ${s.lastName}`.toLowerCase() === query ||
      s.firstName.toLowerCase() === query
    );
  }

  // Default fallback if still not found
  if (!student) {
    student = {
      studentId: currentUser.username || 'STD-1001',
      firstName: currentUser.username || 'Alex',
      lastName: 'Johnson',
      dob: '2002-05-14',
      gender: 'Male',
      course: 'Computer Science',
      status: 'Active',
      address: '123 University Ave, Cityville',
      admissionDate: '2023-08-15'
    };
  }

  const fullName = `${student.firstName} ${student.lastName}`;
  const status = student.status || 'Active';
  const initials = `${(student.firstName || 'S').charAt(0)}${(student.lastName || '').charAt(0)}`.toUpperCase();

  // Profile photo (fallback: initials avatar)
  const avatar = document.getElementById('avatarInitials');
  if (avatar) {
    if (student.photo) {
      avatar.style.backgroundImage = `url("${student.photo}")`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = '';
    } else {
      avatar.style.backgroundImage = 'none';
      avatar.textContent = initials;
    }
  }

  // Populate Header & Welcome Banner
  const sidebarName = document.getElementById('sidebarStudentName');
  if (sidebarName) sidebarName.textContent = fullName;
  
  const welcomeTitle = document.getElementById('welcomeTitle');
  if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${student.firstName} ${student.lastName}!`;
  document.getElementById('cardFullName').textContent = fullName;
  document.getElementById('cardStudentId').textContent = student.studentId;

  // Status badge (Academics section)
  const badgeStatus = document.getElementById('badgeStatus');
  if (badgeStatus) {
    badgeStatus.textContent = status;
    badgeStatus.className = `status-pill ${status === 'Active' ? 'status-active' : 'status-inactive'}`;
  }

  // Academic Details
  document.getElementById('detailCourse').textContent = student.course || 'Not Assigned';
  document.getElementById('detailStudentId').textContent = student.studentId;
  document.getElementById('detailAdmission').textContent = student.admissionDate || 'N/A';

  // Personal Details
  document.getElementById('detailFullName').textContent = fullName;
  document.getElementById('detailGender').textContent = student.gender || 'N/A';
  if (document.getElementById('detailEmail')) {
    document.getElementById('detailEmail').textContent = student.email || 'N/A';
  }
  if (document.getElementById('detailPhone')) {
    document.getElementById('detailPhone').textContent = student.phone || 'N/A';
  }
  document.getElementById('detailDob').textContent = student.dob || 'N/A';
  document.getElementById('detailAddress').textContent = student.address || 'N/A';

  // Overview Quick Cards
  const quickCourse = document.getElementById('dashQuickCourse');
  if (quickCourse) quickCourse.textContent = student.course || 'Not Assigned';
  const quickStatus = document.getElementById('dashQuickStatus');
  if (quickStatus) quickStatus.textContent = `${status} Student`;
  const quickId = document.getElementById('dashQuickId');
  if (quickId) quickId.textContent = student.studentId;
  const quickAdm = document.getElementById('dashQuickAdmission');
  if (quickAdm) quickAdm.textContent = student.admissionDate || 'N/A';
}

/* Section Switching (Dashboard vs Academics vs Personal Info vs Security) */
function switchStudentSection(section) {
  const dashSec = document.getElementById('studentDashboardSection');
  const acadSec = document.getElementById('studentAcademicsSection');
  const persSec = document.getElementById('studentPersonalSection');
  const secSec = document.getElementById('studentSecuritySection');

  const navDash = document.getElementById('studentNavDashboard');
  const navAcad = document.getElementById('studentNavAcademics');
  const navPers = document.getElementById('studentNavPersonal');
  const navSec = document.getElementById('studentNavSecurity');

  // Hide all sections
  if (dashSec) dashSec.style.display = 'none';
  if (acadSec) acadSec.style.display = 'none';
  if (persSec) persSec.style.display = 'none';
  if (secSec) secSec.style.display = 'none';

  // Deactivate navigation active classes
  if (navDash) navDash.classList.remove('active');
  if (navAcad) navAcad.classList.remove('active');
  if (navPers) navPers.classList.remove('active');
  if (navSec) navSec.classList.remove('active');

  if (section === 'dashboard') {
    if (dashSec) dashSec.style.display = 'block';
    if (navDash) navDash.classList.add('active');
  } else if (section === 'academics') {
    if (acadSec) acadSec.style.display = 'block';
    if (navAcad) navAcad.classList.add('active');
  } else if (section === 'personal') {
    if (persSec) persSec.style.display = 'block';
    if (navPers) navPers.classList.add('active');
  } else if (section === 'security') {
    if (secSec) secSec.style.display = 'block';
    if (navSec) navSec.classList.add('active');
  }

  // Close sidebar on mobile after clicking
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 1150) {
    sidebar.classList.remove('show-sidebar');
  }
}

/*=============== SHOW SIDEBAR (FROM SIDEBAR MODEL) ===============*/
function initSidebar() {
  const toggle = document.getElementById('header-toggle');
  const sidebar = document.getElementById('sidebar');

  if (toggle && sidebar) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('show-sidebar');
    });

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth < 1150 && sidebar.classList.contains('show-sidebar')) {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
          sidebar.classList.remove('show-sidebar');
        }
      }
    });
  }

  /*=============== SHOW SIDEBAR LIST / DROPDOWNS ===============*/
  const drops = document.querySelectorAll('.drop');
  drops.forEach(item => {
    const dropBtn = item.querySelector('.drop__button');
    const dropList = item.querySelector('.drop__list');

    if (dropBtn && dropList) {
      dropBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Close any other open drop
        const openItem = document.querySelector('.show-drop');
        if (openItem && openItem !== item) {
          const openList = openItem.querySelector('.drop__list');
          if (openList) openList.removeAttribute('style');
          openItem.classList.remove('show-drop');
        }

        // Show drop list
        if (item.classList.contains('show-drop')) {
          dropList.removeAttribute('style');
          item.classList.remove('show-drop');
        } else {
          dropList.style.height = dropList.scrollHeight + 'px';
          item.classList.add('show-drop');
        }
      });
    }
  });
}

async function logout() {
  await api.logout();
  sessionStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

/* =============== SECURITY SECTION: CHANGE ACCOUNT PASSWORD =============== */
function resetSecurityForm() {
  const form = document.getElementById('securityPasswordForm');
  if (form) form.reset();
}

async function handleStudentPasswordSubmit(event) {
  event.preventDefault();

  const currentPass = document.getElementById('secCurrentPassword').value;
  const newPass = document.getElementById('secNewPassword').value;
  const confirmPass = document.getElementById('secConfirmPassword').value;
  const saveBtn = document.getElementById('secSaveBtn');

  if (newPass.length < 6) {
    showToast('New password must be at least 6 characters long.', 'error');
    return;
  }
  if (newPass === currentPass) {
    showToast('New password must be different from the current password.', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    showToast('New password and confirm password do not match.', 'error');
    return;
  }

  saveBtn.disabled = true;
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Updating...';

  try {
    const res = await api.updateProfilePassword(currentPass, newPass);
    if (res && res.status === 'success') {
      showToast('Password updated successfully!', 'success');
      resetSecurityForm();
    } else {
      showToast(res.message || 'Failed to update password.', 'error');
    }
  } catch (err) {
    console.error('Change password error:', err);
    showToast('Could not update the password. Please try again.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

/* Lightweight alert for the student portal (normal browser alert style) */
function showToast(message, type = 'info') {
  alert(message);
}

window.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  loadStudentDashboard();
});

