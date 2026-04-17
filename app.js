const AUTH_SESSION_KEY = "kent-kup-auth-session-v1";
const AUTH_VISITOR_KEY = "kent-kup-visitor-v1";

// ─── Firebase ────────────────────────────────────────────────────────────────
var db, STATE_DOC, ACCOUNTS_DOC, firebaseReady = false;
try {
  firebase.initializeApp({
    apiKey: "AIzaSyBs3_E4ljrI3NL3pAOlasTkk6o3ky_BgX0",
    authDomain: "kent-kup.firebaseapp.com",
    projectId: "kent-kup",
    storageBucket: "kent-kup.firebasestorage.app",
    messagingSenderId: "18237066198",
    appId: "1:18237066198:web:d96dc60c1b02d52123b277",
    measurementId: "G-ZYZ767XBCE"
  });
  db = firebase.firestore();
  STATE_DOC = db.collection("config").doc("appState");
  ACCOUNTS_DOC = db.collection("config").doc("accounts");
  firebaseReady = true;
  console.log("Firebase initialized successfully");
} catch (err) {
  console.error("Firebase init failed:", err);
}
const PRIMARY_ADMIN_EMAIL = "rywmorgan10@gmail.com";
const DEFAULT_VISITOR_PASSWORD = "KentKup2026";
const DEFAULT_MANUAL_GAMES = 15;
const KDB_MANUAL_PLAYER_STATS = [
  { name: "Parker", goals: 1, assists: 1, awards: 0, games: 15 },
  { name: "Patrick", goals: 5, assists: 1, awards: 1, games: 15 },
  { name: "Jack L", goals: 2, assists: 1, awards: 0, games: 15 },
  { name: "Jacob", goals: 1, assists: 1, awards: 0, games: 15 }
];
const CORNER_FC_MANUAL_PLAYER_STATS = [
  { name: "Miles", goals: 5, assists: 3, awards: 0, games: 15 },
  { name: "Thomas", goals: 0, assists: 1, awards: 0, games: 15 },
  { name: "Will S", goals: 1, assists: 1, awards: 0, games: 15 },
  { name: "Maxwell", goals: 0, assists: 2, awards: 0, games: 15 },
  { name: "Brennan", goals: 4, assists: 0, awards: 0, games: 15 }
];

const defaultState = {
  leagueName: "Kent Kup",
  teams: [
    {
      id: crypto.randomUUID(),
      name: "KDB",
      players: [
        { id: crypto.randomUUID(), name: "Parker", position: "", manualStats: { goals: 1, assists: 1, awards: 0, games: 15 } },
        { id: crypto.randomUUID(), name: "Patrick", position: "", manualStats: { goals: 5, assists: 1, awards: 1, games: 15 } },
        { id: crypto.randomUUID(), name: "Jack L", position: "", manualStats: { goals: 2, assists: 1, awards: 0, games: 15 } },
        { id: crypto.randomUUID(), name: "Jacob", position: "", manualStats: { goals: 1, assists: 1, awards: 0, games: 15 } }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: "Corner FC",
      players: [
        { id: crypto.randomUUID(), name: "Miles", position: "", manualStats: { goals: 5, assists: 3, awards: 0, games: 15 } },
        { id: crypto.randomUUID(), name: "Thomas", position: "", manualStats: { goals: 0, assists: 1, awards: 0, games: 15 } },
        { id: crypto.randomUUID(), name: "Will S", position: "", manualStats: { goals: 1, assists: 1, awards: 0, games: 15 } },
        { id: crypto.randomUUID(), name: "Maxwell", position: "", manualStats: { goals: 0, assists: 2, awards: 0, games: 15 } },
        { id: crypto.randomUUID(), name: "Brennan", position: "", manualStats: { goals: 4, assists: 0, awards: 0, games: 15 } }
      ]
    }
  ],
  tournaments: [
    {
      id: crypto.randomUUID(),
      name: "Opening Week",
      weekLabel: "Week of March 17",
      startDate: "2026-03-17",
      endDate: "2026-03-21"
    }
  ],
  games: [],
  visitorPassword: DEFAULT_VISITOR_PASSWORD,
  rulesText: `## Teams & Lineup
- Each team fields 5 players at a time (4 outfield + 1 goalkeeper).
- A minimum of 4 players is required to start a game — no forfeits for being one short.
- Substitutions are unlimited and can happen at any stoppage.
- Every registered player must play at least half the game.

## Match Format
- Matches are two 10-minute halves with a 2-minute halftime break.
- Clock runs continuously — stoppages do not pause the clock.
- No overtime in the regular season. Tied games stay tied.
- Tournament finals use a sudden-death penalty shootout to decide a winner.

## Points & Standings
- Win = 3 points · Draw = 1 point · Loss = 0 points
- Standings tiebreaker order: Points → Goal Difference → Goals Scored → Head-to-Head.
- Goals scored by the opposing team count against your goals-against total.
- Own goals are credited to the opposing team.

## Gameplay Rules
- No sliding tackles. Standing tackles and shoulder-to-shoulder challenges are allowed.
- Goalkeepers cannot pick up a back-pass played with a foot.
- Kick-ins replace throw-ins on all sideline restarts.
- Free kicks are indirect — the ball must touch another player before a goal can be scored.
- No offside rule is in effect.

## Fair Play
- All players are expected to show respect toward opponents, teammates, and supervisors at all times.
- Arguing with a call results in a free kick for the opposing team.
- Deliberate handball in open play results in an indirect free kick.
- A handball on the goal line results in a penalty kick.
- Serious unsporting conduct can result in removal from the current game.

## Weekly Honors
- An MVP and Best Goalie are selected by the supervisor after each game.
- Season-end trophies are awarded for: Most Goals, Most Assists, Most MVP Awards, and Best Goalie.
- A player can win multiple awards in a single game if performance warrants it.`
};

let state = structuredClone(defaultState);
let authState = { accounts: [], session: { userId: "" }, visitorSession: { hasAccess: false } };
let currentView = "home";
let authNotice = "";
let pendingProtectedView = "";
let manualStatEditor = {
  playerId: "",
  statKey: "goals",
  draft: null
};

const elements = {
  pageShell: document.querySelector("#pageShell"),
  gateView: document.querySelector("#gateView"),
  gateError: document.querySelector("#gateError"),
  visitorForm: document.querySelector("#visitorForm"),
  gateLoginLink: document.querySelector("#gateLoginLink"),
  brandHomeButton: document.querySelector("#brandHomeButton"),
  navButtons: document.querySelectorAll(".nav-button"),
  authStatus: document.querySelector("#authStatus"),
  homeView: document.querySelector("#homeView"),
  rulesView: document.querySelector("#rulesView"),
  rulesContent: document.querySelector("#rulesContent"),
  rulesEditor: document.querySelector("#rulesEditor"),
  saveRulesBtn: document.querySelector("#saveRulesBtn"),
  teamsView: document.querySelector("#teamsView"),
  loginView: document.querySelector("#loginView"),
  adminView: document.querySelector("#adminView"),
  editorView: document.querySelector("#editorView"),
  authNotice: document.querySelector("#authNotice"),
  loginForm: document.querySelector("#loginForm"),
  adminSetupForm: document.querySelector("#adminSetupForm"),
  visitorPasswordPanel: document.querySelector("#visitorPasswordPanel"),
  createAccountForm: document.querySelector("#createAccountForm"),
  adminAccountsList: document.querySelector("#adminAccountsList"),
  homeThisWeek: document.querySelector("#homeThisWeek"),
  homeRecentGames: document.querySelector("#homeRecentGames"),
  homeNextWeek: document.querySelector("#homeNextWeek"),
  homeAllTimeStats: document.querySelector("#homeAllTimeStats"),
  homeStandings: document.querySelector("#homeStandings"),
  leaderboardTable: document.querySelector("#leaderboardTable"),
  teamsOverviewGrid: document.querySelector("#teamsOverviewGrid"),
  teamsGrid: document.querySelector("#teamsGrid"),
  teamForm: document.querySelector("#teamForm"),
  tournamentForm: document.querySelector("#tournamentForm"),
  tournamentsList: document.querySelector("#tournamentsList"),
  gameForm: document.querySelector("#gameForm"),
  gameTournamentSelect: document.querySelector("#gameTournamentSelect"),
  homeTeamSelect: document.querySelector("#homeTeamSelect"),
  awayTeamSelect: document.querySelector("#awayTeamSelect"),
  scheduleBoard: document.querySelector("#scheduleBoard"),
  statsGameSelect: document.querySelector("#statsGameSelect"),
  statsEditor: document.querySelector("#statsEditor")
};

bindEvents();
initApp();

function bindEvents() {
  elements.gateLoginLink.addEventListener("click", () => {
    grantVisitorAccess();
    setView("login");
  });
  elements.visitorForm.addEventListener("submit", handleVisitorLogin);
  elements.brandHomeButton.addEventListener("click", () => {
    setView("home");
  });
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view || "home");
    });
  });
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.adminSetupForm.addEventListener("submit", handleAdminSetup);
  elements.createAccountForm.addEventListener("submit", handleAdminCreateAccount);
  elements.teamForm.addEventListener("submit", handleCreateTeam);
  elements.tournamentForm.addEventListener("submit", handleCreateTournament);
  elements.gameForm.addEventListener("submit", handleCreateGame);
  elements.statsGameSelect.addEventListener("change", renderStatsEditor);
  elements.saveRulesBtn.addEventListener("click", handleSaveRules);

  if (elements.adminAccountsList) {
    elements.adminAccountsList.addEventListener("click", (event) => {
      const btn = event.target.closest(".delete-account-button");
      if (!btn || btn.disabled) return;
      if (!elements.adminAccountsList.contains(btn)) return;
      event.preventDefault();
      event.stopPropagation();
      const accountId = btn.dataset.accountId;
      if (accountId) handleDeleteAccount(accountId);
    });
  }

  // Delegated handler for the stats form — survives Firestore snapshot re-renders
  elements.statsEditor.addEventListener("submit", (event) => {
    const form = event.target.closest("#statsForm");
    if (!form) return;
    event.preventDefault();
    handleSaveGameStats(form);
  });
}

