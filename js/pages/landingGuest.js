document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');

    // 1. Interaksi Tombol Register / Login
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            // Memberikan efek "tekan" sedikit lebih lama sebelum pindah halaman
            loginBtn.style.transform = "translateY(5px)";
            loginBtn.style.boxShadow = "0 0px 0 #8b0000";

            setTimeout(() => {
                // Ganti 'login.html' dengan path halaman login kamu
                window.location.href = 'login.html'; 
            }, 150);
        });
    }

    // 2. Animasi melayang halus (Hover) untuk Boss Image
    const bossImg = document.querySelector('.boss-card img');
    if (bossImg) {
        bossImg.addEventListener('mouseover', () => {
            bossImg.style.transition = "transform 0.3s ease";
            bossImg.style.transform = "scale(1.05) rotate(2deg)";
        });

        bossImg.addEventListener('mouseout', () => {
            bossImg.style.transform = "scale(1) rotate(0deg)";
        });
    }

    // 3. Efek mengetik sederhana untuk teks Hero (Optional)
    // Jika kamu ingin teks "CODE HERO!" muncul belakangan
    const codeHeroText = document.querySelector('.text-danger.fw-bold');
    if (codeHeroText) {
        codeHeroText.style.opacity = '0';
        setTimeout(() => {
            codeHeroText.style.transition = 'opacity 1s ease-in-out';
            codeHeroText.style.opacity = '1';
        }, 1000);
    }

    document.addEventListener('DOMContentLoaded', async () => {
 
  // ── Jika sudah login → langsung ke floor.html ──
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      window.location.replace('floor.html');
      return;
    }
  } catch (e) {
    console.warn('Session check error:', e.message);
  }
 
  // ── Tombol Register / Login ──
  // landingGuest.html punya tombol dengan id="loginBtn"
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
});
 
});

