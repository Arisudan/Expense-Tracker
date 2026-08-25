/**
 * Personal Expense Tracker — Application Controller
 * 
 * Manages application state, event handling, rendering, and
 * coordination between UI components and database operations.
 */

(function () {
  'use strict';

  // ============================
  // Application State
  // ============================

  const state = {
    // Current month being viewed (0-indexed)
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    // Authentication state
    user: null,
    isLoggingIn: false,
    // Loaded expenses for the current month
    expenses: [],
    // Search query
    searchQuery: '',
    // UI states
    isLoading: false,
    isSaving: false,
    isDeleting: false,
    // Currently editing expense (null = create mode)
    editingExpense: null,
    // Expense pending deletion
    deletingExpense: null,
    // Debounce timer for search
    searchTimer: null,
  };

  // ============================
  // DOM References
  // ============================

  const dom = {
    // Auth & Views
    authLoading: document.getElementById('auth-loading'),
    loginView: document.getElementById('login-view'),
    trackerView: document.getElementById('tracker-view'),
    
    // Login Form
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    btnTogglePassword: document.getElementById('btn-toggle-password'),
    loginError: document.getElementById('login-error'),
    btnLogin: document.getElementById('btn-login'),
    btnLoginText: document.getElementById('btn-login-text'),
    btnLoginLoading: document.getElementById('btn-login-loading'),
    
    // Header / Month Nav
    btnLogout: document.getElementById('btn-logout'),
    monthLabel: document.getElementById('month-label'),
    btnPrevMonth: document.getElementById('btn-prev-month'),
    btnNextMonth: document.getElementById('btn-next-month'),

    // Summary
    totalExpenses: document.getElementById('total-expenses'),
    totalEntries: document.getElementById('total-entries'),

    // Toolbar
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    btnAddExpense: document.getElementById('btn-add-expense'),

    // Expense Section
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    noResultsState: document.getElementById('no-results-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),
    expenseTable: document.getElementById('expense-table'),
    expenseTbody: document.getElementById('expense-tbody'),
    expenseCards: document.getElementById('expense-cards'),
    btnAddEmpty: document.getElementById('btn-add-empty'),

    // FAB
    btnFab: document.getElementById('btn-fab'),

    // Expense Modal
    expenseModal: document.getElementById('expense-modal'),
    modalTitle: document.getElementById('modal-title'),
    expenseForm: document.getElementById('expense-form'),
    formExpenseId: document.getElementById('form-expense-id'),
    formDate: document.getElementById('form-date'),
    formDetails: document.getElementById('form-details'),
    formPrice: document.getElementById('form-price'),
    btnCancel: document.getElementById('btn-cancel'),
    btnSave: document.getElementById('btn-save'),
    btnSaveText: document.getElementById('btn-save-text'),
    btnSaveLoading: document.getElementById('btn-save-loading'),
    errorDate: document.getElementById('error-date'),
    errorDetails: document.getElementById('error-details'),
    errorPrice: document.getElementById('error-price'),

    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    deleteDetail: document.getElementById('delete-detail'),
    btnDeleteCancel: document.getElementById('btn-delete-cancel'),
    btnDeleteConfirm: document.getElementById('btn-delete-confirm'),
    btnDeleteText: document.getElementById('btn-delete-text'),
    btnDeleteLoading: document.getElementById('btn-delete-loading'),

    // Toast
    toastContainer: document.getElementById('toast-container'),
  };

  // ============================
  // Initialization
  // ============================

  function init() {
    bindEvents();
    updateMonthDisplay();
    initAuth();
  }

  // ============================
  // Authentication
  // ============================

  async function initAuth() {
    // Listen for auth changes (login, logout, token refresh)
    if (window.supabaseAuth) {
      window.supabaseAuth.onAuthStateChange(function (event, session) {
        handleAuthChange(session);
      });

      // Get initial session
      const { data } = await window.supabaseAuth.getSession();
      handleAuthChange(data.session);
    } else {
      // Fallback if supabase failed to initialize (e.g. offline)
      handleAuthChange(null);
    }
  }

  function handleAuthChange(session) {
    if (session) {
      state.user = session.user;
      dom.authLoading.style.display = 'none';
      dom.loginView.style.display = 'none';
      dom.trackerView.style.display = 'block';
      // Only load expenses if we haven't loaded this session yet
      if (state.expenses.length === 0) {
        loadExpenses();
      }
    } else {
      state.user = null;
      state.expenses = [];
      dom.authLoading.style.display = 'none';
      dom.trackerView.style.display = 'none';
      dom.loginView.style.display = 'flex';
      
      // Clear forms
      if (dom.loginForm) dom.loginForm.reset();
      dom.loginError.textContent = '';
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (state.isLoggingIn) return;

    const email = dom.loginEmail.value.trim();
    const password = dom.loginPassword.value;

    if (!email || !password) {
      dom.loginError.textContent = 'Please enter both email and password.';
      return;
    }

    state.isLoggingIn = true;
    setLoginLoading(true);
    dom.loginError.textContent = '';

    const { error } = await window.supabaseAuth.signInWithEmail(email, password);
    
    if (error) {
      console.error('Login error:', error);
      dom.loginError.textContent = 'Invalid email or password.';
      state.isLoggingIn = false;
      setLoginLoading(false);
    }
    // On success, onAuthStateChange will handle the UI update
    else {
      state.isLoggingIn = false;
      setLoginLoading(false);
    }
  }

  function setLoginLoading(loading) {
    dom.btnLoginText.style.display = loading ? 'none' : '';
    dom.btnLoginLoading.style.display = loading ? 'inline-flex' : 'none';
    dom.btnLogin.disabled = loading;
    dom.loginEmail.disabled = loading;
    dom.loginPassword.disabled = loading;
  }

  function togglePasswordVisibility() {
    const type = dom.loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    dom.loginPassword.setAttribute('type', type);
    
    const eyeIcon = dom.btnTogglePassword.querySelector('.icon-eye');
    const eyeOffIcon = dom.btnTogglePassword.querySelector('.icon-eye-off');
    
    if (type === 'text') {
      eyeIcon.style.display = 'none';
      eyeOffIcon.style.display = 'block';
    } else {
      eyeIcon.style.display = 'block';
      eyeOffIcon.style.display = 'none';
    }
  }

  async function handleLogout() {
    if (window.supabaseAuth) {
      await window.supabaseAuth.signOut();
    }
  }

  // ============================
  // Event Binding
  // ============================

  function bindEvents() {
    // Auth
    if (dom.loginForm) dom.loginForm.addEventListener('submit', handleLoginSubmit);
    if (dom.btnLogout) dom.btnLogout.addEventListener('click', handleLogout);
    if (dom.btnTogglePassword) dom.btnTogglePassword.addEventListener('click', togglePasswordVisibility);

    // Month navigation
    dom.btnPrevMonth.addEventListener('click', goToPrevMonth);
    dom.btnNextMonth.addEventListener('click', goToNextMonth);
    dom.monthLabel.addEventListener('click', goToCurrentMonth);

    // Add expense buttons
    dom.btnAddExpense.addEventListener('click', openAddForm);
    dom.btnAddEmpty.addEventListener('click', openAddForm);
    dom.btnFab.addEventListener('click', openAddForm);

    // Expense form
    dom.expenseForm.addEventListener('submit', handleFormSubmit);
    dom.btnCancel.addEventListener('click', closeExpenseModal);

    // Delete modal
    dom.btnDeleteCancel.addEventListener('click', closeDeleteModal);
    dom.btnDeleteConfirm.addEventListener('click', handleDeleteConfirm);

    // Search
    dom.searchInput.addEventListener('input', handleSearchInput);
    dom.searchClear.addEventListener('click', clearSearch);

    // Retry on error
    dom.btnRetry.addEventListener('click', loadExpenses);

    // Close modals on overlay click
    dom.expenseModal.addEventListener('click', function (e) {
      if (e.target === dom.expenseModal) closeExpenseModal();
    });
    dom.deleteModal.addEventListener('click', function (e) {
      if (e.target === dom.deleteModal) closeDeleteModal();
    });

    // Keyboard: Escape to close modals
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (dom.expenseModal.style.display !== 'none') closeExpenseModal();
        if (dom.deleteModal.style.display !== 'none') closeDeleteModal();
      }
    });
  }

  // ============================
  // Month Navigation
  // ============================

  function goToPrevMonth() {
    state.currentMonth--;
    if (state.currentMonth < 0) {
      state.currentMonth = 11;
      state.currentYear--;
    }
    onMonthChange();
  }

  function goToNextMonth() {
    state.currentMonth++;
    if (state.currentMonth > 11) {
      state.currentMonth = 0;
      state.currentYear++;
    }
    onMonthChange();
  }

  function goToCurrentMonth() {
    const now = new Date();
    if (state.currentYear === now.getFullYear() && state.currentMonth === now.getMonth()) {
      return; // Already on current month
    }
    state.currentYear = now.getFullYear();
    state.currentMonth = now.getMonth();
    onMonthChange();
  }

  function onMonthChange() {
    clearSearch();
    updateMonthDisplay();
    loadExpenses();
  }

  function updateMonthDisplay() {
    const label = getMonthYear(state.currentYear, state.currentMonth);
    dom.monthLabel.textContent = label;

    // Add visual indicator if viewing current month
    const now = new Date();
    const isCurrent = state.currentYear === now.getFullYear() && state.currentMonth === now.getMonth();
    dom.monthLabel.classList.toggle('is-current', isCurrent);
    dom.monthLabel.title = isCurrent ? 'Current month' : 'Click to return to current month';
  }

  // ============================
  // Data Loading
  // ============================

  async function loadExpenses() {
    showLoading();
    state.isLoading = true;

    try {
      let result;
      if (state.searchQuery) {
        result = await searchExpenses(state.currentYear, state.currentMonth, state.searchQuery);
      } else {
        result = await fetchExpenses(state.currentYear, state.currentMonth);
      }

      if (result.error) {
        throw result.error;
      }

      state.expenses = result.data || [];
      renderExpenses();
      updateSummary();
    } catch (err) {
      console.error('Failed to load expenses:', err);
      showError('Failed to load expenses. Check your connection and try again.');
    } finally {
      state.isLoading = false;
    }
  }

  // ============================
  // Rendering
  // ============================

  function renderExpenses() {
    const expenses = state.expenses;
    const hasSearch = state.searchQuery.length > 0;

    // Hide all states first
    dom.loadingState.style.display = 'none';
    dom.emptyState.style.display = 'none';
    dom.noResultsState.style.display = 'none';
    dom.errorState.style.display = 'none';
    dom.expenseTable.style.display = 'none';
    dom.expenseCards.style.display = 'none';

    if (expenses.length === 0) {
      if (hasSearch) {
        dom.noResultsState.style.display = 'flex';
      } else {
        dom.emptyState.style.display = 'flex';
      }
      return;
    }

    // Render table rows (desktop)
    dom.expenseTbody.innerHTML = expenses.map(function (exp) {
      return `<tr data-id="${exp.id}">
        <td class="col-date">${formatDateDisplay(exp.date)}</td>
        <td class="col-details">${escapeHtml(exp.details)}</td>
        <td class="col-price">${formatCurrency(exp.price)}</td>
        <td class="col-actions">
          <div class="action-group">
            <button class="btn btn-icon btn-edit" data-action="edit" data-id="${exp.id}" aria-label="Edit expense">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1.5L12.5 4L4.5 12H2V9.5L10 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              Edit
            </button>
            <button class="btn btn-icon btn-delete" data-action="delete" data-id="${exp.id}" aria-label="Delete expense">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4H11.5M5 4V2.5H9V4M5.5 6.5V10.5M8.5 6.5V10.5M3.5 4L4 11.5H10L10.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Render cards (mobile)
    dom.expenseCards.innerHTML = expenses.map(function (exp) {
      return `<div class="expense-card" data-id="${exp.id}">
        <div class="expense-card-body">
          <div class="expense-card-details">${escapeHtml(exp.details)}</div>
          <div class="expense-card-date">${formatDateDisplay(exp.date)}</div>
        </div>
        <div class="expense-card-price">${formatCurrency(exp.price)}</div>
        <div class="expense-card-actions">
          <button class="btn btn-icon btn-edit" data-action="edit" data-id="${exp.id}" aria-label="Edit expense">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1.5L12.5 4L4.5 12H2V9.5L10 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn btn-icon btn-delete" data-action="delete" data-id="${exp.id}" aria-label="Delete expense">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4H11.5M5 4V2.5H9V4M5.5 6.5V10.5M8.5 6.5V10.5M3.5 4L4 11.5H10L10.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');

    // Attach action listeners via event delegation
    dom.expenseTbody.onclick = handleRowAction;
    dom.expenseCards.onclick = handleRowAction;

    // Show appropriate view
    dom.expenseTable.style.display = 'table';
    dom.expenseCards.style.display = 'flex';
  }

  function updateSummary() {
    const total = state.expenses.reduce(function (sum, exp) {
      return sum + Number(exp.price);
    }, 0);

    dom.totalExpenses.textContent = formatCurrency(total);
    dom.totalEntries.textContent = state.expenses.length;
  }

  // ============================
  // State Display Helpers
  // ============================

  function showLoading() {
    dom.loadingState.style.display = 'flex';
    dom.emptyState.style.display = 'none';
    dom.noResultsState.style.display = 'none';
    dom.errorState.style.display = 'none';
    dom.expenseTable.style.display = 'none';
    dom.expenseCards.style.display = 'none';
  }

  function showError(message) {
    dom.loadingState.style.display = 'none';
    dom.emptyState.style.display = 'none';
    dom.noResultsState.style.display = 'none';
    dom.expenseTable.style.display = 'none';
    dom.expenseCards.style.display = 'none';
    dom.errorMessage.textContent = message;
    dom.errorState.style.display = 'flex';
  }

  // ============================
  // Expense Form (Add / Edit)
  // ============================

  function openAddForm() {
    state.editingExpense = null;
    dom.modalTitle.textContent = 'Add Expense';
    dom.btnSaveText.textContent = 'Save Expense';
    dom.formExpenseId.value = '';
    dom.formDate.value = getTodayStr();
    dom.formDetails.value = '';
    dom.formPrice.value = '';
    clearFormErrors();
    showExpenseModal();

    // Focus the details field after a brief delay for the modal animation
    setTimeout(function () { dom.formDetails.focus(); }, 100);
  }

  function openEditForm(expense) {
    state.editingExpense = expense;
    dom.modalTitle.textContent = 'Edit Expense';
    dom.btnSaveText.textContent = 'Update Expense';
    dom.formExpenseId.value = expense.id;
    dom.formDate.value = expense.date;
    dom.formDetails.value = expense.details;
    dom.formPrice.value = expense.price;
    clearFormErrors();
    showExpenseModal();

    setTimeout(function () { dom.formDetails.focus(); }, 100);
  }

  function showExpenseModal() {
    dom.expenseModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeExpenseModal() {
    if (state.isSaving) return; // Prevent closing during save
    dom.expenseModal.style.display = 'none';
    document.body.style.overflow = '';
    state.editingExpense = null;
    clearFormErrors();
  }

  function clearFormErrors() {
    dom.errorDate.textContent = '';
    dom.errorDetails.textContent = '';
    dom.errorPrice.textContent = '';
    dom.formDate.classList.remove('has-error');
    dom.formDetails.classList.remove('has-error');
    dom.formPrice.classList.remove('has-error');
  }

  function showFormErrors(errors) {
    clearFormErrors();
    if (errors.date) {
      dom.errorDate.textContent = errors.date;
      dom.formDate.classList.add('has-error');
    }
    if (errors.details) {
      dom.errorDetails.textContent = errors.details;
      dom.formDetails.classList.add('has-error');
    }
    if (errors.price) {
      dom.errorPrice.textContent = errors.price;
      dom.formPrice.classList.add('has-error');
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (state.isSaving) return; // Prevent double submission

    const data = {
      date: dom.formDate.value,
      details: dom.formDetails.value,
      price: dom.formPrice.value,
    };

    // Validate
    const validation = validateExpense(data);
    if (!validation.valid) {
      showFormErrors(validation.errors);
      return;
    }

    // Save
    state.isSaving = true;
    setSaveLoading(true);

    try {
      let result;
      if (state.editingExpense) {
        // Update existing
        result = await updateExpense(state.editingExpense.id, data);
        if (result.error) throw result.error;
        showToast('Expense updated', 'success');
      } else {
        // Create new
        result = await createExpense(data);
        if (result.error) throw result.error;
        showToast('Expense saved', 'success');
      }

      // Reset saving state before closing modal (close checks isSaving)
      state.isSaving = false;
      setSaveLoading(false);
      closeExpenseModal();
      await loadExpenses(); // Refresh the list
    } catch (err) {
      console.error('Failed to save expense:', err);
      showToast('Failed to save expense. Please try again.', 'error');
      state.isSaving = false;
      setSaveLoading(false);
    }
  }

  function setSaveLoading(loading) {
    dom.btnSaveText.style.display = loading ? 'none' : '';
    dom.btnSaveLoading.style.display = loading ? 'inline-flex' : 'none';
    dom.btnSave.disabled = loading;
    dom.btnCancel.disabled = loading;
  }

  // ============================
  // Delete Expense
  // ============================

  function openDeleteModal(expense) {
    state.deletingExpense = expense;
    dom.deleteDetail.textContent = `${formatDateDisplay(expense.date)} — ${expense.details} — ${formatCurrency(expense.price)}`;
    dom.deleteModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeDeleteModal() {
    if (state.isDeleting) return;
    dom.deleteModal.style.display = 'none';
    document.body.style.overflow = '';
    state.deletingExpense = null;
  }

  async function handleDeleteConfirm() {
    if (state.isDeleting || !state.deletingExpense) return;

    state.isDeleting = true;
    setDeleteLoading(true);

    try {
      const result = await deleteExpense(state.deletingExpense.id);
      if (result.error) throw result.error;

      showToast('Expense deleted', 'success');
      state.isDeleting = false;
      setDeleteLoading(false);
      closeDeleteModal();
      await loadExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      showToast('Failed to delete expense. Please try again.', 'error');
      state.isDeleting = false;
      setDeleteLoading(false);
    }
  }

  function setDeleteLoading(loading) {
    dom.btnDeleteText.style.display = loading ? 'none' : '';
    dom.btnDeleteLoading.style.display = loading ? 'inline-flex' : 'none';
    dom.btnDeleteConfirm.disabled = loading;
    dom.btnDeleteCancel.disabled = loading;
  }

  // ============================
  // Row Actions (Edit / Delete)
  // ============================

  function handleRowAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const expense = state.expenses.find(function (exp) { return exp.id === id; });
    if (!expense) return;

    if (action === 'edit') {
      openEditForm(expense);
    } else if (action === 'delete') {
      openDeleteModal(expense);
    }
  }

  // ============================
  // Search
  // ============================

  function handleSearchInput() {
    const query = dom.searchInput.value.trim();
    dom.searchClear.style.display = query.length > 0 ? 'flex' : 'none';

    // Debounce search to avoid excessive queries
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(function () {
      state.searchQuery = query;
      loadExpenses();
    }, 300);
  }

  function clearSearch() {
    dom.searchInput.value = '';
    dom.searchClear.style.display = 'none';
    if (state.searchQuery) {
      state.searchQuery = '';
      loadExpenses();
    }
  }

  // ============================
  // Toast Notifications
  // ============================

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type || 'success'}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    // Auto-dismiss after 3 seconds
    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 3000);
  }

  // ============================
  // Utilities
  // ============================

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================
  // Start Application
  // ============================

  // Wait for DOM and Supabase to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
