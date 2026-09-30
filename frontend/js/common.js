// ==========================================================================
// JS/COMMON.JS - Reusable UI helpers, sidebar init, toasts, notifications, dialogs
// ==========================================================================

const Common = {
  // Toast alert (normal browser alert style)
  showToast(message, type = 'info', duration = 3500) {
    alert(message);
  },

  // Setup sidebar toggles and dropdown logic
  initSidebar() {
    const toggle = document.getElementById('header-toggle');
    const sidebar = document.getElementById('sidebar');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('show-sidebar');
      });
    }

    // Dropdown toggles
    const dropButtons = document.querySelectorAll('.drop__button');
    dropButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropList = btn.nextElementSibling;
        const parentDrop = btn.closest('.drop');

        if (dropList) {
          const isOpen = dropList.style.maxHeight && dropList.style.maxHeight !== '0px';
          // Close other drop lists
          document.querySelectorAll('.drop__list').forEach(l => l.style.maxHeight = null);
          document.querySelectorAll('.drop').forEach(d => d.classList.remove('show-drop'));

          if (!isOpen) {
            dropList.style.maxHeight = dropList.scrollHeight + 'px';
            parentDrop.classList.add('show-drop');
          }
        }
      });
    });

    // Populate user profile info in sidebar
    const currentUser = Auth.getCurrentUser();
    if (currentUser) {
      const nameElem = document.getElementById('sidebarUserName');
      if (nameElem) {
        nameElem.textContent = currentUser.username || (currentUser.role === 'admin' ? 'Administrator' : 'Student');
      }
    }
  },

  // Custom Confirmation Dialog using modern HTML modal
  confirm(message, onConfirm) {
    const existing = document.getElementById('customConfirmModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'customConfirmModal';
    modal.className = 'modal';
    modal.style.display = 'flex';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3><i class="ri-alert-line" style="color: #ef5350;"></i> Confirmation</h3>
          <button class="close-btn" onclick="document.getElementById('customConfirmModal').remove()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px; font-size: 15px; color: #ffffff;">
          ${message}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('customConfirmModal').remove()">Cancel</button>
          <button class="btn btn-danger" id="confirmActionBtn">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('confirmActionBtn').addEventListener('click', () => {
      modal.remove();
      if (typeof onConfirm === 'function') onConfirm();
    });
  }
};
