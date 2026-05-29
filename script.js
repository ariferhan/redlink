const body = document.body;
const themeToggle = document.querySelector("#theme-toggle");
const composerField = document.querySelector("#composer-field");
const composerModeButton = document.querySelector(".composer-mode");
const composerSubmitButton = document.querySelector(".composer-submit");
const composerModeLabel = composerModeButton?.querySelector("span:nth-child(2)");
const ideaChips = document.querySelectorAll(".idea-chip");
const primaryAuthLink = document.querySelector("#primary-auth-link");
const secondaryAuthLink = document.querySelector("#secondary-auth-link");

const THEME_KEY = "sojial-theme";
const DRAFT_KEY = "sojial-composer-draft";
const COMPOSER_MODE_KEY = "sojial-composer-mode";
const composerModes = [
  { id: "discuss", label: "Tartış", placeholder: "Düşünceni paylaş, bir sohbet başlat..." },
  { id: "ask", label: "Soru sor", placeholder: "Sormak istediğin konuyu yaz..." },
  { id: "help", label: "Destek ol", placeholder: "Yardım edebileceğin konuyu yaz..." },
  { id: "explore", label: "Keşfet", placeholder: "Keşfetmek istediğin alanı yaz..." },
];

function safeRead(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {}
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  body.classList.toggle("is-dark", isDark);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.textContent = isDark ? "◑" : "◐";
  }
}

function getComposerMode() {
  const savedMode = safeRead(COMPOSER_MODE_KEY, composerModes[0].id);
  return composerModes.find((mode) => mode.id === savedMode) || composerModes[0];
}

function applyComposerMode(mode) {
  if (composerModeLabel) {
    composerModeLabel.textContent = mode.label;
  }

  if (composerField) {
    composerField.placeholder = mode.placeholder;
  }

  safeWrite(COMPOSER_MODE_KEY, mode.id);
}

function cycleComposerMode() {
  const currentMode = getComposerMode();
  const currentIndex = composerModes.findIndex((mode) => mode.id === currentMode.id);
  const nextMode = composerModes[(currentIndex + 1) % composerModes.length];
  applyComposerMode(nextMode);
}

function submitComposerIntent() {
  const draft = composerField?.value.trim() || "";
  const mode = getComposerMode();
  safeWrite(DRAFT_KEY, JSON.stringify({ mode: mode.id, draft }));

  const destination = `register.html${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`;
  window.location.href = destination;
}

function loadTheme() {
  applyTheme(safeRead(THEME_KEY, "light"));
}

function hydrateAuthLinks() {
  const currentUser = window.authStore?.getCurrentUser?.();

  if (currentUser && primaryAuthLink && secondaryAuthLink) {
    primaryAuthLink.textContent = "Profilini görüntüle";
    primaryAuthLink.href = `profile.html?u=${currentUser.username}`;

    secondaryAuthLink.textContent = "Panele dön";
    secondaryAuthLink.href = `admin.html?session=${currentUser.username}`;
  }

  body.classList.remove("auth-pending");
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = body.classList.contains("is-dark") ? "light" : "dark";
    safeWrite(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

if (composerModeButton) {
  composerModeButton.addEventListener("click", cycleComposerMode);
}

if (composerSubmitButton) {
  composerSubmitButton.addEventListener("click", submitComposerIntent);
}

if (composerField) {
  composerField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitComposerIntent();
    }
  });
}

ideaChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    if (!composerField) {
      return;
    }

    composerField.value = chip.textContent.trim();
    composerField.focus();
  });
});

loadTheme();
applyComposerMode(getComposerMode());
hydrateAuthLinks();
