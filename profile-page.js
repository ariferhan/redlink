const PUBLIC_CACHE_PREFIX = "sojial-public-cache";

function resolveProfileUsername() {
  const params = new URLSearchParams(window.location.search);
  const queryUsername = (params.get("u") || "").trim().toLowerCase();

  if (queryUsername) {
    return queryUsername;
  }

  if (window.location.protocol === "file:") {
    return "admin";
  }

  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const reserved = new Set([
    "",
    "index.html",
    "login.html",
    "register.html",
    "admin.html",
    "profile.html",
  ]);

  if (!reserved.has(path)) {
    return path.toLowerCase();
  }

  return "admin";
}

function deriveInitials(name = "", fallback = "A") {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return fallback.slice(0, 2).toUpperCase();
}

function getCacheKey(username) {
  return `${PUBLIC_CACHE_PREFIX}:${username}`;
}

function readCachedProfile(username) {
  try {
    const raw = window.sessionStorage.getItem(getCacheKey(username));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeCachedProfile(username, profileData) {
  try {
    window.sessionStorage.setItem(getCacheKey(username), JSON.stringify(profileData));
  } catch (error) {}
}

function renderPublicAvatar(profileData, username) {
  const avatarElement = document.querySelector('[data-public="avatar"]');
  avatarElement.classList.remove("has-image");
  avatarElement.innerHTML = "";

  if (profileData.avatarImage) {
    const image = document.createElement("img");
    image.src = profileData.avatarImage;
    image.alt = `${profileData.name} profil fotoğrafı`;
    image.loading = "eager";
    avatarElement.appendChild(image);
    avatarElement.classList.add("has-image");
    return;
  }

  avatarElement.textContent = deriveInitials(profileData.name, username);
}

function renderProfile(profileData, username) {
  const activeLanguage = profileData.activeLanguage || "tr";
  const publicLinks = document.querySelector("#public-links");

  document.title = `sojial | ${profileData.name}`;
  renderPublicAvatar(profileData, username);
  document.querySelector('[data-public="eyebrow"]').textContent = profileData.title[activeLanguage] || profileData.title.tr;
  document.querySelector('[data-public="name"]').textContent = profileData.name;
  document.querySelector('[data-public="bio"]').textContent = profileData.bio[activeLanguage] || profileData.bio.tr;
  document.querySelector('[data-public="address"]').textContent = `sojial.app/${username}`;

  publicLinks.innerHTML = "";

  profileData.links.forEach((link) => {
    const element = document.createElement("a");
    element.className = `social-link ${link.platform}`;
    element.href = link.url || "#";
    element.target = link.url && link.url !== "#" ? "_blank" : "_self";
    element.rel = "noreferrer";
    element.innerHTML = `
      <span class="icon">${window.sojialIcons?.renderIcon(link.icon, { size: 18 }) || ""}</span>
      <span class="link-label">${link.label}</span>
    `;
    publicLinks.appendChild(element);
  });

  document.body.classList.remove("profile-pending");
}

function showProfileError() {
  document.querySelector('[data-public="eyebrow"]').textContent = "Profil bulunamadı";
  document.querySelector('[data-public="name"]').textContent = "Bu bağlantı hazır değil";
  document.querySelector('[data-public="bio"]').textContent =
    "Paylaşılacak profil henüz yayınlanmamış olabilir ya da kullanıcı adı yanlış yazılmış olabilir.";
  document.querySelector('[data-public="address"]').textContent = "sojial.app";
  document.querySelector("#public-links").innerHTML = "";
  document.body.classList.remove("profile-pending");
}

async function initializePublicProfile() {
  const username = resolveProfileUsername();
  const cachedProfile = readCachedProfile(username);

  if (cachedProfile) {
    renderProfile(cachedProfile, username);
  }

  const profileData = await window.profileStore.loadPublicProfileData(username, username);

  if (!profileData) {
    if (!cachedProfile) {
      showProfileError();
    }
    return;
  }

  writeCachedProfile(username, profileData);
  renderProfile(profileData, username);
}

initializePublicProfile();
