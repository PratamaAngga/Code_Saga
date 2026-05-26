/* ================================================
   SUPABASE INIT
================================================ */
const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ================================================
   BOSS CONFIG
   - XP_PER_CORRECT  : XP didapat per jawaban benar
   - BOSS_ROOM_ID    : default room_id boss (room_id=7 sesuai SQL)
   - BOSS_MAX_HP     : HP awal bos (di-override dari rooms.hp_limit jika ada)
   - PLAYER_MAX_HP   : HP awal player
   - DAMAGE_TO_PLAYER: damage ke player per jawaban salah (bisa override dari soal)
   - ACHIEVEMENT_ID  : id achievement "Code Knight"
   - BOSS_MAX_XP     : batas maksimal XP yang bisa didapat di room boss
================================================ */
const XP_PER_CORRECT    = 5;
const BOSS_ROOM_ID      = 7;
const BOSS_MAX_HP       = 100;
const PLAYER_MAX_HP     = 100;
const DAMAGE_TO_PLAYER  = 20;
const ACHIEVEMENT_ID    = 1;   // id achievement "Code Knight"
const BOSS_MAX_XP       = 100; // maks XP dari room boss

/* ================================================
   STATE
================================================ */
let questions      = [];
let currentIdx     = 0;
let selectedAnswer = null;
let answers        = [];
let timerInterval  = null;
let startTime      = null;
let currentUser    = null;
let floorId        = 1;
let roomId         = BOSS_ROOM_ID; // default ke room boss

let bossHP         = BOSS_MAX_HP;
let bossMaxHP      = BOSS_MAX_HP;
let playerHP       = PLAYER_MAX_HP;
let playerMaxHP    = PLAYER_MAX_HP;
const SCORE_THRESHOLD = 75;  // minimum score untuk lulus boss
let sessionXpEarned   = 0;   // XP yang sudah ditambahkan ke DB di sesi ini

// Simpan progress_id untuk bisa di-update (in_progress → completed)
let progressRowId  = null;

/* ================================================
   SAMPLE QUESTIONS (fallback jika DB kosong)
================================================ */
const SAMPLE_BOSS_QUESTIONS = [
  {
    id:1, type:'multiple',
    question:'Manakah cara penulisan program Java yang benar agar bisa dijalankan?',
    code: null,
    options:[
      'public class Main { public static void main(String[] args) { } }',
      'class main { void Main() { } }',
      'Public Class Main { Static Void main() { } }',
      'public class Main { static main(String args) { } }'
    ],
    answer: 0,
    explanation: 'Program Java harus memiliki method main dengan signature: public static void main(String[] args).',
    damage_value: 5
  },
  {
    id:2, type:'multiple',
    question:'Tipe data mana yang tepat untuk menyimpan nilai true atau false?',
    code: null,
    options:['int','String','boolean','char'],
    answer: 2,
    explanation: 'boolean adalah tipe data di Java yang hanya bisa menyimpan dua nilai: true atau false.',
    damage_value: 5
  },
  {
    id:3, type:'multiple',
    question:'Apa yang dimaksud dengan komentar satu baris di Java?',
    code: null,
    options:['/* komentar */','// komentar','# komentar','<!-- komentar -->'],
    answer: 1,
    explanation: '// digunakan untuk komentar satu baris di Java.',
    damage_value: 5
  },
  {
    id:4, type:'multiple',
    question:'Berapakah hasil dari operasi berikut?\nint x = 10;\nint y = 3;\nSystem.out.println(x % y);',
    code: 'int x = 10;\nint y = 3;\nSystem.out.println(x % y);',
    options:['3','1','0','3.33'],
    answer: 1,
    explanation: 'Operator % adalah modulus (sisa bagi). 10 dibagi 3 = 3 sisa 1.',
    damage_value: 5
  },
  {
    id:5, type:'multiple',
    question:'Manakah deklarasi variabel yang VALID di Java?',
    code: null,
    options:['int 1angka = 5;','int angka = 5;','int angka nilai = 5;','1int angka = 5;'],
    answer: 1,
    explanation: 'Nama variabel di Java tidak boleh diawali angka dan tidak boleh mengandung spasi.',
    damage_value: 5
  },
];

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Cek login
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  // Ambil param dari URL: boss.html?floor=1&room=7
  const params = new URLSearchParams(window.location.search);
  floorId = parseInt(params.get('floor') || '1');
  roomId  = parseInt(params.get('room') || '') || BOSS_ROOM_ID;

  document.getElementById('topbarTitle').textContent = `💀 FLOOR ${floorId} BOSS`;

  // Load room info (nama bos & hp_limit dari DB)
  await loadRoomInfo(roomId);

  // Load soal dari Supabase
  await loadQuestions();

  document.getElementById('qTotal').textContent = questions.length;
  document.getElementById('qXP').textContent    = XP_PER_CORRECT;

  // Init HP bars
  updateBossHP(bossMaxHP);
  updatePlayerHP(playerMaxHP);

  // Catat status awal ke 'in_progress' ke DB
  await upsertProgress({ status: 'in_progress', current_room_id: roomId });

  startTimer();
  renderQuestion(0);
});

