const body = document.body;
const themeToggle = document.querySelector("#theme-toggle");
const composerField = document.querySelector("#composer-field");
const ideaChips = document.querySelectorAll(".idea-chip");

const THEME_KEY = "sojial-theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  body.classList.toggle("is-dark", isDark);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.textContent = isDark ? "◑" : "◐";
  }
}

function loadTheme() {
  const savedTheme = window.localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = body.classList.contains("is-dark") ? "light" : "dark";
    window.localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

ideaChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    if (!composerField) {
      return;
    }

    const chipText = chip.textContent.trim();
    composerField.value = chipText;
    composerField.focus();
  });
});

loadTheme();
