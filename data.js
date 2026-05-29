const PROFILE_STORAGE_KEY = "sojial-profiles";

window.__sojialMemoryStore = window.__sojialMemoryStore || {};

const SOCIAL_PLATFORMS = {
  profilePhoto: {
    label: "Profil Fotoğrafı",
    icon: "◍",
    hint: "Sistem içi gizli alan",
    buildUrl: (value) => value,
    cleanValue: (value) => value,
    hidden: true,
  },
  website: {
    label: "Website",
    icon: "◌",
    hint: "Tam web site adresi ya da alan adı",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://${value}`),
    cleanValue: (value) => value.replace(/^https?:\/\//, ""),
  },
  instagram: {
    label: "Instagram",
    icon: "◎",
    hint: "Kullanıcı adı ya da tam profil linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://instagram.com/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, ""),
  },
  x: {
    label: "X",
    icon: "𝕏",
    hint: "Kullanıcı adı ya da tam profil linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://x.com/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?x\.com\//, "").replace(/\/$/, ""),
  },
  youtube: {
    label: "YouTube",
    icon: "▶",
    hint: "Kanal adı ya da tam kanal linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://youtube.com/@${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/, "").replace(/\/$/, ""),
  },
  linkedin: {
    label: "LinkedIn",
    icon: "in",
    hint: "Kullanıcı adı ya da tam profil linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://linkedin.com/in/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, ""),
  },
  tiktok: {
    label: "TikTok",
    icon: "♪",
    hint: "Kullanıcı adı ya da tam profil linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://tiktok.com/@${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, "").replace(/\/$/, ""),
  },
  telegram: {
    label: "Telegram",
    icon: "✈",
    hint: "Kullanıcı adı ya da t.me linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://t.me/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/t\.me\//, "").replace(/\/$/, ""),
  },
  whatsapp: {
    label: "WhatsApp",
    icon: "✆",
    hint: "Numara ya da wa.me linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://wa.me/${value.replace(/\D/g, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/wa\.me\//, "").replace(/\/$/, ""),
  },
  facebook: {
    label: "Facebook",
    icon: "f",
    hint: "Kullanıcı adı ya da profil linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://facebook.com/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?facebook\.com\//, "").replace(/\/$/, ""),
  },
  discord: {
    label: "Discord",
    icon: "◎",
    hint: "Davet linki ya da kullanıcı adı",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://discord.gg/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?discord\.(gg|com\/invite)\//, "").replace(/\/$/, ""),
  },
  twitch: {
    label: "Twitch",
    icon: "☰",
    hint: "Kanal adı ya da tam profil linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://twitch.tv/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?twitch\.tv\//, "").replace(/\/$/, ""),
  },
  github: {
    label: "GitHub",
    icon: "⌘",
    hint: "Kullanıcı adı ya da profil linki",
    buildUrl: (value) => (value.startsWith("http") ? value : `https://github.com/${value.replace(/^@/, "")}`),
    cleanValue: (value) => value.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, ""),
  },
};

function readStorage(key, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue !== null) {
      return JSON.parse(rawValue);
    }
  } catch (error) {}

  return key in window.__sojialMemoryStore ? window.__sojialMemoryStore[key] : fallbackValue;
}

function writeStorage(key, value) {
  window.__sojialMemoryStore[key] = value;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {}
}

function createLink(id, platform, value = "#", label = null) {
  const meta = SOCIAL_PLATFORMS[platform];
  return {
    id,
    platform,
    label: label || meta.label,
    url: value,
    icon: meta.icon,
  };
}

function buildDefaultProfile(username = "admin", name = "Demo Admin") {
  return {
    username,
    name,
    avatarLetter: "",
    avatarImage: "",
    title: {
      tr: "Kişisel Bağlantılar",
      en: "Personal Links",
      de: "Persönliche Links",
    },
    bio: {
      tr: `${name} için hazırlanmış sade profil ve bağlantı alanı.`,
      en: `A simple profile and link page prepared for ${name}.`,
      de: `Eine schlichte Profil- und Linkseite für ${name}.`,
    },
    activeLanguage: "tr",
    darkMode: false,
    links: [
      createLink("link-1", "website", `https://sojial.app/${username}`, "Web Sitem"),
      createLink("link-2", "instagram"),
      createLink("link-3", "x"),
      createLink("link-4", "linkedin"),
    ],
  };
}

const defaultProfileData = buildDefaultProfile();

function cloneProfileData(data) {
  return JSON.parse(JSON.stringify(data));
}

function hydrateLinks(links = [], fallbackLinks = defaultProfileData.links) {
  if (!Array.isArray(links) || links.length === 0) {
    return cloneProfileData(fallbackLinks);
  }

  return links.map((link, index) => {
    const platform = SOCIAL_PLATFORMS[link.platform] ? link.platform : "website";
    const meta = SOCIAL_PLATFORMS[platform];
    return {
      id: link.id || `link-${index + 1}`,
      platform,
      label: link.label || meta.label,
      url: link.url || "#",
      icon: link.icon || meta.icon,
    };
  });
}

