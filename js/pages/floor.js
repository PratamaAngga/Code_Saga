/* ============================================
   STATE
============================================ */
let activeFloor      = 0;
let currentUser      = null;
let completedModules = new Set();   // Set of module DB ids
let openMod          = null;
let FLOORS           = [];          // diisi dari database

/* ============================================
   INIT
============================================ */
document.addEventListener("DOMContentLoaded", async () => {
  // — Auth guard —
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = "login.html"; return; }
  currentUser = session.user;

  // — Profile UI —
  const meta = currentUser.user_metadata || {};
  const name = meta.username || meta.full_name || currentUser.email.split("@")[0];
  document.getElementById("profileName").textContent = name;
  const avatarWrap =
    document.getElementById("avatarWrap");

const avatarId =
    meta.avatar_id;

const avatar =
    window.AVATARS.find(
        a => a.id === avatarId
    );

if (avatar) {

    avatarWrap.innerHTML = `   <img
            src="${avatar.src}"
            style="
                width:100%;
                height:100%;
                border-radius:50%;
                object-fit:cover;
            "
        >
    `;

} else {

    avatarWrap.textContent =
        name.charAt(0).toUpperCase();

}

  showLoading(true);

  try {
    await loadFloorsFromDB();
    await loadUserProgress();
    computeUnlocks();
    renderTabs();
    await renderFloor(0);
  } catch (err) {
    console.error("Init error:", err);
    showError("Gagal memuat data. Silakan refresh halaman.");
  } finally {
    showLoading(false);
  }
});

