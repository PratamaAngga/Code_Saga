/* ================================================
   SUPABASE INIT
================================================ */
const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ================================================
   QUIZ DATA
================================================ */
const SAMPLE_QUESTIONS = [
  {
    id:1, type:'multiple',
    question:'What is the correct way to declare an integer variable in Java?',
    code: null,
    options:['int x = 5;', 'integer x = 5;', 'Int x = 5;', 'var int x = 5;'],
    answer: 0,
    explanation: 'In Java, integer variables are declared using the lowercase keyword "int".'
  },
  {
    id:2, type:'multiple',
    question:'What will be the output of the following code?',
    code: 'int x = 10;\nint y = 3;\nSystem.out.println(x % y);',
    options:['3', '1', '0', '10'],
    answer: 1,
    explanation: 'The % operator returns the remainder. 10 divided by 3 = 3 remainder 1.'
  },
  {
    id:3, type:'multiple',
    question:'Which data type is used to store a single character in Java?',
    code: null,
    options:['String', 'char', 'character', 'letter'],
    answer: 1,
    explanation: '"char" is the Java data type for a single Unicode character, e.g. char c = \'A\';'
  },
  {
    id:4, type:'multiple',
    question:'What keyword is used to declare a constant in Java?',
    code: null,
    options:['const', 'static', 'final', 'constant'],
    answer: 2,
    explanation: 'Java uses the "final" keyword to declare constants. Once assigned, the value cannot change.'
  },
  {
    id:5, type:'multiple',
    question:'Which of the following is NOT a valid Java data type?',
    code: null,
    options:['float', 'double', 'real', 'long'],
    answer: 2,
    explanation: '"real" is not a Java data type. Java uses float and double for decimal numbers.'
  },
  {
    id:6, type:'multiple',
    question:'What is the output of this code?',
    code: 'double d = 9.99;\nint i = (int) d;\nSystem.out.println(i);',
    options:['10', '9.99', '9', 'Error'],
    answer: 2,
    explanation: 'Casting double to int truncates the decimal part. 9.99 becomes 9.'
  },
  {
    id:7, type:'multiple',
    question:'Which statement correctly declares a String variable?',
    code: null,
    options:['string name = "Java";', 'String name = "Java";', 'STRING name = "Java";', 'str name = "Java";'],
    answer: 1,
    explanation: 'In Java, String starts with a capital "S" and is a class, not a primitive type.'
  },
  {
    id:8, type:'multiple',
    question:'What is the default value of a boolean variable in Java?',
    code: null,
    options:['true', 'null', 'false', '0'],
    answer: 2,
    explanation: 'The default value for a boolean instance variable in Java is false.'
  },
  {
    id:9, type:'multiple',
    question:'What will this code print?',
    code: 'int a = 5;\na += 3;\nSystem.out.println(a);',
    options:['5', '3', '53', '8'],
    answer: 3,
    explanation: '+= adds the right operand to the variable. 5 + 3 = 8.'
  },
  {
    id:10, type:'multiple',
    question:'Which of the following correctly declares a long variable?',
    code: null,
    options:['long x = 100L;', 'long x = 100l;', 'long x = 100;', 'All of the above'],
    answer: 3,
    explanation: 'All three declarations are valid in Java. The L or l suffix is optional for long literals that fit.'
  },
  {
    id:11, type:'multiple',
    question:'What is type casting in Java?',
    code: null,
    options:['Converting one data type to another', 'Declaring multiple variables', 'A type of loop', 'A method in String class'],
    answer: 0,
    explanation: 'Type casting is the process of converting a value from one data type to another compatible type.'
  },
  {
    id:12, type:'multiple',
    question:'Which operator is used for string concatenation in Java?',
    code: null,
    options:['*', '&', '+', '||'],
    answer: 2,
    explanation: 'The + operator is used to concatenate (join) strings in Java.'
  },
  {
    id:13, type:'multiple',
    question:'What will this code output?',
    code: 'final int MAX = 100;\nSystem.out.println(MAX);',
    options:['Error', '100', 'MAX', 'null'],
    answer: 1,
    explanation: 'final declares a constant. MAX = 100 and can be printed normally.'
  },
  {
    id:14, type:'multiple',
    question:'Which of these is the correct range of a byte in Java?',
    code: null,
    options:['-256 to 255', '0 to 255', '-128 to 127', '-32768 to 32767'],
    answer: 2,
    explanation: 'A Java byte is 8 bits, ranging from -128 to 127 (2^7 = 128).'
  },
  {
    id:15, type:'multiple',
    question:'What is implicit type conversion (widening) in Java?',
    code: null,
    options:['int to byte', 'double to float', 'int to double', 'long to int'],
    answer: 2,
    explanation: 'Widening converts smaller to larger types (int → double) automatically without data loss.'
  },
  {
    id:16, type:'multiple',
    question:'What will this code print?',
    code: 'String s = "Java";\nSystem.out.println(s.length());',
    options:['4', '5', '3', 'Error'],
    answer: 0,
    explanation: '"Java" has 4 characters. The length() method returns 4.'
  },
];

