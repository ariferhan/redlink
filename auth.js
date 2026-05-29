const USERS_KEY = "sojial-users";
const SESSION_KEY = "sojial-session";
const PENDING_SIGNUP_KEY = "sojial-pending-signup";
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const COMMON_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password123",
  "qwerty",
  "qwerty123",
  "111111",
  "000000",
  "abc123",
  "asdfgh",
  "adminadmin",
  "letmein",
  "welcome",
  "iloveyou",
  "monkey",
  "passw0rd",
  "super123",
  "test1234",
]);

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

  const adminProfile = window.profileStore.loadProfileDataLocal("admin", "Demo Admin");

  if (!adminProfile?.name) {
    window.profileStore.saveProfileDataLocal(
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

function getUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return getUsers().find((user) => (user.email || "").trim().toLowerCase() === normalized) || null;
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

function readPendingSignup() {
  return window.profileStore.readStorage(PENDING_SIGNUP_KEY, null);
}

function savePendingSignup(payload) {
  window.profileStore.writeStorage(PENDING_SIGNUP_KEY, payload);
}

function clearPendingSignup() {
  window.profileStore.writeStorage(PENDING_SIGNUP_KEY, null);
}

function validatePasswordPolicy({ password, email = "", username = "", name = "" }) {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, message: "Şifre zorunlu." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Şifren en az ${MIN_PASSWORD_LENGTH} karakter olmalı. Mümkünse 15+ karakterlik bir parola cümlesi kullan.`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Şifren en fazla ${MAX_PASSWORD_LENGTH} karakter olabilir.`,
    };
  }

  if (/[\u0000-\u001F\u007F]/.test(password)) {
    return {
      ok: false,
      message: "Şifrede görünmeyen kontrol karakterleri kullanılamaz.",
    };
  }

  const loweredPassword = password.toLocaleLowerCase("tr-TR");
  const emailLocalPart = email.split("@")[0] || "";
  const forbiddenFragments = [username, emailLocalPart, name]
    .map((value) => value.toLocaleLowerCase("tr-TR").trim())
    .filter((value) => value.length >= 3);

  if (forbiddenFragments.some((fragment) => loweredPassword.includes(fragment))) {
    return {
      ok: false,
      message: "Şifren kullanıcı adı, adın veya e-posta bilgini içermemeli.",
    };
  }

  if (COMMON_PASSWORDS.has(loweredPassword)) {
    return {
      ok: false,
      message: "Bu şifre çok yaygın kullanılıyor. Daha özgün ve uzun bir şifre seç.",
    };
  }

  return { ok: true };
}

async function clearSession() {
  window.profileStore.writeStorage(SESSION_KEY, null);

  if (window.supabaseService?.isReady()) {
    await window.supabaseService.signOut();
  }
}

async function getCurrentUser() {
  if (window.supabaseService?.isReady()) {
    const remoteUser = await window.supabaseService.getUser();

    if (remoteUser) {
      const profile = await window.supabaseService.getProfileForCurrentUser();
      const username = profile?.username || remoteUser.user_metadata?.username || remoteUser.email?.split("@")[0];
      return {
        id: remoteUser.id,
        email: remoteUser.email,
        name: profile?.display_name || remoteUser.user_metadata?.full_name || username,
        username,
      };
    }
  }

  const session = getSession();

  if (!session?.username) {
    return null;
  }

  return getUserByUsername(session.username);
}

async function loginUser(identifier, password) {
  const normalized = sanitizeUsername(identifier);
  const normalizedEmail = identifier.trim().toLowerCase();
  const demoUser = getUsers().find(
    (item) =>
      (item.username === normalized || ((item.email || "").trim().toLowerCase() === normalizedEmail)) &&
      item.password === password
  );

  if (demoUser) {
    setSession(demoUser);
    return { ok: true, user: demoUser };
  }

  if (window.supabaseService?.isReady()) {
    const result = await window.supabaseService.signInWithEmail(identifier.trim(), password);

    if (!result.ok) {
      return { ok: false, message: "Kullanıcı bilgileri doğrulanamadı." };
    }

    const profile = await window.supabaseService.getProfileForCurrentUser();
    const remoteUser = {
      id: result.user.id,
      email: result.user.email,
      name: profile?.display_name || result.user.user_metadata?.full_name || "Kullanıcı",
      username: profile?.username || result.user.user_metadata?.username || result.user.email?.split("@")[0],
    };

    return { ok: true, user: remoteUser };
  }

  return { ok: false, message: "Kullanıcı adı veya şifre hatalı." };
}

