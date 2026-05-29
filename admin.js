const currentUser = window.authStore.requireAuth();

if (!currentUser) {
  throw new Error("Authentication required");
}

const form = document.querySelector("#editor-form");
const resetButton = document.querySelector("#reset-button");
const addLinkButton = document.querySelector("#add-link-button");
const statusMessage = document.querySelector("#status-message");
const linkEditor = document.querySelector("#link-editor");
const previewCard = document.querySelector("#preview-card");
const logoutButton = document.querySelector("#logout-button");
const sessionName = document.querySelector("#session-name");
const sessionUsername = document.querySelector("#session-username");
const publicRoute = document.querySelector("#public-route");
const copyProfileLinkButton = document.querySelector("#copy-profile-link");
const viewProfileLink = document.querySelector("#view-profile-link");

const platformEntries = Object.entries(window.profileStore.SOCIAL_PLATFORMS);
let profileData = window.profileStore.loadProfileData(currentUser.username, currentUser.name);
let editableLinks = [...profileData.links];

if (sessionName) {
  sessionName.textContent = currentUser.name;
}

if (sessionUsername) {
  sessionUsername.textContent = `@${currentUser.username}`;
}

function getPublicProfileUrl() {
  if (window.location.protocol === "file:") {
    return new URL(`profile.html?u=${currentUser.username}`, window.location.href).href;
  }

  return `${window.location.origin}/${currentUser.username}`;
}

function getDisplayRoute() {
  return `sojial.app/${currentUser.username}`;
}

function deriveAvatarLetter(name) {
  return (name.trim().charAt(0) || currentUser.username.charAt(0) || "A").toUpperCase();
}

function getPlatformMeta(platform) {
  return window.profileStore.SOCIAL_PLATFORMS[platform] || window.profileStore.SOCIAL_PLATFORMS.website;
}

function normalizeSocialUrl(platform, value) {
  const input = value.trim();

  if (!input) {
    return "#";
  }

  return getPlatformMeta(platform).buildUrl(input);
}

function denormalizeSocialValue(platform, value) {
  if (!value || value === "#") {
    return "";
  }

  return getPlatformMeta(platform).cleanValue(value);
}

function updateRouteUI() {
  const displayRoute = getDisplayRoute();
  const profileUrl = getPublicProfileUrl();

  publicRoute.textContent = displayRoute;

  if (viewProfileLink) {
    viewProfileLink.href = profileUrl;
    viewProfileLink.target = "_blank";
    viewProfileLink.rel = "noreferrer";
  }

  const previewAddress = previewCard.querySelector('[data-preview="address"]');
  if (previewAddress) {
    previewAddress.textContent = displayRoute;
  }
}

function createLinkRow(link) {
  const meta = getPlatformMeta(link.platform);
  const row = document.createElement("div");
  row.className = "link-row";
  row.dataset.linkId = link.id;

  const options = platformEntries
    .map(([key, value]) => `<option value="${key}" ${key === link.platform ? "selected" : ""}>${value.icon} ${value.label}</option>`)
    .join("");

  row.innerHTML = `
    <div class="link-badge">
      <span class="icon">${meta.icon}</span>
      <span>${meta.label}</span>
      <span class="link-hint">${meta.hint}</span>
    </div>
    <label class="field">
      <span>Platform / ikon</span>
      <select class="platform-select" data-role="platform">${options}</select>
    </label>
    <label class="field">
      <span>Buton adı</span>
      <input type="text" data-role="label" value="${link.label}" />
    </label>
    <label class="field">
      <span>Kullanıcı adı veya link</span>
      <input
        type="text"
        data-role="url"
        placeholder="${meta.hint}"
        value="${denormalizeSocialValue(link.platform, link.url)}"
      />
    </label>
    <button class="action secondary remove-link-button" data-role="remove" type="button">Sil</button>
  `;

  return row;
}

function buildLinkEditor() {
  linkEditor.innerHTML = "";
  editableLinks.forEach((link) => linkEditor.appendChild(createLinkRow(link)));
}

function syncEditableLinksFromDOM() {
  editableLinks = Array.from(linkEditor.querySelectorAll(".link-row")).map((row, index) => {
    const platform = row.querySelector('[data-role="platform"]').value;
    const label = row.querySelector('[data-role="label"]').value.trim() || getPlatformMeta(platform).label;
    const urlInput = row.querySelector('[data-role="url"]').value;
    const meta = getPlatformMeta(platform);

    return {
      id: row.dataset.linkId || `link-${index + 1}`,
      platform,
      label,
      url: normalizeSocialUrl(platform, urlInput),
      icon: meta.icon,
    };
  });
}