/* ============================================
   LOAD FLOORS + ROOMS + MODULES DARI DB
   Relasi: floors → rooms → modules
============================================ */
async function loadFloorsFromDB() {
  // 1. Fetch semua floors
  const { data: floorsData, error: floorErr } = await sb
    .from("floors")
    .select("*")
    .order("order_index", { ascending: true });

  if (floorErr) throw floorErr;
  if (!floorsData?.length) throw new Error("Tidak ada data floor.");

  // 2. Fetch semua rooms beserta modules-nya sekaligus (nested select)
  const { data: roomsData, error: roomErr } = await sb
    .from("rooms")
    .select(`
      id,
      floor_id,
      room_type,
      title,
      has_boss,
      hp_limit,
      order_index,
      modules (
        id,
        room_id,
        title,
        description,
        yt_url,
        xp_reward,
        module_type,
        duration_mentions,
        order_index
      )
    `)
    .order("order_index", { ascending: true });

  if (roomErr) throw roomErr;

  // 3. Gabungkan: tiap floor → array rooms → flatten modules urut
  FLOORS = floorsData.map((floor, idx) => {
    const floorRooms = (roomsData || [])
      .filter((r) => r.floor_id === floor.id)
      .sort((a, b) => a.order_index - b.order_index);

    // Flatten semua modules dari semua rooms dalam floor ini,
    // dengan urutan: room order_index dulu, lalu module order_index
    const modules = floorRooms.flatMap((room) =>
      (room.modules || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((mod) => ({
          ...mod,
          room_type: room.room_type, // sertakan room_type agar bisa render quiz/boss
        })),
    );

    return {
      ...floor,
      unlocked: idx === 0,
      rooms: floorRooms,
      modules,
    };
  });
}

/* ============================================
   LOAD PROGRESS USER
============================================ */
async function loadUserProgress() {
  const { data, error } = await sb
    .from("user_module_progress")
    .select("module_id")
    .eq("user_id", currentUser.id)
    .eq("completed", true);

  if (error) {
    console.warn("Progress load warning:", error.message);
    return;
  }
  completedModules = new Set((data || []).map((r) => r.module_id));
}

/* ============================================
   HITUNG UNLOCK FLOOR
============================================ */
function computeUnlocks() {
  FLOORS.forEach((floor, i) => {
    if (i === 0) {
      floor.unlocked = true;
      return;
    }
    // Floor terbuka jika semua modul floor sebelumnya sudah selesai
    floor.unlocked = FLOORS[i - 1].modules.every((m) =>
      completedModules.has(m.id),
    );
  });
}

/* ============================================
   RENDER TABS
============================================ */
function renderTabs() {
  const container = document.getElementById("floorTabs");
  container.innerHTML = "";
  FLOORS.forEach((floor, i) => {
    const floorName = `Floor ${floor.floor_number}`;
    const btn = document.createElement("button");
    btn.className = `tab-btn${i === activeFloor ? " active" : ""}${!floor.unlocked ? " disabled" : ""}`;
    btn.disabled = !floor.unlocked;
    btn.innerHTML = floor.unlocked ? floorName : `${floorName} 🔒`;
    btn.onclick = async () => {
      activeFloor = i;
      document
        .querySelectorAll(".tab-btn")
        .forEach((b, j) => b.classList.toggle("active", j === i));
      await renderFloor(i);
    };
    container.appendChild(btn);
  });
}

/* ============================================
   RENDER FLOOR & AUTO-INIT FIRST ROOM
============================================ */
async function renderFloor(idx) {
  activeFloor = idx;
  const floor = FLOORS[idx];

  // — Left panel —
  document.getElementById("floorBannerTitle").textContent = floor.title;
  document.getElementById("floorBannerDesc").textContent = floor.description;

  // — Progress —
  const done = floor.modules.filter((m) => completedModules.has(m.id)).length;
  document.getElementById("progressText").textContent = `${done} / ${floor.modules.length}`;

  // — Bottom hint —
  const next = FLOORS[idx + 1];
  const hint = document.getElementById("bottomHint");
  hint.innerHTML = next
    ? `💡 Complete all modules to unlock <strong>Floor ${next.floor_number}</strong>! <span class="runner-emoji">🏃</span>`
    : `🏆 Congrats! You completed all floors!`;

  // — Auto-initialize first room of this active floor as in_progress —
  await initFirstRoomProgress();

  // — Module list —
  const list = document.getElementById("moduleList");
  list.innerHTML = "";

  floor.modules.forEach((mod, i) => {
    const isDone = completedModules.has(mod.id);
    const prevDone = i === 0 || completedModules.has(floor.modules[i - 1].id);
    const isActive = !isDone && prevDone && floor.unlocked;
    const isLocked = !isDone && !prevDone;
    const isLast = i === floor.modules.length - 1;

    const dotCls = isDone ? "done" : isActive ? "active" : "locked";
    const dotLabel = isDone ? "✓" : isActive ? i + 1 : "🔒";

    // Tentukan tipe dari module_type atau room_type
    const isQuiz = mod.module_type === "quiz" || mod.room_type === "quiz";
    const isBoss = mod.room_type === "boss";
    const isQuizBattle = mod.module_type === "quiz_battle";

    // — Thumbnail —
    let thumbHTML;
    if (isBoss) {
      thumbHTML = `<div class="thumb" style="background:#b71c1c;font-size:2rem;">👾</div>`;
    } else if (isQuizBattle) {
      thumbHTML = `<div class="thumb" style="background:linear-gradient(135deg,#6a1b9a,#ad1457);font-size:2rem;">⚔️</div>`;
    } else if (isQuiz) {
      thumbHTML = `<div class="thumb" style="background:#1565C0;font-size:2rem;">📝</div>`;
    } else {
      thumbHTML = `
        <div class="thumb">
          <img src="https://img.youtube.com/vi/${mod.yt_url}/mqdefault.jpg" alt=""
               onerror="this.style.display='none'">
          <div class="thumb-overlay">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="12" fill="white" opacity=".88"/>
              <polygon points="10,8 17,12 10,16" fill="#FF0000"/>
            </svg>
          </div>
        </div>`;
    }

    // — Right action —
    let rightHTML = "";
    if (isDone) {
      rightHTML = `<div class="done-badge">✅ Done</div>`;
    } else if (isActive) {
      if (mod.module_type === "quiz_battle") {
        rightHTML = `<button class="watch-btn" style="background:linear-gradient(135deg,#6a1b9a,#ad1457);box-shadow:0 3px 0 #4a148c;" data-mod-id="${mod.id}">⚔️ Start Quiz</button>`;
      } else if (mod.module_type === "quiz") {
        rightHTML = `<button class="watch-btn" data-mod-id="${mod.id}">📝 Start Practice</button>`;
      } else {
        rightHTML = `<button class="watch-btn" data-mod-id="${mod.id}">▶ Watch Now</button>`;
      }
    } else {
      rightHTML = `<span class="lock-ico">🔒</span>`;
    }

    const row = document.createElement("div");
    row.className = "module-row";
    row.innerHTML = `
      <div class="tl-col">
        <div class="tl-dot ${dotCls}">${dotLabel}</div>
        <div class="tl-line ${isDone ? "done" : ""} ${isLast ? "hidden" : ""}"></div>
      </div>
      <div class="module-card ${isLocked ? "locked" : ""} ${isActive ? "card-active" : ""} ${isDone ? "card-done" : ""}"
           style="animation-delay:${i * 0.05}s">
        ${thumbHTML}
        <div class="card-info">
          <div class="card-num">#${i + 1}</div>
          <div class="card-name">${mod.title}</div>
          <div class="card-desc">${mod.description || ""}</div>
          <div class="card-xp">⭐ +${mod.xp_reward ?? 10} XP</div>
        </div>
        <div class="card-right">${rightHTML}</div>
      </div>`;

    row.querySelector(".module-card").addEventListener("click", () => {
      if (isLocked) return;
      openModal(mod);
    });
    const wb = row.querySelector(".watch-btn");
    if (wb)
      wb.addEventListener("click", (e) => {
        e.stopPropagation();
        openModal(mod);
      });

    list.appendChild(row);
  });
}

/* ============================================
   INITIALIZE FIRST ROOM PROGRESS (in_progress)
============================================ */
async function initFirstRoomProgress() {
  if (!currentUser || FLOORS.length === 0) return;
  try {
    const currentFloor = FLOORS[activeFloor];
    if (!currentFloor || currentFloor.rooms.length === 0) return;

    const firstRoom = currentFloor.rooms[0]; // Room pertama (biasanya isinya video)

    const { data: existing } = await sb
      .from("user_floor_progress")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("floor_id", currentFloor.id)
      .eq("current_room_id", firstRoom.id)
      .maybeSingle();

    if (!existing) {
      await sb.from("user_floor_progress").insert({
        user_id:         currentUser.id,
        floor_id:        currentFloor.id,
        current_room_id: firstRoom.id,
        status:          "in_progress",
        score:           0,
        xp_earned:       0,
        hp_remaining:    100,
      });
      console.log(`✅ First room (${firstRoom.title}) auto-initialized as in_progress!`);
    }
  } catch (e) {
    console.warn("initFirstRoomProgress error:", e.message);
  }
}

/* ============================================
   MODAL
============================================ */
function openModal(mod) {
  if (mod.module_type === "quiz") {
    window.location.href = `practice.html?floor=${FLOORS[activeFloor].floor_number}`;
    return;
  }

  if (mod.module_type === "quiz_battle") {
    window.location.href = `quiz.html?floor=${FLOORS[activeFloor].floor_number}`;
    return;
  }
  openMod = mod;
  document.getElementById("modalTitle").textContent = mod.title;
  document.getElementById("modalDesc").textContent = mod.description || "";
  document.getElementById("modalXP").textContent = mod.xp_reward ?? 10;

  const isDone = completedModules.has(mod.id);
  const btn = document.getElementById("btnMarkDone");
  btn.disabled = isDone;
  btn.textContent = isDone
    ? "✅ Already Completed!"
    : "✅ Mark as Done & Earn XP";

  const frame = document.getElementById("ytFrame");
  frame.src = mod.yt_url
    ? `https://www.youtube.com/embed/${mod.yt_url}?autoplay=1&rel=0`
    : "";

  document.getElementById("videoModal").classList.add("open");
}

function closeModal() {
  document.getElementById("ytFrame").src = "";
  document.getElementById("videoModal").classList.remove("open");
  openMod = null;
}

document.getElementById("modalClose").onclick = closeModal;
document.getElementById("videoModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

/* ============================================
   MARK AS DONE — handles video module completion
============================================ */
document.getElementById("btnMarkDone").addEventListener("click", async () => {
  if (!openMod || completedModules.has(openMod.id)) return;

  const btn = document.getElementById("btnMarkDone");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    // 1. Simpan progress modul ke user_module_progress
    const { error } = await sb.from("user_module_progress").insert({
      user_id:      currentUser.id,
      module_id:    openMod.id,
      floor_id:     FLOORS[activeFloor].id,
      completed:    true,
      completed_at: new Date().toISOString(),
    });
    if (error) throw error;

    // 2. Tambah XP ke users.total_exp secara langsung (tanpa RPC)
    const xpReward = openMod.xp_reward ?? 10;
    await addXpToUser(xpReward);

    // 3. Tambah XP ke user_floor_progress.xp_earned untuk room video ini
    await addXpToFloorProgress(openMod.room_id, xpReward);

    // 4. Update status progress berdasarkan apakah ini video terakhir atau bukan
    await handleVideoModuleProgress(openMod.room_id);

    completedModules.add(openMod.id);
    btn.textContent = "✅ XP Earned!";

    setTimeout(() => {
      closeModal();
      computeUnlocks();
      renderTabs();
      renderFloor(activeFloor);
    }, 800);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "✅ Mark as Done & Earn XP";
    alert("Gagal menyimpan: " + err.message);
  }
});

/* ============================================
   TAMBAH XP KE TABEL public.users (KOLOM total_exp)
============================================ */
async function addXpToUser(xpAmount) {
  if (!currentUser || xpAmount <= 0) return;
  try {
    const { data: userData, error: fetchErr } = await sb
      .from("users")
      .select("total_exp")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (fetchErr) {
      console.warn("addXpToUser fetch error:", fetchErr.message);
      return;
    }

    const currentXp = userData ? (userData.total_exp || 0) : 0;
    const newTotal = currentXp + xpAmount;

    if (userData) {
      await sb
        .from("users")
        .update({
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id);
      console.log(`✅ Users total_exp +${xpAmount} → total ${newTotal}`);
    } else {
      await sb
        .from("users")
        .insert({
          id:         currentUser.id,
          email:      currentUser.email,
          total_exp:  newTotal,
          updated_at: new Date().toISOString(),
        });
      console.log(`✅ Users total_exp +${xpAmount} (Profil baru dibuat) → total ${newTotal}`);
    }
  } catch (e) { console.warn("addXpToUser error:", e.message); }
}

/* ============================================
   TAMBAH XP KE TABEL user_floor_progress (KOLOM xp_earned)
============================================ */
async function addXpToFloorProgress(roomDbId, xpAmount) {
  if (!currentUser || !roomDbId || xpAmount <= 0) return;
  try {
    const { data: progressData, error: fetchErr } = await sb
      .from("user_floor_progress")
      .select("id, xp_earned")
      .eq("user_id", currentUser.id)
      .eq("current_room_id", roomDbId)
      .maybeSingle();

    if (fetchErr) {
      console.warn("addXpToFloorProgress fetch error:", fetchErr.message);
      return;
    }

    const currentXp = progressData ? (progressData.xp_earned || 0) : 0;
    const newTotal = currentXp + xpAmount;

    if (progressData) {
      await sb
        .from("user_floor_progress")
        .update({
          xp_earned: newTotal,
          completed_at: new Date().toISOString()
        })
        .eq("id", progressData.id);
    } else {
      await sb
        .from("user_floor_progress")
        .insert({
          user_id:         currentUser.id,
          floor_id:        FLOORS[activeFloor].id,
          current_room_id: roomDbId,
          status:          "in_progress",
          score:           0,
          xp_earned:       newTotal,
          hp_remaining:    100
        });
    }
    console.log(`✅ user_floor_progress xp_earned +${xpAmount} → total ${newTotal}`);
  } catch (e) {
    console.warn("addXpToFloorProgress error:", e.message);
  }
}

/* ============================================
   HANDLE VIDEO MODULE PROGRESS (LOGIC UNLOCK BARU)
============================================ */
async function handleVideoModuleProgress(roomDbId) {
  if (!currentUser) return;
  try {
    const currentFloor = FLOORS[activeFloor];
    // Filter semua modul video di floor ini (bukan quiz, quiz_battle, atau boss)
    const videoModules = currentFloor.modules.filter(
      (m) => m.module_type !== "quiz" && m.module_type !== "quiz_battle" && m.room_type !== "boss"
    );

    if (videoModules.length === 0) return;

    // Cek apakah video yang barusan diselesaikan adalah video terakhir
    const isLastVideo = openMod.id === videoModules[videoModules.length - 1].id;

    if (!isLastVideo) {
      // Jika bukan video terakhir, status progres video room ini TETAP 'in_progress'
      await sb
        .from("user_floor_progress")
        .update({
          status: "in_progress",
          completed_at: null
        })
        .eq("user_id", currentUser.id)
        .eq("current_room_id", roomDbId);
      console.log("📽 Video selesai, tapi progres room tetap in_progress (masih ada video berikutnya)");
    } else {
      // Jika ini adalah video terakhir, ubah status progres video room ini menjadi 'completed'
      await sb
        .from("user_floor_progress")
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("user_id", currentUser.id)
        .eq("current_room_id", roomDbId);
      console.log("✅ Video terakhir selesai! Status room video diubah menjadi completed.");

      // Otomatis buka room kuis/latihan berikutnya sebagai 'in_progress'
      const currentRoomIdx = currentFloor.rooms.findIndex((r) => r.id === roomDbId);
      if (currentRoomIdx !== -1 && currentRoomIdx < currentFloor.rooms.length - 1) {
        const nextRoom = currentFloor.rooms[currentRoomIdx + 1];

        const { data: existingNext } = await sb
          .from("user_floor_progress")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("current_room_id", nextRoom.id)
          .maybeSingle();

        if (!existingNext) {
          await sb.from("user_floor_progress").insert({
            user_id:         currentUser.id,
            floor_id:        currentFloor.id,
            current_room_id: nextRoom.id,
            status:          "in_progress",
            score:           0,
            xp_earned:       0,
            hp_remaining:    100,
          });
          console.log(`🚀 Practice Room (${nextRoom.title}) successfully unlocked as in_progress!`);
        }
      }
    }
  } catch (err) {
    console.warn("handleVideoModuleProgress error:", err.message);
  }
}

/* ============================================
   PROFILE + LOGOUT
============================================ */
document.getElementById("profileBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("profileBtn").classList.toggle("open");
});
document.addEventListener("click", () => {
  document.getElementById("profileBtn").classList.remove("open");
});
document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  await sb.auth.signOut();
  window.location.href = "login.html";
});

/* ============================================
   HELPERS
================================================ */
function showLoading(show) {
  let el = document.getElementById("loadingOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loadingOverlay";
    el.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;" +
      "align-items:center;justify-content:center;z-index:9999;color:#fff;font-size:1.3rem;";
    el.innerHTML = "⏳ Loading…";
    document.body.appendChild(el);
  }
  el.style.display = show ? "flex" : "none";
}

function showError(msg) {
  const list = document.getElementById("moduleList");
  if (list)
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:#c62828;">${msg}</div>`;
}