// ==========================================================================
// JS/STUDENTS.JS - Students listing, search, filtering, and status toggle/delete
// ==========================================================================

let allStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireRole('admin');
  if (!user) return;

  Common.initSidebar();
  await loadCoursesDropdown();
  await loadStudents();

  // Search and filter listeners
  const searchInput = document.getElementById('searchInput');
  const courseFilter = document.getElementById('courseFilter');
  const statusFilter = document.getElementById('statusFilter');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (courseFilter) courseFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
});

async function loadCoursesDropdown() {
  const select = document.getElementById('courseFilter');
  if (!select) return;

  try {
    const res = await api.getCourses();
    if (res && res.status === 'success' && res.courses) {
      res.courses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load courses filter:', err);
  }
}

async function loadStudents() {
  const tbody = document.getElementById('studentTableBody');
  const noData = document.getElementById('noDataMessage');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="loading-state"><i class="ri-loader-4-line"></i> Loading student records...</td></tr>`;

  try {
    const res = await api.getStudents();
    if (res && res.status === 'success') {
      allStudents = res.students || [];
      renderStudentTable(allStudents);
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef5350;">Failed to retrieve records.</td></tr>`;
    }
  } catch (err) {
    console.error('Failed to load students:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef5350;">Error communicating with server.</td></tr>`;
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
      <td><strong style="color: #64b5f6;">${s.studentId}</strong></td>
      <td>${s.firstName} ${s.lastName}</td>
      <td>${s.gender || 'N/A'}</td>
      <td>${s.course || 'Not Assigned'}</td>
      <td>${s.admissionDate || 'N/A'}</td>
      <td>
        <span class="status-pill ${s.status === 'Active' ? 'status-active' : 'status-inactive'}">
          ${s.status}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <a href="details.html?id=${encodeURIComponent(s.studentId)}" class="btn btn-action btn-view" title="View Complete Details">View</a>
          <a href="edit.html?id=${encodeURIComponent(s.studentId)}" class="btn btn-action btn-edit" title="Edit Student">Edit</a>
          <button class="btn btn-action btn-delete" onclick="confirmDeleteStudent('${s.studentId}', '${s.firstName} ${s.lastName}')" title="Delete Student">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyFilters() {
  const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const course = document.getElementById('courseFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  const filtered = allStudents.filter(s => {
    const matchCourse = !course || s.course === course;
    const matchStatus = !status || s.status === status;
    const matchSearch = !query || (
      s.studentId.toLowerCase().includes(query) ||
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
  const sInput = document.getElementById('searchInput');
  const cFilter = document.getElementById('courseFilter');
  const stFilter = document.getElementById('statusFilter');

  if (sInput) sInput.value = '';
  if (cFilter) cFilter.value = '';
  if (stFilter) stFilter.value = '';

  renderStudentTable(allStudents);
}

async function toggleStudentStatus(studentId, currentStatus) {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  try {
    const res = await api.changeStudentStatus(studentId, newStatus);
    if (res && res.status === 'success') {
      Common.showToast(`Student status updated to ${newStatus}`, 'success');
      await loadStudents();
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
    `Are you sure you want to permanently delete student <strong>${name} (${studentId})</strong> and their login account? This action cannot be undone.`,
    async () => {
      try {
        const res = await api.deleteStudent(studentId);
        if (res && res.status === 'success') {
          Common.showToast(`Student ${studentId} deleted successfully.`, 'success');
          await loadStudents();
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
