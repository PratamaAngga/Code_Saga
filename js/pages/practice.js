/* ================================================
   SUPABASE
================================================ */
const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ================================================
   PRACTICE QUESTIONS
================================================ */
const QUESTIONS = [];

/* ================================================
   TIPS per difficulty
================================================ */
const TIPS = {
  easy:   'Soal Basic — Fokus pada konsep dasar! Bacalah semua pilihan sebelum memilih.',
  medium: 'Soal Medium — Coba trace kode langkah per langkah di kertas dulu.',
  hard:   'Soal Advanced — Perhatikan urutan eksekusi dan edge case dengan teliti!',
};

/* ================================================
   STATE
================================================ */
let idx         = 0;
let answers     = [];
let selected    = null;
let expOpen     = false;
let floorId     = 1;
let currentUser = null;

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  const p = new URLSearchParams(window.location.search);
  floorId = parseInt(p.get('floor') || '1');
  document.getElementById('topFloorLabel').textContent = `Floor ${floorId}: Java Basics`;

  try {
    const { data: floorData } = await sb
      .from('floors')
      .select('id, title')
      .eq('floor_number', floorId)
      .single();

    console.log('floorData:', floorData);

    if (floorData) {
      document.getElementById('topFloorLabel').textContent = floorData.title;

      const { data: roomData } = await sb
        .from('rooms')
        .select('id')
        .eq('floor_id', floorData.id)
        .eq('room_type', 'quiz')
        .single();

      console.log('roomData:', roomData);

      if (roomData) {
        const { data: qData, error } = await sb
          .from('questions')
          .select('*')
          .eq('room_id', roomData.id)
          .eq('type', 'practice')
          .order('order_index', { ascending: true });

        console.log('qData:', qData, 'error:', error);

        if (error) throw error;

        if (qData?.length) {
          QUESTIONS.length = 0;
          qData.forEach(q => QUESTIONS.push({
            id:              q.id,
            difficulty:      q.difficulty === 'basic'  ? 'easy'
                           : q.difficulty === 'medium' ? 'medium' : 'hard',
            question:        q.question_text,
            code:            null,
            options:         q.options,
            answer:          q.correct_index,
            xp:              q.damage_value ?? 10,
            explanation:     q.explanation,
            explanationCode: null,
            tip:             q.tips,
          }));
        }
      }
    }
  } catch(e) {
    console.warn('Fallback ke sample questions:', e.message);
  }

  answers = new Array(QUESTIONS.length).fill(null);
  buildTabs();
  render(0);
  updateProgress();
});
/* ================================================
   BUILD TABS
================================================ */
function buildTabs() {
  const row = document.getElementById('qTabsRow');
  row.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const btn = document.createElement('button');
    btn.className = 'q-tab' + (i === 0 ? ' active' : i > 0 ? ' locked' : '');
    btn.id = `tab${i}`;
    btn.innerHTML = i === 0
      ? `<span>${i+1}</span>`
      : `<span>${i+1}</span><span class="lock-icon">🔒</span>`;
    btn.onclick = () => {
      if (btn.classList.contains('locked')) return;
      render(i);
    };
    row.appendChild(btn);
  });
}

/* ================================================
   RENDER QUESTION
================================================ */
function render(i) {
  idx      = i;
  selected = null;
  expOpen  = false;

  const q = QUESTIONS[i];

  // Header
  document.getElementById('qNumLabel').textContent = `Pertanyaan ${i + 1}`;
  const diffMap = {
    easy:   { label:'🌱 Basic',     cls:'easy'   },
    medium: { label:'⚡ Medium',   cls:'medium' },
    hard:   { label:'🔥 Advanced', cls:'hard'   },
  };
  const d = diffMap[q.difficulty];
  const badge = document.getElementById('diffBadge');
  badge.textContent = d.label; badge.className = `diff-badge ${d.cls}`;

  // Question
  document.getElementById('questionText').textContent = q.question.replace(/\\n/g, '\n');

  // Code
  const cEl = document.getElementById('codeBlock');
  if (q.code) { cEl.textContent = q.code; cEl.style.display = 'block'; }
  else cEl.style.display = 'none';

  // Options — 2 col if all options are short (<= 20 chars each)
  const allShort = q.options.every(o => o.length <= 20);
  const list     = document.getElementById('optsList');
  list.innerHTML  = '';
  list.className  = 'options-list' + (allShort ? ' two-col' : '');

  const labels = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, oi) => {
    const btn  = document.createElement('button');
    btn.className = 'opt-btn';
    btn.id = `opt${oi}`;
    btn.innerHTML = `<div class="opt-label">${labels[oi]}</div><span>${opt}</span>`;

    const prev = answers[i];
    if (prev !== null) {
      btn.disabled = true;
      if (oi === q.answer)                     btn.classList.add('correct');
      if (oi === prev.selected && !prev.correct) btn.classList.add('wrong');
    } else {
      btn.addEventListener('click', () => pickOption(oi));
    }
    list.appendChild(btn);
  });

  // Verify button
  const vBtn = document.getElementById('btnVerify');
  if (answers[i] !== null) vBtn.style.display = 'none';
  else { vBtn.style.display = 'flex'; vBtn.disabled = true; }

  // Feedback
  const fb = document.getElementById('feedbackBox');
  fb.className = 'feedback-box';
  document.getElementById('expBox').classList.remove('show');

  if (answers[i] !== null) showFeedback(answers[i].correct, q);

  // Nav
  document.getElementById('btnPrev').disabled = (i === 0);
  const btnNext = document.getElementById('btnNext');