function handleSaveRules() {
  state.rulesText = elements.rulesEditor.value;
  saveState();
  renderRules();
}

// ─── Firebase Init ───────────────────────────────────────────────────────────

async function initApp() {
  // Load device-local session immediately (no network needed)
  authState.session = loadLocalSession();
  authState.visitorSession = loadLocalVisitorSession();

  // If Firebase failed to initialize, skip Firestore and render with defaults
  if (!firebaseReady) {
    console.warn("Firebase not available — rendering with default state");
    showLoading(false);
    render();
    return;
  }

  showLoading(true);

  let stateReady = false;
  let accountsReady = false;

  function tryRender() {
    if (stateReady && accountsReady) {
      showLoading(false);
      render();
    }
  }

  // Safety timeout — never stay stuck on "Loading…" for more than 8 seconds
  setTimeout(() => {
    if (!stateReady || !accountsReady) {
      console.warn("Firestore timeout — rendering with defaults");
      stateReady = true;
      accountsReady = true;
      tryRender();
    }
  }, 8000);

  // Real-time listener for app state — fires immediately with current data,
  // then again whenever an editor/admin saves a change
  STATE_DOC.onSnapshot(
    (doc) => {
      state = doc.exists ? normalizeState(doc.data()) : structuredClone(defaultState);
      stateReady = true;
      tryRender();
    },
    (err) => {
      console.error("State listener error:", err);
      state = structuredClone(defaultState);
      stateReady = true;
      tryRender();
    }
  );

  // Real-time listener for accounts — fires immediately, then on any account change
  ACCOUNTS_DOC.onSnapshot(
    (doc) => {
      authState.accounts = normalizeAccounts(doc.exists ? (doc.data().accounts || []) : []);
      accountsReady = true;
      tryRender();
    },
    (err) => {
      console.error("Accounts listener error:", err);
      authState.accounts = [];
      accountsReady = true;
      tryRender();
    }
  );
}

function showLoading(isLoading) {
  const el = document.querySelector("#loadingView");
  if (el) el.classList.toggle("is-hidden", !isLoading);
  if (isLoading) {
    elements.gateView.classList.add("is-hidden");
    elements.pageShell.classList.add("is-hidden");
  }
}

function loadLocalSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : { userId: "" };
  } catch {
    return { userId: "" };
  }
}

function loadLocalVisitorSession() {
  try {
    const raw = localStorage.getItem(AUTH_VISITOR_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : { hasAccess: false };
  } catch {
    return { hasAccess: false };
  }
}

function saveState() {
  if (!firebaseReady || !STATE_DOC) return;
  STATE_DOC.set(state).catch((err) => {
    console.error("Failed to save state:", err);
    alert("Failed to save to server: " + (err?.message || err) + "\n\nYour changes may not persist. Check Firestore rules in Firebase Console.");
  });
}

function saveAuthState() {
  // Session and visitor access are device-local (which device you're logged in on)
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authState.session));
  localStorage.setItem(AUTH_VISITOR_KEY, JSON.stringify(authState.visitorSession));
  // Accounts live in Firestore so all devices share the same user list
  if (!firebaseReady || !ACCOUNTS_DOC) return;
  ACCOUNTS_DOC.set({ accounts: authState.accounts })
    .catch((err) => console.error("Failed to save accounts:", err));
}

function normalizeAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.map((account) => {
    const normalizedEmail = (account.email || "").trim().toLowerCase();
    return {
      ...account,
      email: normalizedEmail,
      role: normalizedEmail === PRIMARY_ADMIN_EMAIL ? "admin" : (account.role || "member")
    };
  });
}

function normalizeState(input) {
  const nextState = {
    leagueName: input?.leagueName || defaultState.leagueName,
    teams: Array.isArray(input?.teams) ? normalizeTeams(input.teams) : structuredClone(defaultState.teams),
    tournaments: Array.isArray(input?.tournaments) ? input.tournaments : structuredClone(defaultState.tournaments),
    games: Array.isArray(input?.games) ? input.games : [],
    visitorPassword: input?.visitorPassword || DEFAULT_VISITOR_PASSWORD,
    rulesText: typeof input?.rulesText === "string" ? input.rulesText : defaultState.rulesText
  };

  nextState.games = nextState.games.map((game) => {
    const normalizedGame = {
      ...game,
      playerStats: game.playerStats || {},
      awards: game.awards || { mvpPlayerId: "", bestGoaliePlayerId: "" }
    };

    normalizedGame.rosters = game.rosters || createRosterSnapshotFromTeams(nextState.teams, game.homeTeamId, game.awayTeamId);
    return normalizedGame;
  });

  return nextState;
}

function normalizeTeams(teams) {
  const normalizedTeams = teams.map((team) => ({
    ...team,
    players: Array.isArray(team.players)
      ? team.players.map((player) => ({
          ...player,
          manualStats: {
            goals: Number(player.manualStats?.goals || 0),
            assists: Number(player.manualStats?.assists || 0),
            awards: Number(player.manualStats?.awards || 0),
            games: Number(player.manualStats?.games || DEFAULT_MANUAL_GAMES)
          }
        }))
      : []
  }));

  // NOTE: applyManualStatsToTeam is intentionally NOT called here.
  // It was used once to seed initial historical stats into Firestore on first load.
  // Calling it on every normalizeState would overwrite any stats saved by admins.

  return normalizedTeams;
}

function applyManualStatsToTeam(teams, teamName, manualStatEntries) {
  const team = teams.find((entry) => entry.name === teamName);
  if (!team) return;

  manualStatEntries.forEach((entry) => {
    const existingPlayer = team.players.find((player) => player.name.toLowerCase() === entry.name.toLowerCase());
    if (existingPlayer) {
      existingPlayer.manualStats = {
        goals: entry.goals,
        assists: entry.assists,
        awards: entry.awards,
        games: entry.games ?? DEFAULT_MANUAL_GAMES
      };
    } else {
      team.players.push({
        id: crypto.randomUUID(),
        name: entry.name,
        position: "",
        manualStats: {
          goals: entry.goals,
          assists: entry.assists,
          awards: entry.awards,
          games: entry.games ?? DEFAULT_MANUAL_GAMES
        }
      });
    }
  });
}

function render() {
  renderGateOrApp();
  if (!hasAnyAccess()) return;
  renderAuthStatus();
  renderLoginPage();
  renderView();
  renderHome();
  renderStandings();
  renderLeaderboard();
  renderTeamsOverview();
  renderRules();
  renderAdminAccounts();
  renderAdminVisitorPassword();
  renderTeams();
  renderTournamentOptions();
  renderTournaments();
  renderSchedule();
  renderStatsGameOptions();
  renderStatsEditor();
}

function renderView() {
  elements.homeView.classList.toggle("is-hidden", currentView !== "home");
  elements.rulesView.classList.toggle("is-hidden", currentView !== "rules");
  elements.teamsView.classList.toggle("is-hidden", currentView !== "teams");
  elements.loginView.classList.toggle("is-hidden", currentView !== "login");
  elements.adminView.classList.toggle("is-hidden", currentView !== "admin");
  elements.editorView.classList.toggle("is-hidden", currentView !== "editor");

  elements.authNotice.classList.toggle("is-hidden", !authNotice);
  elements.authNotice.textContent = authNotice;

  const user = getCurrentUser();
  elements.navButtons.forEach((button) => {
    const view = button.dataset.view;
    button.classList.toggle("active", view === currentView);

    // Show/hide nav buttons based on role
    let visible = true;
    if (view === "editor") visible = canEdit(user);
    if (view === "admin") visible = isAdmin(user);
    if (view === "login") visible = !user; // hide Sign In when logged in
    button.classList.toggle("is-hidden", !visible);
  });
}

// ─── Rules rendering ─────────────────────────────────────────────────────────

