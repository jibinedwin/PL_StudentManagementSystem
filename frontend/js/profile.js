// ==========================================================================
// JS/PROFILE.JS - Logged-in user / student personal profile & password manager
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.getCurrentUser();
  if (!user) {
    window.location.href = Auth.getBasePath() + 'index.html';
    return;
  }

  Common.initSidebar();
  await loadProfileData(user);

  // Attach Password Change Form Submit
  const pwdForm = document.getElementById('changePasswordForm');
  if (pwdForm) {
    pwdForm.addEventListener('submit', handleChangePassword);
  }
});

async function loadProfileData(user) {
  try {
    let studentData = null;

    if (user.role === 'student') {
      const res = await api.getStudentProfile(user.username);
      if (res && res.status === 'success' && res.student) {
        studentData = res.student;
      }
    }

    // Common Profile Fields
    const usernameElem = document.getElementById('profUsername');
    if (usernameElem) usernameElem.textContent = user.username;

    const roleElem = document.getElementById('profRole');
    if (roleElem) roleElem.textContent = user.role.toUpperCase();

    // If student data available, populate details
    if (studentData) {
      const fullName = `${studentData.firstName} ${studentData.lastName}`;
      const initials = `${(studentData.firstName || 'S').charAt(0)}${(studentData.lastName || '').charAt(0)}`.toUpperCase();

      if (document.getElementById('avatarInitials')) document.getElementById('avatarInitials').textContent = initials;
      if (document.getElementById('cardFullName')) document.getElementById('cardFullName').textContent = fullName;
      if (document.getElementById('cardStudentId')) document.getElementById('cardStudentId').textContent = studentData.studentId;
      
      const statElem = document.getElementById('cardStatus');
      if (statElem) {
        statElem.textContent = `${studentData.status} Student`;
        statElem.style.color = studentData.status === 'Active' ? '#81c784' : '#ef5350';
      }

      // Detailed tiles
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || 'N/A';
      };

      setVal('profFullName', fullName);
      setVal('profGender', studentData.gender);
      setVal('profDob', studentData.dob);
      setVal('profEmail', studentData.email);
      setVal('profPhone', studentData.phone);
      setVal('profCourse', studentData.course);
      setVal('profAdmission', studentData.admissionDate);
      setVal('profAddress', studentData.address);
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    Common.showToast('Failed to load profile details.', 'error');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();

  const oldPassword = document.getElementById('oldPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (newPassword !== confirmPassword) {
    Common.showToast('New passwords do not match.', 'error');
    return;
  }

  if (newPassword.length < 6) {
    Common.showToast('New password must be at least 6 characters.', 'error');
    return;
  }

  const btn = document.getElementById('updatePasswordBtn');
  btn.disabled = true;
  btn.innerHTML = `<i class="ri-loader-4-line" style="animation: spin 1s infinite linear;"></i> Updating...`;

  try {
    const res = await api.updateProfilePassword(oldPassword, newPassword);
    if (res && res.status === 'success') {
      Common.showToast('Password updated successfully!', 'success');
      document.getElementById('changePasswordForm').reset();
    } else {
      Common.showToast(res.message || 'Failed to update password.', 'error');
    }
  } catch (err) {
    console.error('Password update error:', err);
    Common.showToast('Server communication error.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="ri-lock-password-line"></i> Update Password`;
  }
}