async function updateAccountSettings({ currentUsername, email, username, name, currentPassword }) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const normalized = sanitizeUsername(username);
  const trimmedCurrentPassword = (currentPassword || "").trim();

  if (!trimmedName || !trimmedEmail || !normalized) {
    return { ok: false, message: "Ad, kullanıcı adı ve e-posta zorunlu." };
  }

  if (window.supabaseService?.isReady()) {
    const currentRemoteUser = await window.supabaseService.getUser();

    if (!currentRemoteUser) {
      return { ok: false, message: "Oturum bulunamadı." };
    }

    const emailChanged = trimmedEmail !== (currentRemoteUser.email || "").trim().toLowerCase();
    const usernameChanged = normalized !== currentUsername;

    if ((emailChanged || usernameChanged) && !trimmedCurrentPassword) {
      return { ok: false, message: "E-posta veya kullanıcı adı değişikliği için mevcut şifreni girmen gerekiyor." };
    }

    if (emailChanged || usernameChanged) {
      const passwordCheck = await window.supabaseService.verifyCurrentPassword(
        currentRemoteUser.email,
        trimmedCurrentPassword
      );

      if (!passwordCheck.ok) {
        return passwordCheck;
      }
    }

    if (normalized !== currentUsername) {
      const existingProfile = await window.supabaseService.getProfileByUsername(normalized);
      if (existingProfile && existingProfile.id !== currentRemoteUser.id) {
        return { ok: false, message: "Bu kullanıcı adı zaten alınmış." };
      }
    }

    const result = await window.supabaseService.updateCurrentUser({
      email: trimmedEmail,
      username: normalized,
      name: trimmedName,
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      emailChanged,
      user: {
        id: currentRemoteUser.id,
        email: trimmedEmail,
        name: trimmedName,
        username: normalized,
      },
    };
  }

  const users = getUsers();
  const currentUser = getUserByUsername(currentUsername);

  if (!currentUser) {
    return { ok: false, message: "Kullanıcı bulunamadı." };
  }

  const emailChanged = trimmedEmail !== ((currentUser.email || "").trim().toLowerCase());
  const usernameChanged = normalized !== currentUsername;

  if ((emailChanged || usernameChanged) && currentUser.password !== trimmedCurrentPassword) {
    return { ok: false, message: "E-posta veya kullanıcı adı değişikliği için mevcut şifreni doğru girmen gerekiyor." };
  }

  const usernameOwner = getUserByUsername(normalized);
  if (usernameOwner && usernameOwner.id !== currentUser.id) {
    return { ok: false, message: "Bu kullanıcı adı zaten alınmış." };
  }

  const emailOwner = getUserByEmail(trimmedEmail);
  if (emailOwner && emailOwner.id !== currentUser.id) {
    return { ok: false, message: "Bu e-posta zaten kullanımda." };
  }

  const updatedUsers = users.map((user) =>
    user.id === currentUser.id
      ? {
          ...user,
          name: trimmedName,
          username: normalized,
          email: trimmedEmail,
        }
      : user
  );

  saveUsers(updatedUsers);
  const updatedUser = updatedUsers.find((user) => user.id === currentUser.id);
  setSession(updatedUser);

  return { ok: true, emailChanged, user: updatedUser };
}

async function requestLoginCode(email) {
  if (!window.supabaseService?.isReady()) {
    return { ok: false, message: "Kod ile giriş için önce Supabase bağlantısını kurman gerekiyor." };
  }

  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { ok: false, message: "E-posta adresi gerekli." };
  }

  return window.supabaseService.sendEmailOtp({
    email: trimmedEmail,
    shouldCreateUser: false,
  });
}

