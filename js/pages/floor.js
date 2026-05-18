/* ============================================
   SUPABASE INIT
============================================ */
const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ============================================
   FLOOR & MODULE DATA
============================================ */
const FLOORS = [
  {
    id:1, name:'Floor 1',
    title:'FLOOR 1: JAVA BASICS',
    desc:'Start your journey by learning the basic building blocks of Java programming.',
    unlocked: true,
    modules: [
      { id:1,  num:'#1', name:'Introduction to Variables',   desc:'Learn what variables are, how to declare them, and store data in Java.',          videoId:'XzOwuNX3dIE', xp:10, type:'video' },
      { id:2,  num:'#2', name:'Java Data Types',             desc:'Understand different data types in Java and when to use them.',                   videoId:'WPvGqX-TXP0', xp:10, type:'video' }, 
      { id:3,  num:'#3', name:'Working with Variables',      desc:'Practice using variables in real code examples.',                                 videoId:'RYi-ZiWjnB8', xp:10, type:'video' }, 
      { id:4,  num:'#4', name:'Type Casting',                desc:'Learn how to convert one data type into another.',                                videoId:'FaRqY5pMU_w', xp:10, type:'video' }, 
      { id:5,  num:'#5', name:'Constants and Final Keyword', desc:'Learn about constants and how the final keyword works.',                          videoId:'UfEv1NFXZSU', xp:10, type:'video' }, 
      { id:6,  num:'#6', name:'Practice Quiz',               desc:'Test your understanding with a fun quiz challenge!',                              videoId:null,          xp:20, type:'quiz'  },
    ],
  },
  {
    id:2, name:'Floor 2',
    title:'FLOOR 2: CONTROL FLOW',
    desc:'Master conditional statements and loops to control program flow.',
    unlocked: false,
    modules: [
      { id:7,  num:'#1', name:'If-Else Statements',  desc:'Learn how to make decisions in your code.',         videoId:'BfVrEMmCqBI', xp:10, type:'video' }, 
      { id:8,  num:'#2', name:'Switch Statements',   desc:'Use switch to handle multiple conditions cleanly.', videoId:'mA23x39DjbI', xp:10, type:'video' }, 
      { id:9,  num:'#3', name:'For Loops',           desc:'Repeat code efficiently using for loops.',          videoId:'x7Xzvm0iLCI', xp:10, type:'video' }, 
      { id:10, num:'#4', name:'While & Do-While',    desc:'Learn while and do-while loops.',                   videoId:'pTnmGWLnRKE', xp:10, type:'video' }, 
      { id:11, num:'#5', name:'Break & Continue',    desc:'Control loop execution with break and continue.',   videoId:'QXa_6jPdL78', xp:10, type:'video' }, 
      { id:12, num:'#6', name:'Practice Quiz',       desc:'Test your control flow knowledge!',                 videoId:null,          xp:20, type:'quiz'  },
    ],
  },
  {
    id:3, name:'Floor 3',
    title:'FLOOR 3: METHODS & ARRAYS',
    desc:'Write reusable code with methods and organize data with arrays.',
    unlocked: false,
    modules: [
      { id:13, num:'#1', name:'Introduction to Methods', desc:'Define and call methods in Java.',              videoId:'pTuSP9Cg6tA', xp:10, type:'video' }, 
      { id:14, num:'#2', name:'Method Parameters',       desc:'Pass data to methods and return results.',      videoId:'i6az_GkCPtg', xp:10, type:'video' }, 
      { id:15, num:'#3', name:'Arrays Basics',           desc:'Store multiple values in a single variable.',   videoId:'eNPX2pTiaHI', xp:10, type:'video' }, 
      { id:16, num:'#4', name:'Looping through Arrays',  desc:'Iterate over arrays using for-each loops.',     videoId:'K9kOmjkq-nA', xp:10, type:'video' }, 
      { id:17, num:'#5', name:'2D Arrays',               desc:'Work with multi-dimensional arrays.',           videoId:'AEfBCfutJcM', xp:10, type:'video' }, 
      { id:18, num:'#6', name:'Practice Quiz',           desc:'Apply your methods and arrays knowledge!',      videoId:null,          xp:20, type:'quiz'  },
    ],
  },
];

