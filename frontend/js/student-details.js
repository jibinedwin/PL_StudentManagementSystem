// ==========================================================================
// JS/STUDENT-DETAILS.JS - Single student detail view controller
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireRole('admin');
  if (!user) return;

  Common.initSidebar();

  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('id');

  if (!studentId) {
    Common.showToast('No student ID provided in URL.', 'error');
    document.getElementById('detailsContent').innerHTML = `
      <div class="empty-state">
        <i class="ri-error-warning-line"></i>
        <h4>Missing Student ID</h4>
        <p>Please return to the student list and select a valid student.</p>
        <a href="index.html" class="btn btn-primary" style="margin-top: 15px;">Back to Students</a>
      </div>
    `;
    return;
  }

  await loadStudentDetails(studentId);
});

async function loadStudentDetails(studentId) {
  try {
    const res = await api.getStudent(studentId);
    if (res && res.status === 'success' && res.student) {
      renderStudentDetails(res.student);
    } else {
      document.getElementById('detailsContent').innerHTML = `
        <div class="empty-state">
          <i class="ri-user-unfollow-line"></i>
          <h4>Student Not Found</h4>
          <p>${res.message || 'The requested student could not be located.'}</p>
          <a href="index.html" class="btn btn-primary" style="margin-top: 15px;">Back to Students</a>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error fetching student details:', err);
    Common.showToast('Failed to load student details.', 'error');
  }
}

function renderStudentDetails(s) {
  // Update Header Banner
  document.getElementById('displayFullName').textContent = `${s.firstName} ${s.lastName}`;
  document.getElementById('displayStudentId').textContent = s.studentId;
  
  const statusElem = document.getElementById('displayStatus');
  if (statusElem) {
    statusElem.textContent = s.status;
    statusElem.className = `status-pill ${s.status === 'Active' ? 'status-active' : 'status-inactive'}`;
  }

  // Populate data items
  document.getElementById('valStudentId').textContent = s.studentId || '-';
  document.getElementById('valFullName').textContent = `${s.firstName} ${s.lastName}` || '-';
  document.getElementById('valGender').textContent = s.gender || '-';
  document.getElementById('valDob').textContent = s.dob || '-';
  document.getElementById('valEmail').textContent = s.email || '-';
  document.getElementById('valPhone').textContent = s.phone || '-';
  document.getElementById('valCourse').textContent = s.course || 'Not Assigned';
  document.getElementById('valAdmissionDate').textContent = s.admissionDate || '-';
  document.getElementById('valStatus').textContent = s.status || 'Active';
  document.getElementById('valAddress').textContent = s.address || 'No address provided.';

  // Update edit link
  const editBtn = document.getElementById('editStudentLink');
  if (editBtn) {
    editBtn.href = `edit.html?id=${encodeURIComponent(s.studentId)}`;
  }
}
