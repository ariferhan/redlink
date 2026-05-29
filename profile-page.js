const params = new URLSearchParams(window.location.search);
const username = (params.get("u") || "admin").trim().toLowerCase();
const profileData = window.profileStore.loadProfileData(username, username);

const publicLinks = document.querySelector("#public-links");

document.querySelector('[data-public="avatar"]').textContent = profileData.avatarLetter;
document.querySelector('[data-public="eyebrow"]').textContent = profileData.title.tr;
document.querySelector('[data-public="name"]').textContent = profileData.name;
document.querySelector('[data-public="bio"]').textContent = profileData.bio.tr;
document.querySelector('[data-public="address"]').textContent = `sojial.app/${username}`;

profileData.links.forEach((link) => {
  const element = document.createElement("a");
  element.className = `social-link ${link.key}`;
  element.href = link.url || "#";
  element.target = link.url && link.url !== "#" ? "_blank" : "_self";
  element.rel = "noreferrer";
  element.innerHTML = `
    <span class="icon">${link.icon}</span>
    <span class="link-label">${link.label}</span>
  `;
  publicLinks.appendChild(element);
});
