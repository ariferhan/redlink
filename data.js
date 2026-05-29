const STORAGE_KEY = "personal-social-card-data";

const defaultProfileData = {
  name: "Arif",
  avatarLetter: "A",
  title: {
    tr: "Kişisel Bağlantılar",
    en: "Personal Links",
    de: "Persönliche Links",
  },
  bio: {
    tr: "Tasarım, yazılım ve dijital üretim odaklı kişisel bağlantı ekranı.",
    en: "A personal profile hub focused on design, software, and digital making.",
    de: "Eine persönliche Profilseite für Design, Software und digitale Produktion.",
  },
  themeLabel: {
    tr: "Karanlık Tema",
    en: "Dark Theme",
    de: "Dunkles Thema",
  },
  activeLanguage: "tr",
  darkMode: false,
  links: [
    { key: "youtube", label: "YouTube", url: "#", icon: "▶" },
    { key: "instagram", label: "Instagram", url: "#", icon: "◎" },
    { key: "tiktok", label: "TikTok", url: "#", icon: "♪" },
    { key: "x", label: "X (Twitter)", url: "#", icon: "𝕏" },
    { key: "linkedin", label: "LinkedIn", url: "#", icon: "in" },
    { key: "website", label: "Web Sitem", url: "#", icon: "◌" },
  ],
};

function cloneDefaultData() {
  return JSON.parse(JSON.stringify(defaultProfileData));
}

function mergeProfileData(savedData = {}) {
  const merged = cloneDefaultData();

  merged.name = savedData.name || merged.name;
  merged.avatarLetter = savedData.avatarLetter || merged.avatarLetter;
  merged.activeLanguage = savedData.activeLanguage || merged.activeLanguage;
  merged.darkMode = typeof savedData.darkMode === "boolean" ? savedData.darkMode : merged.darkMode;

  ["title", "bio", "themeLabel"].forEach((field) => {
    if (savedData[field] && typeof savedData[field] === "object") {
      merged[field] = { ...merged[field], ...savedData[field] };
    }
  });

  if (Array.isArray(savedData.links) && savedData.links.length > 0) {
    merged.links = merged.links.map((link) => {
      const nextLink = savedData.links.find((item) => item.key === link.key);
      return nextLink ? { ...link, ...nextLink } : link;
    });
  }

  return merged;
}

function loadProfileData() {
  try {
    const rawData = window.localStorage.getItem(STORAGE_KEY);

    if (!rawData) {
      return cloneDefaultData();
    }

    return mergeProfileData(JSON.parse(rawData));
  } catch (error) {
    return cloneDefaultData();
  }
}

function saveProfileData(data) {
  const merged = mergeProfileData(data);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

window.profileStore = {
  STORAGE_KEY,
  defaultProfileData,
  loadProfileData,
  saveProfileData,
  mergeProfileData,
};
