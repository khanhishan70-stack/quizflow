/* ============================================================
   QuizFlow — Shared auth guard & session
   Session object: { id, name, email, role }
   Stored in localStorage (remember) or sessionStorage.
   ============================================================ */

(function () {
  'use strict';

  var SESSION_KEY = 'quizflow_session';

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY) ||
                sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(user, remember) {
    var data = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    try {
      if (remember) {
        localStorage.setItem(SESSION_KEY, data);
      } else {
        sessionStorage.setItem(SESSION_KEY, data);
      }
    } catch (e) { /* storage unavailable */ }
  }

  function logout(redirectTo) {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
    window.location.href = redirectTo || 'login.html';
  }

  /* Redirect to login if no session. Returns session or null. */
  function requireAuth(redirectTo) {
    var session = getSession();
    if (!session) {
      window.location.replace(redirectTo || 'login.html');
      return null;
    }
    /* Stale session: the user no longer exists in the store (e.g. after a
       seed reset). Clear it and send to login with a notice. */
    if (window.QuizFlowAPI && window.QuizFlowAPI.hasUser &&
        !window.QuizFlowAPI.hasUser(session.id)) {
      logout('login.html?expired=1');
      return null;
    }
    return session;
  }

  /* Redirect to dashboard if a session already exists (for login pages). */
  function requireGuest(redirectTo) {
    if (getSession()) {
      window.location.replace(redirectTo || 'dashboard.html');
      return false;
    }
    return true;
  }

  function requireRole(role, redirectTo) {
    var session = getSession();
    if (!session) {
      window.location.replace('login.html');
      return null;
    }
    if (window.QuizFlowAPI && window.QuizFlowAPI.hasUser &&
        !window.QuizFlowAPI.hasUser(session.id)) {
      logout('login.html?expired=1');
      return null;
    }
    if (session.role !== role) {
      window.location.replace(redirectTo || 'dashboard.html');
      return null;
    }
    return session;
  }

  window.QuizFlowAuth = {
    SESSION_KEY: SESSION_KEY,
    getSession: getSession,
    setSession: setSession,
    logout: logout,
    requireAuth: requireAuth,
    requireGuest: requireGuest,
    requireRole: requireRole
  };
})();
