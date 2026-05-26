// ============================================
// INIT PAGE
// ============================================

window.addEventListener('load', async () => {

    await loadOverallProgress();

    await loadUserProfile();

    await loadCurrentFloor();

    await loadTotalXP();

    await loadAchievementProgress();

});

// ============================================
// LOAD OVERALL PROGRESS
// ============================================

async function loadOverallProgress() {

    try {

        const {
            data: { user }
        } = await sb.auth.getUser();

        if (!user) return;

        // Ambil modul yang selesai
        const { data, error } = await sb
            .from('user_module_progress')
            .select('module_id')
            .eq('user_id', user.id)
            .eq('completed', true);

        if (error) {

            console.error(
                'Progress fetch error:',
                error
            );

            return;

        }

        // Total semua module game
        const TOTAL_MODULES = 42;

        // Jumlah selesai
        const completedCount =
            data ? data.length : 0;

        // Hitung persen
        const targetPercent =
            Math.round(
                (completedCount / TOTAL_MODULES) * 100
            );

        console.log(
            'Completed:',
            completedCount,
            '/',
            TOTAL_MODULES
        );

        animateProgress(targetPercent);

    } catch (err) {

        console.error(
            'Progress load error:',
            err
        );

    }

}

// ============================================
// ANIMATE PROGRESS
// ============================================

function animateProgress(targetPercent) {

    const bar =
        document.getElementById('barFill');

    const char =
        document.getElementById('charRunner');

    const text =
        document.getElementById('percentText');

    setTimeout(() => {

        bar.style.width =
            targetPercent + '%';

        char.style.left =
            targetPercent + '%';

        let current = 0;

        const interval = setInterval(() => {

            if (current >= targetPercent) {

                clearInterval(interval);

            } else {

                current++;

                text.innerText =
                    current + '%';

            }

        }, 30);

    }, 500);

}

// ============================================
// PROFILE BUTTON
// ============================================

document
    .getElementById('profileToggle')
    ?.addEventListener('click', () => {

        window.location.href =
            'profile.html';

    });

// ============================================
// START GAME BUTTON
// ============================================

document
    .querySelector('.btn-start')
    ?.addEventListener('click', () => {

        window.location.href =
            'floor.html';

    });

// ============================================
// LOAD USER PROFILE
// ============================================

async function loadUserProfile() {

    try {

        const {
            data: { user }
        } = await sb.auth.getUser();

        if (!user) return;

        // Ambil username
        const { data, error } = await sb
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single();

        if (error) {

            console.error(
                'Profile fetch error:',
                error
            );

            return;

        }

        // Tampilkan username
        document
            .getElementById('profileName')
            .textContent =
            data.username;

        // Ambil avatar dari metadata
        const avatarId =
            user.user_metadata?.avatar_id;

        console.log(
            'Avatar ID:',
            avatarId
        );

        // Cari avatar
        const avatar =
            window.AVATARS.find(
                a => a.id === avatarId
            );

        // Tampilkan avatar
        if (avatar) {

            document
                .getElementById('profileAvatarImg')
                .src =
                avatar.src;

        }

    } catch (err) {

        console.error(
            'Load profile error:',
            err
        );

    }

}

// ============================================
// LOAD CURRENT FLOOR
// ============================================

async function loadCurrentFloor() {

    try {

        const {
            data: { user }
        } = await sb.auth.getUser();

        if (!user) return;

        // Ambil floor terakhir user
        const { data: progress, error } = await sb
            .from('user_floor_progress')
            .select(`
                floor_id,
                floors (
                    floor_number
                )
            `)
            .eq('user_id', user.id)
            .order('floor_id', {
                ascending: false
            })
            .limit(1)
            .maybeSingle(); // Menggunakan maybeSingle agar aman jika data masih kosong

        if (error || !progress) {

            console.warn(
                'Floor progress masih kosong atau error:',
                error?.message
            );

            return;

        }

        // Ambil nomor floor
        const floorNumber =
            progress.floors.floor_number;

        // Tampilkan ke card
        document.getElementById(
            'currentFloorText'
        ).textContent =
            `Floor ${floorNumber}`;

    } catch (err) {

        console.error(
            'Load floor error:',
            err
        );

    }

}