function simpleMarkdown(text) {
  // Convert simple markdown (## headings and - bullets) to HTML
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${escapeText(trimmed.slice(3))}</h3>`;
    } else if (trimmed.startsWith("- ")) {
      if (!inList) { html += "<ul class=\"rules-list\">"; inList = true; }
      html += `<li>${escapeText(trimmed.slice(2))}</li>`;
    } else if (trimmed === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${escapeText(trimmed)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

function renderRules() {
  // Render rules content from state
  if (elements.rulesContent) {
    elements.rulesContent.innerHTML = simpleMarkdown(state.rulesText || "");
  }
  // Populate the editor textarea (only when editor view is active and textarea is empty or stale)
  if (elements.rulesEditor && currentView === "editor") {
    elements.rulesEditor.value = state.rulesText || "";
  }
}

function renderAuthStatus() {
  const user = getCurrentUser();
  if (user) {
    elements.authStatus.innerHTML = `
      <div class="auth-user-copy">
        <strong>${escapeText(user.displayName)}</strong>
        <span class="meta-line">${escapeText(user.email)} · ${escapeText(capitalize(user.role))}</span>
      </div>
      <button type="button" class="ghost-button auth-link-button" id="authLogoutButton">Sign Out</button>
    `;
    elements.authStatus.querySelector("#authLogoutButton").addEventListener("click", handleLogout);
    return;
  }

  // Visitor mode — show who they are and offer sign-in link
  elements.authStatus.innerHTML = `
    <span class="meta-line auth-visitor-label">Viewing as guest</span>
    <button type="button" class="ghost-button auth-link-button" id="authSignInButton">Sign In</button>
  `;
  elements.authStatus.querySelector("#authSignInButton").addEventListener("click", () => {
    setView("login");
  });
}

function setView(view) {
  if (!hasAnyAccess() && view !== "login") {
    // No access at all — show gate
    renderGateOrApp();
    return;
  }

  // Always sync gate vs app-shell visibility before touching views
  renderGateOrApp();

  if (!canAccessView(view)) {
    pendingProtectedView = view;
    authNotice = getAccessDeniedMessage(view);
    currentView = getCurrentUser() ? "home" : "login";
    renderLoginPage();
    renderView();
    return;
  }

  authNotice = "";
  currentView = view;
  renderLoginPage();
  renderView();
}

function renderTeamsOverview() {
  const template = document.querySelector("#teamOverviewTemplate");

  elements.teamsOverviewGrid.innerHTML = "";

  // Build a lookup of all-time stats by player id (includes game stats + pre-season)
  const allTimeStats = getAllTimePlayerStats();
  const statById = new Map(allTimeStats.map((s) => [s.id, s]));

  const teamLogos = {
    "KDB": "assets/KDB_logo_transparent.png",
    "Corner FC": "assets/CFC_logo_transparent.png"
  };

  state.teams.forEach((team) => {
    const fragment = template.content.cloneNode(true);

    // Insert team logo above team name if one exists
    const logoSrc = teamLogos[team.name];
    if (logoSrc) {
      const logoImg = document.createElement("img");
      logoImg.src = logoSrc;
      logoImg.alt = team.name + " logo";
      logoImg.className = "team-logo";
      const header = fragment.querySelector(".team-card-header");
      header.parentNode.insertBefore(logoImg, header);
    }

    fragment.querySelector(".team-name").textContent = team.name;
    fragment.querySelector(".team-meta").textContent = `${team.players.length} players`;

    // Compute team totals from all-time stats
    let teamGoals = 0;
    let teamAssists = 0;
    let teamAwards = 0;
    team.players.forEach((player) => {
      const s = statById.get(player.id);
      teamGoals += s ? s.goals : 0;
      teamAssists += s ? s.assists : 0;
      teamAwards += s ? s.awards : 0;
    });

    fragment.querySelector(".team-awards").textContent = `${teamAwards} awards`;

    // Insert team totals row before the player list
    const rosterList = fragment.querySelector(".roster-list");
    const totalsRow = document.createElement("div");
    totalsRow.className = "roster-row team-totals-row";
    totalsRow.innerHTML = `
      <span class="team-totals-label">Team totals</span>
      <div class="player-stat-summary">
        <span>${teamGoals} G</span>
        <span>${teamAssists} A</span>
      </div>
    `;
    rosterList.appendChild(totalsRow);

    if (!team.players.length) {
      rosterList.innerHTML = `<p class="empty-copy">No players yet.</p>`;
    } else {
      team.players.forEach((player) => {
        const s = statById.get(player.id) || { goals: 0, assists: 0, awards: 0 };

        const row = document.createElement("div");
        row.className = "roster-row player-stat-row";
        row.innerHTML = `
          <div>
            <strong>${player.name}</strong>
            <p class="meta-line">${player.position || "No position set"}</p>
          </div>
          <div class="player-stat-summary">
            <span>${s.goals} G</span>
            <span>${s.assists} A</span>
            <span>${s.awards} Awards</span>
          </div>
        `;
        rosterList.appendChild(row);
      });
    }

    elements.teamsOverviewGrid.appendChild(fragment);
  });
}

function renderAdminAccounts() {
  if (!elements.adminAccountsList) return;

  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    elements.adminAccountsList.innerHTML = `<p class="empty-copy">Administrator access is required to manage accounts.</p>`;
    return;
  }

  if (!authState.accounts.length) {
    elements.adminAccountsList.innerHTML = `<p class="empty-copy">No registered accounts yet.</p>`;
    return;
  }

  elements.adminAccountsList.innerHTML = "";

  authState.accounts
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((account) => {
      const card = document.createElement("article");
      card.className = "list-card";
      const isPrimaryAdmin = account.email === PRIMARY_ADMIN_EMAIL;
      const roleOptions = ["member", "editor", "admin"].map((role) => {
        const selected = role === account.role ? " selected" : "";
        const disabled = isPrimaryAdmin && role !== "admin" ? " disabled" : "";
        return `<option value="${role}"${selected}${disabled}>${capitalize(role)}</option>`;
      }).join("");

      card.innerHTML = `
        <form class="admin-account-form stack-form">
          <div class="schedule-card-header">
            <div>
              <h3>${escapeText(account.displayName)}</h3>
              <p class="meta-line">${escapeText(account.email)}</p>
            </div>
            <span class="pill">${escapeText(account.role)}</span>
          </div>
          <div class="field-row">
            <label>
              Display name
              <input type="text" name="displayName" value="${escapeAttribute(account.displayName)}" required>
            </label>
            <label>
              Email
              <input type="email" name="email" value="${escapeAttribute(account.email)}" ${isPrimaryAdmin ? "readonly" : ""} required>
            </label>
          </div>
          <div class="field-row">
            <label>
              Access level
              <select name="role">
                ${roleOptions}
              </select>
            </label>
            <label>
              Created
              <input type="text" value="${escapeAttribute(formatDateTime(account.createdAt))}" readonly>
            </label>
          </div>
          <div class="player-actions">
            <button type="submit">Save Account</button>
          </div>
        </form>
        <div class="player-actions" style="margin-top:.5rem;">
          <button type="button" class="ghost-button delete-account-button" data-account-id="${escapeAttribute(account.id)}" ${isPrimaryAdmin ? "disabled" : ""}>Delete Account</button>
        </div>
      `;

      card.querySelector(".admin-account-form").addEventListener("submit", (event) => {
        event.preventDefault();
        handleSaveAccount(account.id, event.currentTarget, isPrimaryAdmin);
      });

      elements.adminAccountsList.appendChild(card);
    });
}

function renderHome() {
  renderWeekSchedule(elements.homeThisWeek, 0, "No tournament games scheduled for this week.");
  renderWeekSchedule(elements.homeNextWeek, 1, "No tournament games scheduled for next week.");
  renderPreviousTournamentResults();
  renderAllTimeStats();
}

function renderWeekSchedule(container, weekOffset, emptyMessage) {
  const { start, end } = getWeekWindow(weekOffset);
  const tournaments = state.tournaments
    .filter((tournament) => rangesOverlap(tournament.startDate, tournament.endDate, start, end))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (!tournaments.length) {
    container.innerHTML = `<p class="empty-copy">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = tournaments.map((tournament) => {
    const games = state.games
      .filter((game) => game.tournamentId === tournament.id && isDateInRange(game.date, start, end))
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    const gameMarkup = games.length
      ? games.map((game) => {
          const matchup = getMatchupTeams(game).map((team) => team?.name || "Unknown").join(" vs ");
          const score = calculateScoreline(game);
          return `
            <div class="home-game-line">
              <strong>${matchup}</strong>
              <span>${formatDate(game.date)} · ${formatTime(game.time)} · ${game.location}</span>
              <span>${game.status} · ${score.home} - ${score.away}</span>
            </div>
          `;
        }).join("")
      : `<p class="empty-copy">Tournament created, but no games scheduled in this week yet.</p>`;

    return `
      <article class="list-card">
        <div class="schedule-card-header">
          <div>
            <h3>${tournament.name}</h3>
            <p class="meta-line">${tournament.weekLabel}</p>
          </div>
          <span class="pill">${formatDate(tournament.startDate)} to ${formatDate(tournament.endDate)}</span>
        </div>
        <div class="home-game-list">${gameMarkup}</div>
      </article>
    `;
  }).join("");
}