function mergeProfileData(savedData = {}, fallbackData = defaultProfileData) {
  const merged = cloneProfileData(fallbackData);
  merged.username = savedData.username || merged.username;
  merged.name = savedData.name || merged.name;
  merged.avatarLetter = savedData.avatarLetter || merged.avatarLetter;
  merged.avatarImage = savedData.avatarImage || merged.avatarImage;
  merged.activeLanguage = savedData.activeLanguage || merged.activeLanguage;
  merged.darkMode = typeof savedData.darkMode === "boolean" ? savedData.darkMode : merged.darkMode;

  ["title", "bio"].forEach((field) => {
    if (savedData[field] && typeof savedData[field] === "object") {
      merged[field] = { ...merged[field], ...savedData[field] };
    }
  });

  merged.links = hydrateLinks(savedData.links, fallbackData.links);
  return merged;
}

function loadProfiles() {
  return readStorage(PROFILE_STORAGE_KEY, {});
}

function saveProfiles(profiles) {
  writeStorage(PROFILE_STORAGE_KEY, profiles);
}

function loadProfileDataLocal(username = "admin", name = "Demo Admin") {
  const profiles = loadProfiles();
  const base = buildDefaultProfile(username, name);
  return mergeProfileData(profiles[username], base);
}

function saveProfileDataLocal(username, data, name = "Demo Admin") {
  const profiles = loadProfiles();
  const base = buildDefaultProfile(username, name);
  const merged = mergeProfileData(data, base);
  profiles[username] = merged;
  saveProfiles(profiles);
  return merged;
}

function mapRemoteProfile(remoteProfile, fallbackUsername, fallbackName) {
  const base = buildDefaultProfile(remoteProfile?.username || fallbackUsername, remoteProfile?.display_name || fallbackName);

  if (!remoteProfile) {
    return base;
  }

  const rawLinks = (remoteProfile.profile_links || []).sort((a, b) => a.sort_order - b.sort_order);
  const avatarLink = rawLinks.find((link) => link.platform === "profilePhoto");

  return mergeProfileData(
    {
      username: remoteProfile.username,
      name: remoteProfile.display_name,
      avatarLetter: remoteProfile.avatar_letter,
      avatarImage: avatarLink?.url || "",
      activeLanguage: remoteProfile.active_language,
      darkMode: remoteProfile.dark_mode,
      title: {
        tr: remoteProfile.title_tr,
        en: remoteProfile.title_en,
        de: remoteProfile.title_de,
      },
      bio: {
        tr: remoteProfile.bio_tr,
        en: remoteProfile.bio_en,
        de: remoteProfile.bio_de,
      },
      links: rawLinks
        .filter((link) => link.platform !== "profilePhoto")
        .map((link) => ({
          id: link.id,
          platform: link.platform,
          label: link.label,
          url: link.url,
          icon: link.icon,
        })),
    },
    base
  );
}

async function loadProfileData(username = "admin", name = "Demo Admin") {
  if (window.supabaseService?.isReady()) {
    const remoteProfile = await window.supabaseService.getProfileByUsername(username);
    return mapRemoteProfile(remoteProfile, username, name);
  }

  return loadProfileDataLocal(username, name);
}

async function saveProfileData(username, data, name = "Demo Admin") {
  if (window.supabaseService?.isReady()) {
    const payload = mergeProfileData({ ...data, username }, buildDefaultProfile(username, name));
    const avatarLink = payload.avatarImage
      ? [
          createLink(
            payload.links.some((link) => link.id === "profile-photo") ? "profile-photo" : "profile-photo",
            "profilePhoto",
            payload.avatarImage,
            "Profil Fotoğrafı"
          ),
        ]
      : [];
    payload.links = [...payload.links, ...avatarLink];
    const result = await window.supabaseService.saveProfile(payload);

    if (!result.ok) {
      throw new Error(result.message || "Profil kaydedilemedi.");
    }

    const refreshed = await window.supabaseService.getProfileByUsername(username);
    return mapRemoteProfile(refreshed, username, name);
  }

  return saveProfileDataLocal(username, data, name);
}

window.profileStore = {
  PROFILE_STORAGE_KEY,
  SOCIAL_PLATFORMS,
  buildDefaultProfile,
  createLink,
  defaultProfileData,
  visiblePlatforms: Object.entries(SOCIAL_PLATFORMS).filter(([, meta]) => !meta.hidden),
  loadProfileData,
  saveProfileData,
  loadProfileDataLocal,
  saveProfileDataLocal,
  mergeProfileData,
  readStorage,
  writeStorage,
};
