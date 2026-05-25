import { supabase } from '../config/supabase.js'

// ================================================
// HELPER: Redirect kalau belum login
// ================================================
async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    window.location.href = '/login.html'
    return null
  }
  return session.user
}

// ================================================
// MAIN: Jalankan semua saat halaman load
// ================================================
window.addEventListener('load', async () => {

  // 1. CEK AUTH
  const authUser = await requireAuth()
  if (!authUser) return

  // 2. FETCH SEMUA DATA PARALEL (lebih cepat)
  const [
    { data: userData },
    { data: allFloors },
    { data: progressList },
    { data: allAchievements },
    { data: userAchievements }
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', authUser.id).single(),
    supabase.from('floors').select('*').order('order_index', { ascending: true }),
    supabase.from('user_floor_progress').select('*').eq('user_id', authUser.id),
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', authUser.id)
  ])

  // 3. UPDATE PROFILE DI NAVBAR
    // 1. Ganti tulisan "Profile" jadi username dari database
    // const profileText = document.querySelector('.profile p');
    // if (profileText && userData) {
    //     profileText.textContent = userData.username || 'Hero';
    // }

    // 2. Logika Dropdown
    const profileContainer = document.querySelector('.profile-container');

    // Pastikan dropdown dibuat HANYA SEKALI
    let dropdown = document.querySelector('.profile-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'profile-dropdown';
        dropdown.innerHTML = `
            <a href="profile.html"><i class="bi bi-person-fill"></i> Profile</a>
            <a href="skill-tree.html"><i class="bi bi-diagram-3-fill"></i> Skill Tree</a>
            <hr>
            <button id="btnLogout"><i class="bi bi-box-arrow-right"></i> Logout</button>
        `;
        profileContainer.appendChild(dropdown);
    }

    // Logika klik
    profileContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // INI PENTING: Biar nggak langsung ketutup sama window.onclick
        console.log("Profile clicked!"); // Buat debug di console
        dropdown.classList.toggle('active');
    });

    // Klik di mana saja untuk menutup
    window.addEventListener('click', () => {
        if (dropdown.classList.contains('active')) {
            console.log("Closing dropdown...");
            dropdown.classList.remove('active');
        }
    });

    // Logika Logout tetap sama
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (!error) window.location.href = 'login.html';
        });
    }

  // 4. HITUNG FLOOR AKTIF
  const inProgressEntry = (progressList || []).find(p => p.status === 'available')
  const sortedFloors = [...(allFloors || [])].sort((a, b) => a.order_index - b.order_index)
  const currentFloor = inProgressEntry
    ? allFloors.find(f => f.id === inProgressEntry.floor_id)
    : sortedFloors[0]

  const floorNumber = currentFloor?.floor_number ?? 1

  // Update semua elemen floor label — tambahkan data-floor-label di HTML kamu
  document.querySelectorAll('[data-floor-label]').forEach(el => {
    el.textContent = `Floor ${floorNumber}`
  })

  // 5. ROOM CARDS
  if (currentFloor) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('floor_id', currentFloor.id)
      .order('order_index', { ascending: true })

    const currentProgress = (progressList || []).find(p => p.floor_id === currentFloor.id)
    const currentRoomId = currentProgress?.current_room_id
    const currentRoomOrder = (rooms || []).find(r => r.id === currentRoomId)?.order_index ?? 0

    ;(rooms || []).forEach(room => {
      // Di HTML kamu, tambahkan data-room-type="module/practice/quiz" di setiap .stage-card
      const card = document.querySelector(`[data-room-type="${room.room_type}"]`)
      if (!card) return

      const isDone = currentRoomOrder > room.order_index
      const isCurrent = room.id === currentRoomId
      const isLocked = !isDone && !isCurrent

      card.classList.remove('active', 'locked')
      if (isDone) {
        card.classList.add('active')
      } else if (isLocked) {
        card.classList.add('locked')
      }

      if (!isLocked) {
        card.style.cursor = 'pointer'
        card.addEventListener('click', () => {
          window.location.href = `/floor.html?floor_id=${currentFloor.id}&room_id=${room.id}`
        })
      }
    })
  }

  // 6. OVERALL PROGRESS + ANIMASI
  const totalFloors = (allFloors || []).length
  const doneFloors = (progressList || []).filter(p => p.status === 'done').length
  const targetPercent = totalFloors > 0
    ? Math.round((doneFloors / totalFloors) * 100)
    : 0

  // Update XP display
  const expEl = document.querySelector('.exp')
  if (expEl) expEl.innerHTML = `${userData.total_xp ?? 0} <small>xp</small>`

  // Animasi progress bar — sama persis struktur kode kamu, cuma targetPercent dari DB
  const bar = document.getElementById('barFill')
  const char = document.getElementById('charRunner')
  const text = document.getElementById('percentText')

  setTimeout(() => {
    if (bar) bar.style.width = targetPercent + '%'
    if (char) char.style.left = targetPercent + '%'

    let current = 0
    const interval = setInterval(() => {
      if (current >= targetPercent) {
        clearInterval(interval)
      } else {
        current++
        if (text) text.innerText = current + '%'
      }
    }, 40)
  }, 800)

  // 7. ACHIEVEMENTS
  const unlockedIds = new Set((userAchievements || []).map(u => u.achievement_id))
  const grid = document.querySelector('.achievement-grid')

  if (grid && allAchievements) {
    grid.innerHTML = ''
    allAchievements.forEach(ach => {
      const isUnlocked = unlockedIds.has(ach.id)
      const item = document.createElement('div')
      item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`

      if (isUnlocked) {
        item.innerHTML = `
          <img src="assets/images/achievement - ${ach.icon || 'default'}.png"
               alt="${ach.name}"
               onerror="this.style.display='none'">
          ${ach.name}
        `
        item.title = ach.description || ''
      } else {
        item.innerHTML = `
          <img src="assets/images/achievement - lock.png" alt="Locked">
          ???
        `
      }
      grid.appendChild(item)
    })
  }

  // 8. UPDATE STREAK HARIAN
  await updateStreak(authUser.id, userData)
})

// ================================================
// HELPER: Hitung dan update streak
// ================================================
async function updateStreak(userId, userData) {
  const today = new Date().toISOString().split('T')[0]
  const lastActive = userData.last_active

  // Sudah aktif hari ini, skip
  if (lastActive === today) return

  const diffDays = lastActive
    ? Math.floor((new Date(today) - new Date(lastActive)) / 86400000)
    : 999

  const newStreak = diffDays === 1
    ? (userData.streak_days || 0) + 1
    : 1

  await supabase
    .from('users')
    .update({ streak_days: newStreak, last_active: today })
    .eq('id', userId)
}