const USERS_KEY = "sojial-users";
const SESSION_KEY = "sojial-session";

function sanitizeUsername(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function readUsers() {
  return window.profileStore.readStorage(USERS_KEY, []);
}

function saveUsers(users) {
  window.profileStore.writeStorage(USERS_KEY, users);
}

function ensureDemoAccount() {
  const users = readUsers();
  const hasAdmin = users.some((user) => user.username === "admin");

  if (!hasAdmin) {
    users.push({
      id: "seed-admin",
      name: "Demo Admin",
      username: "admin",
      password: "admin",
      createdAt: new Date().toISOString(),
    });
    saveUsers(users);
  }

  const adminProfile = window.profileStore.loadProfileData("admin", "Demo Admin");

  if (!adminProfile?.name) {
    window.profileStore.saveProfileData(
      "admin",
      window.profileStore.buildDefaultProfile("admin", "Demo Admin"),
      "Demo Admin"
    );
  }
}

function getUsers() {
  ensureDemoAccount();
  return readUsers();
}

function getUserByUsername(username) {
  const normalized = sanitizeUsername(username);
  return getUsers().find((user) => user.username === normalized) || null;
}

function getSession() {
  return window.profileStore.readStorage(SESSION_KEY, null);
}

function setSession(user) {
  const session = {
    username: user.username,
    name: user.name,
    loggedInAt: new Date().toISOString(),
  };

  window.profileStore.writeStorage(SESSION_KEY, session);
  return session;
}

function clearSession() {
  window.profileStore.writeStorage(SESSION_KEY, null);
}

function getCurrentUser() {
  const session = getSession();

  if (!session?.username) {
    return null;
  }

  return getUserByUsername(session.username);
}

function loginUser(username, password) {
  const normalized = sanitizeUsername(username);
  const user = getUsers().find((item) => item.username === normalized && item.password === password);

  if (!user) {
    return { ok: false, message: "Kullanıcı adı veya şifre hatalı." };
  }

  setSession(user);
  return { ok: true, user };
}

function registerUser({ name, username, password }) {
  const users = getUsers();
  const normalized = sanitizeUsername(username);
  const trimmedName = name.trim();

  if (!trimmedName || !normalized || !password.trim()) {
    return { ok: false, message: "Tüm alanları doldurman gerekiyor." };
  }

  if (users.some((user) => user.username === normalized)) {
    return { ok: false, message: "Bu kullanıcı adı zaten alınmış." };
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name: trimmedName,
    username: normalized,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  window.profileStore.saveProfileData(
    normalized,
    window.profileStore.buildDefaultProfile(normalized, trimmedName),
    trimmedName
  );
  setSession(newUser);

  return { ok: true, user: newUser };
}

function requireAuth(redirectUrl = "login.html") {
  const params = new URLSearchParams(window.location.search);
  const sessionUsername = params.get("session");

  if (sessionUsername) {
    const urlUser = getUserByUsername(sessionUsername);

    if (urlUser) {
      setSession(urlUser);
      return urlUser;
    }
  }

  const user = getCurrentUser();

  if (!user) {
    window.location.href = redirectUrl;
    return null;
  }

  return user;
}

ensureDemoAccount();

window.authStore = {
  sanitizeUsername,
  getUsers,
  getUserByUsername,
  getSession,
  getCurrentUser,
  loginUser,
  registerUser,
  clearSession,
  requireAuth,
};
