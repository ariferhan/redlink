const themeToggle = document.querySelector(".theme-toggle");
const themeLabel = document.querySelector(".theme-label");
const localeButtons = document.querySelectorAll(".locale");
const eyebrow = document.querySelector(".eyebrow");
const bio = document.querySelector(".bio");
const nameHeading = document.querySelector(".identity h1");
const avatar = document.querySelector(".avatar");
const linkElements = document.querySelectorAll("[data-link]");

let profileData = window.profileStore.loadProfileData();

function getLanguageContent(lang) {
  return {
    eyebrow: profileData.title[lang] || profileData.title.tr,
    bio: profileData.bio[lang] || profileData.bio.tr,
    theme: profileData.themeLabel[lang] || profileData.themeLabel.tr,
  };
}

function renderProfile() {
  const activeLanguage = profileData.activeLanguage;
  const content = getLanguageContent(activeLanguage);

  if (eyebrow) {
    eyebrow.textContent = content.eyebrow;
  }

  if (bio) {
    bio.textContent = content.bio;
  }

  if (themeLabel) {
    themeLabel.textContent = content.theme;
  }

  if (nameHeading) {
    nameHeading.textContent = profileData.name;
  }

  if (avatar) {
    avatar.textContent = profileData.avatarLetter;
  }

  document.body.classList.toggle("dark", profileData.darkMode);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(profileData.darkMode));
  }

  localeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === activeLanguage);
  });

  linkElements.forEach((element) => {
    const linkData = profileData.links.find((item) => item.key === element.dataset.link);
    const label = element.querySelector(".link-label");
    const href = linkData?.url?.trim() ? linkData.url : "#";

    if (!linkData) {
      return;
    }

    if (label) {
      label.textContent = linkData.label;
    }

    element.href = href;
    element.target = href === "#" ? "_self" : "_blank";
    element.rel = href === "#" ? "" : "noreferrer";
    element.setAttribute("aria-label", `${linkData.label} profili`);
  });
}

function updateLanguage(lang) {
  profileData.activeLanguage = lang;
  profileData = window.profileStore.saveProfileData(profileData);
  renderProfile();
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    profileData.darkMode = !profileData.darkMode;
    profileData = window.profileStore.saveProfileData(profileData);
    renderProfile();
  });
}

localeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    updateLanguage(button.dataset.lang);
  });
});

window.addEventListener("storage", () => {
  profileData = window.profileStore.loadProfileData();
  renderProfile();
});

renderProfile();
