/* ============================================================
   ARKHIVEZ STORE — auth.js (Supabase Version)
   Login/logout dari tabel accounts di database
   ============================================================ */

const SESSION_KEY = 'arkhivez_session';

function getSession() {
  try {
    /* sessionStorage: per-tab, tidak bocor ke tab lain */
    var raw = sessionStorage.getItem(SESSION_KEY);
    /* Fallback: kalau sessionStorage kosong, cek localStorage (kompatibilitas) */
    if (!raw) raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

async function attemptLogin(username, password) {
  var inputUser = (username || '').trim().toLowerCase();
  var inputPass = (password || '').trim();
  if (!inputUser || !inputPass)
    return { success: false, error: 'Username dan password wajib diisi.' };
  try {
    var account = await window.ArkhivezAccounts.findByUsername(inputUser);
    if (!account || account.password !== inputPass)
      return { success: false, error: 'Username atau password salah.' };
    var sessionData = {
      id: account.id, username: account.username,
      name: account.name, email: account.email,
      role: account.role, loginAt: new Date().toISOString(),
    };
    /* Simpan di sessionStorage (per-tab) dan localStorage (fallback single-tab) */
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    try { await window.logActivity('Login', account.name + ' berhasil masuk'); } catch(e) {}
    return { success: true, user: sessionData };
  } catch(e) {
    console.error('Login error:', e);
    return { success: false, error: 'Gagal terhubung ke server. Periksa koneksi internet.' };
  }
}

function logout() {
  var s = getSession();
  if (s) { try { window.logActivity('Logout', s.name + ' keluar'); } catch(e) {} }
  try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
}

function requireAuth(requiredRole) {
  var session = getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (requiredRole && session.role !== requiredRole) {
    window.location.href = session.role === 'admin' ? 'admin.html' : 'catalog.html';
    return null;
  }
  return session;
}

function redirectByRole(role) {
  window.location.href = role === 'admin' ? 'admin.html' : 'catalog.html';
}

(function initLoginPage() {
  document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    var existing = getSession();
    if (existing) { redirectByRole(existing.role); return; }

    var usernameInput = document.getElementById('username');
    var passwordInput = document.getElementById('password');
    var togglePwBtn   = document.getElementById('togglePw');
    var eyeIcon       = document.getElementById('eyeIcon');
    var formError     = document.getElementById('formError');
    var errorMsg      = document.getElementById('errorMsg');
    var btnLogin      = document.getElementById('btnLogin');

    if (togglePwBtn && passwordInput) {
      togglePwBtn.addEventListener('click', function() {
        var isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        if (eyeIcon) {
          eyeIcon.innerHTML = isPass
            ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
            : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        }
      });
    }

    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (formError) { formError.classList.remove('visible'); formError.style.display = 'none'; }
      btnLogin.disabled = true;
      var txtEl = btnLogin.querySelector('.btn-login__text');
      var arrEl = btnLogin.querySelector('.btn-login__arrow');
      if (txtEl) txtEl.textContent = 'Memeriksa...';
      if (arrEl) arrEl.textContent = '⟳';
      btnLogin.style.opacity = '0.8';

      var result = await attemptLogin(usernameInput.value, passwordInput.value);

      if (result.success) {
        redirectByRole(result.user.role);
      } else {
        btnLogin.disabled = false;
        if (txtEl) txtEl.textContent = 'Masuk';
        if (arrEl) arrEl.textContent = '→';
        btnLogin.style.opacity = '1';
        if (errorMsg) errorMsg.textContent = result.error;
        if (formError) {
          formError.style.display = 'flex';
          formError.classList.add('visible');
          formError.style.animation = 'none';
          void formError.offsetWidth;
          formError.style.animation = 'shakeX 0.4s ease';
        }
      }
    });
  });
})();

window.ArkhivezAuth = { requireAuth, attemptLogin, login: attemptLogin, logout, getSession };