function renderPreviousTournamentResults() {
  const { start, end } = getWeekWindow(-1);
  const tournaments = state.tournaments
    .filter((tournament) => rangesOverlap(tournament.startDate, tournament.endDate, start, end))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (!tournaments.length) {
    elements.homeRecentGames.innerHTML = `<p class="empty-copy">No tournament results from last week yet.</p>`;
    return;
  }

  elements.homeRecentGames.innerHTML = tournaments.map((tournament) => {
    const games = state.games
      .filter((game) => game.tournamentId === tournament.id && isDateInRange(game.date, start, end))
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    const weeklyMvp = getWeeklyTournamentMvp(games);
    const resultsMarkup = games.length
      ? games.map((game) => {
          const matchup = getMatchupTeams(game).map((team) => team?.name || "Unknown").join(" vs ");
          const score = calculateScoreline(game);
          return `
            <div class="home-game-line">
              <strong>${matchup}</strong>
              <span>${formatDate(game.date)} · ${formatTime(game.time)}</span>
              <span>${score.home} - ${score.away} · ${game.status}</span>
            </div>
          `;
        }).join("")
      : `<p class="empty-copy">No games were recorded for this tournament last week.</p>`;

    return `
      <article class="list-card">
        <div class="schedule-card-header">
          <div>
            <h3>${tournament.name}</h3>
            <p class="meta-line">${tournament.weekLabel}</p>
          </div>
          <span class="pill">${formatDate(tournament.startDate)} to ${formatDate(tournament.endDate)}</span>
        </div>
        <div class="home-game-list">${resultsMarkup}</div>
        <p class="meta-line">Week MVP: ${weeklyMvp || "Not selected"}</p>
      </article>
    `;
  }).join("");
}

function renderAllTimeStats() {
  const players = getAllTimePlayerStats();
  const goalsLeader = players
    .slice()
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))[0];
  const assistsLeader = players
    .slice()
    .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name))[0];

  if (!goalsLeader && !assistsLeader) {
    elements.homeAllTimeStats.innerHTML = `<p class="empty-copy">No player stats recorded yet.</p>`;
    return;
  }

  const leaderCards = [
    { title: "All-Time Goals Leader", statLabel: "Goals", player: goalsLeader, value: goalsLeader?.goals || 0 },
    { title: "All-Time Assists Leader", statLabel: "Assists", player: assistsLeader, value: assistsLeader?.assists || 0 }
  ];

  elements.homeAllTimeStats.innerHTML = leaderCards.map((entry) => `
    <article class="list-card stat-summary-card">
      <div class="schedule-card-header">
        <div>
          <p class="section-tag">${entry.title}</p>
          <h3>${entry.player?.name || "No leader yet"}</h3>
          <p class="meta-line">${entry.player?.teamName || "Former player"}</p>
        </div>
      </div>
      <div class="leader-grid">
        <p><strong>${entry.value}</strong><span>${entry.statLabel}</span></p>
      </div>
    </article>
  `).join("");
}

function renderTeams() {
  const template = document.querySelector("#teamCardTemplate");
  elements.teamsGrid.innerHTML = "";

  state.teams.forEach((team) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".team-card");
    fragment.querySelector(".team-name").textContent = team.name;
    fragment.querySelector(".team-meta").textContent = `${team.players.length} players`;

    const playerForm = fragment.querySelector(".player-form");
    playerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(playerForm);
      const playerName = formData.get("playerName")?.toString().trim();
      const position = formData.get("playerPosition")?.toString().trim();
      if (!playerName) return;

      team.players.push({
        id: crypto.randomUUID(),
        name: playerName,
        position,
        manualStats: {
          games: DEFAULT_MANUAL_GAMES,
          goals: 0,
          assists: 0,
          awards: 0
        }
      });
      persistAndRender();
    });

    const deleteTeamButton = fragment.querySelector(".delete-team-button");
    deleteTeamButton.disabled = state.teams.length <= 1;
    deleteTeamButton.addEventListener("click", () => {
      if (!confirm(`Delete ${team.name}? Players and any scheduled games for this team will be removed.`)) {
        return;
      }
      state.teams = state.teams.filter((entry) => entry.id !== team.id);
      state.games = state.games.filter((game) => game.homeTeamId !== team.id && game.awayTeamId !== team.id);
      persistAndRender();
    });

    const rosterList = fragment.querySelector(".roster-list");
    if (!team.players.length) {
      rosterList.innerHTML = `<p class="empty-copy">No players yet.</p>`;
    } else {
      team.players.forEach((player) => {
        const row = document.createElement("div");
        row.className = "roster-row editor-player-row";
        row.innerHTML = `
          <div class="editor-player-copy">
            <strong>${player.name}</strong>
            <p class="meta-line">${player.position || "No position set"}</p>
          </div>
          <div class="player-actions editor-player-actions">
            <select aria-label="Transfer ${player.name}">
              ${buildTransferOptions(team.id)}
            </select>
            <button type="button" class="ghost-button change-stats-button">Change Stats</button>
            <button type="button" class="ghost-button transfer-button">Transfer</button>
            <button type="button" class="ghost-button remove-button">Remove</button>
          </div>
        `;

        const transferSelect = row.querySelector("select");
        row.querySelector(".change-stats-button").addEventListener("click", () => {
          const currentStats = {
            games: Number(player.manualStats?.games || DEFAULT_MANUAL_GAMES),
            goals: Number(player.manualStats?.goals || 0),
            assists: Number(player.manualStats?.assists || 0),
            awards: Number(player.manualStats?.awards || 0)
          };
          manualStatEditor = {
            playerId: player.id,
            statKey: manualStatEditor.playerId === player.id ? manualStatEditor.statKey : "games",
            draft: manualStatEditor.playerId === player.id && manualStatEditor.draft
              ? { ...manualStatEditor.draft }
              : currentStats
          };
          renderTeams();
        });

        row.querySelector(".transfer-button").addEventListener("click", () => {
          const targetTeamId = transferSelect.value;
          if (!targetTeamId) return;
          transferPlayer(team.id, player.id, targetTeamId);
        });

        row.querySelector(".remove-button").addEventListener("click", () => {
          team.players = team.players.filter((entry) => entry.id !== player.id);
          if (manualStatEditor.playerId === player.id) {
            manualStatEditor = { playerId: "", statKey: "goals", draft: null };
          }
          persistAndRender();
        });

        rosterList.appendChild(row);

        if (manualStatEditor.playerId === player.id) {
          const editorPanel = document.createElement("div");
          editorPanel.className = "manual-stat-editor";
          const statOptions = [
            { key: "goals", label: "Goals" },
            { key: "assists", label: "Assists" },
            { key: "awards", label: "Awards Won" }
          ];
          const selectedStat = statOptions.find((option) => option.key === manualStatEditor.statKey) || statOptions[0];
          const draftStats = manualStatEditor.draft || {
            games: Number(player.manualStats?.games || DEFAULT_MANUAL_GAMES),
            goals: Number(player.manualStats?.goals || 0),
            assists: Number(player.manualStats?.assists || 0),
            awards: Number(player.manualStats?.awards || 0)
          };

          editorPanel.innerHTML = `
            <p class="meta-line" style="margin-bottom:.5rem;">These stats are added to game-recorded stats to calculate all-time totals.</p>
            <div class="manual-stat-picker">
              ${statOptions.map((option) => `
                <button
                  type="button"
                  class="ghost-button stat-choice-button${option.key === selectedStat.key ? " active" : ""}"
                  data-stat-key="${option.key}"
                >
                  ${option.label}
                </button>
              `).join("")}
            </div>
            <div class="manual-stat-entry">
              <label>
                <span class="stat-grid-label">${selectedStat.label}</span>
                <input type="number" min="0" value="${Number(draftStats[selectedStat.key] || 0)}" class="manual-stat-value-input">
              </label>
              <div class="player-actions">
                <button type="button" class="save-manual-stat-button">Save Stats</button>
                <button type="button" class="ghost-button cancel-manual-stat-button">Close</button>
              </div>
            </div>
          `;

          const valueInput = editorPanel.querySelector(".manual-stat-value-input");
          valueInput.addEventListener("input", () => {
            if (!manualStatEditor.draft) {
              manualStatEditor.draft = { ...draftStats };
            }
            manualStatEditor.draft[selectedStat.key] = Number(valueInput.value || 0);
          });

          editorPanel.querySelectorAll(".stat-choice-button").forEach((button) => {
            button.addEventListener("click", () => {
              if (!manualStatEditor.draft) {
                manualStatEditor.draft = { ...draftStats };
              }
              manualStatEditor.draft[selectedStat.key] = Number(valueInput.value || 0);
              manualStatEditor = {
                playerId: player.id,
                statKey: button.dataset.statKey || "games",
                draft: { ...manualStatEditor.draft }
              };
              renderTeams();
            });
          });

          editorPanel.querySelector(".save-manual-stat-button").addEventListener("click", () => {
            const finalDraft = {
              ...(manualStatEditor.draft || draftStats),
              [selectedStat.key]: Number(valueInput.value || 0)
            };
            player.manualStats = {
              games: Number(finalDraft.games || 0),
              goals: Number(finalDraft.goals || 0),
              assists: Number(finalDraft.assists || 0),
              awards: Number(finalDraft.awards || 0)
            };
            manualStatEditor = { playerId: "", statKey: "goals", draft: null };
            persistAndRender();
          });

          editorPanel.querySelector(".cancel-manual-stat-button").addEventListener("click", () => {
            manualStatEditor = { playerId: "", statKey: "goals", draft: null };
            renderTeams();
          });

          rosterList.appendChild(editorPanel);
        }
      });
    }

    elements.teamsGrid.appendChild(fragment);
  });
}

