/* ================================================
   SUPABASE INIT
================================================ */
const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ================================================
   AVATAR DATA
================================================ */
const AVATARS = [
  // ── Kategori: Hero ──────────────────────────────────
  // ← GANTI src dengan path asset avatarmu
  { id:'hero_1',    name:'Knight',   src:'assets/icons/avatars/1.png',   category:'Hero'    },
  { id:'hero_2',    name:'Wizard',   src:'assets/icons/avatars/2.png',   category:'Hero'    },
  { id:'hero_3',    name:'Archer',   src:'assets/icons/avatars/3.png',   category:'Hero'    },
  { id:'hero_4',    name:'Warrior',  src:'assets/icons/avatars/4.png',   category:'Hero'    },
  { id:'hero_5',    name:'Mage',     src:'assets/icons/avatars/5.png',   category:'Hero'    },
  { id:'hero_6',    name:'King',    src:'assets/icons/avatars/6.png',   category:'Hero'    },
  { id:'hero_7',    name:'Rogue',    src:'assets/icons/avatars/7.png',   category:'Hero'    },
  { id:'hero_8',    name:'Thor',    src:'assets/icons/avatars/8.png',   category:'Hero'    },
  { id:'hero_9',    name:'Nightshade',    src:'assets/icons/avatars/9.png',   category:'Hero'    },

  // ── Kategori: Monster ───────────────────────────────
  { id:'mon_1',     name:'Octo',    src:'assets/icons/avatars/10.png',    category:'Monster' },
  { id:'mon_2',     name:'Phantom',   src:'assets/icons/avatars/11.png',   category:'Monster' },
  { id:'mon_3',     name:'Gooey',    src:'assets/icons/avatars/12.png',    category:'Monster' },
  { id:'mon_4',     name:'Rikkit',   src:'assets/icons/avatars/13.png',   category:'Monster' },
  { id:'mon_5',     name:'Grumpus',   src:'assets/icons/avatars/14.png',   category:'Monster' },
  { id:'mon_6',     name:'Gnasher',   src:'assets/icons/avatars/15.png',   category:'Monster' },
  { id:'mon_7',     name:'Tiamat',   src:'assets/icons/avatars/16.png',   category:'Monster' },
  { id:'mon_8',     name:'Casper',   src:'assets/icons/avatars/17.png',   category:'Monster' },
  { id:'mon_9',     name:'Saphira',   src:'assets/icons/avatars/18.png',   category:'Monster' },

  // ── Kategori: Animal ────────────────────────────────
  { id:'ani_1',     name:'Vixen',      src:'assets/icons/avatars/19.png',      category:'Animal'  },
  { id:'ani_2',     name:'Lynx',      src:'assets/icons/avatars/20.png',      category:'Animal'  },
  { id:'ani_3',     name:'Swift',    src:'assets/icons/avatars/21.png',    category:'Animal'  },
  { id:'ani_4',     name:'Bao Bao',    src:'assets/icons/avatars/22.png',    category:'Animal'  },
  { id:'ani_5',     name:'Snift',    src:'assets/icons/avatars/23.png',    category:'Animal'  },
  { id:'ani_6',     name:'Stoper',    src:'assets/icons/avatars/24.png',    category:'Animal'  },
  { id:'ani_7',     name:'Gui',    src:'assets/icons/avatars/25.png',    category:'Animal'  },
  { id:'ani_8',     name:'Cookie',    src:'assets/icons/avatars/26.png',    category:'Animal'  },
  { id:'ani_9',     name:'Ekhpant',    src:'assets/icons/avatars/27.png',    category:'Animal'  },
];

/* Emoji fallback — ditampilkan jika file gambar belum ada */
const AVATAR_FALLBACK = {
  hero_1:'🗡️', hero_2:'🧙', hero_3:'🏹', hero_4:'⚔️', hero_5:'✨', hero_6:'🗝️',
  mon_1:'🟢',  mon_2:'🐉',  mon_3:'👻',  mon_4:'👺',
  ani_1:'🦊',  ani_2:'🐱',  ani_3:'🐰',  ani_4:'🐼',
};

/* ================================================
   STATE
================================================ */
let currentUser    = null;
let selectedAvatar = null; // id string
let pendingAvatar  = null;
let currentCategory = null;

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  loadProfile();
  loadStats();
  buildAvatarPicker();
});

/* ================================================
   LOAD PROFILE
================================================ */
async function loadProfile() {

  // ambil data user dari tabel users
  const { data: userData, error } = await sb
    .from('users')
    .select('username, total_exp')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    console.log(error);
    return;
  }

  const meta = currentUser.user_metadata || {};

  // username
  const name =
    userData.username ||
    meta.username ||
    currentUser.email.split('@')[0];

  document.getElementById('playerName').textContent = name;

  // email
  document.getElementById('playerEmail').textContent =
    currentUser.email;

  document.getElementById('inputUsername').value =
    name;

  document.getElementById('inputEmail').value =
    currentUser.email;

  // ============================================
