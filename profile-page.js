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

const username = resolveProfileUsername();
const profileData = window.profileStore.loadProfileData(username, username);
const publicLinks = document.querySelector("#public-links");

document.title = `sojial | ${profileData.name}`;
document.querySelector('[data-public="avatar"]').textContent = profileData.avatarLetter;
document.querySelector('[data-public="eyebrow"]').textContent = profileData.title.tr;
document.querySelector('[data-public="name"]').textContent = profileData.name;
document.querySelector('[data-public="bio"]').textContent = profileData.bio.tr;
document.querySelector('[data-public="address"]').textContent = `sojial.app/${username}`;

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