/* ============================================
   STATE
============================================ */
let activeFloor      = 0;
let currentUser      = null;
let completedModules = new Set();
let openMod          = null;

/* ============================================
   INIT — jalankan segera setelah DOM ready
============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Cek login
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  // Profile
  const meta = currentUser.user_metadata || {};
  const name = meta.username || meta.full_name || currentUser.email.split('@')[0];
  document.getElementById('profileName').textContent = name;
  if (meta.avatar_url) {
    document.getElementById('avatarWrap').innerHTML =
      `<img src="${meta.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    document.getElementById('avatarWrap').textContent = name.charAt(0).toUpperCase();
  }

  // Load progress
  try {
    const { data } = await sb.from('user_progress')
      .select('module_id').eq('user_id', currentUser.id).eq('completed', true);
    if (data) data.forEach(r => completedModules.add(r.module_id));
  } catch(e) { console.warn('Progress load:', e.message); }

  // Unlock floors
  FLOORS.forEach((f, i) => {
    if (i === 0) return;
    f.unlocked = FLOORS[i-1].modules.every(m => completedModules.has(m.id));
  });

  // Render
  renderTabs();
  renderFloor(0);
});

/* ============================================
   RENDER TABS
============================================ */
function renderTabs() {
  const container = document.getElementById('floorTabs');
  container.innerHTML = '';
  FLOORS.forEach((floor, i) => {
    const btn = document.createElement('button');
    btn.className = `tab-btn${i === activeFloor ? ' active' : ''}${!floor.unlocked ? ' disabled' : ''}`;
    btn.disabled  = !floor.unlocked;
    btn.innerHTML = floor.unlocked ? floor.name : `${floor.name} 🔒`;
    btn.onclick = () => {
      activeFloor = i;
      document.querySelectorAll('.tab-btn').forEach((b,j) => {
        b.classList.toggle('active', j === i);
      });
      renderFloor(i);
    };
    container.appendChild(btn);
  });
}

/* ============================================
   RENDER FLOOR
============================================ */
function renderFloor(idx) {
  const floor = FLOORS[idx];

  // Left panel
  document.getElementById('floorBannerTitle').textContent = floor.title;
  document.getElementById('floorBannerDesc').textContent  = floor.desc;

  // Progress
  const done = floor.modules.filter(m => completedModules.has(m.id)).length;
  document.getElementById('progressText').textContent = `${done} / ${floor.modules.length}`;

  // Bottom hint
  const next = FLOORS[idx + 1];
  const hint = document.getElementById('bottomHint');
  if (next) {
    hint.innerHTML = `💡 Complete all modules to unlock <strong>${next.name}</strong>! <span class="runner-emoji">🏃</span>`;
  } else {
    hint.innerHTML = `🏆 Congrats! You completed all floors!`;
  }

  // Module list
  const list = document.getElementById('moduleList');
  list.innerHTML = '';

  floor.modules.forEach((mod, i) => {
    const isDone   = completedModules.has(mod.id);
    const prevDone = i === 0 || completedModules.has(floor.modules[i-1].id);
    const isActive = !isDone && prevDone && floor.unlocked;
    const isLocked = !isDone && !prevDone;
    const isLast   = i === floor.modules.length - 1;

    // dot
    const dotCls   = isDone ? 'done' : isActive ? 'active' : 'locked';
    const dotLabel = isDone ? '✓' : isActive ? (i+1) : '🔒';

    // thumb
    const thumbHTML = mod.type === 'quiz'
      ? `<div class="thumb" style="background:#1565C0;font-size:2rem;">📝</div>`
      : `<div class="thumb">
           <img src="https://img.youtube.com/vi/${mod.videoId}/mqdefault.jpg" alt=""
                onerror="this.style.display='none'">
           <div class="thumb-overlay">
             <svg viewBox="0 0 24 24">
               <circle cx="12" cy="12" r="12" fill="white" opacity=".88"/>
               <polygon points="10,8 17,12 10,16" fill="#FF0000"/>
             </svg>
           </div>
         </div>`;

    // right
    let rightHTML = '';
    if (isDone)        rightHTML = `<div class="done-badge">✅ Done</div>`;
    else if (isActive) rightHTML = `<button class="watch-btn" data-mod-id="${mod.id}">▶ Watch Now</button>`;
    else               rightHTML = `<span class="lock-ico">🔒</span>`;

    const row = document.createElement('div');
    row.className = 'module-row';
    row.innerHTML = `
      <div class="tl-col">
        <div class="tl-dot ${dotCls}">${dotLabel}</div>
        <div class="tl-line ${isDone ? 'done' : ''} ${isLast ? 'hidden' : ''}"></div>
      </div>
      <div class="module-card ${isLocked ? 'locked' : ''} ${isActive ? 'card-active' : ''} ${isDone ? 'card-done' : ''}"
           style="animation-delay:${i * .05}s">
        ${thumbHTML}
        <div class="card-info">
          <div class="card-num">${mod.num}</div>
          <div class="card-name">${mod.name}</div>
          <div class="card-desc">${mod.desc}</div>
          <div class="card-xp">⭐ +${mod.xp} XP</div>
        </div>
        <div class="card-right">${rightHTML}</div>
      </div>`;

    // events
    row.querySelector('.module-card').addEventListener('click', () => {
      if (isLocked) return;
      openModal(mod);
    });
    const wb = row.querySelector('.watch-btn');
    if (wb) wb.addEventListener('click', e => { e.stopPropagation(); openModal(mod); });

    list.appendChild(row);
  });
}

