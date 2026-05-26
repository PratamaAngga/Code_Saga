/* ================================================
   SUPABASE INIT
================================================ */
const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ================================================
   QUIZ CONFIG
================================================ */
const PASS_THRESHOLD = 75; // Batas minimal kelulusan (75%)
const XP_PER_CORRECT = 5;  // Reward XP per jawaban kuis yang benar

/* ================================================
   STATE
================================================ */
let questions      = [];
let currentIdx     = 0;
let selectedAnswer = null;
let answers        = []; // Menyimpan data { questionIdx, selected, correct }
let timerInterval  = null;
let startTime      = null;
let currentUser    = null;
let floorId        = 1;
let roomId         = 16;  // Dinamis: 15 + floorId
let sessionXpEarned   = 0; // Melacak perolehan XP selama kuis aktif (untuk rollback)
let quizModuleId   = null; // Menyimpan ID modul kuis agar sinkron dengan floor.html
let actualFloorDbId  = null; // ID UUID/bigint asli dari tabel floors di DB

/* ================================================
   SAMPLE QUESTIONS (Fallback jika kueri database gagal)
================================================ */
const SAMPLE_QUESTIONS = [
  {
    id:1, type:'multiple',
    question:'What is the correct way to declare an integer variable in Java?',
    code: null,
    options:['int x = 5;', 'integer x = 5;', 'Int x = 5;', 'var int x = 5;'],
    answer: 0,
    explanation: 'In Java, integer variables are declared using the lowercase keyword "int".'
  }
];

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Verifikasi login user
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  // Ambil data floor dari parameter URL, misal: quiz.html?floor=1
  const params = new URLSearchParams(window.location.search);
  floorId = parseInt(params.get('floor') || '1');
  
  // Hitung Room ID Kuis secara otomatis (Floor 1 = 16, Floor 2 = 17, dst)
  roomId = 15 + floorId;
  
  document.getElementById('topbarTitle').textContent = `⚔ FLOOR ${floorId} QUIZ`;

  // Cari ID modul kuis di database agar progress di floor.html tersinkronisasi otomatis
  await fetchQuizModuleId();

  // Load pertanyaan kuis dari database secara dinamis
  await loadQuestions();

  document.getElementById('qTotal').textContent = questions.length;
  startTimer();
  renderQuestion(0);
});

/* ================================================
   FETCH QUIZ MODULE ID FROM DATABASE
================================================ */
async function fetchQuizModuleId() {
  try {
    // 1. Dapatkan ID asli dari floor berdasarkan nomor lantai
    const { data: floorData } = await sb
      .from('floors')
      .select('id')
      .eq('floor_number', floorId)
      .maybeSingle();

    if (!floorData) return;
    actualFloorDbId = floorData.id;

    // 2. Ambil semua room yang terdaftar di floor tersebut
    const { data: rooms } = await sb
      .from('rooms')
      .select('id')
      .eq('floor_id', floorData.id);

    if (!rooms || rooms.length === 0) return;
    const roomIds = rooms.map(r => r.id);

    // 3. Cari modul kuis yang bertipe 'quiz_battle' di dalam room tersebut
    const { data: modData } = await sb
      .from('modules')
      .select('id')
      .in('room_id', roomIds)
      .eq('module_type', 'quiz_battle')
      .maybeSingle();

    if (modData) {
      quizModuleId = modData.id;
      console.log(`🎯 Terdeteksi Module ID Kuis untuk Floor ${floorId}: ${quizModuleId}`);
    }
  } catch (e) {
    console.warn('Gagal mencocokkan modul kuis dengan floor.js:', e.message);
  }
}

/* ================================================
   LOAD QUESTIONS FROM SUPABASE
================================================ */
async function loadQuestions() {
  try {
    const { data, error } = await sb
      .from('questions')
      .select('id, question_text, options, correct_index, explanation, type')
      .eq('room_id', roomId)
      .eq('type', 'quiz')
      .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Soal kuis tidak ditemukan di DB, pakai sample fallback.');
      questions = SAMPLE_QUESTIONS;
      return;
    }

    // Map data dari database ke format kuis
    questions = data.map(q => ({
      id:           q.id,
      type:         'multiple',
      question:     q.question_text,
      code:         null,
      options:      Array.isArray(q.options) ? q.options : Object.values(q.options),
      answer:       q.correct_index,
      explanation:  q.explanation || '',
    }));
  } catch(e) {
    console.warn('loadQuestions kuis error:', e.message);
    questions = SAMPLE_QUESTIONS;
  }
}

/* ================================================
   TIMER
================================================ */
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    const el = document.getElementById('timerDisplay');
    el.textContent = `${m}:${s}`;
    el.classList.toggle('warning', elapsed > 600); // Merah setelah 10 menit
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