/* ================================================
   STATE
================================================ */
const PASS_THRESHOLD = 75; // ← ubah jika ingin ganti minimum nilai
const XP_PER_CORRECT = 5;

let questions      = [];
let currentIdx     = 0;
let selectedAnswer = null;
let answers        = []; // { questionIdx, selected, correct }
let timerInterval  = null;
let startTime      = null;
let currentUser    = null;
let floorId        = 1; // ← ambil dari URL param atau sessionStorage

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Cek login
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  // Ambil floor dari URL: quiz.html?floor=1
  const params = new URLSearchParams(window.location.search);
  floorId = parseInt(params.get('floor') || '1');
  document.getElementById('topbarTitle').textContent = `⚔ FLOOR ${floorId} QUIZ`;

  // Load soal (pakai sample dulu)
  questions = SAMPLE_QUESTIONS;

  document.getElementById('qTotal').textContent = questions.length;
  startTimer();
  renderQuestion(0);
});

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
    el.classList.toggle('warning', elapsed > 600); // merah setelah 10 menit
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
  const pct = ((idx) / questions.length) * 100;
  document.getElementById('quizProgressBar').style.width = pct + '%';

  // Counter
  document.getElementById('qCurrent').textContent = idx + 1;
  document.getElementById('qXP').textContent = XP_PER_CORRECT;

  // Question
  document.getElementById('questionText').textContent = q.question;

  // Code block
  const codeEl = document.getElementById('codeBlock');
  if (q.code) {
    codeEl.style.display = 'block';
    codeEl.textContent = q.code;
  } else {
    codeEl.style.display = 'none';
  }

  // Type badge
  document.getElementById('qTypeBadge').textContent = '💡 Multiple Choice';

  // Reset card animation
  const card = document.getElementById('questionCard');
  card.style.animation = 'none';
  requestAnimationFrame(() => { card.style.animation = ''; });

  // Next button
  const btnNext = document.getElementById('btnNext');
  btnNext.classList.remove('visible');
  btnNext.textContent = idx === questions.length - 1 ? '🏁 Finish Quiz' : 'Next Question →';

  // Options
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
function selectAnswer(idx) {
  if (selectedAnswer !== null) return; // already answered
  selectedAnswer = idx;
  const q = questions[currentIdx];
  const isCorrect = idx === q.answer;
  const btns = document.querySelectorAll('.option-btn');

  // Record
  answers.push({ questionIdx: currentIdx, selected: idx, correct: isCorrect });

  // Visual feedback
  btns[idx].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) {
    btns[q.answer].classList.add('correct'); // show right answer
  }
  btns.forEach(b => b.disabled = true);

  // Toast
  showToast(isCorrect);

  // Show next button
  setTimeout(() => {
    document.getElementById('btnNext').classList.add('visible');
  }, 600);
}

