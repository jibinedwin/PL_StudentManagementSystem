// ==========================================================================
// JS/DASHBOARD.JS - Admin Dashboard Comprehensive Controller
// Connects Overview, Students, Courses, and Users SPA Sections
// ==========================================================================

let allStudents = [];
let allCourses = [];
let allUsers = [];
let selectedStudentPhoto = null; // Base64 data URL of the chosen profile photo
let currentAttendanceCourse = null; // Course selected in the Attendance section

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireRole('admin');
  if (!user) return;

  // Initialize sidebar toggles and user profile info
  Common.initSidebar();

  const greetingElem = document.getElementById('adminGreeting');
  if (greetingElem && user.username) {
    greetingElem.textContent = user.username;
  }

  // Load initial statistics and overview data
  await loadDashboardStats();
  await loadRecentAdmissions();

  // Pre-load dropdown data
  await loadCoursesForFiltersAndForms();
});

// ==========================================================================
// 1. SECTION SWITCHING & NAVIGATION
// ==========================================================================
function switchSection(sectionName) {
  const sections = {
    dashboard: document.getElementById('dashboardSection'),
    students: document.getElementById('studentsSection'),
    courses: document.getElementById('coursesSection'),
    attendance: document.getElementById('attendanceSection'),
    users: document.getElementById('usersSection')
  };

  // Hide all sections
  Object.values(sections).forEach(sec => {
    if (sec) sec.style.display = 'none';
  });

  // Remove active highlight from sidebar items
  document.querySelectorAll('.sidebar__link').forEach(link => link.classList.remove('active'));

  // Show target section & load section-specific data
  if (sections[sectionName]) {
    sections[sectionName].style.display = 'block';
  }

  if (sectionName === 'dashboard') {
    loadDashboardStats();
    loadRecentAdmissions();
  } else if (sectionName === 'students') {
    loadStudents();
  } else if (sectionName === 'courses') {
    loadCourses();
  } else if (sectionName === 'attendance') {
    showAttendanceCourses();
  } else if (sectionName === 'users') {
    renderUsersTable();
  }

  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 1150) {
    sidebar.classList.remove('show-sidebar');
  }
}

// Global top-bar search that routes to student records
function handleGlobalSearch(query) {
  const val = (query || '').trim();
  if (!val) return;
  switchSection('students');
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = val;
    applyFilterAndSearch();
  }
}

