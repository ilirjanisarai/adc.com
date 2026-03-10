/**
 * ADC Portal — Username + Password Protection
 *
 * UDHËZIME PËR INTEGRIM:
 * ─────────────────────────────────────────────
 * 1. Shto përdoruesit te USERS më poshtë (shiko udhëzimet për hash)
 * 2. Vendos skedarin në të njëjtin folder me index.html
 * 3. Shto në <head> të index.html si linja e PARË e skripteve:
 *    <script src="adc-login-protection.js"></script>
 * ─────────────────────────────────────────────
 *
 * SI TË GJENEROSH HASH PËR PASSWORDIN:
 * ─────────────────────────────────────────────
 * Hap browser console (F12) dhe ekzekuto:
 *
 *   async function hash(msg) {
 *     const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
 *     return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
 *   }
 *   hash("passwordi_yt").then(console.log);
 *
 * Kopjo rezultatin dhe vendose te "passwordHash" i përdoruesit përkatës.
 * ─────────────────────────────────────────────
 */

(function () {

  // ─── LISTA E PËRDORUESVE ────────────────────────────────────────────────────
  // "username" është case-insensitive
  // "passwordHash" është SHA-256 i passwordit (shiko udhëzimet sipër)
  // "displayName" shfaqet pas hyrjes si përshëndetje
  const USERS = [
    {
      username: "ilirjan",
      passwordHash: "962754a0588b30827005464c7b536b5f06a1dc01d491e7b109d67f271a31df4c",
      displayName: "Ilirjan"
    },
    {
      username: "admin",
      passwordHash: "c1f0cc0106d221e536ef29c1802b16e4572c515868b4348038abf8a505747d31",
      displayName: "Administrator"
    },
    {
      username: "user3",
      passwordHash: "VENDOS_HASH_KETU",
      displayName: "Përdoruesi 3"
    },
    // Shto më shumë:
    // { username: "user4", passwordHash: "...", displayName: "Emri" },
  ];

  // ─── KONFIGURIMI ────────────────────────────────────────────────────────────
  const SESSION_HOURS  = 8;
  const STORAGE_KEY    = "adc_portal_auth_v2";
  const MAX_ATTEMPTS   = 5;
  const LOCKOUT_MINUTES = 5;

  // ─── LOGJIKA ────────────────────────────────────────────────────────────────

  async function hashPassword(password) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  function getState() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function setState(data) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function isAuthenticated() {
    const s = getState();
    if (!s.authenticated) return false;
    if (SESSION_HOURS > 0 && Date.now() > s.timestamp + SESSION_HOURS * 3600000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  }

  function isLockedOut() {
    const s = getState();
    if (!s.lockUntil) return false;
    if (Date.now() < s.lockUntil) return true;
    setState({ ...s, attempts: 0, lockUntil: null });
    return false;
  }

  function recordFailedAttempt() {
    const s = getState();
    const attempts = (s.attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      setState({ ...s, attempts, lockUntil: Date.now() + LOCKOUT_MINUTES * 60000 });
    } else {
      setState({ ...s, attempts });
    }
    return attempts;
  }

  function injectLoginScreen() {
    document.documentElement.style.visibility = "hidden";

    const overlay = document.createElement("div");
    overlay.id = "adc-login-overlay";
    overlay.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        #adc-login-overlay{position:fixed;inset:0;z-index:999999;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;overflow:hidden}
        .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(220,30,30,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(220,30,30,0.04) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
        .bg-glow{position:absolute;top:-150px;right:-150px;width:500px;height:500px;background:radial-gradient(circle,rgba(220,30,30,0.15) 0%,transparent 65%);pointer-events:none}
        .bg-glow2{position:absolute;bottom:-100px;left:-100px;width:350px;height:350px;background:radial-gradient(circle,rgba(220,30,30,0.07) 0%,transparent 65%);pointer-events:none}
        .adc-card{position:relative;width:400px;padding:48px 40px 40px;background:#111;border:1px solid #1e1e1e;box-shadow:0 0 0 1px rgba(220,30,30,0.08),0 40px 100px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.03);animation:cardIn .55s cubic-bezier(.22,1,.36,1) both}
        @keyframes cardIn{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        .adc-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#8b0000,#dc1e1e,#ff5555,#dc1e1e);background-size:200% 100%;animation:shimmer 3s linear infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .adc-logo{font-family:'Bebas Neue',sans-serif;font-size:40px;letter-spacing:5px;color:#fff;line-height:1;margin-bottom:4px}
        .adc-logo span{color:#dc1e1e}
        .adc-tagline{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#444;margin-bottom:38px}
        .adc-field{margin-bottom:18px}
        .adc-label{display:block;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:8px}
        .adc-input-wrap{position:relative}
        .adc-input{width:100%;padding:12px 44px 12px 16px;background:#0d0d0d;border:1px solid #222;color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}
        .adc-input:focus{border-color:#dc1e1e;box-shadow:0 0 0 3px rgba(220,30,30,0.1)}
        .adc-input::placeholder{color:#2a2a2a}
        .adc-toggle-pw{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#444;cursor:pointer;font-size:11px;letter-spacing:.5px;text-transform:uppercase;user-select:none;transition:color .2s}
        .adc-toggle-pw:hover{color:#dc1e1e}
        .adc-btn{width:100%;padding:14px;margin-top:10px;background:#dc1e1e;color:#fff;border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:4px;cursor:pointer;transition:background .2s,transform .1s,box-shadow .2s}
        .adc-btn:hover{background:#c01818;box-shadow:0 4px 20px rgba(220,30,30,0.3)}
        .adc-btn:active{transform:scale(.98)}
        .adc-btn:disabled{background:#2a2a2a;color:#555;cursor:not-allowed;box-shadow:none;transform:none}
        .adc-error{margin-top:14px;padding:11px 14px;background:rgba(220,30,30,0.07);border-left:3px solid #dc1e1e;color:#ff6b6b;font-size:13px;display:none}
        .adc-error.show{display:block;animation:shake .4s ease}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        .adc-lockout{margin-top:14px;padding:11px 14px;background:rgba(255,140,0,0.07);border-left:3px solid #ff8c00;color:#ffaa44;font-size:13px;display:none}
        .adc-attempts-hint{margin-top:10px;font-size:11px;color:#444;text-align:right}
        .adc-footer{margin-top:32px;padding-top:18px;border-top:1px solid #191919;font-size:10px;color:#2e2e2e;letter-spacing:.5px}
        .adc-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes spin{to{transform:rotate(360deg)}}
      </style>

      <div class="bg-grid"></div>
      <div class="bg-glow"></div>
      <div class="bg-glow2"></div>

      <div class="adc-card">
        <div class="adc-logo">ADC<span>.</span></div>
        <div class="adc-tagline">Albanian Development Company — Portal</div>

        <div class="adc-field">
          <label class="adc-label" for="adc-username">Përdoruesi</label>
          <div class="adc-input-wrap">
            <input class="adc-input" type="text" id="adc-username"
              placeholder="username" autocomplete="username" autofocus spellcheck="false"/>
          </div>
        </div>

        <div class="adc-field">
          <label class="adc-label" for="adc-password">Fjalëkalimi</label>
          <div class="adc-input-wrap">
            <input class="adc-input" type="password" id="adc-password"
              placeholder="••••••••" autocomplete="current-password"/>
            <span class="adc-toggle-pw" id="adc-toggle">SHFAQ</span>
          </div>
        </div>

        <div class="adc-error" id="adc-error"></div>
        <div class="adc-lockout" id="adc-lockout"></div>
        <div class="adc-attempts-hint" id="adc-attempts"></div>

        <button class="adc-btn" id="adc-submit">HYRJA</button>

        <div class="adc-footer">© 2025 ADC · Akses i kufizuar për stafin</div>
      </div>
    `;

    document.body.prepend(overlay);
    document.documentElement.style.visibility = "visible";

    const usernameEl = overlay.querySelector("#adc-username");
    const passwordEl = overlay.querySelector("#adc-password");
    const btn        = overlay.querySelector("#adc-submit");
    const errEl      = overlay.querySelector("#adc-error");
    const lockEl     = overlay.querySelector("#adc-lockout");
    const attEl      = overlay.querySelector("#adc-attempts");
    const toggleEl   = overlay.querySelector("#adc-toggle");

    toggleEl.addEventListener("click", () => {
      const isHidden = passwordEl.type === "password";
      passwordEl.type = isHidden ? "text" : "password";
      toggleEl.textContent = isHidden ? "FSHIH" : "SHFAQ";
    });

    function showError(msg) {
      errEl.textContent = "✕  " + msg;
      errEl.classList.remove("show");
      void errEl.offsetWidth;
      errEl.classList.add("show");
    }

    function updateLockoutTimer() {
      const s = getState();
      if (!s.lockUntil || Date.now() >= s.lockUntil) {
        lockEl.style.display = "none";
        btn.disabled = false;
        return;
      }
      const remaining = Math.ceil((s.lockUntil - Date.now()) / 1000);
      lockEl.style.display = "block";
      lockEl.textContent = `⚠  Shumë tentativa. Provo sërish pas ${remaining} sekondash.`;
      btn.disabled = true;
      setTimeout(updateLockoutTimer, 1000);
    }

    if (isLockedOut()) { btn.disabled = true; updateLockoutTimer(); }

    async function attempt() {
      if (btn.disabled) return;
      if (isLockedOut()) { updateLockoutTimer(); return; }

      const username = usernameEl.value.trim().toLowerCase();
      const password = passwordEl.value;

      if (!username || !password) { showError("Plotëso të dy fushat."); return; }

      const user = USERS.find(u => u.username.toLowerCase() === username);

      btn.disabled = true;
      btn.innerHTML = '<span class="adc-spinner"></span>Duke verifikuar...';
      errEl.classList.remove("show");
      attEl.textContent = "";

      const h = await hashPassword(password);

      if (user && h === user.passwordHash) {
        setState({ authenticated: true, timestamp: Date.now(), user: user.displayName });
        overlay.style.transition = "opacity 0.45s ease";
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 450);
      } else {
        const attempts = recordFailedAttempt();
        btn.disabled = false;
        btn.textContent = "HYRJA";
        passwordEl.value = "";
        passwordEl.focus();

        if (isLockedOut()) {
          showError("Llogaria u bllokua përkohësisht.");
          updateLockoutTimer();
        } else {
          showError("Emri i përdoruesit ose fjalëkalimi është i gabuar.");
          const left = MAX_ATTEMPTS - attempts;
          if (left <= 2) attEl.textContent = `${left} tentativa të mbetura para bllokimit.`;
        }
      }
    }

    btn.addEventListener("click", attempt);
    [usernameEl, passwordEl].forEach(el =>
      el.addEventListener("keydown", e => { if (e.key === "Enter") attempt(); })
    );
  }

  if (!isAuthenticated()) {
    if (document.body) { injectLoginScreen(); }
    else { document.addEventListener("DOMContentLoaded", injectLoginScreen); }
  }

})();