/* ================================================
   LOAD ROOM INFO
================================================ */
async function loadRoomInfo(rId) {
  try {
    const { data, error } = await sb
      .from('rooms')
      .select('title, hp_limit')
      .eq('id', rId)
      .maybeSingle();

    if (error || !data) return;

    if (data.title) {
      document.getElementById('bossNameTag').textContent = `💀 ${data.title.toUpperCase()}`;
      document.getElementById('topbarTitle').textContent = `⚔ ${data.title.toUpperCase()}`;
    }
    if (data.hp_limit && data.hp_limit > 0) {
      bossMaxHP = data.hp_limit;
      bossHP    = data.hp_limit;
    }
  } catch(e) { console.warn('loadRoomInfo:', e.message); }
}

/* ================================================
   LOAD QUESTIONS FROM SUPABASE
================================================ */
async function loadQuestions() {
  try {
    const { data, error } = await sb
      .from('questions')
      .select('id, question_text, options, correct_index, explanation, damage_value, order_index, type')
      .eq('room_id', roomId)
      .eq('type', 'boss')
      .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Soal boss tidak ditemukan di DB, pakai sample fallback.');
      questions = SAMPLE_BOSS_QUESTIONS;
      return;
    }

    questions = data.map(q => ({
      id:           q.id,
      type:         'multiple',
      question:     q.question_text,
      code:         null,
      options:      Array.isArray(q.options) ? q.options : Object.values(q.options),
      answer:       q.correct_index,
      explanation:  q.explanation  || '',
      damage_value: q.damage_value || 5,
    }));
  } catch(e) {
    console.warn('loadQuestions boss error:', e.message);
    questions = SAMPLE_BOSS_QUESTIONS;
  }
}

/* ================================================
   TIMER
================================================ */
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m  = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s  = String(elapsed % 60).padStart(2, '0');
    const el = document.getElementById('timerDisplay');
    el.textContent = `${m}:${s}`;
    el.classList.toggle('warning', elapsed > 600);
  }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }

