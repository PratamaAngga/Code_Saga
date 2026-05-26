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

        // ambil module yang selesai
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

        // total semua module game
        const TOTAL_MODULES = 42;

        // jumlah selesai
        const completedCount =
            data ? data.length : 0;

        // hitung persen
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

        // ambil username
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

        // tampilkan username
        document
            .getElementById('profileName')
            .textContent =
            data.username;

        // ambil avatar dari metadata
        const avatarId =
            user.user_metadata?.avatar_id;

        console.log(
            'Avatar ID:',
            avatarId
        );

        // cari avatar
        const avatar =
            window.AVATARS.find(
                a => a.id === avatarId
            );

        // tampilkan avatar
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

        // ambil floor terakhir user
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
            .single();

        if (error) {

            console.error(
                'Floor progress error:',
                error
            );

            return;

        }

        // ambil nomor floor
        const floorNumber =
            progress.floors.floor_number;

        // tampilkan ke card
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

        // ambil total_exp dari tabel users
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

        // tampilkan XP
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

        const { data, error } = await sb
            .from('user_module_progress')
            .select('module_id')
            .eq('user_id', user.id)
            .eq('completed', true);

        if (error) {

            console.error(error);
            return;

        }

        const TOTAL_MODULES = 42;

        const completed =
            data.length;

        const percent =
            Math.round(
                (completed / TOTAL_MODULES) * 100
            );

        // text
        document.getElementById(
            'achievementProgressText'
        ).textContent =
            `${completed} / ${TOTAL_MODULES} Modules`;

        // bar
        document.getElementById(
            'achievementProgressFill'
        ).style.width =
            percent + '%';

        // status
        const status =
            document.getElementById(
                'achievementStatus'
            );

        if (completed >= TOTAL_MODULES) {

            status.classList.remove('locked');

            status.classList.add('unlocked');

            status.innerHTML =
                '🏆 Achievement Unlocked';

        }

    } catch (err) {

        console.error(
            'Achievement error:',
            err
        );

    }

}