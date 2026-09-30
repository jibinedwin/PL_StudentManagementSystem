// ==========================================================================
// JS/USERS.JS - User Accounts listing, filtering, search, and user CRUD
// ==========================================================================

let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireRole('admin');
  if (!user) return;

  Common.initSidebar();
  await loadUsers();

  const searchInput = document.getElementById('searchUsersInput');
  const roleFilter = document.getElementById('roleFilter');

  if (searchInput) searchInput.addEventListener('input', applyUserFilters);
  if (roleFilter) roleFilter.addEventListener('change', applyUserFilters);
});

async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  const noData = document.getElementById('noUsersMessage');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="loading-state"><i class="ri-loader-4-line"></i> Loading user accounts...</td></tr>`;

  try {
    const res = await api.getUsers();
    if (res && res.status === 'success') {
      allUsers = res.users || [];
      renderUsersTable(allUsers);
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef5350;">Failed to load user accounts.</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef5350;">Error communicating with server.</td></tr>`;
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  const noData = document.getElementById('noUsersMessage');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '';
    if (noData) noData.style.display = 'block';
    return;
  }

  if (noData) noData.style.display = 'none';

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong style="color: #64b5f6;">${u.studentId}</strong></td>
      <td>${u.fullName}</td>
      <td><code>${u.username}</code></td>
      <td>${u.email}</td>
      <td>
        <span class="password-badge">
          <i class="ri-key-line"></i> ${u.password}
        </span>
      </td>
      <td>
        <span class="status-pill ${u.status === 'Active' ? 'status-active' : 'status-inactive'}">
          ${u.role.toUpperCase()} • ${u.status}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <a href="details.html?id=${u.id}" class="btn-icon btn-view" title="View Account Details">
            <i class="ri-eye-line"></i>
          </a>
          <a href="edit.html?id=${u.id}" class="btn-icon btn-edit" title="Edit User">
            <i class="ri-edit-line"></i>
          </a>
          ${u.username !== 'admin' ? `
            <button class="btn-icon btn-delete" onclick="confirmDeleteUser(${u.id}, '${u.username}')" title="Delete User">
              <i class="ri-delete-bin-line"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function applyUserFilters() {
  const query = (document.getElementById('searchUsersInput')?.value || '').trim().toLowerCase();
  const role = document.getElementById('roleFilter')?.value || '';

  const filtered = allUsers.filter(u => {
    const matchRole = !role || u.role === role;
    const matchQuery = !query || (
      u.username.toLowerCase().includes(query) ||
      u.fullName.toLowerCase().includes(query) ||
      u.studentId.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
    return matchRole && matchQuery;
  });

  renderUsersTable(filtered);
}

function confirmDeleteUser(id, username) {
  Common.confirm(
    `Are you sure you want to delete user <strong>"${username}"</strong>? They will no longer be able to log in.`,
    async () => {
      try {
        const res = await api.deleteUser(id);
        if (res && res.status === 'success') {
          Common.showToast(`User "${username}" deleted.`, 'success');
          await loadUsers();
        } else {
          Common.showToast(res.message || 'Delete operation failed', 'error');
        }
      } catch (err) {
        console.error('User delete error:', err);
        Common.showToast('Could not delete user account.', 'error');
      }
    }
  );
}
