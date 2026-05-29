const form = document.querySelector("#editor-form");
const resetButton = document.querySelector("#reset-button");
const statusMessage = document.querySelector("#status-message");
const linkEditor = document.querySelector("#link-editor");
const previewCard = document.querySelector("#preview-card");

let profileData = window.profileStore.loadProfileData();

function buildLinkEditor() {
  linkEditor.innerHTML = "";

  profileData.links.forEach((link) => {
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `
      <div class="link-badge">
        <span class="icon">${link.icon}</span>
        <span>${link.key}</span>
      </div>
      <label class="field">
        <span>Buton Adı</span>
        <input type="text" name="label-${link.key}" value="${link.label}" />
      </label>
      <label class="field">
        <span>Bağlantı Adresi</span>
        <input type="url" name="url-${link.key}" value="${link.url}" />
      </label>
    `;
    linkEditor.appendChild(row);
  });
}

function fillForm() {
  form.elements.name.value = profileData.name;
  form.elements.avatarLetter.value = profileData.avatarLetter;
  form.elements.activeLanguage.value = profileData.activeLanguage;
  form.elements.darkMode.checked = profileData.darkMode;

  ["tr", "en", "de"].forEach((lang) => {
    form.elements[`title-${lang}`].value = profileData.title[lang];
    form.elements[`bio-${lang}`].value = profileData.bio[lang];
    form.elements[`theme-${lang}`].value = profileData.themeLabel[lang];
  });

  profileData.links.forEach((link) => {
    form.elements[`label-${link.key}`].value = link.label;
    form.elements[`url-${link.key}`].value = link.url;
  });
}

function collectFormData() {
  const nextData = window.profileStore.mergeProfileData({
    name: form.elements.name.value.trim() || "Arif",
    avatarLetter: (form.elements.avatarLetter.value.trim() || "A").slice(0, 2),
    activeLanguage: form.elements.activeLanguage.value,
    darkMode: form.elements.darkMode.checked,
    title: {},
    bio: {},
    themeLabel: {},
    links: profileData.links.map((link) => ({
      ...link,
      label: form.elements[`label-${link.key}`].value.trim() || link.label,
      url: form.elements[`url-${link.key}`].value.trim() || "#",
    })),
  });

  ["tr", "en", "de"].forEach((lang) => {
    nextData.title[lang] = form.elements[`title-${lang}`].value.trim() || profileData.title[lang];
    nextData.bio[lang] = form.elements[`bio-${lang}`].value.trim() || profileData.bio[lang];
    nextData.themeLabel[lang] =
      form.elements[`theme-${lang}`].value.trim() || profileData.themeLabel[lang];
  });

  return nextData;
}

function renderPreview(data) {
  const activeLanguage = data.activeLanguage;
  const previewText = {
    eyebrow: data.title[activeLanguage] || data.title.tr,
    bio: data.bio[activeLanguage] || data.bio.tr,
    themeLabel: data.themeLabel[activeLanguage] || data.themeLabel.tr,
  };

  previewCard.querySelector('[data-preview="avatar"]').textContent = data.avatarLetter;
  previewCard.querySelector('[data-preview="name"]').textContent = data.name;
  previewCard.querySelector('[data-preview="eyebrow"]').textContent = previewText.eyebrow;
  previewCard.querySelector('[data-preview="bio"]').textContent = previewText.bio;
  previewCard.querySelector('[data-preview="themeLabel"]').textContent = previewText.themeLabel;

  previewCard.querySelectorAll("[data-preview-link]").forEach((element) => {
    const linkData = data.links.find((link) => link.key === element.dataset.previewLink);
    const label = element.querySelector(".link-label");

    if (!linkData) {
      return;
    }

    label.textContent = linkData.label;
    element.href = linkData.url?.trim() ? linkData.url : "#";
  });

  document.body.classList.toggle("dark", data.darkMode);
  previewCard.querySelectorAll(".locale").forEach((button, index) => {
    const langs = ["tr", "en", "de"];
    button.classList.toggle("is-active", langs[index] === activeLanguage);
  });
}

function setStatus(message) {
  statusMessage.textContent = message;
}

form.addEventListener("input", () => {
  renderPreview(collectFormData());
  setStatus("Değişiklikler önizlemeye yansıtıldı.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  profileData = window.profileStore.saveProfileData(collectFormData());
  fillForm();
  renderPreview(profileData);
  setStatus("Kaydedildi. Profil ekranı bu verileri kullanacak.");
});

resetButton.addEventListener("click", () => {
  profileData = window.profileStore.saveProfileData(window.profileStore.defaultProfileData);
  buildLinkEditor();
  fillForm();
  renderPreview(profileData);
  setStatus("Varsayılan düzen geri yüklendi.");
});

buildLinkEditor();
fillForm();
renderPreview(profileData);