function renderTournamentOptions() {
  const selectedTournamentId = elements.gameTournamentSelect.value;
  const selectedHomeTeamId = elements.homeTeamSelect.value;
  const selectedAwayTeamId = elements.awayTeamSelect.value;

  const tournamentOptions = state.tournaments.map((tournament) =>
    `<option value="${tournament.id}">${tournament.weekLabel} · ${tournament.name}</option>`
  ).join("");

  const teamOptions = state.teams.map((team) =>
    `<option value="${team.id}">${team.name}</option>`
  ).join("");

  elements.gameTournamentSelect.innerHTML = tournamentOptions || `<option value="">Create a tournament first</option>`;
  elements.homeTeamSelect.innerHTML = teamOptions;
  elements.awayTeamSelect.innerHTML = teamOptions;

  if (selectedTournamentId && state.tournaments.some((tournament) => tournament.id === selectedTournamentId)) {
    elements.gameTournamentSelect.value = selectedTournamentId;
  }

  if (selectedHomeTeamId && state.teams.some((team) => team.id === selectedHomeTeamId)) {
    elements.homeTeamSelect.value = selectedHomeTeamId;
  }

  if (selectedAwayTeamId && state.teams.some((team) => team.id === selectedAwayTeamId)) {
    elements.awayTeamSelect.value = selectedAwayTeamId;
  }

  if (state.teams.length > 1 && elements.homeTeamSelect.value === elements.awayTeamSelect.value) {
    const fallbackTeam = state.teams.find((team) => team.id !== elements.homeTeamSelect.value);
    if (fallbackTeam) {
      elements.awayTeamSelect.value = fallbackTeam.id;
    }
  }
}

function renderTournaments() {
  if (!state.tournaments.length) {
    elements.tournamentsList.innerHTML = `<p class="empty-copy">No tournaments yet.</p>`;
    return;
  }

  elements.tournamentsList.innerHTML = "";

  state.tournaments
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .forEach((tournament) => {
      const games = state.games.filter((game) => game.tournamentId === tournament.id);
      const card = document.createElement("article");
      card.className = "list-card";
      card.innerHTML = `
        <form class="tournament-edit-form stack-form">
          <div class="schedule-card-header">
            <div>
              <h3>${tournament.name}</h3>
              <p class="meta-line">${tournament.weekLabel}</p>
            </div>
            <span class="pill">${games.length} game${games.length === 1 ? "" : "s"}</span>
          </div>
          <label>
            Tournament name
            <input type="text" name="name" value="${escapeAttribute(tournament.name)}" required>
          </label>
          <label>
            Week label
            <input type="text" name="weekLabel" value="${escapeAttribute(tournament.weekLabel)}" required>
          </label>
          <div class="field-row">
            <label>
              Start date
              <input type="date" name="startDate" value="${tournament.startDate}" required>
            </label>
            <label>
              End date
              <input type="date" name="endDate" value="${tournament.endDate}" required>
            </label>
          </div>
          <p class="meta-line">${formatDate(tournament.startDate)} to ${formatDate(tournament.endDate)}</p>
          <div class="player-actions">
            <button type="submit">Save Changes</button>
            <button type="button" class="ghost-button delete-button">Delete</button>
          </div>
        </form>
      `;

      card.querySelector(".tournament-edit-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        tournament.name = formData.get("name")?.toString().trim() || tournament.name;
        tournament.weekLabel = formData.get("weekLabel")?.toString().trim() || tournament.weekLabel;
        tournament.startDate = formData.get("startDate")?.toString() || tournament.startDate;
        tournament.endDate = formData.get("endDate")?.toString() || tournament.endDate;
        persistAndRender();
      });

      card.querySelector(".delete-button").addEventListener("click", () => {
        state.tournaments = state.tournaments.filter((entry) => entry.id !== tournament.id);
        state.games = state.games.filter((game) => game.tournamentId !== tournament.id);
        persistAndRender();
      });

      elements.tournamentsList.appendChild(card);
    });
}

function renderSchedule() {
  const games = state.games
    .slice()
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  if (!games.length) {
    elements.scheduleBoard.innerHTML = `<p class="empty-copy">No games scheduled yet.</p>`;
    return;
  }

  elements.scheduleBoard.innerHTML = "";
  games.forEach((game) => {
    const tournament = getTournamentById(game.tournamentId);
    const score = calculateScoreline(game);
    const matchup = getMatchupTeams(game);

    const card = document.createElement("article");
    card.className = "game-card";
    card.innerHTML = `
      <form class="game-edit-form stack-form">
        <div class="schedule-card-header">
          <div>
            <span class="pill">${game.status}</span>
            <h3>${matchup.map((team) => team?.name || "Unknown").join(" vs ")}</h3>
            <p class="meta-line">${tournament?.weekLabel || "No tournament"}</p>
          </div>
          <button type="button" class="ghost-button delete-game-button">Delete</button>
        </div>
        <div class="field-row">
          <label>
            Team 1
            <select name="teamOneId" required>
              ${buildTeamOptions(game.homeTeamId)}
            </select>
          </label>
          <label>
            Team 2
            <select name="teamTwoId" required>
              ${buildTeamOptions(game.awayTeamId)}
            </select>
          </label>
        </div>
        <div class="field-row">
          <label>
            Date
            <input type="date" name="date" value="${game.date}" required>
          </label>
          <label>
            Time
            <input type="time" name="time" value="${game.time}" required>
          </label>
        </div>
        <div class="field-row">
          <label>
            Location
            <input type="text" name="location" value="${escapeAttribute(game.location)}" required>
          </label>
          <label>
            Status
            <select name="status">
              ${buildStatusOptions(game.status)}
            </select>
          </label>
        </div>
        <label>
          Notes
          <textarea name="notes" rows="3" placeholder="Special rules, fan notes, weather, etc.">${escapeText(game.notes || "")}</textarea>
        </label>
        <p class="score-line">${score.home} - ${score.away}</p>
        <p class="meta-line">${formatDate(game.date)} at ${formatTime(game.time)}</p>
        <div class="player-actions">
          <button type="submit">Save Matchup</button>
        </div>
      </form>
    `;

    card.querySelector(".game-edit-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const teamOneId = formData.get("teamOneId")?.toString() || "";
      const teamTwoId = formData.get("teamTwoId")?.toString() || "";

      if (!teamOneId || !teamTwoId || teamOneId === teamTwoId) {
        alert("Choose two different teams for a matchup.");
        return;
      }

      const teamsChanged = teamOneId !== game.homeTeamId || teamTwoId !== game.awayTeamId;
      game.homeTeamId = teamOneId;
      game.awayTeamId = teamTwoId;
      game.date = formData.get("date")?.toString() || game.date;
      game.time = formData.get("time")?.toString() || game.time;
      game.location = formData.get("location")?.toString().trim() || game.location;
      game.status = formData.get("status")?.toString() || game.status;
      game.notes = formData.get("notes")?.toString().trim() || "";

      if (teamsChanged) {
        game.rosters = createGameRosterSnapshot(teamOneId, teamTwoId);
        game.playerStats = {};
        game.awards = { mvpPlayerId: "", bestGoaliePlayerId: "" };
      }

      persistAndRender();
    });

    card.querySelector(".delete-game-button").addEventListener("click", () => {
      state.games = state.games.filter((entry) => entry.id !== game.id);
      persistAndRender();
    });

    elements.scheduleBoard.appendChild(card);
  });
}

function renderStatsGameOptions() {
  const selectedGameId = elements.statsGameSelect.value;
  const options = state.games
    .slice()
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .map((game) => {
      const matchup = getMatchupTeams(game).map((team) => team?.name || "Unknown").join(" vs ");
      return `<option value="${game.id}">${formatDate(game.date)} · ${matchup}</option>`;
    })
    .join("");

  elements.statsGameSelect.innerHTML = options || `<option value="">No games scheduled</option>`;
  if (selectedGameId && state.games.some((game) => game.id === selectedGameId)) {
    elements.statsGameSelect.value = selectedGameId;
  }
}