// ============================================
// LOAD TOTAL EXP
// ============================================

async function loadTotalXP() {

    try {

        const {
            data: { user }
        } = await sb.auth.getUser();

        if (!user) return;

        // Ambil total_exp dari tabel users
        const { data, error } = await sb
            .from('users')
            .select('total_exp')
            .eq('id', user.id)
            .single();

        if (error) {

            console.error(
                'XP fetch error:',
                error
            );

            return;

        }

        // Tampilkan XP
        document.getElementById(
            'totalXPText'
        ).innerHTML =
            `${data.total_exp} <small>xp</small>`;

    } catch (err) {

        console.error(
            'Load XP error:',
            err
        );

    }

}

// ============================================
// LOAD ACHIEVEMENT
// ============================================

async function loadAchievementProgress() {

    try {

        const {
            data: { user }
        } = await sb.auth.getUser();

        if (!user) return;

        // 1. Ambil jumlah module yang diselesaikan user
        const { data: modulesData, error: modulesError } = await sb
            .from('user_module_progress')
            .select('module_id')
            .eq('user_id', user.id)
            .eq('completed', true);

        if (modulesError) {

            console.error('Gagal mengambil progress modul:', modulesError.message);
            return;

        }

        const TOTAL_MODULES = 42;
        const completed = modulesData ? modulesData.length : 0;
        const percent = Math.round((completed / TOTAL_MODULES) * 100);

        // Render teks progres modul
        document.getElementById('achievementProgressText').textContent =
            `${completed} / ${TOTAL_MODULES} Modules`;

        // Render lebar progress bar
        document.getElementById('achievementProgressFill').style.width =
            percent + '%';

        // 2. [IDEMU!] Cek status pertempuran Boss di Room ID 15 di tabel user_floor_progress
        const { data: bossProgress, error: bossError } = await sb
            .from('user_floor_progress')
            .select('score, status')
            .eq('user_id', user.id)
            .eq('current_room_id', 15) // Target spesifik Room ID 15 sesuai usulanmu
            .maybeSingle(); // Menggunakan maybeSingle agar tidak throw error jika data kosong

        if (bossError) {
            console.warn('Gagal memverifikasi status boss:', bossError.message);
        }

        // 3. Evaluasi Syarat Kelulusan Achievement
        // Syarat A: Semua 42 modul harus selesai
        const isAllModulesDone = completed >= TOTAL_MODULES;

        // Syarat B: Boss Room 15 berstatus 'completed' dan skor >= 75
        const isBossDefeated = bossProgress && 
                               bossProgress.status === 'completed' && 
                               (bossProgress.score >= 75);

        // Keduanya wajib terpenuhi untuk membuka lencana
        const isUnlocked = isAllModulesDone && isBossDefeated;

        const status = document.getElementById('achievementStatus');
        const badgeImg = document.querySelector('.achievement-badge-img');

        if (isUnlocked) {

            // JIKA UNLOCKED:
            status.classList.remove('locked');
            status.classList.add('unlocked');
            status.innerHTML = '🏆 Achievement Unlocked';

            // Kembalikan gambar ke warna aslinya (filter grayscale dinonaktifkan)
            if (badgeImg) {
                badgeImg.style.filter = 'none';
                badgeImg.style.opacity = '1';
            }

        } else {

            // JIKA LOCKED:
            status.classList.remove('unlocked');
            status.classList.add('locked');
            status.innerHTML = '🔒 Locked Achievement';

            // Ubah gambar menjadi abu-abu (grayscale) dan sedikit transparan
            if (badgeImg) {
                badgeImg.style.filter = 'grayscale(100%)';
                badgeImg.style.opacity = '0.5';
            }

        }

    } catch (err) {

        console.error(
            'Achievement error:',
            err
        );

    }

}