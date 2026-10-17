/* ═══════════════════════════════════════════════════
   HSK Flashcards – client
   ─────────────────────────────────────────────────── */

// ── State ───────────────────────────────────────────
let allWords = [];
let deck = [];
let currentIndex = null;
let locked = false;
let flipped = false;
let shownCount = 0;
let flipTimer = null;

// Score tracking
let correctCount = 0;
let answeredCount = 0;

// ── Text-to-Speech (female zh-CN voice) ─────────────
let zhVoice = null;

function pickChineseVoice() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;

  const zhVoices = voices.filter(v => v.lang.startsWith("zh"));
  if (!zhVoices.length) return;

  const femaleHints = [
    "huihui",
    "yaoyao",
    "tingting",
    "meijia",
    "female",
  ];

  zhVoice = zhVoices.find(v => {
    const name = v.name.toLowerCase();
    return femaleHints.some(hint => name.includes(hint));
  });

  if (!zhVoice) {
    zhVoice = zhVoices.find(v => v.lang === "zh-CN") || zhVoices[0];
  }
}

if (typeof speechSynthesis !== "undefined") {
  pickChineseVoice();
  speechSynthesis.onvoiceschanged = pickChineseVoice;
}

function speak() {
  const w = allWords[currentIndex];
  if (!w) return;

  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(w.h);
  u.lang = "zh-CN";
  u.rate = 0.75;
  u.pitch = 1.2;

  if (zhVoice) {
    u.voice = zhVoice;
  }

  speechSynthesis.speak(u);
}

// ── Deck helpers ────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Fetch words from API ────────────────────────────
async function loadWords(level) {
  const res = await fetch(`/api/words?level=${level}`);
  if (!res.ok) throw new Error(`Failed to load level ${level}`);
  return res.json();
}

// ── Score display (red → green gradient by hue) ─────
function updateScore() {
  const el = document.getElementById("score");
  if (answeredCount === 0) {
    el.textContent = "";
    el.style.color = "";
    return;
  }

  const pct = Math.round((correctCount / answeredCount) * 100);
  // Hue: 0 = red, 60 = yellow, 120 = green
  const hue = Math.round(pct * 1.2);
  el.style.color = `hsl(${hue}, 75%, 55%)`;
  el.textContent = `${pct}% · ${correctCount}/${answeredCount}`;
}

// ── Card display ────────────────────────────────────
function nextCard() {
  if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; }

  if (allWords.length === 0) return;

  if (deck.length === 0) {
    deck = shuffle([...Array(allWords.length).keys()]);
  }
  currentIndex = deck.pop();
  shownCount++;

  const w = allWords[currentIndex];
  document.getElementById("hanzi").textContent = w.h;
  document.getElementById("pinyin").textContent = w.p;

  // Back face stays BLANK until the answer is revealed
  document.getElementById("backTranslation").textContent = "";
  document.getElementById("backHanzi").textContent = "";

  const card = document.getElementById("card");
  card.classList.remove("flipped", "green-glow", "red-glow");
  locked = false;
  flipped = false;

  const input = document.getElementById("answerInput");
  input.value = "";
  input.disabled = false;
  input.focus();

  document.getElementById("feedback").className = "feedback-text";
  document.getElementById("hint").classList.remove("show");
  document.getElementById("counter").textContent =
    `Card ${shownCount} · ${deck.length + 1} left in cycle`;

  // Auto-speak the new card
  speak();
}

// ── Reveal back face (called when answer is checked) ─
function revealBack() {
  const w = allWords[currentIndex];
  document.getElementById("backTranslation").textContent = w.e;
  document.getElementById("backHanzi").textContent = `${w.h} / ${w.p}`;
}

// ── Flip & advance ──────────────────────────────────
function doFlipAndAdvance() {
  if (flipped) return;
  
  const card = document.getElementById("card");
  card.classList.add("flipped");
  flipped = true;

  flipTimer = setTimeout(nextCard, 1800);
}

// ── Check answer ────────────────────────────────────
function checkAnswer() {
  if (locked) return;
  locked = true;

  const input = document.getElementById("answerInput");
  const userAns = input.value.trim().toLowerCase();
  const correct = allWords[currentIndex].e.toLowerCase();

  const isCorrect =
    userAns === correct ||
    (userAns.length > 2 && correct.includes(userAns)) ||
    (correct.length > 2 && userAns.includes(correct));

  // Update score
  answeredCount++;
  if (isCorrect) correctCount++;
  updateScore();

  const card = document.getElementById("card");
  const feedback = document.getElementById("feedback");
  const hint = document.getElementById("hint");

  if (isCorrect) {
    card.classList.add("green-glow");
    feedback.textContent = "✓ Correct!";
    feedback.className = "feedback-text show correct";
  } else {
    card.classList.add("red-glow");
    feedback.textContent = "✗ Not quite";
    feedback.className = "feedback-text show wrong";
  }

  input.disabled = true;
  hint.classList.add("show");

  // Populate the back face now (was blank)
  revealBack();

  flipTimer = setTimeout(doFlipAndAdvance, 1000);
}

// ── Manual override ─────────────────────────────────
function skipToBack() {
  if (!locked) return;
  if (flipTimer && flipped) {
    clearTimeout(flipTimer);
    flipTimer = null;
    nextCard(); 
  }
}

// ── Populate level dropdown ─────────────────────────
async function populateLevels() {
  const res = await fetch("/api/levels");
  const levels = await res.json();

  const sel = document.getElementById("levelSelect");
  for (const n of levels) {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = `HSK ${n}`;
    sel.appendChild(opt);
  }
}

// ── Load words for selected level ───────────────────
async function buildWords() {
  const level = document.getElementById("levelSelect").value;
  try {
    allWords = await loadWords(level);
  } catch (err) {
    console.error(err);
    return;
  }
  shownCount = 0;
  deck = [];
  nextCard();
}

// ── Init ────────────────────────────────────────────
async function init() {
  await populateLevels();

  document.getElementById("levelSelect").addEventListener("change", () => {
    correctCount = 0;
    answeredCount = 0;
    updateScore();
    buildWords();
  });

  document.getElementById("speakBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    speak();
  }, true);

  document.getElementById("checkBtn").addEventListener("click", checkAnswer);
  document.getElementById("answerInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkAnswer();
  });

  document.getElementById("card").addEventListener("click", skipToBack);

  document.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && locked) {
      e.preventDefault();
      skipToBack();
    }
  });

  await buildWords();
}

init();