function renderStatsEditor() {
  const gameId = elements.statsGameSelect.value || state.games[0]?.id;
  if (!gameId) {
    elements.statsEditor.className = "stats-editor empty-state";
    elements.statsEditor.innerHTML = "Schedule a game to start tracking stats.";
    return;
  }

  if (elements.statsGameSelect.value !== gameId) {
    elements.statsGameSelect.value = gameId;
  }

  const game = state.games.find((entry) => entry.id === gameId);
  if (!game) {
    elements.statsEditor.className = "stats-editor empty-state";
    elements.statsEditor.innerHTML = "Select a game to edit stats.";
    return;
  }

  ensureGameRosterSnapshot(game);

  const rosterGroups = [
    {
      teamId: game.homeTeamId,
      teamName: getTeamById(game.homeTeamId)?.name || "Unknown",
      players: game.rosters?.[game.homeTeamId] || []
    },
    {
      teamId: game.awayTeamId,
      teamName: getTeamById(game.awayTeamId)?.name || "Unknown",
      players: game.rosters?.[game.awayTeamId] || []
    }
  ];
  const allPlayers = rosterGroups.flatMap((group) => group.players);
  const score = calculateScoreline(game);

  elements.statsEditor.className = "stats-editor";
  elements.statsEditor.innerHTML = `
    <form id="statsForm" class="stats-panel">
      <div class="stats-topline">
        <div>
          <p class="section-tag">Live Stat Sheet</p>
          <h3>${rosterGroups.map((group) => group.teamName).join(" vs ")}</h3>
          <p class="meta-line">${score.home} - ${score.away} · ${game.status}</p>
        </div>
        <label>
          Match status
          <select name="status">
            <option value="Scheduled"${game.status === "Scheduled" ? " selected" : ""}>Scheduled</option>
            <option value="Live"${game.status === "Live" ? " selected" : ""}>Live</option>
            <option value="Final"${game.status === "Final" ? " selected" : ""}>Final</option>
          </select>
        </label>
      </div>
      <div class="award-row">
        <label>
          MVP
          <select name="mvpPlayerId">
            <option value="">Select player</option>
            ${allPlayers.map((player) => `
              <option value="${player.id}"${game.awards?.mvpPlayerId === player.id ? " selected" : ""}>${player.name}</option>
            `).join("")}
          </select>
        </label>
      </div>
      <div class="stats-groups">
        ${rosterGroups.map((group) => renderTeamStatsGroup(group, game)).join("")}
      </div>
      <button type="submit">Save Stats</button>
    </form>
  `;

  // Submit handler is delegated in bindEvents() so it survives re-renders.
}

function renderTeamStatsGroup(group, game) {
  const rows = group.players.length
    ? group.players.map((player) => {
        const statLine = game.playerStats?.[player.id] || { goals: 0, assists: 0 };
        return `
          <div class="stat-player-row">
            <div>
              <strong>${player.name}</strong>
              <p class="meta-line">${player.position || "No position set"}</p>
            </div>
            <label>
              <span class="stat-grid-label">Goals</span>
              <input type="number" min="0" name="goals_${player.id}" value="${statLine.goals}">
            </label>
            <label>
              <span class="stat-grid-label">Assists</span>
              <input type="number" min="0" name="assists_${player.id}" value="${statLine.assists}">
            </label>
          </div>
        `;
      }).join("")
    : `<p class="empty-copy">No players on this game roster.</p>`;

  return `
    <section class="list-card">
      <div class="schedule-card-header">
        <div>
          <h3>${group.teamName}</h3>
          <p class="meta-line">${group.players.length} players in this game</p>
        </div>
      </div>
      ${rows}
    </section>
  `;
}

function handleCreateTeam(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const teamName = formData.get("teamName")?.toString().trim();
  if (!teamName) return;

  state.teams.push({
    id: crypto.randomUUID(),
    name: teamName,
    players: []
  });

  event.currentTarget.reset();
  persistAndRender();
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = formData.get("email")?.toString().trim().toLowerCase() || "";
  const password = formData.get("password")?.toString() || "";

  const account = authState.accounts.find((entry) => entry.email === email);
  if (!account) {
    authNotice = "No account found for that email address.";
    renderView();
    return;
  }

  const passwordHash = await hashPassword(password);
  if (account.passwordHash !== passwordHash) {
    authNotice = "Incorrect password.";
    renderView();
    return;
  }

  authState.session = { userId: account.id };
  saveAuthState();
  form.reset();
  authNotice = "";
  const destination = pendingProtectedView || "teams";
  pendingProtectedView = "";
  if (canAccessView(destination)) {
    currentView = destination;
    render();
  } else {
    authNotice = getAccessDeniedMessage(destination);
    currentView = "home";
    render();
  }
}

// First-time admin account setup (only available when primary admin has no account)
async function handleAdminSetup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const displayName = formData.get("displayName")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirmPassword")?.toString() || "";

  if (password !== confirmPassword) {
    authNotice = "Passwords do not match.";
    renderView();
    return;
  }

  if (authState.accounts.some((entry) => entry.email === PRIMARY_ADMIN_EMAIL)) {
    authNotice = "An administrator account already exists. Please sign in.";
    renderView();
    return;
  }

  const account = {
    id: crypto.randomUUID(),
    displayName,
    email: PRIMARY_ADMIN_EMAIL,
    passwordHash: await hashPassword(password),
    role: "admin",
    createdAt: new Date().toISOString()
  };

  authState.accounts.push(account);
  authState.accounts = normalizeAccounts(authState.accounts);
  authState.session = { userId: account.id };
  saveAuthState();
  form.reset();
  authNotice = "Administrator account created. Welcome!";
  currentView = "admin";
  render();
}

// Admin creates an editor/member account from the Admin panel
async function handleAdminCreateAccount(event) {
  event.preventDefault();
  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    authNotice = "Administrator access is required to create accounts.";
    render();
    return;
  }

  const form = event.currentTarget;
  const formData = new FormData(form);
  const displayName = formData.get("displayName")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim().toLowerCase() || "";
  const password = formData.get("password")?.toString() || "";
  const role = formData.get("role")?.toString() || "editor";

  if (!displayName || !email || !password) {
    authNotice = "Please fill in all fields.";
    render();
    return;
  }

  if (authState.accounts.some((entry) => entry.email === email)) {
    authNotice = "An account with that email already exists.";
    render();
    return;
  }

  const account = {
    id: crypto.randomUUID(),
    displayName,
    email,
    passwordHash: await hashPassword(password),
    role: email === PRIMARY_ADMIN_EMAIL ? "admin" : role,
    createdAt: new Date().toISOString()
  };

  authState.accounts.push(account);
  authState.accounts = normalizeAccounts(authState.accounts);
  saveAuthState();
  form.reset();
  authNotice = `Account created for ${displayName}.`;
  render();
}

function handleLogout() {
  authState.session = { userId: "" };
  saveAuthState();
  pendingProtectedView = "";
  authNotice = "You have been signed out.";
  currentView = "home";
  render();
}

function handleSaveAccount(accountId, form, isPrimaryAdmin) {
  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    authNotice = "Administrator access is required to update accounts.";
    render();
    return;
  }

  const formData = new FormData(form);
  const displayName = formData.get("displayName")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim().toLowerCase() || "";
  const role = formData.get("role")?.toString() || "member";

  const existing = authState.accounts.find((account) => account.id !== accountId && account.email === email);
  if (existing) {
    authNotice = "Another account already uses that email address.";
    render();
    return;
  }

  authState.accounts = authState.accounts.map((account) => {
    if (account.id !== accountId) return account;
    const normalizedEmail = isPrimaryAdmin ? PRIMARY_ADMIN_EMAIL : email;
    return {
      ...account,
      displayName,
      email: normalizedEmail,
      role: normalizedEmail === PRIMARY_ADMIN_EMAIL ? "admin" : role
    };
  });

  authState.accounts = normalizeAccounts(authState.accounts);
  saveAuthState();
  authNotice = "Account updated.";
  render();
}

async function handleDeleteAccount(accountId) {
  console.log("[deleteAccount] called with id:", accountId);

  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    alert("Only an admin can delete accounts.");
    return;
  }

  const account = authState.accounts.find((entry) => entry.id === accountId);
  if (!account) {
    alert("Account not found.");
    return;
  }
  if (account.email === PRIMARY_ADMIN_EMAIL) {
    alert("The primary admin account cannot be deleted.");
    return;
  }

  if (!confirm(`Delete account for ${account.displayName} (${account.email})? This cannot be undone.`)) {
    return;
  }

  const nextAccounts = authState.accounts.filter((entry) => entry.id !== accountId);

  // Persist to Firestore FIRST so we catch permission errors before the UI flickers.
  if (firebaseReady && ACCOUNTS_DOC) {
    try {
      await ACCOUNTS_DOC.set({ accounts: nextAccounts });
      console.log("[deleteAccount] Firestore save succeeded");
    } catch (err) {
      console.error("[deleteAccount] Firestore save FAILED:", err);
      alert(`Could not delete the account: ${err?.message || err}\n\nThis usually means Firestore security rules are blocking writes. Check Firebase Console → Firestore → Rules.`);
      return;
    }
  }

  // Now update local state. The snapshot listener will also update it, but this keeps the UI snappy.
  authState.accounts = nextAccounts;
  if (authState.session.userId === accountId) {
    authState.session = { userId: "" };
    currentView = "login";
  }
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authState.session));
  localStorage.setItem(AUTH_VISITOR_KEY, JSON.stringify(authState.visitorSession));
  render();

}

function handleCreateTournament(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.tournaments.push({
    id: crypto.randomUUID(),
    name: formData.get("name")?.toString().trim() || "Untitled Tournament",
    weekLabel: formData.get("weekLabel")?.toString().trim() || "Week",
    startDate: formData.get("startDate")?.toString() || "",
    endDate: formData.get("endDate")?.toString() || ""
  });

  event.currentTarget.reset();
  persistAndRender();
}