/* ================================================
   RENDER QUESTION
================================================ */
function renderQuestion(idx) {
  selectedAnswer = null;
  currentIdx     = idx;
  const q        = questions[idx];

  const pct = (idx / questions.length) * 100;
  document.getElementById('quizProgressBar').style.width = pct + '%';
  document.getElementById('qCurrent').textContent = idx + 1;
  document.getElementById('questionText').textContent = q.question;

  const codeEl = document.getElementById('codeBlock');
  if (q.code) {
    codeEl.style.display = 'block';
    codeEl.textContent   = q.code;
  } else {
    codeEl.style.display = 'none';
  }

  document.getElementById('qTypeBadge').textContent = '💡 Multiple Choice';

  const card = document.getElementById('questionCard');
  card.style.animation = 'none';
  requestAnimationFrame(() => { card.style.animation = ''; });

  const btnNext = document.getElementById('btnNext');
  btnNext.classList.remove('visible');
  btnNext.textContent = idx === questions.length - 1 ? '🏁 Finish Battle' : 'Next Question →';

  const grid   = document.getElementById('optionsGrid');
  grid.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<div class="option-label">${labels[i]}</div><span>${opt}</span>`;
    btn.addEventListener('click', () => selectAnswer(i));
    grid.appendChild(btn);
  });
}

/* ================================================
   SELECT ANSWER
================================================ */
async function selectAnswer(idx) {
  if (selectedAnswer !== null) return;
  selectedAnswer = idx;
 
  const q         = questions[currentIdx];
  const isCorrect = idx === q.answer;
  const btns      = document.querySelectorAll('.option-btn');
 
  answers.push({ questionIdx: currentIdx, selected: idx, correct: isCorrect });
 
  btns[idx].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) btns[q.answer].classList.add('correct');
  btns.forEach(b => b.disabled = true);
 
  if (isCorrect) {
    // BENAR: Serang bos
    const dmg = q.damage_value || 5;
    bossHP    = Math.max(0, bossHP - dmg);
    updateBossHP(bossHP);
    showDamageNumber(dmg, 'boss');
    hitBossAnimation();
    showToast(true);
 
    // Tambah XP real-time ke tabel users (kolom total_exp)
    const xpThisQuestion = XP_PER_CORRECT;
    sessionXpEarned += xpThisQuestion;
    await addXpToUser(xpThisQuestion);
 
    if (bossHP <= 0) {
      setTimeout(() => finishBoss(true), 900);
      return;
    }
  } else {
    // SALAH: Player diserang bos
    playerHP = Math.max(0, playerHP - DAMAGE_TO_PLAYER);
    updatePlayerHP(playerHP);
    showDamageNumber(DAMAGE_TO_PLAYER, 'player');
    damagePlayerAnimation();
    showToast(false);
 
    if (playerHP <= 0) {
      setTimeout(() => showGameOver(), 900);
      return;
    }
  }
 
  setTimeout(() => {
    document.getElementById('btnNext').classList.add('visible');
  }, 600);
}

/* ================================================
   HP BAR UPDATES
================================================ */
function updateBossHP(current) {
  const pct    = Math.max(0, (current / bossMaxHP) * 100);
  const bar    = document.getElementById('bossHPBar');
  const txtCur = document.getElementById('bossHPCurrent');
  const txtMax = document.getElementById('bossHPMax');

  bar.style.width    = pct + '%';
  txtCur.textContent = current;
  txtMax.textContent = bossMaxHP;

  bar.classList.remove('warning', 'critical');
  if (pct <= 25)      bar.classList.add('critical');
  else if (pct <= 50) bar.classList.add('warning');
}

function updatePlayerHP(current) {
  const pct    = Math.max(0, (current / playerMaxHP) * 100);
  const bar    = document.getElementById('playerHPBar');
  const txtCur = document.getElementById('playerHPCurrent');
  const txtMax = document.getElementById('playerHPMax');

  bar.style.width    = pct + '%';
  txtCur.textContent = current;
  txtMax.textContent = playerMaxHP;

  bar.classList.remove('warning', 'critical');
  if (pct <= 25)      bar.classList.add('critical');
  else if (pct <= 50) bar.classList.add('warning');
}

/* ================================================
   ANIMASI
================================================ */
function hitBossAnimation() {
  const img = document.getElementById('bossImg');
  img.classList.remove('hit');
  void img.offsetWidth; 
  img.classList.add('hit');
  img.addEventListener('animationend', () => img.classList.remove('hit'), { once: true });
}

function damagePlayerAnimation() {
  const overlay = document.getElementById('damageOverlay');
  overlay.classList.remove('flash');
  void overlay.offsetWidth;
  overlay.classList.add('flash');
  overlay.addEventListener('animationend', () => overlay.classList.remove('flash'), { once: true });

  document.body.classList.remove('screen-shake');
  void document.body.offsetWidth;
  document.body.classList.add('screen-shake');
  document.body.addEventListener('animationend', () => document.body.classList.remove('screen-shake'), { once: true });
}

function showDamageNumber(amount, target) {
  const wrap = target === 'boss'
    ? document.getElementById('bossImgWrap')
    : document.querySelector('.player-hp-wrap');
  if (!wrap) return;

  const el      = document.createElement('div');
  el.className  = target === 'boss' ? 'dmg-number' : 'dmg-number player-dmg';
  el.textContent = target === 'boss' ? `-${amount} 💥` : `-${amount} 💔`;
  wrap.style.position = 'relative';
  wrap.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

let toastTimeout;
function showToast(isCorrect) {
  const toast      = document.getElementById('feedbackToast');
  toast.textContent = isCorrect
    ? `✓ Correct! +${XP_PER_CORRECT} XP`
    : '✗ Wrong! Boss attacks!';
  toast.className  = 'feedback-toast show' + (isCorrect ? '' : ' wrong-toast');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 1400);
}

/* ================================================
   NEXT QUESTION
================================================ */
document.getElementById('btnNext').addEventListener('click', () => {
  if (selectedAnswer === null) return;
  const next = currentIdx + 1;
  if (next < questions.length) {
    renderQuestion(next);
  } else {
    finishBoss(bossHP <= 0 || playerHP > 0);
  }
});

/* ================================================
   GAME OVER — Player HP = 0
================================================ */
async function showGameOver() {
  stopTimer();
 
  const correctCount = answers.filter(a => a.correct).length;
  const score        = questions.length > 0
    ? Math.round((correctCount / questions.length) * 100) : 0;
 
  // ROLLBACK XP karena player mati (gagal menyelesaikan boss fight)
  if (sessionXpEarned > 0) {
    await subtractXpFromUser(sessionXpEarned);
    sessionXpEarned = 0;
  }
 
  // Status tetap 'in_progress' agar tidak terhitung 'completed' di DB
  await saveProgress(score, 0, 'in_progress');
 
  let overlay = document.getElementById('gameoverOverlay');
  if (overlay) { overlay.classList.add('show'); return; }
 
  overlay = document.createElement('div');
  overlay.className = 'gameover-overlay show';
  overlay.id        = 'gameoverOverlay';
  overlay.innerHTML = `
    <div class="gameover-box">
      <div class="gameover-icon">💀</div>
      <div class="gameover-title">GAME OVER</div>
      <div class="gameover-sub">HP kamu habis! Sang boss memenangkan pertempuran ini!</div>
      <div class="gameover-actions">
        <button class="btn-gameover-retry" onclick="retryBoss()">🔁 Retry Boss</button>
        <button class="btn-gameover-back" onclick="window.location.href='floor.html'">← Back to Floor</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

/* ================================================
   FINISH BOSS — Akhir Battle
================================================ */
async function finishBoss(playerWon) {
  stopTimer();
 
  document.getElementById('quizProgressBar').style.width = '100%';
 
  const correctCount = answers.filter(a => a.correct).length;
  const wrongCount   = answers.length - correctCount;
  const score        = questions.length > 0
    ? Math.round((correctCount / questions.length) * 100) : 0;
  const xpEarned     = Math.min(correctCount * XP_PER_CORRECT, BOSS_MAX_XP);
 
  // Cek apakah skor memenuhi batas kelulusan 75%
  const passed = playerWon && score >= SCORE_THRESHOLD;
 
  document.getElementById('bossScreen').style.display = 'none';
 
  document.getElementById('scoreNumber').textContent = score;
  document.getElementById('scoreNumber').className   = 'score-number ' + (passed ? 'pass' : 'fail');
  document.getElementById('statCorrect').textContent = correctCount;
  document.getElementById('statWrong').textContent   = wrongCount;
  document.getElementById('statXP').textContent      = passed ? xpEarned : 0; 
 
  const header   = document.getElementById('resultHeader');
  const trophy   = document.getElementById('resultTrophy');
  const title    = document.getElementById('resultTitle');
  const subtitle = document.getElementById('resultSubtitle');
  const thBar    = document.getElementById('thresholdBar');
  const thIcon   = document.getElementById('thresholdIcon');
  const thMsg    = document.getElementById('thresholdMsg');
 
  if (passed) {
    // MENANG + SKOR >= 75
    header.className     = 'result-header pass boss-win';
    trophy.textContent   = '🏆';
    title.textContent    = 'BOSS DEFEATED!';
    subtitle.textContent = `Luar biasa! Kamu mengalahkan boss dengan sisa HP player ${playerHP}!`;
    thBar.className      = 'threshold-bar pass';
    thIcon.textContent   = '🎉';
    thMsg.textContent    = `Skor ${score}/100 — Floor ${floorId + 1} Terbuka!`;
    document.getElementById('btnNextFloor').style.display = 'flex';
    spawnConfetti();
 
    // Simpan progress 'completed' & unlock achievement
    await Promise.all([
      saveProgress(score, xpEarned, 'completed'),
      unlockAchievement(ACHIEVEMENT_ID),
    ]);
 
    sessionXpEarned = 0; // Reset aman karena sudah sah diterima
 
  } else if (playerWon && score < SCORE_THRESHOLD) {
    // MENANG TAPI SKOR < 75
    header.className     = 'result-header fail';
    trophy.textContent   = '😓';
    title.textContent    = 'NOT ENOUGH!';
    subtitle.textContent = `Skor kamu ${score}/100. Kamu butuh minimal ${SCORE_THRESHOLD} untuk lolos!`;
    thBar.className      = 'threshold-bar fail';
    thIcon.textContent   = '⚠️';
    thMsg.textContent    = `Skor minimum adalah ${SCORE_THRESHOLD}. Kamu dapet ${score} — Ulangi lagi!`;
    document.getElementById('btnNextFloor').style.display = 'none';
 
    // ROLLBACK XP karena tidak lolos skor minimum
    if (sessionXpEarned > 0) {
      await subtractXpFromUser(sessionXpEarned);
      sessionXpEarned = 0;
    }
 
    // Status tetap 'in_progress' agar progress pengerjaan terkunci
    await saveProgress(score, 0, 'in_progress');
 
  } else {
    // KALAH HP habis
    header.className     = 'result-header fail boss-lose';
    trophy.textContent   = '😢';
    title.textContent    = 'DEFEATED...';
    subtitle.textContent = 'Boss terlalu tangguh! Ayo latihan lagi dan kembali kemari.';
    thBar.className      = 'threshold-bar fail';
    thIcon.textContent   = '❌';
    thMsg.textContent    = `HP kamu habis — coba lagi untuk mengalahkan boss!`;
    document.getElementById('btnNextFloor').style.display = 'none';
 
    // ROLLBACK XP karena kalah
    if (sessionXpEarned > 0) {
      await subtractXpFromUser(sessionXpEarned);
      sessionXpEarned = 0;
    }
 
    await saveProgress(score, 0, 'in_progress');
  }
 
  document.getElementById('resultScreen').classList.add('show');
}

/* ================================================
   TAMBAH XP KE TABEL public.users (KOLOM total_exp)
   Memisahkan antara UPDATE dan INSERT berdasarkan keberadaan record
   agar terhindar dari error null constraint 'email'.
================================================ */
async function addXpToUser(xpAmount) {
  if (!currentUser || xpAmount <= 0) return;
  try {
    const { data: userData, error: fetchErr } = await sb
      .from('users')
      .select('total_exp')
      .eq('id', currentUser.id)
      .maybeSingle();
 
    if (fetchErr) {
      console.warn('addXpToUser fetch error:', fetchErr.message);
      return;
    }
 
    const currentXp = userData ? (userData.total_exp || 0) : 0;
    const newTotal = currentXp + xpAmount;
 
    if (userData) {
      // Jika data user sudah ada, cukup jalankan UPDATE saja (aman dari constraint email)
      const { error: updateErr } = await sb
        .from('users')
        .update({
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
 
      if (updateErr) {
        console.warn('addXpToUser update error:', updateErr.message);
      } else {
        console.log(`✅ XP +${xpAmount} → total ${newTotal}`);
      }
    } else {
      // Jika data user belum ada, lakukan INSERT baru dengan menyertakan email dari session auth
      const { error: insertErr } = await sb
        .from('users')
        .insert({
          id:         currentUser.id,
          email:      currentUser.email, // Menyertakan email agar meloloskan NOT NULL constraint
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        });
 
      if (insertErr) {
        console.warn('addXpToUser insert error:', insertErr.message);
      } else {
        console.log(`✅ XP +${xpAmount} (Profil baru berhasil dibuat) → total ${newTotal}`);
      }
    }
  } catch(e) { console.warn('addXpToUser error:', e.message); }
}

/* ================================================
   SUBTRACT/ROLLBACK XP DARI TABEL public.users
================================================ */
async function subtractXpFromUser(xpAmount) {
  if (!currentUser || xpAmount <= 0) return;
  try {
    const { data: userData, error: fetchErr } = await sb
      .from('users')
      .select('total_exp')
      .eq('id', currentUser.id)
      .maybeSingle();
 
    if (fetchErr) {
      console.warn('subtractXpFromUser fetch error:', fetchErr.message);
      return;
    }
 
    const currentXp = userData ? (userData.total_exp || 0) : 0;
    const newTotal = Math.max(0, currentXp - xpAmount);
 
    if (userData) {
      // Jika profil ada, cukup jalankan UPDATE
      const { error: updateErr } = await sb
        .from('users')
        .update({
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
 
      if (updateErr) {
        console.warn('subtractXpFromUser update error:', updateErr.message);
      } else {
        console.log(`⚠️ XP -${xpAmount} (gagal/score < ${SCORE_THRESHOLD}) → total ${newTotal}`);
      }
    } else {
      // Jika profil belum ada, lakukan INSERT lengkap dengan email
      const { error: insertErr } = await sb
        .from('users')
        .insert({
          id:         currentUser.id,
          email:      currentUser.email,
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        });
 
      if (insertErr) {
        console.warn('subtractXpFromUser insert error:', insertErr.message);
      } else {
        console.log(`⚠️ XP -${xpAmount} (Profil baru berhasil dibuat) → total ${newTotal}`);
      }
    }
  } catch(e) { console.warn('subtractXpFromUser error:', e.message); }
}

/* ================================================
   UPSERT PROGRESS (in_progress / completed)
================================================ */
async function upsertProgress(fields) {
  if (!currentUser) return;
  try {
    if (progressRowId) {
      await sb
        .from('user_floor_progress')
        .update({
          ...fields,
          ...(fields.status === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', progressRowId);
      return;
    }

    const { data: existing } = await sb
      .from('user_floor_progress')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('floor_id', floorId)
      .eq('current_room_id', roomId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      progressRowId = existing.id;
      await sb
        .from('user_floor_progress')
        .update({
          ...fields,
          ...(fields.status === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', progressRowId);
    } else {
      const { data: inserted, error } = await sb
        .from('user_floor_progress')
        .insert({
          user_id:         currentUser.id,
          floor_id:        floorId,
          current_room_id: roomId,
          status:          'in_progress',
          score:           0,
          xp_earned:       0,
          hp_remaining:    playerMaxHP,
          ...fields,
        })
        .select('id')
        .single();

      if (!error && inserted) progressRowId = inserted.id;
      else if (error) console.warn('upsertProgress INSERT error:', error.message);
    }
  } catch(e) { console.warn('upsertProgress error:', e.message); }
}

/* ================================================
   SAVE PROGRESS
================================================ */
async function saveProgress(score, xpEarned, status) {
  await upsertProgress({
    status:       status, 
    score,
    xp_earned:    xpEarned,
    hp_remaining: playerHP,
    current_room_id: roomId,
  });
}

/* ================================================
   UNLOCK ACHIEVEMENT
================================================ */
async function unlockAchievement(achievementId) {
  if (!currentUser) return;
  try {
    const { data: existing } = await sb
      .from('user_achievements')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if (existing) {
      console.log('Achievement sudah dimiliki, skip.');
      return;
    }

    const { error } = await sb
      .from('user_achievements')
      .insert({
        user_id:        currentUser.id,
        achievement_id: achievementId,
        unlocked_at:    new Date().toISOString(),
      });

    if (error) console.warn('unlockAchievement insert error:', error.message);
    else {
      console.log(`🏅 Achievement ${achievementId} (Code Knight) unlocked!`);
      showAchievementToast();
    }
  } catch(e) { console.warn('unlockAchievement error:', e.message); }
}

function showAchievementToast() {
  const el = document.createElement('div');
  el.className = 'achievement-toast';
  el.innerHTML = `
    <div class="ach-icon">🏅</div>
    <div class="ach-text">
      <div class="ach-label">Achievement Unlocked!</div>
      <div class="ach-name">⚔ Code Knight</div>
    </div>`;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 3500);
}

/* ================================================
   RETRY BOSS
================================================ */
function retryBoss() {
  answers        = [];
  bossHP         = bossMaxHP;
  playerHP       = playerMaxHP;
  progressRowId  = null;
  sessionXpEarned = 0; 
 
  const go = document.getElementById('gameoverOverlay');
  if (go) go.remove();
  document.getElementById('resultScreen').classList.remove('show');
  document.getElementById('reviewScreen').classList.remove('show');
 
  document.getElementById('bossScreen').style.display = '';
 
  updateBossHP(bossHP);
  updatePlayerHP(playerHP);
 
  upsertProgress({ status: 'in_progress', current_room_id: roomId });
 
  startTimer();
  renderQuestion(0);
}

/* ================================================
   SHOW REVIEW
================================================ */
function showReview() {
  document.getElementById('resultScreen').classList.remove('show');
  const list = document.getElementById('reviewList');
  list.innerHTML = '';

  questions.forEach((q, i) => {
    const ans = answers.find(a => a.questionIdx === i);
    if (!ans) return;
    const isCorrect = ans.correct;
    const labels    = ['A', 'B', 'C', 'D'];

    const item = document.createElement('div');
    item.className = `review-item ${isCorrect ? 'ri-correct' : 'ri-wrong'}`;

    let answerRows = '';
    if (!isCorrect) {
      answerRows = `
        <div class="review-answer-row">
          <span class="ans-label-pill your-ans">Your answer</span>
          <span>${labels[ans.selected]}. ${q.options[ans.selected]}</span>
        </div>
        <div class="review-answer-row">
          <span class="ans-label-pill right-ans">Correct</span>
          <span>${labels[q.answer]}. ${q.options[q.answer]}</span>
        </div>
        <div class="review-answer-row" style="margin-top:4px;color:#555;font-size:.78rem;font-weight:600;">
          💡 ${q.explanation}
        </div>`;
    } else {
      answerRows = `
        <div class="review-answer-row">
          <span class="ans-label-pill correct-choice">Correct</span>
          <span>${labels[q.answer]}. ${q.options[q.answer]}</span>
        </div>`;
    }

    let codeHTML = '';
    if (q.code) {
      codeHTML = `<pre style="background:#1e1e2e;color:#cdd6f4;padding:10px 14px;border-radius:8px;font-size:.78rem;margin:8px 0;overflow-x:auto;">${q.code}</pre>`;
    }

    item.innerHTML = `
      <div class="review-item-header">
        <div class="review-num">Q${i + 1}</div>
        <div class="review-status">${isCorrect ? '✅' : '❌'}</div>
        <div class="review-q">${q.question}</div>
      </div>
      ${codeHTML}
      <div class="review-answers">${answerRows}</div>`;

    list.appendChild(item);
  });

  document.getElementById('reviewScreen').classList.add('show');
}

function backToResult() {
  document.getElementById('reviewScreen').classList.remove('show');
  document.getElementById('resultScreen').classList.add('show');
}

function goNextFloor() {
  window.location.href = `floor.html?floor=${floorId + 1}`;
}

/* ================================================
   CONFETTI
================================================ */
function spawnConfetti() {
  const wrap   = document.getElementById('confettiWrap');
  wrap.classList.add('show');
  const colors = ['#FFC107','#4CAF50','#7E57C2','#E91E63','#03A9F4','#FF5722'];
  for (let i = 0; i < 80; i++) {
    const el        = document.createElement('div');
    el.className    = 'confetto';
    el.style.left   = Math.random() * 100 + 'vw';
    el.style.background        = colors[Math.floor(Math.random() * colors.length)];
    el.style.width             = (6 + Math.random() * 8) + 'px';
    el.style.height            = (6 + Math.random() * 8) + 'px';
    el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    el.style.animationDelay    = Math.random() * .8 + 's';
    el.style.borderRadius      = Math.random() > .5 ? '50%' : '2px';
    wrap.appendChild(el);
  }
  setTimeout(() => { wrap.classList.remove('show'); wrap.innerHTML = ''; }, 4000);
}