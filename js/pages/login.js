/**
 * js/pages/login.js
 * ─────────────────────────────────────────────
 * Handles: Login + Register toggle, Google OAuth, Forgot Password
 *
 * PENTING: login.html harus load file ini dengan urutan:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="js/config/supabase.js"></script>   ← sb tersedia
 *   <script src="js/pages/login.js"></script>       ← logic ini
 *
 * login.html yang dipakai adalah versi BARU (authForm, toggleMode, dll)
 * BUKAN versi lama (loginForm inline script)
 * ─────────────────────────────────────────────
 */

/* ── Auto redirect jika sudah login ── */
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    // Cek apakah ada halaman tujuan yang tersimpan
    const saved = sessionStorage.getItem('cs_after_login');
    sessionStorage.removeItem('cs_after_login');
    window.location.replace(saved || 'floor.html');
  }
})();

/* ── State ── */
let isRegisterMode = false;

/* ── DOM refs ── */
const authForm      = document.getElementById('authForm');
const submitBtn     = document.getElementById('submitBtn');
const submitLabel   = document.getElementById('submitLabel');
const formTitle     = document.getElementById('formTitle');
const formSubtitle  = document.getElementById('formSubtitle');
const alertBox      = document.getElementById('alertBox');
const toggleMode    = document.getElementById('toggleMode');
const toggleText    = document.getElementById('toggleText');
const usernameField = document.getElementById('usernameField');
const loginExtras   = document.getElementById('loginExtras');
const googleBtn     = document.getElementById('googleBtn');
const togglePwdBtn  = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const eyeIcon       = document.getElementById('eyeIcon');
const forgotLink    = document.getElementById('forgotLink');

/* ── Alert ── */
function showAlert(msg, type = 'error') {
  alertBox.textContent   = msg;
  alertBox.className     = `alert-box alert-${type}`;
  alertBox.style.display = 'block';
}
function hideAlert() {
  alertBox.style.display = 'none';
  alertBox.textContent   = '';
}

/* ── Loading ── */
function setLoading(on) {
  submitBtn.disabled      = on;
  submitBtn.style.opacity = on ? '.7' : '1';
  submitLabel.textContent = on
    ? (isRegisterMode ? 'Creating account…' : 'Logging in…')
    : (isRegisterMode ? 'Create Account' : 'Login');
}

/* ── Toggle Login ↔ Register ── */
function switchMode(toRegister) {
  isRegisterMode = toRegister;
  hideAlert();
  if (toRegister) {
    formTitle.textContent       = 'CREATE ACCOUNT';
    formSubtitle.textContent    = 'Start your coding adventure today!';
    submitLabel.textContent     = 'Create Account';
    toggleText.textContent      = 'Already have an account?';
    toggleMode.textContent      = ' Log in here';
    usernameField.style.display = 'block';
    loginExtras.style.display   = 'none';
  } else {
    formTitle.textContent       = 'WELCOME BACK!';
    formSubtitle.textContent    = 'Log in and continue your coding adventure';
    submitLabel.textContent     = 'Login';
    toggleText.textContent      = "Don't have an account?";
    toggleMode.textContent      = ' Sign up here';
    usernameField.style.display = 'none';
    loginExtras.style.display   = 'flex';
  }
}
toggleMode.addEventListener('click', e => { e.preventDefault(); switchMode(!isRegisterMode); });

/* ── Toggle password visibility ── */
togglePwdBtn.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  eyeIcon.innerHTML  = show
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
});

/* ── Forgot password ── */
forgotLink.addEventListener('click', async e => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  if (!email) { showAlert('Masukkan email kamu dulu, lalu klik Forgot Password.', 'info'); return; }

  forgotLink.textContent        = 'Sending…';
  forgotLink.style.pointerEvents = 'none';

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html',
  });

  forgotLink.textContent        = 'Forgot password?';
  forgotLink.style.pointerEvents = 'auto';

  error
    ? showAlert('Gagal: ' + error.message, 'error')
    : showAlert('Link reset password dikirim! Cek inbox kamu.', 'success');
});

/* ── Form submit (Login & Register) ── */
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert();

  const email    = document.getElementById('email').value.trim();
  const password = passwordInput.value;
  const username = (document.getElementById('username')?.value || '').trim();

  if (!email || !password)         { showAlert('Email dan password wajib diisi.', 'error'); return; }
  if (isRegisterMode && !username) { showAlert('Username wajib diisi.', 'error'); return; }
  if (password.length < 6)        { showAlert('Password minimal 6 karakter.', 'error'); return; }

  setLoading(true);

  try {
    if (isRegisterMode) {
      /* ── REGISTER ── */
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        showAlert('Email sudah terdaftar. Silakan login.', 'error');
      } else {
        // Simpan username ke tabel users jika ada
        if (data.user) {
          await sb.from('users').upsert({
            id: data.user.id, email, username,
          }).catch(() => {}); // aman meski tabel belum ada
        }
        showAlert('Akun berhasil dibuat! Cek email untuk konfirmasi, lalu login.', 'success');
        setTimeout(() => switchMode(false), 2500);
      }

    } else {
      /* ── LOGIN ── */
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Remember me
      if (document.getElementById('rememberMe')?.checked) {
        localStorage.setItem('cs_remember', '1');
      }

      // Redirect — cek apakah ada halaman tujuan
      const saved = sessionStorage.getItem('cs_after_login');
      sessionStorage.removeItem('cs_after_login');
      window.location.replace(saved || 'floor.html');
    }

  } catch (err) {
    let msg = err.message;
    if (msg.includes('Invalid login credentials')) msg = 'Email atau password salah.';
    if (msg.includes('Email not confirmed'))        msg = 'Email belum dikonfirmasi. Cek inbox kamu.';
    if (msg.includes('User already registered'))    msg = 'Email sudah terdaftar. Silakan login.';
    if (msg.includes('Password should be'))         msg = 'Password minimal 6 karakter.';
    showAlert(msg, 'error');
  } finally {
    setLoading(false);
  }
});

/* ── Google OAuth ── */
googleBtn.addEventListener('click', async () => {
  googleBtn.disabled      = true;
  googleBtn.style.opacity = '.7';

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Setelah Google auth selesai → kembali ke index.html → cek session → floor.html
      redirectTo: window.location.origin + '/index.html',
    },
  });

  if (error) {
    showAlert('Google login gagal: ' + error.message, 'error');
    googleBtn.disabled      = false;
    googleBtn.style.opacity = '1';
  }
});