// XP & LEVEL
// ============================================

const xp = userData.total_exp || 0;

// max xp progress bar
const MAX_XP = 2000;

// level tiap 200 xp
const level =
  Math.floor(xp / 200) + 1;

// persen progress bar
const xpPercent =
  Math.min((xp / MAX_XP) * 100, 100);

// tampilkan xp atas
document.getElementById('topbarXP').textContent =
  xp;

// badge level
document.getElementById('levelBadge').textContent =
  'LV ' + level;

// tulisan progress
document.getElementById('xpBarLabel').textContent =
  `${xp} / ${MAX_XP}`;

// isi progress bar
document.getElementById('xpBarFill').style.width =
  xpPercent + '%';

  // ============================================
  // AVATAR
  // ============================================

  const savedAvatarId =
    meta.avatar_id || null;

  if (savedAvatarId) {

    selectedAvatar = savedAvatarId;

    const av =
      AVATARS.find(a => a.id === savedAvatarId);

    if (av) {
      setAvatarDisplay(av);
    }
  }
}
/* ================================================
   LOAD STATS FROM SUPABASE
================================================ */
async function loadStats() {
  try {
    // Modules completed
    const { data: progress } = await sb
      .from('user_progress').select('module_id, floor_id')
      .eq('user_id', currentUser.id).eq('completed', true);

    const modules   = progress ? progress.length : 0;
    const floorsSet = progress ? new Set(progress.map(p => p.floor_id)).size : 0;
    document.getElementById('statModules').textContent = modules;
    document.getElementById('statFloor').textContent   = floorsSet;

    // Quiz passed
    const { data: quizData } = await sb
      .from('quiz_results').select('id')
      .eq('user_id', currentUser.id).eq('passed', true);
    document.getElementById('statQuiz').textContent = quizData ? quizData.length : 0;

    // Streak from user_metadata
    const meta = currentUser.user_metadata || {};
    document.getElementById('statStreak').textContent = meta.streak || 0;

    // Achievements
    updateAchievements(modules, quizData ? quizData.length : 0, meta.streak || 0);
  } catch(e) { console.warn('Stats load:', e.message); }
}

function updateAchievements(modules, quizPassed, streak) {
  const row = document.getElementById('badgeRow');
  row.innerHTML = '';
  const badges = [
    { label: '🎓 First Module',  earned: modules >= 1  },
    { label: '✅ First Quiz',    earned: quizPassed >= 1 },
    { label: '🔥 Streak 3',      earned: streak >= 3    },
    { label: '📚 5 Modules',     earned: modules >= 5   },
    { label: '🏆 Floor 1 Done',  earned: modules >= 6   },
    { label: '⚡ Java Basics',   earned: quizPassed >= 1 },
  ];
  badges.forEach(b => {
    const el = document.createElement('div');
    el.className = 'badge-pill' + (b.earned ? '' : ' locked');
    el.textContent = b.earned ? b.label : '🔒 ' + b.label.split(' ').slice(1).join(' ');
    row.appendChild(el);
  });
}

/* ================================================
   AVATAR PICKER
================================================ */
function buildAvatarPicker() {
  // Categories
  const cats = [...new Set(AVATARS.map(a => a.category))];
  currentCategory = cats[0];
  const catsEl = document.getElementById('avatarCats');
  cats.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'cat-tab' + (i === 0 ? ' active' : '');
    btn.textContent = c;
    btn.onclick = () => {
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = c;
      renderAvatarGrid(c);
    };
    catsEl.appendChild(btn);
  });

  // Total count
  document.getElementById('pickerCount').textContent = AVATARS.length + ' avatars';

  renderAvatarGrid(cats[0]);
}

function renderAvatarGrid(category) {
  const grid = document.getElementById('avatarGrid');
  grid.innerHTML = '';
  const filtered = AVATARS.filter(a => a.category === category);

  filtered.forEach(av => {
    const item = document.createElement('div');
    item.className = 'avatar-item' + (av.id === selectedAvatar ? ' selected' : '');
    item.dataset.id = av.id;

    // Try image, fallback to emoji
    const fallback = AVATAR_FALLBACK[av.id] || '🎭';
    item.innerHTML = `
      <img src="${av.src}" alt="${av.name}"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
      <div class="avatar-placeholder" style="display:none;background:#f0f0f0;border-radius:50%;">${fallback}</div>
      <div class="avatar-item-name">${av.name}</div>`;

    item.onclick = () => selectAvatarItem(av.id);
    grid.appendChild(item);
  });
}

