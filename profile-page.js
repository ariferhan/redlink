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

function renderPublicAvatar(profileData, username) {
  const avatarElement = document.querySelector('[data-public="avatar"]');
  avatarElement.classList.remove("has-image");
  avatarElement.innerHTML = "";

  if (profileData.avatarImage) {
    const image = document.createElement("img");
    image.src = profileData.avatarImage;
    image.alt = `${profileData.name} profil fotoğrafı`;
    avatarElement.appendChild(image);
    avatarElement.classList.add("has-image");
    return;
  }

  avatarElement.textContent = deriveInitials(profileData.name, username);
}

async function initializePublicProfile() {
  const username = resolveProfileUsername();
  const publicLinks = document.querySelector("#public-links");
  const profileData = await window.profileStore.loadProfileData(username, username);
  const activeLanguage = profileData.activeLanguage || "tr";

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
      <span class="icon">${link.icon}</span>
      <span class="link-label">${link.label}</span>
    `;
    publicLinks.appendChild(element);
  });
}

initializePublicProfile();