function fillForm() {
  form.elements.name.value = profileData.name;
  form.elements.activeLanguage.value = profileData.activeLanguage;
  form.elements["title-tr"].value = profileData.title.tr;
  form.elements["bio-tr"].value = profileData.bio.tr;
}

function collectFormData() {
  syncEditableLinksFromDOM();

  const name = form.elements.name.value.trim() || currentUser.name;

  return window.profileStore.mergeProfileData(
    {
      name,
      avatarLetter: deriveAvatarLetter(name),
      activeLanguage: form.elements.activeLanguage.value,
      title: {
        tr: form.elements["title-tr"].value.trim() || profileData.title.tr,
      },
      bio: {
        tr: form.elements["bio-tr"].value.trim() || profileData.bio.tr,
      },
      links: editableLinks,
    },
    window.profileStore.buildDefaultProfile(currentUser.username, currentUser.name)
  );
}

function renderPreview(data) {
  previewCard.querySelector('[data-preview="avatar"]').textContent = deriveAvatarLetter(data.name);
  previewCard.querySelector('[data-preview="name"]').textContent = data.name;
  previewCard.querySelector('[data-preview="eyebrow"]').textContent = data.title.tr;
  previewCard.querySelector('[data-preview="bio"]').textContent = data.bio.tr;

  const linksContainer = previewCard.querySelector(".links");
  linksContainer.innerHTML = "";

  data.links.forEach((link) => {
    const element = document.createElement("a");
    element.className = `social-link ${link.platform}`;
    element.href = link.url?.trim() ? link.url : "#";
    element.target = link.url && link.url !== "#" ? "_blank" : "_self";
    element.rel = "noreferrer";
    element.innerHTML = `
      <span class="icon">${link.icon}</span>
      <span class="link-label">${link.label}</span>
    `;
    linksContainer.appendChild(element);
  });

  updateRouteUI();
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function refreshLinkRowMeta(row) {
  const platform = row.querySelector('[data-role="platform"]').value;
  const meta = getPlatformMeta(platform);
  row.querySelector(".icon").textContent = meta.icon;
  row.querySelector(".link-badge span:nth-child(2)").textContent = meta.label;
  row.querySelector(".link-hint").textContent = meta.hint;
  row.querySelector('[data-role="url"]').placeholder = meta.hint;
  if (!row.querySelector('[data-role="label"]').value.trim()) {
    row.querySelector('[data-role="label"]').value = meta.label;
  }
}

form.addEventListener("input", () => {
  renderPreview(collectFormData());
  setStatus("Önizleme güncellendi.");
});

linkEditor.addEventListener("change", (event) => {
  const row = event.target.closest(".link-row");
  if (!row) {
    return;
  }

  if (event.target.dataset.role === "platform") {
    refreshLinkRowMeta(row);
  }

  renderPreview(collectFormData());
});

linkEditor.addEventListener("click", (event) => {
  const button = event.target.closest('[data-role="remove"]');
  if (!button) {
    return;
  }

  const row = button.closest(".link-row");
  row.remove();
  renderPreview(collectFormData());
  setStatus("Bağlantı kaldırıldı.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  profileData = window.profileStore.saveProfileData(currentUser.username, collectFormData(), currentUser.name);
  editableLinks = [...profileData.links];
  buildLinkEditor();
  fillForm();
  renderPreview(profileData);
  setStatus("Profil kaydedildi. Linkin paylaşılmaya hazır.");
});

resetButton.addEventListener("click", () => {
  const defaultData = window.profileStore.buildDefaultProfile(currentUser.username, currentUser.name);
  profileData = window.profileStore.saveProfileData(currentUser.username, defaultData, currentUser.name);
  editableLinks = [...profileData.links];
  buildLinkEditor();
  fillForm();
  renderPreview(profileData);
  setStatus("Varsayılan profil geri yüklendi.");
});

if (addLinkButton) {
  addLinkButton.addEventListener("click", () => {
    editableLinks.push(
      window.profileStore.createLink(`link-${Date.now()}`, "telegram")
    );
    buildLinkEditor();
    renderPreview(collectFormData());
    setStatus("Yeni sosyal bağlantı alanı eklendi.");
  });
}

if (copyProfileLinkButton) {
  copyProfileLinkButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getPublicProfileUrl());
      setStatus("Profil linki panoya kopyalandı.");
    } catch (error) {
      setStatus("Link kopyalanamadı. Tarayıcı izinlerini kontrol et.");
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    window.authStore.clearSession();
    window.location.href = "login.html";
  });
}

editableLinks = [...profileData.links];
buildLinkEditor();
fillForm();
renderPreview(profileData);