const isLast = i >= QUESTIONS.length - 1;

if (isLast && answers[i] !== null) {
  btnNext.textContent = '🏠 Kembali ke Modul';
  btnNext.onclick = () => window.location.href = 'floor.html';
  btnNext.disabled = false;
} else if (isLast) {
  btnNext.textContent = 'Selanjutnya →';
  btnNext.onclick = () => nav(1);
  btnNext.disabled = true;
} else {
  btnNext.textContent = 'Selanjutnya →';
  btnNext.onclick = () => nav(1);
  btnNext.disabled = answers[i] === null;
}

  // Active tab
  document.querySelectorAll('.q-tab').forEach((t, ti) => t.classList.toggle('active', ti === i));

  // Tips
  document.getElementById('tipText').textContent = q.tip
    ? q.tip.slice(0, 100) + (q.tip.length > 100 ? '...' : '')
    : TIPS[q.difficulty];

  // Go quiz button
  const allDone = answers.every(a => a !== null);
  document.getElementById('btnGoQuiz').classList.toggle('show', allDone);

  document.getElementById('qCardBody').scrollTop = 0;
}

/* ================================================
   PICK OPTION
================================================ */
function pickOption(oi) {
  selected = oi;
  document.querySelectorAll('.opt-btn').forEach((b, bi) => {
    b.classList.toggle('selected', bi === oi);
  });
  document.getElementById('btnVerify').disabled = false;
}

/* ================================================
   VERIFY
================================================ */
function verify() {
  if (selected === null) return;
  const q         = QUESTIONS[idx];
  const isCorrect = selected === q.answer;
  answers[idx]    = { selected, correct: isCorrect };

  // Disable + highlight options
  document.querySelectorAll('.opt-btn').forEach((b, bi) => {
    b.disabled = true;
    b.classList.remove('selected');
    if (bi === q.answer)                    b.classList.add('correct');
    if (bi === selected && !isCorrect)      b.classList.add('wrong');
  });

  document.getElementById('btnVerify').style.display = 'none';
  showFeedback(isCorrect, q);
  updateTabs();
  updateProgress();

  // Unlock next tab
  if (idx < QUESTIONS.length - 1) {
    const nextTab = document.getElementById(`tab${idx+1}`);
    if (nextTab) {
      nextTab.classList.remove('locked');
      nextTab.innerHTML = `<span>${idx+2}</span>`;
    }
    document.getElementById('btnNext').disabled = false;
  }

  // XP
  if (isCorrect && currentUser) {
    sb.rpc('add_xp', { p_user_id: currentUser.id, p_xp: q.xp }).catch(() => {});
  }

  // All done?
  if (answers.every(a => a !== null)) {
    document.getElementById('btnGoQuiz').classList.add('show');
    setTimeout(showModal, 700);
  }
}

