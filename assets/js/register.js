/* ============================================================
   QuizFlow — Register (create account)
   Calls QuizFlowAPI.register() (POST /api/register).
   The real backend (C++ OOP) will implement that endpoint later.
   ============================================================ */

(function () {
  'use strict';

  if (!window.QuizFlowAuth.requireGuest('dashboard.html')) return;

  var form = document.getElementById('regForm');
  var nameInput = document.getElementById('name');
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var confirmInput = document.getElementById('confirm');
  var submitBtn = document.getElementById('regBtn');
  var btnLabel = submitBtn.querySelector('.btn-label');
  var spinner = submitBtn.querySelector('.spinner');
  var alertBox = document.getElementById('regAlert');
  var alertText = document.getElementById('regAlertText');

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
    btnLabel.textContent = loading ? 'Creating account…' : 'Create account';
  }

  /* ---------- Validation ---------- */
  function validateName() {
    var value = nameInput.value.trim();
    if (value.length < 3) { setError(nameInput, 'Enter your full name (min 3 characters).'); return false; }
    clearError(nameInput);
    return true;
  }
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
  function validateConfirm() {
    if (confirmInput.value !== passwordInput.value) { setError(confirmInput, 'Passwords do not match.'); return false; }
    clearError(confirmInput);
    return true;
  }

  nameInput.addEventListener('blur', validateName);
  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('blur', validatePassword);
  confirmInput.addEventListener('blur', validateConfirm);
  nameInput.addEventListener('input', function () { clearError(nameInput); });
  emailInput.addEventListener('input', function () { clearError(emailInput); });
  passwordInput.addEventListener('input', function () { clearError(passwordInput); });
  confirmInput.addEventListener('input', function () { clearError(confirmInput); });

  /* ---------- Submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlert();

    var nameOk = validateName();
    var emailOk = validateEmail();
    var passOk = validatePassword();
    var confirmOk = validateConfirm();
    if (!nameOk || !emailOk || !passOk || !confirmOk) return;

    setLoading(true);
    window.QuizFlowAPI.register(nameInput.value, emailInput.value, passwordInput.value)
      .then(function () {
        window.location.href = 'login.html?created=1';
      })
      .catch(function (err) {
        showAlert(err && err.message ? err.message : 'Registration failed.');
        setLoading(false);
      });
  });
})();