/* ============================================
   MODAL
============================================ */
function openModal(mod) {
  openMod = mod;
  document.getElementById('modalTitle').textContent = mod.name;
  document.getElementById('modalDesc').textContent  = mod.desc;
  document.getElementById('modalXP').textContent    = mod.xp;

  const isDone = completedModules.has(mod.id);
  const btn = document.getElementById('btnMarkDone');
  btn.disabled    = isDone;
  btn.textContent = isDone ? '✅ Already Completed!' : '✅ Mark as Done & Earn XP';

  const frame = document.getElementById('ytFrame');
  if (mod.videoId) {
    frame.src = `https://www.youtube.com/embed/${mod.videoId}?autoplay=1&rel=0`;
  } else {
    frame.src = '';
  }

  document.getElementById('videoModal').classList.add('open');
}

function closeModal() {
  document.getElementById('ytFrame').src = '';
  document.getElementById('videoModal').classList.remove('open');
  openMod = null;
}

document.getElementById('modalClose').onclick = closeModal;
document.getElementById('videoModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

/* ============================================
   MARK AS DONE
============================================ */
document.getElementById('btnMarkDone').addEventListener('click', async () => {
  if (!openMod || completedModules.has(openMod.id)) return;
  const btn = document.getElementById('btnMarkDone');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    const { error } = await sb.from('user_progress').upsert({
      user_id:      currentUser.id,
      module_id:    openMod.id,
      floor_id:     FLOORS[activeFloor].id,
      completed:    true,
      completed_at: new Date().toISOString(),
    });
    if (error) throw error;

    // XP (opsional — skip jika RPC belum dibuat)
    await sb.rpc('add_xp', { p_user_id: currentUser.id, p_xp: openMod.xp }).catch(() => {});

    completedModules.add(openMod.id);
    btn.textContent = '✅ XP Earned!';

    setTimeout(() => {
      closeModal();
      FLOORS.forEach((f, i) => {
        if (i === 0) return;
        f.unlocked = FLOORS[i-1].modules.every(m => completedModules.has(m.id));
      });
      renderTabs();
      renderFloor(activeFloor);
    }, 800);
  } catch(err) {
    btn.disabled = false;
    btn.textContent = '✅ Mark as Done & Earn XP';
    alert('Gagal: ' + err.message);
  }
});

/* ============================================
   PROFILE + LOGOUT
============================================ */
document.getElementById('profileBtn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('profileBtn').classList.toggle('open');
});
document.addEventListener('click', () => {
  document.getElementById('profileBtn').classList.remove('open');
});
document.getElementById('logoutBtn').addEventListener('click', async e => {
  e.preventDefault();
  await sb.auth.signOut();
  window.location.href = 'login.html';
});