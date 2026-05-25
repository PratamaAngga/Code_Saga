/**
 * js/utils/auth.guard.js
 * ─────────────────────────────────────────────
 * Pasang di SEMUA halaman yang butuh login:
 *   floor.html, practice.html, quiz.html, profile.html, boss.html
 *
 * Urutan load di HTML:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="js/config/supabase.js"></script>    ← sb tersedia
 *   <script src="js/utils/auth.guard.js"></script>   ← guard jalan
 *   <script src="js/pages/floor.js"></script>        ← baru logic halaman
 *
 * Jika tidak ada session → redirect ke login.html
 * Jika ada session → lanjut normal, `sb` tetap tersedia
 * ─────────────────────────────────────────────
 */

(async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      // Simpan URL tujuan supaya bisa redirect balik setelah login
      sessionStorage.setItem('cs_after_login', window.location.href);
      window.location.replace('login.html');
    }
    // Ada session → halaman terus dirender normal
  } catch (err) {
    console.error('[auth.guard] Error:', err.message);
    window.location.replace('login.html');
  }
})();