// ==========================================================================
// 2. DASHBOARD OVERVIEW & RECENT METRICS
// ==========================================================================
async function loadDashboardStats() {
  try {
    const res = await api.getStats();
    if (res && res.status === 'success' && res.stats) {
      const s = res.stats;
      const elTotal = document.getElementById('statTotalStudents');
      const elActive = document.getElementById('statActiveStudents');
      const elInactive = document.getElementById('statInactiveStudents');
      const elCourses = document.getElementById('statTotalCourses');

      if (elTotal) elTotal.textContent = s.totalStudents || 0;
      if (elActive) elActive.textContent = s.activeStudents || 0;
      if (elInactive) elInactive.textContent = s.inactiveStudents || 0;
      if (elCourses) elCourses.textContent = s.totalCourses || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
    Common.showToast('Could not load dynamic dashboard statistics.', 'error');
  }
}

async function loadRecentAdmissions() {
  const list = document.getElementById('recentStudentsList');
  if (!list) return;

  try {
    const res = await api.getStudents();
    if (res && res.status === 'success' && res.students) {
      allStudents = res.students;
      const recent = res.students.slice(0, 3);

      if (recent.length === 0) {
        list.innerHTML = `<li style="text-align:center; padding: 20px; color:hsla(0,0%,100%,0.6);">No students enrolled yet.</li>`;
        return;
      }

      list.innerHTML = recent.map(s => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div>
            <div style="font-weight: 600; color: #fff;">${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)} <span style="font-size: 12px; color: #fff; margin-left: 6px;">${escapeHtml(s.studentId)}</span></div>
            <div style="font-size: 12px; color: hsla(0,0%,100%,0.6); margin-top: 2px;">${escapeHtml(s.course || 'No course assigned')} • Admitted: ${escapeHtml(s.admissionDate || 'N/A')}</div>
          </div>
          <div style="display: flex; align-items: center;">
            <button class="btn btn-action btn-view" title="View Student" onclick="openViewModal('${escapeHtml(s.studentId)}')">View</button>
          </div>
        </li>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load recent students:', err);
    list.innerHTML = `<li style="text-align:center; padding: 20px; color: #ef5350;">Failed to load admissions.</li>`;
  }
}

async function loadCourseSummary() {
  const list = document.getElementById('courseSummaryList');
  if (!list) return;

  try {
    const [coursesRes, studentsRes] = await Promise.all([
      api.getCourses(),
      api.getStudents()
    ]);

    const courses = (coursesRes && coursesRes.courses) ? coursesRes.courses : [];
    const students = (studentsRes && studentsRes.students) ? studentsRes.students : [];

    if (courses.length === 0) {
      list.innerHTML = `<li style="text-align:center; padding: 20px; color:hsla(0,0%,100%,0.6);">No courses defined.</li>`;
      return;
    }

    // Count students per course
    const countMap = {};
    students.forEach(s => {
      if (s.course) {
        countMap[s.course] = (countMap[s.course] || 0) + 1;
      }
    });

    list.innerHTML = courses.map(c => {
      const studentCount = countMap[c.name] || 0;
      return `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div>
            <div style="font-weight: 600; color: #fff;">${escapeHtml(c.name)}</div>
            <div style="font-size: 12px; color: hsla(0,0%,100%,0.6); margin-top: 2px;">Duration: ${escapeHtml(c.duration || '4 Years')}</div>
          </div>
          <div>
            <span class="badge" style="background: rgba(100, 181, 246, 0.2); color: #90caf9; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${studentCount} Students
            </span>
          </div>
        </li>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load course distribution summary:', err);
    list.innerHTML = `<li style="text-align:center; padding: 20px; color: #ef5350;">Failed to load course summary.</li>`;
  }
}

// ==========================================================================
// 3. STUDENTS SECTION (CRUD, FILTERING, MODALS)
// ==========================================================================
async function loadCoursesForFiltersAndForms() {
  try {
    const res = await api.getCourses();
    if (res && res.status === 'success' && res.courses) {
      allCourses = res.courses;

      // Populate filter dropdown
      const filterSelect = document.getElementById('courseFilter');
      if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">All Courses</option>' +
          allCourses.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
        filterSelect.value = currentVal;
      }

      // Populate student modal course dropdown
      const modalCourseSelect = document.getElementById('course');
      if (modalCourseSelect) {
        modalCourseSelect.innerHTML = '<option value="">Select Course</option>' +
          allCourses.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load courses dropdown options:', err);
  }
}

async function loadStudents() {
  const tbody = document.getElementById('studentTableBody');
  const noData = document.getElementById('noDataMessage');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="loading-state" style="text-align:center; padding: 20px;"><i class="ri-loader-4-line"></i> Loading student records...</td></tr>`;

  try {
    const res = await api.getStudents();
    if (res && res.status === 'success') {
      allStudents = res.students || [];
      applyFilterAndSearch();
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef5350; padding: 20px;">Failed to retrieve records.</td></tr>`;
    }
  } catch (err) {
    console.error('Failed to load students:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef5350; padding: 20px;">Error loading students.</td></tr>`;
  }
}

function renderStudentTable(students) {
  const tbody = document.getElementById('studentTableBody');
  const noData = document.getElementById('noDataMessage');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = '';
    if (noData) noData.style.display = 'block';
    return;
  }

  if (noData) noData.style.display = 'none';

  tbody.innerHTML = students.map(s => `
    <tr>
      <td>${escapeHtml(s.studentId)}</td>
      <td>${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)}</td>
      <td>${escapeHtml(s.gender || 'N/A')}</td>
      <td>${escapeHtml(s.course || 'N/A')}</td>
      <td>${escapeHtml(s.admissionDate || 'N/A')}</td>
      <td>
        <span class="status-pill ${s.status === 'Active' ? 'status-active' : 'status-inactive'}" 
              style="cursor: pointer;" 
              title="Click to toggle status"
              onclick="toggleStudentStatus('${escapeHtml(s.studentId)}', '${escapeHtml(s.status)}')">
          ${escapeHtml(s.status)}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-action btn-view" title="View Details" onclick="openViewModal('${escapeHtml(s.studentId)}')">View</button>
          <button class="btn btn-action btn-edit" title="Edit Student" onclick="openEditModal('${escapeHtml(s.studentId)}')">Edit</button>
          <button class="btn btn-action btn-delete" title="Delete Student" onclick="confirmDeleteStudent('${escapeHtml(s.studentId)}', '${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyFilterAndSearch() {
  const searchInput = document.getElementById('searchInput');
  const courseFilter = document.getElementById('courseFilter');
  const statusFilter = document.getElementById('statusFilter');

  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const selectedCourse = courseFilter ? courseFilter.value : '';
  const selectedStatus = statusFilter ? statusFilter.value : '';

  const filtered = allStudents.filter(s => {
    const matchCourse = !selectedCourse || s.course === selectedCourse;
    const matchStatus = !selectedStatus || s.status === selectedStatus;
    const matchSearch = !query || (
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.phone && s.phone.toLowerCase().includes(query)) ||
      (s.course && s.course.toLowerCase().includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query))
    );
    return matchCourse && matchStatus && matchSearch;
  });

  renderStudentTable(filtered);
}

function resetFilters() {
  const searchInput = document.getElementById('searchInput');
  const courseFilter = document.getElementById('courseFilter');
  const statusFilter = document.getElementById('statusFilter');

  if (searchInput) searchInput.value = '';
  if (courseFilter) courseFilter.value = '';
  if (statusFilter) statusFilter.value = '';

  renderStudentTable(allStudents);
}

// Student Modals (Add / Edit / View)
function openAddModal() {
  loadCoursesForFiltersAndForms();
  document.getElementById('modalTitle').textContent = 'Add New Student';
  document.getElementById('editIndex').value = '';
  document.getElementById('studentId').value = 'Auto-Generated (STD-XXXX)';
  document.getElementById('studentForm').reset();
  resetPhotoSelection();
  
  const admInput = document.getElementById('admissionDate');
  if (admInput) admInput.value = new Date().toISOString().split('T')[0];
  
  const statusSelect = document.getElementById('status');
  if (statusSelect) statusSelect.value = 'Active';

  document.getElementById('saveBtn').textContent = 'Add Student';
  document.getElementById('studentModal').style.display = 'flex';
}

async function openEditModal(studentId) {
  await loadCoursesForFiltersAndForms();
  const student = allStudents.find(s => s.studentId === studentId);
  if (!student) {
    Common.showToast('Student not found.', 'error');
    return;
  }

  document.getElementById('modalTitle').textContent = `Edit Student (${student.studentId})`;
  document.getElementById('editIndex').value = student.studentId;
  document.getElementById('studentId').value = student.studentId;
  document.getElementById('admissionDate').value = student.admissionDate || '';
  document.getElementById('firstName').value = student.firstName || '';
  document.getElementById('lastName').value = student.lastName || '';
  document.getElementById('dob').value = student.dob || '';
  document.getElementById('gender').value = student.gender || '';
  document.getElementById('email').value = student.email || '';
  document.getElementById('phone').value = student.phone || '';
  document.getElementById('course').value = student.course || '';
  document.getElementById('status').value = student.status || 'Active';
  document.getElementById('address').value = student.address || '';

  // Prefill photo: show existing photo, or empty state
  selectedStudentPhoto = student.photo || null;
  const preview = document.getElementById('photoPreview');
  const placeholder = document.getElementById('photoPlaceholder');
  const removeBtn = document.getElementById('removePhotoBtn');
  if (preview && placeholder) {
    if (selectedStudentPhoto) {
      preview.src = selectedStudentPhoto;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      resetPhotoSelection();
    }
  }
  const fileInput = document.getElementById('studentPhoto');
  if (fileInput) fileInput.value = '';

  document.getElementById('saveBtn').textContent = 'Update Student';
  document.getElementById('studentModal').style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('studentModal');
  if (modal) modal.style.display = 'none';
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const editId = document.getElementById('editIndex').value;
  const payload = {
    admissionDate: document.getElementById('admissionDate').value,
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    dob: document.getElementById('dob').value,
    gender: document.getElementById('gender').value,
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    course: document.getElementById('course').value,
    status: document.getElementById('status').value,
    address: document.getElementById('address').value.trim(),
    photo: selectedStudentPhoto || ''
  };

  try {
    let res;
    if (editId) {
      res = await api.updateStudent(editId, payload);
    } else {
      res = await api.addStudent(payload);
    }

    if (res && res.status === 'success') {
      Common.showToast(res.message || 'Student saved successfully!', 'success');
      closeModal();
      await loadStudents();
      await loadDashboardStats();
    } else {
      Common.showToast(res.message || 'Operation failed.', 'error');
    }
  } catch (err) {
    console.error('Error saving student:', err);
    Common.showToast('Unable to connect to server.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Photo upload handlers for the Add/Edit Student modal
function handlePhotoSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    Common.showToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
    event.target.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    Common.showToast('Photo must be smaller than 2 MB.', 'error');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedStudentPhoto = e.target.result;
    const preview = document.getElementById('photoPreview');
    const placeholder = document.getElementById('photoPlaceholder');
    const removeBtn = document.getElementById('removePhotoBtn');
    if (preview && placeholder) {
      preview.src = selectedStudentPhoto;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
    }
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}

function clearPhotoSelection() {
  // Explicitly remove an existing photo on edit (empty string signals deletion to the backend)
  selectedStudentPhoto = '';
  const fileInput = document.getElementById('studentPhoto');
  if (fileInput) fileInput.value = '';
  updatePhotoPreview();
}

function resetPhotoSelection() {
  selectedStudentPhoto = null;
  const fileInput = document.getElementById('studentPhoto');
  if (fileInput) fileInput.value = '';
  updatePhotoPreview();
}

function updatePhotoPreview() {
  const preview = document.getElementById('photoPreview');
  const placeholder = document.getElementById('photoPlaceholder');
  const removeBtn = document.getElementById('removePhotoBtn');
  if (preview && placeholder) {
    if (selectedStudentPhoto) {
      preview.src = selectedStudentPhoto;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      preview.src = '';
      preview.style.display = 'none';
      placeholder.style.display = 'flex';
    }
  }
  if (removeBtn) removeBtn.style.display = selectedStudentPhoto ? 'inline-flex' : 'none';
}

// View Details Modal
async function openViewModal(studentId) {
  const viewModal = document.getElementById('viewModal');
  const body = document.getElementById('viewDetailsBody');
  if (!viewModal || !body) return;

  body.innerHTML = `<div style="text-align:center; padding: 25px;"><i class="ri-loader-4-line"></i> Loading student details...</div>`;
  viewModal.style.display = 'flex';

  try {
    const res = await api.getStudent(studentId);
    if (res && res.status === 'success' && res.student) {
      const s = res.student;
      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
      body.innerHTML = `
        <div class="details-grid">
          <div class="detail-item full-width photo-detail-item"><strong>Profile Photo</strong><span class="photo-detail-span">${s.photo ? `<img src="${s.photo}" alt="Student Photo" class="photo-detail-img" />` : '<i class=\'ri-user-3-line\' style=\'font-size: 30px; color: rgba(255,255,255,0.4);\'></i>'}</span></div>
          <div class="detail-item"><strong>Student ID</strong><span style="color: #64b5f6;">${escapeHtml(s.studentId)}</span></div>
          <div class="detail-item"><strong>Status</strong><span class="status-pill ${s.status === 'Active' ? 'status-active' : 'status-inactive'}">${escapeHtml(s.status || 'N/A')}</span></div>
          <div class="detail-item"><strong>Full Name</strong><span>${escapeHtml(fullName || 'N/A')}</span></div>
          <div class="detail-item"><strong>Gender</strong><span>${escapeHtml(s.gender || 'N/A')}</span></div>
          <div class="detail-item"><strong>Date of Birth</strong><span>${escapeHtml(s.dob || 'N/A')}</span></div>
          <div class="detail-item"><strong>Admission Date</strong><span>${escapeHtml(s.admissionDate || 'N/A')}</span></div>
          <div class="detail-item"><strong>Course / Program</strong><span>${escapeHtml(s.course || 'N/A')}</span></div>
          <div class="detail-item"><strong>Email Address</strong><span>${escapeHtml(s.email || 'N/A')}</span></div>
          <div class="detail-item"><strong>Mobile Number</strong><span>${escapeHtml(s.phone || 'N/A')}</span></div>
          <div class="detail-item full-width"><strong>Residential Address</strong><span>${escapeHtml(s.address || 'N/A')}</span></div>
        </div>
      `;
    } else {
      body.innerHTML = `<div style="text-align:center; padding: 20px; color:#ef5350;">Student not found.</div>`;
    }
  } catch (err) {
    console.error('Error opening student details:', err);
    body.innerHTML = `<div style="text-align:center; padding: 20px; color:#ef5350;">Failed to load details.</div>`;
  }
}

function closeViewModal() {
  const modal = document.getElementById('viewModal');
  if (modal) modal.style.display = 'none';
}

async function toggleStudentStatus(studentId, currentStatus) {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  try {
    const res = await api.changeStudentStatus(studentId, newStatus);
    if (res && res.status === 'success') {
      Common.showToast(`Status updated to ${newStatus}`, 'success');
      await loadStudents();
      await loadDashboardStats();
    } else {
      Common.showToast(res.message || 'Status update failed', 'error');
    }
  } catch (err) {
    console.error('Status toggle error:', err);
    Common.showToast('Failed to update student status.', 'error');
  }
}

function confirmDeleteStudent(studentId, name) {
  Common.confirm(
    `Are you sure you want to permanently delete student <strong>${name} (${studentId})</strong> and their portal account?`,
    async () => {
      try {
        const res = await api.deleteStudent(studentId);
        if (res && res.status === 'success') {
          Common.showToast(`Student ${studentId} deleted successfully.`, 'success');
          await loadStudents();
          await loadDashboardStats();
        } else {
          Common.showToast(res.message || 'Delete operation failed', 'error');
        }
      } catch (err) {
        console.error('Delete error:', err);
        Common.showToast('Could not delete student record.', 'error');
      }
    }
  );
}

// ==========================================================================
// 3.5 ATTENDANCE SECTION (Courses -> Enrolled Students -> Mark Present/Absent)
// ==========================================================================
async function showAttendanceCourses() {
  const courseView = document.getElementById('attendanceCourseView');
  const studentView = document.getElementById('attendanceStudentView');
  if (courseView) courseView.style.display = 'block';
  if (studentView) studentView.style.display = 'none';
  currentAttendanceCourse = null;
  await loadAttendanceCourses();
}

async function loadAttendanceCourses() {
  const tbody = document.getElementById('attendanceCourseTableBody');
  const noData = document.getElementById('noAttendanceCourses');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="loading-state" style="text-align:center; padding: 20px;"><i class="ri-loader-4-line"></i> Loading courses...</td></tr>`;

  try {
    const res = await api.getAttendanceCourses();
    if (res && res.status === 'success') {
      const courses = res.courses || [];

      if (courses.length === 0) {
        tbody.innerHTML = '';
        if (noData) noData.style.display = 'block';
        return;
      }
      if (noData) noData.style.display = 'none';

      tbody.innerHTML = courses.map(c => `
        <tr>
          <td><strong style="color: #fff;">${escapeHtml(c.name)}</strong></td>
          <td>${escapeHtml(c.duration || '4 Years')}</td>
          <td>${escapeHtml(c.departmentName || 'General')}</td>
          <td><span class="badge">${c.enrolledCount || 0}</span></td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-action btn-view" title="Mark Attendance" onclick="openAttendanceStudents(${c.id}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')">
                Mark Attendance
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef5350; padding: 20px;">${escapeHtml(res.message || 'Failed to load courses.')}</td></tr>`;
    }
  } catch (err) {
    console.error('Error loading attendance courses:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef5350; padding: 20px;">Error loading courses.</td></tr>`;
  }
}

async function openAttendanceStudents(courseId, courseName) {
  currentAttendanceCourse = { id: courseId, name: courseName };

  const courseView = document.getElementById('attendanceCourseView');
  const studentView = document.getElementById('attendanceStudentView');
  if (courseView) courseView.style.display = 'none';
  if (studentView) studentView.style.display = 'block';

  const title = document.getElementById('attendanceCourseTitle');
  if (title) title.textContent = `Attendance - ${courseName}`;

  // Default the date picker to today
  const dateInput = document.getElementById('attendanceDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  await loadAttendanceStudents();
}

async function loadAttendanceStudents() {
  if (!currentAttendanceCourse) return;

  const tbody = document.getElementById('attendanceStudentTableBody');
  const noData = document.getElementById('noAttendanceStudents');
  if (!tbody) return;

  const dateInput = document.getElementById('attendanceDate');
  const date = dateInput ? dateInput.value : '';

  tbody.innerHTML = `<tr><td colspan="4" class="loading-state" style="text-align:center; padding: 20px;"><i class="ri-loader-4-line"></i> Loading enrolled students...</td></tr>`;

  try {
    const res = await api.getCourseStudents(currentAttendanceCourse.id, date);
    if (res && res.status === 'success') {
      const students = res.students || [];

      if (students.length === 0) {
        tbody.innerHTML = '';
        if (noData) noData.style.display = 'block';
        return;
      }
      if (noData) noData.style.display = 'none';

      tbody.innerHTML = students.map(s => `
        <tr>
          <td>${escapeHtml(s.studentId)}</td>
          <td>${escapeHtml(s.fullName)}</td>
          <td>
            <span class="status-pill ${s.status === 'Active' ? 'status-active' : 'status-inactive'}">${escapeHtml(s.status)}</span>
          </td>
          <td>
            <div class="attendance-buttons">
              <button class="btn btn-attendance ${s.attendanceStatus === 'Present' ? 'btn-present active' : 'btn-present'}"
                      onclick="markAttendanceFor(${s.id}, 'Present')">
                <i class="ri-check-line"></i> Present
              </button>
              <button class="btn btn-attendance ${s.attendanceStatus === 'Absent' ? 'btn-absent active' : 'btn-absent'}"
                      onclick="markAttendanceFor(${s.id}, 'Absent')">
                <i class="ri-close-line"></i> Absent
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef5350; padding: 20px;">${escapeHtml(res.message || 'Failed to load students.')}</td></tr>`;
    }
  } catch (err) {
    console.error('Error loading attendance students:', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef5350; padding: 20px;">Error loading students.</td></tr>`;
  }
}

async function markAttendanceFor(studentRowId, status) {
  if (!currentAttendanceCourse) return;

  const dateInput = document.getElementById('attendanceDate');
  const date = dateInput ? dateInput.value : '';

  try {
    const res = await api.markAttendance(currentAttendanceCourse.id, [{ studentRowId, status }], date || undefined);
    if (res && res.status === 'success') {
      // Optimistically update the button highlight without a full reload
      const row = document.querySelector(`button[onclick="markAttendanceFor(${studentRowId}, 'Present')"]`);
      const rowPresent = row ? row.closest('tr') : null;
      if (rowPresent) {
        const presentBtn = rowPresent.querySelector('.btn-present');
        const absentBtn = rowPresent.querySelector('.btn-absent');
        if (presentBtn && absentBtn) {
          presentBtn.classList.toggle('active', status === 'Present');
          absentBtn.classList.toggle('active', status === 'Absent');
        }
      }
    } else {
      Common.showToast(res.message || 'Failed to mark attendance.', 'error');
    }
  } catch (err) {
    console.error('Mark attendance error:', err);
    Common.showToast('Could not mark attendance. Please try again.', 'error');
  }
}

// ==========================================================================
// 4. COURSES MANAGEMENT
// ==========================================================================
async function loadCourses() {
  const list = document.getElementById('courseList');
  const countBadge = document.getElementById('courseCount');
  if (!list) return;

  list.innerHTML = `<li style="text-align:center; padding: 20px;"><i class="ri-loader-4-line"></i> Loading courses...</li>`;

  try {
    const res = await api.getCourses();
    if (res && res.status === 'success') {
      allCourses = res.courses || [];
      if (countBadge) countBadge.textContent = allCourses.length;

      if (allCourses.length === 0) {
        list.innerHTML = `<li style="text-align:center; padding: 20px; color:hsla(0,0%,100%,0.6);">No courses added yet.</li>`;
        return;
      }

      list.innerHTML = allCourses.map(c => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div>
            <div class="item-title" style="font-weight: 600; color: #fff; font-size: 15px;">${escapeHtml(c.name)}</div>
            <div class="item-desc" style="font-size: 13px; color: hsla(0,0%,100%,0.6); margin-top: 3px;">
              Duration: <strong>${escapeHtml(c.duration || '4 Years')}</strong>
            </div>
          </div>
          <div class="action-buttons">
            <button class="btn btn-action btn-delete" onclick="confirmDeleteCourse(${c.id}, '${escapeHtml(c.name)}')" title="Delete Course">
              Delete
            </button>
          </div>
        </li>
      `).join('');
    }
  } catch (err) {
    console.error('Error fetching courses:', err);
    list.innerHTML = `<li style="text-align:center; padding: 20px; color:#ef5350;">Failed to load courses.</li>`;
  }
}

function openCourseModal() {
  const form = document.getElementById('courseForm');
  if (form) form.reset();
  const dur = document.getElementById('courseDurationInput');
  if (dur) dur.value = '4 Years';
  const modal = document.getElementById('courseModal');
  if (modal) modal.style.display = 'flex';
}

function closeCourseModal() {
  const modal = document.getElementById('courseModal');
  if (modal) modal.style.display = 'none';
}

async function handleCourseSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('courseNameInput').value.trim();
  const duration = document.getElementById('courseDurationInput').value.trim();
  const saveBtn = document.getElementById('saveCourseBtn');

  if (!name) return;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const res = await api.addCourse({ name, duration });
    if (res && res.status === 'success') {
      Common.showToast(`Course "${name}" added successfully!`, 'success');
      closeCourseModal();
      await loadCourses();
      await loadCoursesForFiltersAndForms();
      await loadDashboardStats();
    } else {
      Common.showToast(res.message || 'Failed to add course.', 'error');
    }
  } catch (err) {
    console.error('Add course error:', err);
    Common.showToast('Could not add course.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Add Course';
  }
}

function confirmDeleteCourse(courseId, courseName) {
  Common.confirm(
    `Are you sure you want to delete course <strong>${courseName}</strong>? Students assigned to this course will become unassigned.`,
    async () => {
      try {
        const res = await api.deleteCourse(courseId);
        if (res && res.status === 'success') {
          Common.showToast(`Course deleted successfully.`, 'success');
          await loadCourses();
          await loadCoursesForFiltersAndForms();
          await loadDashboardStats();
        } else {
          Common.showToast(res.message || 'Delete operation failed', 'error');
        }
      } catch (err) {
        console.error('Delete course error:', err);
        Common.showToast('Could not delete course.', 'error');
      }
    }
  );
}

// ==========================================================================
// 5. USERS MANAGEMENT
// ==========================================================================
async function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  const noData = document.getElementById('noUsersMessage');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="loading-state" style="text-align:center; padding: 20px;"><i class="ri-loader-4-line"></i> Loading user accounts...</td></tr>`;

  try {
    // Only student accounts are managed here; admin accounts are excluded
    const res = await api.getUsers({ role: 'student' });
    if (res && res.status === 'success') {
      allUsers = res.users || [];

      if (allUsers.length === 0) {
        tbody.innerHTML = '';
        if (noData) noData.style.display = 'block';
        return;
      }

      if (noData) noData.style.display = 'none';

      tbody.innerHTML = allUsers.map(u => `
        <tr>
          <td>
            <code>${escapeHtml(u.username)}</code>
          </td>
          <td>${escapeHtml(u.fullName || '-')}</td>
          <td>${escapeHtml(u.email || '-')}</td>
          <td>${escapeHtml(u.password || '******')}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-edit" title="Change Password" onclick="openChangePasswordModal('${escapeHtml(u.studentId || '')}', '${escapeHtml((u.fullName || '').replace(/'/g, ""))}')">
                Change Password
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef5350; padding: 20px;">${escapeHtml(res.message || 'Failed to load user accounts.')}</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef5350; padding: 20px;">Could not retrieve user credentials.</td></tr>`;
  }
}

// ==========================================================================
// 6. CHANGE STUDENT PASSWORD (USERS SECTION)
// ==========================================================================
function openChangePasswordModal(studentId, fullName) {
  if (!studentId) {
    Common.showToast('This account has no linked student record.', 'error');
    return;
  }

  const form = document.getElementById('changePasswordForm');
  if (form) form.reset();

  document.getElementById('cpStudentId').value = studentId;
  document.getElementById('cpStudentName').textContent = fullName || studentId;

  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.style.display = 'flex';
}

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.style.display = 'none';
}

async function handleChangePasswordSubmit(event) {
  event.preventDefault();

  const studentId = document.getElementById('cpStudentId').value;
  const newPass = document.getElementById('cpNewPassword').value.trim();
  const confirmPass = document.getElementById('cpConfirmPassword').value.trim();
  const saveBtn = document.getElementById('cpSaveBtn');

  if (newPass.length < 6) {
    Common.showToast('New password must be at least 6 characters long.', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    Common.showToast('New password and confirm password do not match.', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const res = await api.resetStudentPassword(studentId, newPass);
    if (res && res.status === 'success') {
      Common.showToast(`Password for ${studentId} changed successfully!`, 'success');
      closeChangePasswordModal();
      await renderUsersTable();
    } else {
      Common.showToast(res.message || 'Failed to change password.', 'error');
    }
  } catch (err) {
    console.error('Change password error:', err);
    Common.showToast('Could not change the password.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save New Password';
  }
}

// ==========================================================================
// 7. AUTH LOGOUT
// ==========================================================================
async function logout() {
  await Auth.logout();
}

// Security Helper to avoid XSS injections
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