/* ================================================
   RENDER QUESTION
================================================ */
function renderQuestion(idx) {
  selectedAnswer = null;
  currentIdx = idx;
  const q = questions[idx];

  // Progress bar
  const pct = (idx / questions.length) * 100;
  document.getElementById('quizProgressBar').style.width = pct + '%';

  // Counter
  document.getElementById('qCurrent').textContent = idx + 1;
  document.getElementById('qXP').textContent = XP_PER_CORRECT;

  // Teks Pertanyaan
  document.getElementById('questionText').textContent = q.question;

  // Code Block
  const codeEl = document.getElementById('codeBlock');
  if (q.code) {
    codeEl.style.display = 'block';
    codeEl.textContent = q.code;
  } else {
    codeEl.style.display = 'none';
  }

  // Badge Tipe Soal
  document.getElementById('qTypeBadge').textContent = '💡 Multiple Choice';

  // Reset Animasi Kartu
  const card = document.getElementById('questionCard');
  card.style.animation = 'none';
  requestAnimationFrame(() => { card.style.animation = ''; });

  // Tombol Next
  const btnNext = document.getElementById('btnNext');
  btnNext.classList.remove('visible');
  btnNext.textContent = idx === questions.length - 1 ? '🏁 Finish Quiz' : 'Next Question →';

  // Render Pilihan Ganda
  const grid = document.getElementById('optionsGrid');
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
  const q = questions[currentIdx];
  const isCorrect = idx === q.answer;
  const btns = document.querySelectorAll('.option-btn');

  // Rekam jawaban player
  answers.push({ questionIdx: currentIdx, selected: idx, correct: isCorrect });

  // Efek visual jawaban
  btns[idx].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) {
    btns[q.answer].classList.add('correct'); 
  }
  btns.forEach(b => b.disabled = true);

  // Tampilkan toast feedback
  showToast(isCorrect);

  // Jika jawaban benar, langsung tambahkan XP secara real-time
  if (isCorrect) {
    const xpThisQuestion = XP_PER_CORRECT;
    sessionXpEarned += xpThisQuestion;
    await addXpToUser(xpThisQuestion);
  }

  // Tampilkan tombol next setelah delay kecil
  setTimeout(() => {
    document.getElementById('btnNext').classList.add('visible');
  }, 600);
}

/* ================================================
   TOAST FEEDBACK
================================================ */
let toastTimeout;
function showToast(isCorrect) {
  const toast = document.getElementById('feedbackToast');
  toast.textContent = isCorrect ? `✓ Correct! +${XP_PER_CORRECT} XP` : '✗ Wrong!';
  toast.className = 'feedback-toast show' + (isCorrect ? '' : ' wrong-toast');
  
  clearTimeout(toastTimeout); 
  toastTimeout = setTimeout(() => { 
    toast.classList.remove('show'); 
  }, 1400);
}

/* ================================================
   NEXT / FINISH ACTION
================================================ */
document.getElementById('btnNext').addEventListener('click', () => {
  if (selectedAnswer === null) return;
  const next = currentIdx + 1;
  if (next < questions.length) {
    renderQuestion(next);
  } else {
    finishQuiz();
  }
});

/* ================================================
   FINISH QUIZ
================================================ */
async function finishQuiz() {
  stopTimer();

  // Set progress bar penuh
  document.getElementById('quizProgressBar').style.width = '100%';

  const correctCount = answers.filter(a => a.correct).length;
  const wrongCount   = answers.length - correctCount;
  const score        = Math.round((correctCount / questions.length) * 100);
  const xpEarned     = correctCount * XP_PER_CORRECT;
  const passed       = score >= PASS_THRESHOLD;

  // Sembunyikan container kuis utama
  document.getElementById('quizScreen').style.display = 'none';

  // Render papan skor hasil akhir
  document.getElementById('scoreNumber').textContent = score;
  document.getElementById('scoreNumber').className   = 'score-number ' + (passed ? 'pass' : 'fail');
  document.getElementById('statCorrect').textContent = correctCount;
  document.getElementById('statWrong').textContent   = wrongCount;
  document.getElementById('statXP').textContent      = passed ? xpEarned : 0; // Tampilkan 0 jika gagal

  const header   = document.getElementById('resultHeader');
  const trophy   = document.getElementById('resultTrophy');
  const title    = document.getElementById('resultTitle');
  const subtitle = document.getElementById('resultSubtitle');
  const thBar    = document.getElementById('thresholdBar');
  const thIcon   = document.getElementById('thresholdIcon');
  const thMsg    = document.getElementById('thresholdMsg');

  if (passed) {
    // ── LULUS (Skor >= 75) ──────────────────────────────
    header.className     = 'result-header pass';
    trophy.textContent   = '🏆';
    title.textContent    = 'QUIZ PASSED!';
    subtitle.textContent = `Luar biasa! Kamu mendapatkan nilai ${score}/100 — Floor ${floorId + 1} Terbuka!`;
    thBar.className      = 'threshold-bar pass';
    thIcon.textContent   = '🎉';
    thMsg.textContent    = `Skor ${score} ≥ ${PASS_THRESHOLD} — Kamu berhasil membuka lantai baru!`;
    document.getElementById('btnNextFloor').style.display = 'flex';
    spawnConfetti();
    
    // Simpan progres kelulusan kuis
    await saveProgress(score, xpEarned, true);

    // Reset pelacak sesi karena XP resmi dipertahankan
    sessionXpEarned = 0;
  } else {
    // ── GAGAL (Skor < 75) ──────────────────────────────
    header.className     = 'result-header fail';
    trophy.textContent   = '😢';
    title.textContent    = 'QUIZ FAILED';
    subtitle.textContent = `Skor kamu ${score}/100. Kamu butuh minimal ${PASS_THRESHOLD} untuk lolos!`;
    thBar.className      = 'threshold-bar fail';
    thIcon.textContent   = '❌';
    thMsg.textContent    = `Skor ${score} < ${PASS_THRESHOLD} — Silakan ulangi untuk bisa lanjut!`;
    document.getElementById('btnNextFloor').style.display = 'none';

    // ROLLBACK XP karena tidak lolos skor minimum kuis
    if (sessionXpEarned > 0) {
      await subtractXpFromUser(sessionXpEarned);
      sessionXpEarned = 0;
    }

    // Simpan hasil progres sebagai gagal
    await saveProgress(score, 0, false);
  }

  document.getElementById('resultScreen').classList.add('show');
}