function selectAvatarItem(id) {
  pendingAvatar = id;
  document.querySelectorAll('.avatar-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
  const btn = document.getElementById('btnSelectAvatar');
  btn.classList.add('ready');
  const av = AVATARS.find(a => a.id === id);
  btn.textContent = `Use "${av ? av.name : ''}"`;
}

async function applyAvatar() {
  if (!pendingAvatar) return;
  const btn = document.getElementById('btnSelectAvatar');
  btn.textContent = 'Saving…'; btn.disabled = true;

  try {
    const { error } = await sb.auth.updateUser({
      data: { avatar_id: pendingAvatar }
    });
    if (error) throw error;

    selectedAvatar = pendingAvatar;
    const av = AVATARS.find(a => a.id === pendingAvatar);
    if (av) setAvatarDisplay(av);

    btn.classList.remove('ready');
    btn.textContent = 'Use This Avatar';
    btn.disabled = false;
    showToast('Avatar updated!', 'success');
  } catch(e) {
    btn.textContent = 'Use This Avatar';
    btn.disabled = false;
    showToast('Failed: ' + e.message, 'error');
  }
}

function setAvatarDisplay(av) {
  const wrap = document.getElementById('avatarDisplay');
  const fallback = AVATAR_FALLBACK[av.id] || '🎭';
  wrap.innerHTML = `
    <img src="${av.src}" alt="${av.name}" style="width:100%;height:100%;object-fit:cover;image-rendering:pixelated;"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
    <span style="display:none;font-size:3rem;">${fallback}</span>`;
}

/* ================================================
   SAVE USERNAME
================================================ */
async function saveUsername() {
  const btn      = document.getElementById('btnSaveUsername');
  const alertEl  = document.getElementById('usernameAlert');
  const username = document.getElementById('inputUsername').value.trim();

  alertEl.style.display = 'none';

  if (username.length < 3) {
    showFormAlert(alertEl, 'Username minimal 3 karakter.', 'error'); return;
  }
  if (username.length > 24) {
    showFormAlert(alertEl, 'Username maksimal 24 karakter.', 'error'); return;
  }

  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    const { error } = await sb.auth.updateUser({ data: { username } });
    if (error) throw error;

    // Update tabel users jika ada
    await sb.from('users').update({ username }).eq('id', currentUser.id).catch(() => {});

    document.getElementById('playerName').textContent = username;
    showFormAlert(alertEl, 'Username updated!', 'success');
    showToast('Username saved!', 'success');
  } catch(e) {
    showFormAlert(alertEl, 'Failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Username';
  }
}

/* ================================================
   SAVE PASSWORD
================================================ */
async function savePassword() {
  const btn       = document.getElementById('btnSavePassword');
  const alertEl   = document.getElementById('passwordAlert');
  const newPw     = document.getElementById('inputNewPw').value;
  const confirmPw = document.getElementById('inputConfirmPw').value;

  alertEl.style.display = 'none';

  if (newPw.length < 6) {
    showFormAlert(alertEl, 'Password minimal 6 karakter.', 'error'); return;
  }
  if (newPw !== confirmPw) {
    showFormAlert(alertEl, 'Password tidak cocok.', 'error'); return;
  }

  btn.disabled = true; btn.textContent = '🔑 Saving…';

  try {
    const { error } = await sb.auth.updateUser({ password: newPw });
    if (error) throw error;

    document.getElementById('inputNewPw').value     = '';
    document.getElementById('inputConfirmPw').value = '';
    document.getElementById('pwFill').style.width   = '0%';
    document.getElementById('pwLabel').textContent  = '';
    showFormAlert(alertEl, 'Password updated successfully!', 'success');
    showToast('Password changed! 🔐', 'success');
  } catch(e) {
    showFormAlert(alertEl, 'Failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '🔑 Update Password';
  }
}

/* ================================================
   HELPERS
================================================ */
function showFormAlert(el, msg, type) {
  el.textContent  = msg;
  el.className    = 'alert-box alert-' + type;
  el.style.display = 'block';
}

function togglePw(id, btn) {
  const el = document.getElementById(id);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

function checkStrength(val) {
  let s = 0;
  if (val.length >= 6)  s++;
  if (val.length >= 10) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const pct   = (s / 5) * 100;
  const color = s <= 1 ? '#EF5350' : s <= 3 ? '#FFA726' : '#66BB6A';
  const label = s <= 1 ? 'Weak 😬' : s <= 3 ? 'Medium 🙂' : 'Strong 💪';
  document.getElementById('pwFill').style.width      = pct + '%';
  document.getElementById('pwFill').style.background = color;
  document.getElementById('pwLabel').textContent     = val.length ? label : '';
  document.getElementById('pwLabel').style.color     = color;
}

/* ── Toast ── */
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type === 'success' ? 'success-toast' : type === 'error' ? 'error-toast' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── Confirm modal ── */
function confirmLogout() {
  document.getElementById('confirmIcon').textContent  = '🚪';
  document.getElementById('confirmTitle').textContent = 'Logout?';
  document.getElementById('confirmMsg').textContent   = 'Your progress is saved. See you next time!';
  document.getElementById('btnConfirmAction').textContent = '✓ Logout';
  document.getElementById('btnConfirmAction').onclick = doLogout;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
}
async function doLogout() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}