function handleCreateGame(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const homeTeamId = form.elements.teamOneId?.value?.toString() || "";
  const awayTeamId = form.elements.teamTwoId?.value?.toString() || "";

  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    alert("Choose two different teams for a game.");
    return;
  }

  state.games.push({
    id: crypto.randomUUID(),
    tournamentId: formData.get("tournamentId")?.toString() || "",
    homeTeamId,
    awayTeamId,
    date: formData.get("date")?.toString() || "",
    time: formData.get("time")?.toString() || "",
    location: formData.get("location")?.toString().trim() || "",
    status: formData.get("status")?.toString() || "Scheduled",
    notes: formData.get("notes")?.toString().trim() || "",
    rosters: createGameRosterSnapshot(homeTeamId, awayTeamId),
    playerStats: {},
    awards: {
      mvpPlayerId: "",
      bestGoaliePlayerId: ""
    }
  });

  event.currentTarget.reset();
  persistAndRender();
}

function buildTransferOptions(currentTeamId) {
  const options = state.teams
    .filter((team) => team.id !== currentTeamId)
    .map((team) => `<option value="${team.id}">${team.name}</option>`)
    .join("");

  return `<option value="">Move to...</option>${options}`;
}

function transferPlayer(fromTeamId, playerId, toTeamId) {
  const fromTeam = getTeamById(fromTeamId);
  const toTeam = getTeamById(toTeamId);
  if (!fromTeam || !toTeam) return;

  const player = fromTeam.players.find((entry) => entry.id === playerId);
  if (!player) return;

  fromTeam.players = fromTeam.players.filter((entry) => entry.id !== playerId);
  toTeam.players.push(player);
  persistAndRender();
}

function calculateScoreline(game) {
  ensureGameRosterSnapshot(game);
  return {
    home: sumGoalsForTeam(game, game.homeTeamId),
    away: sumGoalsForTeam(game, game.awayTeamId)
  };
}

function sumGoalsForTeam(game, teamId) {
  return Object.values(game.playerStats || {}).reduce((total, statLine) => {
    return total + (statLine.teamId === teamId ? Number(statLine.goals || 0) : 0);
  }, 0);
}

function getFilteredGames(tournamentId) {
  const games = tournamentId && tournamentId !== "all"
    ? state.games.filter((game) => game.tournamentId === tournamentId)
    : state.games.slice();

  return games.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function getTeamById(teamId) {
  return state.teams.find((team) => team.id === teamId);
}

function getTournamentById(tournamentId) {
  return state.tournaments.find((tournament) => tournament.id === tournamentId);
}

function getMatchupTeams(game) {
  return [getTeamById(game.homeTeamId), getTeamById(game.awayTeamId)];
}

function buildTeamOptions(selectedTeamId) {
  return state.teams.map((team) => {
    const selected = team.id === selectedTeamId ? " selected" : "";
    return `<option value="${team.id}"${selected}>${team.name}</option>`;
  }).join("");
}

function buildStatusOptions(selectedStatus) {
  return ["Scheduled", "Live", "Final"].map((status) => {
    const selected = status === selectedStatus ? " selected" : "";
    return `<option value="${status}"${selected}>${status}</option>`;
  }).join("");
}

function getWeekWindow(weekOffset = 0) {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() + mondayOffset + (weekOffset * 7));

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

function rangesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA) return false;
  return startA <= endB && endA >= startB;
}

function isDateInRange(dateValue, start, end) {
  if (!dateValue) return false;
  return dateValue >= start && dateValue <= end;
}

function isPastGame(game) {
  if (!game.date) return false;
  const gameMoment = new Date(`${game.date}T${game.time || "23:59"}`);
  return gameMoment.getTime() < Date.now();
}