async function requestSignupCode({ name, email, username, password }) {
  if (!window.supabaseService?.isReady()) {
    return { ok: false, message: "Kod ile üyelik için önce Supabase bağlantısını kurman gerekiyor." };
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const normalized = sanitizeUsername(username);
  const rawPassword = typeof password === "string" ? password : "";

  if (!trimmedName || !trimmedEmail || !normalized || !rawPassword) {
    return { ok: false, message: "Ad, kullanıcı adı, e-posta ve şifre zorunlu." };
  }

  const passwordValidation = validatePasswordPolicy({
    password: rawPassword,
    email: trimmedEmail,
    username: normalized,
    name: trimmedName,
  });

  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  const result = await window.supabaseService.sendEmailOtp({
    email: trimmedEmail,
    shouldCreateUser: true,
    data: {
      username: normalized,
      full_name: trimmedName,
    },
  });

  if (!result.ok) {
    return result;
  }

  savePendingSignup({
    name: trimmedName,
    email: trimmedEmail,
    username: normalized,
    password: rawPassword,
  });

  return { ok: true };
}

async function verifyEmailCode(email, token, mode = "login", signupFallback = null) {
  const trimmedEmail = email.trim();
  const trimmedToken = token.trim();

  if (!window.supabaseService?.isReady()) {
    return { ok: false, message: "Kod doğrulama için önce Supabase bağlantısını kurman gerekiyor." };
  }

  if (!trimmedEmail || !trimmedToken) {
    return { ok: false, message: "E-posta ve kod zorunlu." };
  }

  const result = await window.supabaseService.verifyEmailOtp({
    email: trimmedEmail,
    token: trimmedToken,
  });

  if (!result.ok) {
    return result;
  }

  if (mode === "signup") {
    const pendingSignup = readPendingSignup();
    const signupContext =
      pendingSignup && pendingSignup.email === trimmedEmail
        ? pendingSignup
        : signupFallback
          ? {
              name: signupFallback.name.trim(),
              email: trimmedEmail,
              username: sanitizeUsername(signupFallback.username),
              password: signupFallback.password,
            }
          : null;

    if (!signupContext?.name || !signupContext?.username || !signupContext?.password) {
      return { ok: false, message: "Kayıt bilgisi bulunamadı. Lütfen üyelik adımını yeniden başlat." };
    }

    const passwordValidation = validatePasswordPolicy({
      password: signupContext.password,
      email: signupContext.email,
      username: signupContext.username,
      name: signupContext.name,
    });

    if (!passwordValidation.ok) {
      return passwordValidation;
    }

    const updateResult = await window.supabaseService.updateCurrentUser({
      password: signupContext.password,
      username: signupContext.username,
      name: signupContext.name,
    });

    if (!updateResult.ok) {
      return updateResult;
    }

    clearPendingSignup();
  }

  const profile = await window.supabaseService.getProfileForCurrentUser();
  const remoteUser = {
    id: result.user.id,
    email: result.user.email,
    name: profile?.display_name || result.user.user_metadata?.full_name || "Kullanıcı",
    username: profile?.username || result.user.user_metadata?.username || result.user.email?.split("@")[0],
  };

  return { ok: true, user: remoteUser };
}

async function registerUser({ name, email, username, password }) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const normalized = sanitizeUsername(username);
  const rawPassword = typeof password === "string" ? password : "";

  if (!trimmedName || !normalized || !rawPassword || !trimmedEmail) {
    return { ok: false, message: "Tüm alanları doldurman gerekiyor." };
  }

  const passwordValidation = validatePasswordPolicy({
    password: rawPassword,
    email: trimmedEmail,
    username: normalized,
    name: trimmedName,
  });

  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  if (window.supabaseService?.isReady()) {
    const result = await window.supabaseService.signUp({
      name: trimmedName,
      email: trimmedEmail,
      username: normalized,
      password: rawPassword,
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      requiresConfirmation: !result.session,
      user: {
        id: result.user?.id,
        email: result.user?.email,
        name: trimmedName,
        username: normalized,
      },
    };
  }

  const users = getUsers();

  if (users.some((user) => user.username === normalized)) {
    return { ok: false, message: "Bu kullanıcı adı zaten alınmış." };
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name: trimmedName,
    username: normalized,
    password: rawPassword,
    email: trimmedEmail,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  window.profileStore.saveProfileDataLocal(
    normalized,
    window.profileStore.buildDefaultProfile(normalized, trimmedName),
    trimmedName
  );
  setSession(newUser);

  return { ok: true, user: newUser };
}

async function requireAuth(redirectUrl = "login.html") {
  const params = new URLSearchParams(window.location.search);
  const sessionUsername = params.get("session");

  if (sessionUsername && !window.supabaseService?.isReady()) {
    const urlUser = getUserByUsername(sessionUsername);

    if (urlUser) {
      setSession(urlUser);
      return urlUser;
    }
  }

  const user = await getCurrentUser();

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
  getUserByEmail,
  getSession,
  getCurrentUser,
  loginUser,
  registerUser,
  readPendingSignup,
  updateAccountSettings,
  requestLoginCode,
  requestSignupCode,
  verifyEmailCode,
  validatePasswordPolicy,
  clearSession,
  requireAuth,
};