/* ================================================
   TOAST FEEDBACK
================================================ */
/* ================================================
   TOAST FEEDBACK
================================================ */
let toastTimeout; // Tambahkan variabel ini di luar fungsi

function showToast(isCorrect) {
  const toast = document.getElementById('feedbackToast');
  toast.textContent = isCorrect ? '✓ Correct! +' + XP_PER_CORRECT + ' XP' : '✗ Wrong!';
  toast.className = 'feedback-toast show' + (isCorrect ? '' : ' wrong-toast');
  
  // Hapus timer lama agar animasinya tidak bertabrakan jika dipanggil berdekatan
  clearTimeout(toastTimeout); 
  toastTimeout = setTimeout(() => { 
    toast.classList.remove('show'); 
  }, 1400);
}

/* ================================================
   NEXT QUESTION / FINISH
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
function finishQuiz() {
  stopTimer();

  // Progress bar 100%
  document.getElementById('quizProgressBar').style.width = '100%';

  const correctCount = answers.filter(a => a.correct).length;
  const wrongCount   = answers.length - correctCount;
  const score        = Math.round((correctCount / questions.length) * 100);
  const xpEarned     = correctCount * XP_PER_CORRECT;
  const passed       = score >= PASS_THRESHOLD;

  // Hide quiz screen
  document.getElementById('quizScreen').style.display = 'none';

  // Fill result
  document.getElementById('scoreNumber').textContent = score;
  document.getElementById('scoreNumber').className   = 'score-number ' + (passed ? 'pass' : 'fail');
  document.getElementById('statCorrect').textContent = correctCount;
  document.getElementById('statWrong').textContent   = wrongCount;
  document.getElementById('statXP').textContent      = xpEarned;

  const header   = document.getElementById('resultHeader');
  const trophy   = document.getElementById('resultTrophy');
  const title    = document.getElementById('resultTitle');
  const subtitle = document.getElementById('resultSubtitle');
  const thBar    = document.getElementById('thresholdBar');
  const thIcon   = document.getElementById('thresholdIcon');
  const thMsg    = document.getElementById('thresholdMsg');

  if (passed) {
    header.className = 'result-header pass';
    trophy.textContent = '🏆';
    title.textContent  = 'QUIZ PASSED!';
    subtitle.textContent = `Amazing! You scored ${score}/100 — Floor ${floorId + 1} unlocked!`;
    thBar.className = 'threshold-bar pass';
    thIcon.textContent = '🎉';
    thMsg.textContent  = `Score ${score} ≥ ${PASS_THRESHOLD} — You unlocked the next floor!`;
    document.getElementById('btnNextFloor').style.display = 'flex';
    spawnConfetti();
    saveProgress(score, xpEarned, true);
  } else {
    header.className = 'result-header fail';
    trophy.textContent = '😢';
    title.textContent  = 'QUIZ FAILED';
    subtitle.textContent = `You scored ${score}/100. Need ≥ ${PASS_THRESHOLD} to proceed.`;
    thBar.className = 'threshold-bar fail';
    thIcon.textContent = '❌';
    thMsg.textContent  = `Score ${score} < ${PASS_THRESHOLD} — Retry to unlock the next floor.`;
    saveProgress(score, xpEarned, false);
  }

  document.getElementById('resultScreen').classList.add('show');
}

/* ================================================
   SAVE PROGRESS TO SUPABASE
================================================ */
async function saveProgress(score, xpEarned, passed) {
  if (!currentUser) return;
  try {
    await sb.from('quiz_results').upsert({
      user_id:   currentUser.id,
      floor_id:  floorId,
      score,
      xp_earned: xpEarned,
      passed,
      taken_at:  new Date().toISOString(),
    });
    if (passed) {
      await sb.rpc('add_xp', { p_user_id: currentUser.id, p_xp: xpEarned }).catch(() => {});
    }
  } catch(e) { console.warn('Save progress:', e.message); }
}

/* ================================================
   RETRY QUIZ
================================================ */
function retryQuiz() {
  answers = [];
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