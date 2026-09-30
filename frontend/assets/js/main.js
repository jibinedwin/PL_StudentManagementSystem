/*=== Focus, blur, and autofill management for inputs ===*/
const inputs = document.querySelectorAll(".form__input");

function addfocus() {
  let parent = this.parentNode.parentNode;
  parent.classList.add("focus");
  clearError();
}

function remfocus() {
  let parent = this.parentNode.parentNode;
  if (!this.value || this.value.trim() === "") {
    parent.classList.remove("focus");
  }
}

function checkInputValues() {
  inputs.forEach(input => {
    const parent = input.parentNode.parentNode;
    if (input.value && input.value.trim() !== '') {
      parent.classList.add("focus");
    }
  });
}

inputs.forEach(input => {
  input.addEventListener("focus", addfocus);
  input.addEventListener("blur", remfocus);
  input.addEventListener("input", () => {
    checkInputValues();
    clearError();
  });
  input.addEventListener("change", checkInputValues);
});

window.addEventListener('DOMContentLoaded', checkInputValues);
setTimeout(checkInputValues, 200);
setTimeout(checkInputValues, 600);

/*=== Error Handling Helpers ===*/
function showError(msg) {
  const errEl = document.getElementById('loginError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } else {
    alert(msg);
  }
}

function clearError() {
  const errEl = document.getElementById('loginError');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.textContent = '';
  }
}

/*=== Role Switcher & Form Submission ===*/
let currentRole = 'admin';

function switchRole(role) {
  currentRole = role;
  clearError();
  const adminTab = document.getElementById('adminTab');
  const studentTab = document.getElementById('studentTab');
  const usernameLabel = document.getElementById('usernameLabel');
  const loginBtn = document.getElementById('loginButton');

  if (role === 'admin') {
    adminTab.classList.add('active');
    studentTab.classList.remove('active');
    usernameLabel.textContent = 'Admin Username';
    loginBtn.value = 'Login as Admin';
  } else {
    studentTab.classList.add('active');
    adminTab.classList.remove('active');
    usernameLabel.textContent = 'Student ID';
    loginBtn.value = 'Login as Student';
  }
  checkInputValues();
}

async function handleLogin(event) {
  event.preventDefault();
  clearError();
  const username = document.getElementById('userInput').value.trim();
  const password = document.getElementById('passInput').value.trim();
  const loginBtn = document.getElementById('loginButton');

  if (!username || !password) {
    showError('Please enter both your username and password.');
    return;
  }

  const originalBtnText = loginBtn.value;
  loginBtn.value = 'Signing in...';
  loginBtn.disabled = true;

  try {
    const res = await api.login(currentRole, username, password);

    if (res.status === 'success') {
      sessionStorage.setItem('currentUser', JSON.stringify({
        username: username,
        role: currentRole,
        data: res.student || res.user
      }));

      if (currentRole === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'student-dashboard.html';
      }
    } else {
      showError(res.message || 'Login failed. Please check your credentials.');
    }
  } catch (err) {
    console.error('Login error:', err);
    showError('Unable to connect to the backend server. Please verify the Flask service is running on http://localhost:5000');
  } finally {
    loginBtn.value = originalBtnText;
    loginBtn.disabled = false;
  }
}
