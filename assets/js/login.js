/* ============================================================
   QuizFlow — Student Login
   Validates the form, then calls QuizFlowAPI.login() (POST /api/login).
   The real backend (C++ OOP) will implement that endpoint later.
   ============================================================ */

(function () {
  'use strict';

  if (!window.QuizFlowAuth.requireGuest('dashboard.html')) return;

  var form = document.getElementById('loginForm');
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var rememberCheck = document.getElementById('remember');
  var submitBtn = document.getElementById('loginBtn');
  var btnLabel = submitBtn.querySelector('.btn-label');
  var spinner = submitBtn.querySelector('.spinner');
  var alertBox = document.getElementById('loginAlert');
  var alertText = document.getElementById('loginAlertText');

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Password visibility toggle ---------- */
  var toggleBtn = document.querySelector('.toggle-password');
  if (toggleBtn) {
    var eyeOpen = toggleBtn.querySelector('.eye-open');
    var eyeClosed = toggleBtn.querySelector('.eye-closed');
    toggleBtn.addEventListener('click', function () {
      var isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      eyeOpen.style.display = isHidden ? 'none' : '';
      eyeClosed.style.display = isHidden ? '' : 'none';
      toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  }

  /* ---------- Helpers ---------- */
  function setError(input, message) {
    var field = input.closest('.field');
    field.classList.add('has-error');
    field.querySelector('.error-msg span').textContent = message;
  }
  function clearError(input) {
    input.closest('.field').classList.remove('has-error');
  }
  function showAlert(message) {
    alertText.textContent = message;
    alertBox.classList.add('show');
  }
  function hideAlert() {
    alertBox.classList.remove('show');
  }
  function setLoading(loading) {
    submitBtn.disabled = loading;
    spinner.style.display = loading ? '' : 'none';
    btnLabel.textContent = loading ? 'Signing in…' : 'Sign In';
  }

  /* ---------- Validation ---------- */
  function validateEmail() {
    var value = emailInput.value.trim();
    if (!value) { setError(emailInput, 'Email address is required.'); return false; }
    if (!EMAIL_RE.test(value)) { setError(emailInput, 'Enter a valid email address.'); return false; }
    clearError(emailInput);
    return true;
  }
  function validatePassword() {
    var value = passwordInput.value;
    if (!value) { setError(passwordInput, 'Password is required.'); return false; }
    if (value.length < 6) { setError(passwordInput, 'Password must be at least 6 characters.'); return false; }
    clearError(passwordInput);
    return true;
  }

  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('blur', validatePassword);
  emailInput.addEventListener('input', function () { clearError(emailInput); });
  passwordInput.addEventListener('input', function () { clearError(passwordInput); });

  /* ---------- Success / expiry notices ---------- */
  var createdAlert = document.getElementById('createdAlert');
  if (/[?&]created=1/.test(window.location.search) && createdAlert) {
    createdAlert.classList.add('show');
  }
  if (/[?&]expired=1/.test(window.location.search)) {
    showAlert('Your session was reset — please sign in again.');
  }

  /* ---------- Submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlert();

    var emailOk = validateEmail();
    var passOk = validatePassword();
    if (!emailOk || !passOk) return;

    setLoading(true);
    window.QuizFlowAPI.login(emailInput.value.trim(), passwordInput.value)
      .then(function (user) {
        window.QuizFlowAuth.setSession(user, rememberCheck.checked);
        window.location.href = user.role === 'Admin' ? 'admin.html' : 'dashboard.html';
      })
      .catch(function (err) {
        showAlert(err && err.message ? err.message : 'Login failed.');
        setLoading(false);
      });
  });
})();