function getTopGameStatLines(game) {
  const statLines = Object.entries(game.playerStats || {})
    .map(([playerId, stats]) => {
      const name = findPlayerNameById(playerId, game);
      return {
        label: `${name}: ${stats.goals || 0} goals, ${stats.assists || 0} assists`,
        total: Number(stats.goals || 0) + Number(stats.assists || 0)
      };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  return statLines.slice(0, 3).map((entry) => entry.label);
}

function getAllTimePlayerStats() {
  const players = new Map();

  state.teams.forEach((team) => {
    team.players.forEach((player) => {
      const manualStats = player.manualStats || {};
      players.set(player.id, {
        id: player.id,
        name: player.name,
        teamName: team.name,
        goals: Number(manualStats.goals || 0),
        assists: Number(manualStats.assists || 0),
        mvpAwards: 0,
        goalieAwards: 0,
        manualAwards: Number(manualStats.awards || 0),
        awards: Number(manualStats.awards || 0),
        games: Number(manualStats.games || DEFAULT_MANUAL_GAMES)
      });
    });
  });

  state.games.forEach((game) => {
    ensureGameRosterSnapshot(game);

    Object.values(game.rosters || {}).flat().forEach((player) => {
      if (!players.has(player.id)) {
        players.set(player.id, {
          id: player.id,
          name: player.name,
          teamName: getHistoricalTeamName(player.id, game),
          goals: 0,
          assists: 0,
          mvpAwards: 0,
          goalieAwards: 0,
          manualAwards: 0,
          awards: 0,
          games: 0
        });
      }
    });

    const seenThisGame = new Set();
    Object.entries(game.playerStats || {}).forEach(([playerId, stats]) => {
      const player = players.get(playerId) || {
        id: playerId,
        name: findPlayerNameById(playerId, game),
        teamName: getHistoricalTeamName(playerId, game),
        goals: 0,
        assists: 0,
        mvpAwards: 0,
        goalieAwards: 0,
        manualAwards: 0,
        awards: 0,
        games: 0
      };

      player.goals += Number(stats.goals || 0);
      player.assists += Number(stats.assists || 0);
      if (!seenThisGame.has(playerId)) {
        player.games += 1;
        seenThisGame.add(playerId);
      }
      players.set(playerId, player);
    });

    if (game.awards?.mvpPlayerId) {
      const player = players.get(game.awards.mvpPlayerId);
      if (player) {
        player.mvpAwards += 1;
        player.awards += 1;
      }
    }

    if (game.awards?.bestGoaliePlayerId) {
      const player = players.get(game.awards.bestGoaliePlayerId);
      if (player) {
        player.goalieAwards += 1;
        player.awards += 1;
      }
    }
  });

  return Array.from(players.values()).filter((player) => {
    return player.goals || player.assists || player.awards || player.games;
  });
}

function getCurrentUser() {
  const userId = authState.session?.userId;
  if (!userId) return null;
  return authState.accounts.find((account) => account.id === userId) || null;
}

function isAdmin(user) {
  return user?.role === "admin";
}

function canEdit(user) {
  return user?.role === "admin" || user?.role === "editor";
}

function canAccessView(view) {
  // Public views accessible to all (including the gate link for login)
  if (view === "login") return true;

  // Everything else requires at minimum visitor access
  if (!hasAnyAccess()) return false;

  // Views available to any visitor or logged-in user
  if (view === "home" || view === "rules" || view === "teams") return true;

  // Privileged views require a proper account
  const user = getCurrentUser();
  if (!user) return false;
  if (view === "editor") return canEdit(user);
  if (view === "admin") return isAdmin(user);
  return true;
}

function getAccessDeniedMessage(view) {
  const user = getCurrentUser();
  if (!user) {
    if (view === "teams") return "Please sign in to open Teams.";
    if (view === "editor") return "Please sign in with an editor or administrator account to open Editor.";
    if (view === "admin") return "Please sign in with the administrator account to open Admin.";
    return "Please sign in to continue.";
  }

  if (view === "editor") {
    return "Your account does not have editor permissions yet.";
  }
  if (view === "admin") {
    return "Administrator permissions are required to open Admin.";
  }
  return "Your account does not have access to that page.";
}

function capitalize(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

async function hashPassword(password) {
  if (!crypto?.subtle) {
    return `fallback-${simpleHash(password)}`;
  }
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function simpleHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getWeeklyTournamentMvp(games) {
  const counts = new Map();

  games.forEach((game) => {
    const playerId = game.awards?.mvpPlayerId;
    if (!playerId) return;
    counts.set(playerId, (counts.get(playerId) || 0) + 1);
  });

  if (!counts.size) return "";

  const [winnerId] = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || findPlayerNameById(a[0], games[0]).localeCompare(findPlayerNameById(b[0], games[0])))[0];

  return findPlayerNameById(winnerId, games[0]);
}

function findPlayerNameById(playerId, game) {
  if (!playerId) return "";
  for (const team of state.teams) {
    const player = team.players.find((entry) => entry.id === playerId);
    if (player) return player.name;
  }

  if (game?.rosters) {
    for (const roster of Object.values(game.rosters)) {
      const player = roster.find((entry) => entry.id === playerId);
      if (player) return player.name;
    }
  }

  return "Unknown player";
}

function getHistoricalTeamName(playerId, game) {
  if (!game?.rosters) return "";
  for (const [teamId, roster] of Object.entries(game.rosters)) {
    if (roster.some((player) => player.id === playerId)) {
      return getTeamById(teamId)?.name || "Former team";
    }
  }
  return "";
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createGameRosterSnapshot(homeTeamId, awayTeamId) {
  return createRosterSnapshotFromTeams(state.teams, homeTeamId, awayTeamId);
}

function createRosterSnapshotFromTeams(teams, homeTeamId, awayTeamId) {
  const homeTeam = teams.find((team) => team.id === homeTeamId);
  const awayTeam = teams.find((team) => team.id === awayTeamId);

  return {
    [homeTeamId]: (homeTeam?.players || []).map((player) => ({ ...player })),
    [awayTeamId]: (awayTeam?.players || []).map((player) => ({ ...player }))
  };
}

function ensureGameRosterSnapshot(game) {
  if (shouldSyncGameRosterFromTeams(game)) {
    game.rosters = createGameRosterSnapshot(game.homeTeamId, game.awayTeamId);
    return;
  }

  if (game.rosters?.[game.homeTeamId] && game.rosters?.[game.awayTeamId]) {
    return;
  }

  game.rosters = {
    ...createGameRosterSnapshot(game.homeTeamId, game.awayTeamId),
    ...(game.rosters || {})
  };
}

function shouldSyncGameRosterFromTeams(game) {
  const hasStats = Object.keys(game.playerStats || {}).length > 0;
  const hasAwards = Boolean(game.awards?.mvpPlayerId || game.awards?.bestGoaliePlayerId);
  return !hasStats && !hasAwards && game.status !== "Final";
}

function handleSaveGameStats(form) {
  const gameId = elements.statsGameSelect.value;
  const game = state.games.find((g) => g.id === gameId);
  if (!game) {
    console.warn("[saveStats] game not found for id:", gameId);
    return;
  }

  const formData = new FormData(form);

  game.status = formData.get("status")?.toString() || "Scheduled";
  game.awards = {
    mvpPlayerId: formData.get("mvpPlayerId")?.toString() || "",
    bestGoaliePlayerId: formData.get("bestGoaliePlayerId")?.toString() || ""
  };

  // Build roster groups from the game's current roster snapshot
  ensureGameRosterSnapshot(game);
  const rosterEntries = Object.entries(game.rosters || {});

  game.playerStats = {};
  rosterEntries.forEach(([teamId, players]) => {
    players.forEach((player) => {
      const goals = Number(formData.get(`goals_${player.id}`) || 0);
      const assists = Number(formData.get(`assists_${player.id}`) || 0);
      if (goals > 0 || assists > 0) {
        game.playerStats[player.id] = { goals, assists, teamId };
      }
    });
  });

  console.log("[saveStats] playerStats saved:", JSON.stringify(game.playerStats));
  persistAndRender();
  elements.statsGameSelect.value = game.id;
  renderStatsEditor();
}

function persistAndRender() {
  saveState();
  render();
}

function formatDate(value) {
  if (!value) return "Date TBD";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value) {
  if (!value) return "Time TBD";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ─── League Standings ───────────────────────────────────────────────────────

function calculateStandings() {
  // Build a record per team from all Final games
  const records = new Map();

  state.teams.forEach((team) => {
    records.set(team.id, {
      id: team.id,
      name: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    });
  });

  state.games
    .filter((game) => game.status === "Final")
    .forEach((game) => {
      const score = calculateScoreline(game);
      const home = records.get(game.homeTeamId);
      const away = records.get(game.awayTeamId);
      if (!home || !away) return;

      home.played += 1;
      away.played += 1;
      home.goalsFor += score.home;
      home.goalsAgainst += score.away;
      away.goalsFor += score.away;
      away.goalsAgainst += score.home;

      if (score.home > score.away) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (score.away > score.home) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        home.points += 1;
        away.draws += 1;
        away.points += 1;
      }
    });

  return Array.from(records.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });
}

function renderStandings() {
  if (!elements.homeStandings) return;

  const standings = calculateStandings();

  if (!standings.length) {
    elements.homeStandings.innerHTML = `<p class="empty-copy">No teams found. Add teams in the Editor to see standings.</p>`;
    return;
  }

  const hasGames = standings.some((row) => row.played > 0);

  const rows = standings.map((row, index) => {
    const gd = row.goalsFor - row.goalsAgainst;
    const gdDisplay = gd > 0 ? `+${gd}` : `${gd}`;
    return `
      <tr>
        <td>
          <span style="color:var(--muted);font-size:0.8rem;margin-right:0.4rem;">${index + 1}</span>
          <strong>${escapeText(row.name)}</strong>
        </td>
        <td>${row.played}</td>
        <td>${row.wins}</td>
        <td>${row.draws}</td>
        <td>${row.losses}</td>
        <td>${row.goalsFor}</td>
        <td>${row.goalsAgainst}</td>
        <td>${gdDisplay}</td>
        <td class="standings-pts">${row.points}</td>
      </tr>
    `;
  }).join("");

  elements.homeStandings.innerHTML = `
    <table class="standings-table">
      <thead>
        <tr>
          <th>Team</th>
          <th title="Games Played">GP</th>
          <th title="Wins">W</th>
          <th title="Draws">D</th>
          <th title="Losses">L</th>
          <th title="Goals For">GF</th>
          <th title="Goals Against">GA</th>
          <th title="Goal Difference">GD</th>
          <th title="Points">Pts</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    ${!hasGames ? `<p class="meta-line" style="margin-top:0.75rem;">Mark games as "Final" in the Editor to see standings update.</p>` : ""}
  `;
}

// ─── Player Leaderboard ──────────────────────────────────────────────────────

function renderLeaderboard() {
  if (!elements.leaderboardTable) return;

  const players = getAllTimePlayerStats();

  if (!players.length) {
    elements.leaderboardTable.innerHTML = `<p class="empty-copy">No player stats recorded yet. Add teams and track game stats in the Editor.</p>`;
    return;
  }

  // Sort by goals, then assists, then awards, then name
  const sorted = players
    .slice()
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (b.awards !== a.awards) return b.awards - a.awards;
      return a.name.localeCompare(b.name);
    });

  const rows = sorted.map((player, index) => {
    const rank = index + 1;
    const rankClass = rank <= 3 ? " top-three" : "";
    return `
      <tr>
        <td><span class="leaderboard-rank${rankClass}">${rank}</span></td>
        <td><strong>${escapeText(player.name)}</strong></td>
        <td>${escapeText(player.teamName || "—")}</td>
        <td>${player.goals}</td>
        <td>${player.assists}</td>
        <td>${player.goals + player.assists}</td>
        <td>${player.awards}</td>
      </tr>
    `;
  }).join("");

  elements.leaderboardTable.innerHTML = `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Team</th>
          <th title="Goals">G</th>
          <th title="Assists">A</th>
          <th title="Goals + Assists">G+A</th>
          <th title="Awards (MVP + Best Goalie)">Awards</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ─── Gate & Access Helpers ───────────────────────────────────────────────────

function hasVisitorAccess() {
  return authState.visitorSession?.hasAccess === true;
}

function hasAnyAccess() {
  return getCurrentUser() !== null || hasVisitorAccess();
}

function grantVisitorAccess() {
  authState.visitorSession = { hasAccess: true };
  saveAuthState();
}

function revokeVisitorAccess() {
  authState.visitorSession = { hasAccess: false };
  saveAuthState();
}

// Show gate page or main app depending on access state
function renderGateOrApp() {
  const hasAccess = hasAnyAccess();
  elements.gateView.classList.toggle("is-hidden", hasAccess);
  elements.pageShell.classList.toggle("is-hidden", !hasAccess);
}

// Handle visitor password entry on the gate page
function handleVisitorLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const entered = formData.get("visitorPassword")?.toString() || "";

  if (entered === state.visitorPassword) {
    grantVisitorAccess();
    event.currentTarget.reset();
    currentView = "home";
    render();
  } else {
    elements.gateError.textContent = "Incorrect password. Try again.";
    elements.gateError.classList.remove("is-hidden");
    document.querySelector("#visitorPasswordInput").value = "";
    document.querySelector("#visitorPasswordInput").focus();
  }
}

// Show/hide the first-time admin setup form on the login page
function renderLoginPage() {
  if (!elements.adminSetupForm) return;
  const adminExists = authState.accounts.some((acc) => acc.email === PRIMARY_ADMIN_EMAIL);
  elements.adminSetupForm.classList.toggle("is-hidden", adminExists);
}

// ─── Admin: Visitor Password Management ─────────────────────────────────────

function renderAdminVisitorPassword() {
  if (!elements.visitorPasswordPanel) return;
  const currentUser = getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    elements.visitorPasswordPanel.innerHTML = `<p class="empty-copy">Administrator access required.</p>`;
    return;
  }

  elements.visitorPasswordPanel.innerHTML = `
    <article class="list-card">
      <form id="visitorPasswordForm" class="stack-form">
        <label>
          Current password
          <input type="text" readonly value="${escapeAttribute(state.visitorPassword)}" style="font-family:monospace;">
        </label>
        <label>
          New visitor password
          <input type="text" name="newPassword" placeholder="Enter a new league password" required>
        </label>
        <div class="player-actions">
          <button type="submit">Update Password</button>
        </div>
      </form>
    </article>
  `;

  elements.visitorPasswordPanel.querySelector("#visitorPasswordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("newPassword")?.toString().trim() || "";
    if (!newPassword) return;

    state.visitorPassword = newPassword;
    // Revoke all existing visitor sessions so everyone must re-enter
    revokeVisitorAccess();
    saveState();
    authNotice = "Visitor password updated. Existing guest sessions have been reset.";
    render();
  });
}
