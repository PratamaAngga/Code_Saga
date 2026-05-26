/* ================================================
   SUPABASE INIT
================================================ */
const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ================================================
   PRACTICE CONFIG
   - XP_PER_CORRECT : XP reward per jawaban benar (3 XP)
================================================ */
const XP_PER_CORRECT = 3; 
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
let idx              = 0;
let answers          = [];
let selected         = null;
let expOpen          = false;
let floorId          = 1;
let actualFloorDbId  = null; // ID UUID/bigint asli dari tabel floors di DB
let practiceModuleId = null; // ID modul dari database agar tersinkronisasi dengan floor.html
let progressRowId    = null; // ID row dari user_floor_progress
let currentUser      = null;

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
    // 1. Dapatkan data floor secara detail
    const { data: floorData } = await sb
      .from('floors')
      .select('id, title')
      .eq('floor_number', floorId)
      .single();

    console.log('floorData:', floorData);

    if (floorData) {
      actualFloorDbId = floorData.id;
      document.getElementById('topFloorLabel').textContent = floorData.title;

      // 2. Dapatkan data room bertipe 'practice' di floor ini
      const { data: roomData } = await sb
        .from('rooms')
        .select('id')
        .eq('floor_id', floorData.id)
        .eq('room_type', 'practice')
        .single();

      console.log('roomData:', roomData);

      if (roomData) {
        // Inisialisasi baris progress di user_floor_progress (status: in_progress)
        await initFloorProgress(roomData.id);

        // Cari ID modul kuis di database agar progress di floor.html tersinkronisasi otomatis
        await fetchPracticeModuleId(floorData.id);

        // 3. Load pertanyaan practice dari room tersebut
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
            xp:              XP_PER_CORRECT, // Override menggunakan konstanta 3 XP
            explanation:     q.explanation,
            explanationCode: null,
            tip:             q.tips,
          }));
        }
      }
    }
  } catch(e) {
    console.warn('Gagal memuat kueri database:', e.message);
  }

  answers = new Array(QUESTIONS.length).fill(null);
  buildTabs();
  render(0);
  updateProgress();
});

/* ================================================
   INITIALIZE FLOOR PROGRESS (in_progress)
================================================ */
async function initFloorProgress(roomDbId) {
  if (!currentUser || !roomDbId || !actualFloorDbId) return;
  try {
    const { data: existing } = await sb
      .from('user_floor_progress')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('floor_id', actualFloorDbId) // FIX: Menggunakan ID database asli, bukan floorId (nomor lantai)
      .eq('current_room_id', roomDbId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      progressRowId = existing.id;
      console.log('📌 Progress floor ditemukan, ID:', progressRowId);
    } else {
      // Buat baru jika belum pernah dibuka
      const { data: inserted, error } = await sb
        .from('user_floor_progress')
        .insert({
          user_id:         currentUser.id,
          floor_id:        actualFloorDbId, // FIX: Menggunakan ID database asli untuk menghindari FK violation
          current_room_id: roomDbId,
          status:          'in_progress',
          score:           0,
          xp_earned:       0,
          hp_remaining:    100
        })
        .select('id')
        .single();

      if (!error && inserted) {
        progressRowId = inserted.id;
        console.log('✅ Progress floor diinisialisasi baru, ID:', progressRowId);
      } else {
        console.warn('Gagal inisialisasi progress:', error?.message);
      }
    }
  } catch(e) { console.warn('initFloorProgress error:', e.message); }
}