/* ================================================
   SHOW FEEDBACK
================================================ */
function showFeedback(isCorrect, q) {
  const fb      = document.getElementById('feedbackBox');
  const fbChar  = document.getElementById('fbChar');
  const fbTitle = document.getElementById('fbTitle');
  const fbSub   = document.getElementById('fbSub');
  const fbXP    = document.getElementById('fbXP');
  const expBtn  = document.getElementById('btnShowExp');

  fb.className = 'feedback-box show ' + (isCorrect ? 'fb-correct' : 'fb-wrong');

  if (isCorrect) {
    fbChar.textContent  = '🎉';
    fbTitle.textContent = 'Jawaban Benar!';
    fbTitle.className   = 'fb-title correct';
    fbSub.textContent   = 'Hebat! Jawabanmu benar 🎉';
    fbXP.textContent    = `⭐ +${q.xp} XP`;
    expBtn.style.display = 'none';
  } else {
    fbChar.textContent  = '😅';
    fbTitle.textContent = 'Jawaban Salah!';
    fbTitle.className   = 'fb-title wrong';
    fbSub.textContent   = 'Jawaban yang kamu pilih kurang tepat.';
    fbXP.textContent    = '⭐ +0 XP';
    expBtn.style.display = 'flex';
    // Auto-show explanation on wrong
    showExp(q);
  }
}

/* ================================================
   TOGGLE EXPLANATION
================================================ */
function toggleExp() {
  const box = document.getElementById('expBox');
  if (box.classList.contains('show')) {
    box.classList.remove('show');
    document.getElementById('btnShowExp').textContent = '📖 Lihat Pembahasan';
  } else {
    showExp(QUESTIONS[idx]);
    document.getElementById('btnShowExp').textContent = '✕ Sembunyikan';
  }
}

function showExp(q) {
  document.getElementById('expText').textContent = q.explanation;

  const codeEl = document.getElementById('expCode');
  if (q.explanationCode) { codeEl.textContent = q.explanationCode; codeEl.style.display = 'block'; }
  else codeEl.style.display = 'none';

  const tipBox  = document.getElementById('expTipBox');
  const tipText = document.getElementById('expTipText');
  if (q.tip) { tipText.textContent = q.tip; tipBox.style.display = 'block'; }
  else tipBox.style.display = 'none';

  const box = document.getElementById('expBox');
  box.classList.add('show');
  setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
}

/* ================================================
   UPDATE TABS
================================================ */
function updateTabs() {
  answers.forEach((ans, i) => {
    if (ans === null) return;
    const tab = document.getElementById(`tab${i}`);
    if (!tab) return;
    tab.classList.remove('answered-correct', 'answered-wrong');
    tab.innerHTML = ans.correct
      ? `<span>${i+1}</span><span class="lock-icon">✅</span>`
      : `<span>${i+1}</span><span class="lock-icon">❌</span>`;
    tab.classList.add(ans.correct ? 'answered-correct' : 'answered-wrong');
  });
}

/* ================================================
   PROGRESS BAR
================================================ */
function updateProgress() {
  const done = answers.filter(a => a !== null).length;
  const pct  = (done / QUESTIONS.length) * 100;
  document.getElementById('barFill').style.width   = pct + '%';
  document.getElementById('progCount').textContent = `${done} / ${QUESTIONS.length}`;
}

/* ================================================
   NAVIGATION
================================================ */
function nav(delta) {
  const next = idx + delta;
  if (next < 0 || next >= QUESTIONS.length) return;
  if (delta > 0 && answers[idx] === null) return;
  render(next);
}

/* ================================================
   COMPLETE MODAL
================================================ */
function showModal() {
  const correct = answers.filter(a => a?.correct).length;
  const wrong   = answers.filter(a => a && !a.correct).length;
  const xp      = QUESTIONS.reduce((s, q, i) => s + (answers[i]?.correct ? q.xp : 0), 0);

  document.getElementById('msCorrect').textContent = correct;
  document.getElementById('msWrong').textContent   = wrong;
  document.getElementById('msXP').textContent      = xp;

  const sub = correct >= 5 ? 'Luar biasa! Kamu siap untuk Quiz! 🚀'
            : correct >= 3 ? 'Cukup baik! Kamu bisa lanjut atau ulangi untuk persiapan lebih baik.'
            : 'Masih banyak yang perlu dipelajari. Coba ulangi practice dulu!';
  document.getElementById('modalSub').textContent = sub;
  document.getElementById('modalOverlay').classList.add('open');
}

function retry() {
  answers  = new Array(QUESTIONS.length).fill(null);
  selected = null;
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('btnGoQuiz').classList.remove('show');
  buildTabs();
  render(0);
  updateProgress();
}

function goQuiz() {
  window.location.href = `quiz.html?floor=${floorId}`;
}