/* ================================================
   TAMBAH XP KE TABEL public.users (KOLOM total_exp)
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
      // Jika data profil ada, lakukan UPDATE (aman dari error email constraint)
      await sb
        .from('users')
        .update({
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
      console.log(`✅ Users total_exp +${xpAmount} → total ${newTotal}`);
    } else {
      // Jika data profil kosong, lakukan INSERT lengkap dengan email dari auth session
      await sb
        .from('users')
        .insert({
          id:         currentUser.id,
          email:      currentUser.email,
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        });
      console.log(`✅ Users total_exp +${xpAmount} (Profil baru berhasil dibuat) → total ${newTotal}`);
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
      await sb
        .from('users')
        .update({
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
      console.log(`⚠️ XP -${xpAmount} (gagal/score < ${PASS_THRESHOLD}) → total ${newTotal}`);
    } else {
      await sb
        .from('users')
        .insert({
          id:         currentUser.id,
          email:      currentUser.email,
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        });
      console.log(`⚠️ XP -${xpAmount} (Profil baru berhasil dibuat) → total ${newTotal}`);
    }
  } catch(e) { console.warn('subtractXpFromUser error:', e.message); }
}

/* ================================================
   SAVE PROGRESS TO SUPABASE
================================================ */
async function saveProgress(score, xpEarned, passed) {
  if (!currentUser) return;
  try {
    // 1. Catat hasil kuis ke tabel quiz_results (akan di-skip secara aman jika tabelnya belum dibuat di DB)
    await sb.from('quiz_results').insert({
      user_id:   currentUser.id,
      floor_id:  floorId,
      score,
      xp_earned: xpEarned,
      passed,
      taken_at:  new Date().toISOString(),
    });

    // 2. Jika lolos kuis, catat juga ke user_module_progress agar floor.html mendeteksi kuis SELESAI
    if (passed && quizModuleId) {
      const { data: existing } = await sb
        .from('user_module_progress')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('module_id', quizModuleId)
        .maybeSingle();
      
      if (!existing) {
        await sb.from('user_module_progress').insert({
          user_id:      currentUser.id,
          module_id:    quizModuleId,
          floor_id:     actualFloorDbId, // Menyimpan ID asli dari tabel floors
          completed:    true,
          completed_at: new Date().toISOString(),
        });
        console.log('✅ Progress modul kuis berhasil didaftarkan ke user_module_progress!');
      }
    }
  } catch(e) { console.warn('Save progress error:', e.message); }
}

/* ================================================
   RETRY QUIZ
================================================ */
function retryQuiz() {
  answers = [];
  sessionXpEarned = 0; // Reset pelacak XP sesi sebelum memulai kuis ulang
  document.getElementById('resultScreen').classList.remove('show');
  document.getElementById('reviewScreen').classList.remove('show');
  document.getElementById('quizScreen').style.display = '';
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
    const el = document.createElement('div');
    el.className = 'confetto';
    el.style.left       = Math.random() * 100 + 'vw';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width      = (6 + Math.random() * 8) + 'px';
    el.style.height     = (6 + Math.random() * 8) + 'px';
    el.style.animationDuration  = (1.5 + Math.random() * 2) + 's';
    el.style.animationDelay     = Math.random() * .8 + 's';
    el.style.borderRadius       = Math.random() > .5 ? '50%' : '2px';
    wrap.appendChild(el);
  }
  setTimeout(() => {
    wrap.classList.remove('show');
    wrap.innerHTML = '';
  }, 4000);
}