/* ================================================
   FETCH PRACTICE MODULE ID FROM DATABASE
================================================ */
async function fetchPracticeModuleId(floorDbId) {
  try {
    const { data: rooms } = await sb
      .from('rooms')
      .select('id')
      .eq('floor_id', floorDbId);

    if (!rooms || rooms.length === 0) return;
    const roomIds = rooms.map(r => r.id);

    // Practice adalah module_type = 'quiz' di floor.html
    const { data: modData } = await sb
      .from('modules')
      .select('id')
      .in('room_id', roomIds)
      .eq('module_type', 'quiz')
      .maybeSingle();

    if (modData) {
      practiceModuleId = modData.id;
      console.log(`🎯 Terdeteksi Practice Module ID: ${practiceModuleId}`);
    }
  } catch (e) {
    console.warn('fetchPracticeModuleId error:', e.message);
  }
}

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

  // Options
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

  // Navigasi Tombol Dinamis di Footer
  document.getElementById('btnPrev').disabled = (i === 0);
  const btnNext = document.getElementById('btnNext');
  const isLast = i >= QUESTIONS.length - 1;

  if (isLast) {
    if (answers[i] !== null) {
      btnNext.textContent = '🏠 Kembali ke Modul';
      btnNext.disabled = false;
      btnNext.onclick = () => { window.location.href = 'floor.html'; };
    } else {
      btnNext.textContent = 'Selanjutnya →';
      btnNext.disabled = true;
      btnNext.onclick = () => nav(1);
    }
  } else {
    btnNext.textContent = 'Selanjutnya →';
    btnNext.disabled = answers[i] === null;
    btnNext.onclick = () => nav(1);
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
async function verify() {
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
  } else {
    // Tombol Next pada soal terakhir diganti aksinya ke Kembali ke Modul
    const btnNext = document.getElementById('btnNext');
    btnNext.textContent = '🏠 Kembali ke Modul';
    btnNext.disabled = false;
    btnNext.onclick = () => { window.location.href = 'floor.html'; };
  }

  // Tambahkan XP jika benar
  if (isCorrect && currentUser) {
    await addXpToUser(XP_PER_CORRECT);
    await addXpToFloorProgress(XP_PER_CORRECT);
  }

  // Jika semua soal terjawab, kunci status modul menjadi selesai
  if (answers.every(a => a !== null)) {
    document.getElementById('btnGoQuiz').classList.add('show');
    await saveModuleProgress();
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

/* ================================================
   RETRY PRACTICE
================================================ */
function retry() {
  answers  = new Array(QUESTIONS.length).fill(null);
  selected = null;
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('btnGoQuiz').classList.remove('show');
  buildTabs();
  render(0);
  updateProgress();
}

/* ================================================
   GO TO QUIZ
================================================ */
function goQuiz() {
  window.location.href = `quiz.html?floor=${floorId}`;
}

/* ================================================
   SAVE MODULE PROGRESS (user_module_progress)
================================================ */
async function saveModuleProgress() {
  if (!currentUser || !practiceModuleId) return;
  try {
    const { data: existing } = await sb
      .from('user_module_progress')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('module_id', practiceModuleId)
      .maybeSingle();

    if (!existing) {
      const { error } = await sb
        .from('user_module_progress')
        .insert({
          user_id:      currentUser.id,
          module_id:    practiceModuleId,
          floor_id:     actualFloorDbId, // Menyimpan ID UUID/bigint asli dari tabel floors
          completed:    true,
          completed_at: new Date().toISOString()
        });
      
      if (error) throw error;
      console.log('✅ Progress modul latihan berhasil didaftarkan ke user_module_progress!');
    }
  } catch (e) {
    console.warn('Gagal menyimpan progress modul latihan:', e.message);
  }
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
      await sb
        .from('users')
        .update({
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
      console.log(`✅ Users total_exp +${xpAmount} → total ${newTotal}`);
    } else {
      await sb
        .from('users')
        .insert({
          id:         currentUser.id,
          email:      currentUser.email,
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        });
      console.log(`✅ Users total_exp +${xpAmount} (Profil baru dibuat) → total ${newTotal}`);
    }
  } catch(e) { console.warn('addXpToUser error:', e.message); }
}

/* ================================================
   TAMBAH XP KE TABEL user_floor_progress (KOLOM xp_earned)
================================================ */
async function addXpToFloorProgress(xpAmount) {
  if (!progressRowId || xpAmount <= 0) return;
  try {
    const { data: progressData, error: fetchErr } = await sb
      .from('user_floor_progress')
      .select('xp_earned')
      .eq('id', progressRowId)
      .maybeSingle();

    if (fetchErr) {
      console.warn('addXpToFloorProgress fetch error:', fetchErr.message);
      return;
    }

    const currentXp = progressData ? (progressData.xp_earned || 0) : 0;
    const newTotal = currentXp + xpAmount;

    const { error: updateErr } = await sb
      .from('user_floor_progress')
      .update({
        xp_earned: newTotal,
        completed_at: new Date().toISOString()
      })
      .eq('id', progressRowId);

    if (updateErr) {
      console.warn('addXpToFloorProgress update error:', updateErr.message);
    } else {
      console.log(`✅ user_floor_progress xp_earned +${xpAmount} → total ${newTotal}`);
    }
  } catch (e) {
    console.warn('addXpToFloorProgress error:', e.message);
  }
}