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
const previewLocaleButtons = document.querySelectorAll(".preview-locales .locale");
const downloadQrButton = document.querySelector("#download-qr-button");
const managementLink = document.querySelector("#management-link");
const avatarUploadInput = document.querySelector("#avatar-upload-input");
const removeAvatarButton = document.querySelector("#remove-avatar-button");
const settingsAvatar = document.querySelector('[data-settings="avatar"]');
const blogAdminCard = document.querySelector("#blog-admin-card");
const blogForm = document.querySelector("#blog-form");
const blogSlugPreview = document.querySelector("#blog-slug-preview");
const blogStatusMessage = document.querySelector("#blog-status-message");
const blogList = document.querySelector("#blog-list");
const blogCoverInput = document.querySelector("#blog-cover-input");
const removeBlogCoverButton = document.querySelector("#remove-blog-cover-button");
const resetBlogFormButton = document.querySelector("#reset-blog-form");
const blogCoverPreview = document.querySelector("#blog-cover-preview");

const platformEntries = window.profileStore.visiblePlatforms;
let currentUser = null;
let profileData = null;
let editableLinks = [];
let avatarImage = "";
let blogPosts = [];
let blogCoverImage = "";

function renderIconMarkup(iconName, size = 18, className = "") {
  return window.sojialIcons?.renderIcon(iconName, { size, className }) || "";
}

function isAdminUser() {
  return currentUser?.role === "admin";
}

function canManageBlogs() {
  return window.authStore?.canManageBlogs?.(currentUser?.role);
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

function getBlogHref(slug) {
  return `blog.html?slug=${encodeURIComponent(slug)}`;
}

function formatBlogDate(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatBlogDateForInput(date) {
  const value = new Date(date);
  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
}

function deriveInitials(name, fallback = currentUser?.username || "AA") {
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

function getPlatformMeta(platform) {
  return window.profileStore.SOCIAL_PLATFORMS[platform] || window.profileStore.SOCIAL_PLATFORMS.website;
}

function normalizeSocialUrl(platform, value) {
  const input = value.trim();
  if (!input) return "#";
  return getPlatformMeta(platform).buildUrl(input);
}

function denormalizeSocialValue(platform, value) {
  if (!value || value === "#") return "";
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
    .map(([key, value]) => `<option value="${key}" ${key === link.platform ? "selected" : ""}>${value.label}</option>`)
    .join("");

  row.innerHTML = `
    <div class="link-badge">
      <span class="icon">${renderIconMarkup(meta.icon, 18)}</span>
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
  form.elements.accountEmail.value = currentUser.email || "";
  form.elements.accountUsername.value = currentUser.username;
  form.elements.currentPassword.value = "";
  form.elements.activeLanguage.value = profileData.activeLanguage;
  form.elements["title-tr"].value = profileData.title.tr;
  form.elements["bio-tr"].value = profileData.bio.tr;
  avatarImage = profileData.avatarImage || "";
  renderAvatarPreview(profileData.name);
}

function collectFormData() {
  syncEditableLinksFromDOM();
  const name = form.elements.name.value.trim() || currentUser.name;
  const username = window.authStore.sanitizeUsername(form.elements.accountUsername.value) || currentUser.username;

  return window.profileStore.mergeProfileData(
    {
      username,
      name,
      avatarLetter: deriveInitials(name, username),
      avatarImage,
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

function renderAvatarInto(element, data) {
  element.classList.remove("has-image");
  element.innerHTML = "";

  if (data.avatarImage) {
    const image = document.createElement("img");
    image.src = data.avatarImage;
    image.alt = `${data.name} profil fotoğrafı`;
    element.appendChild(image);
    element.classList.add("has-image");
    return;
  }

  element.textContent = deriveInitials(data.name, data.username || currentUser.username);
}

function renderAvatarPreview(name) {
  const draft = {
    name,
    username: form?.elements.accountUsername?.value?.trim() || currentUser?.username || "",
    avatarImage,
  };

  if (settingsAvatar) {
    renderAvatarInto(settingsAvatar, draft);
  }

  const previewAvatar = previewCard.querySelector('[data-preview="avatar"]');
  if (previewAvatar) {
    renderAvatarInto(previewAvatar, draft);
  }
}

function renderPreview(data) {
  renderAvatarInto(previewCard.querySelector('[data-preview="avatar"]'), data);
  previewCard.querySelector('[data-preview="name"]').textContent = data.name;
  const activeLanguage = data.activeLanguage || "tr";
  previewCard.querySelector('[data-preview="eyebrow"]').textContent = data.title[activeLanguage] || data.title.tr;
  previewCard.querySelector('[data-preview="bio"]').textContent = data.bio[activeLanguage] || data.bio.tr;

  const linksContainer = previewCard.querySelector(".links");
  linksContainer.innerHTML = "";

  data.links.forEach((link) => {
    const element = document.createElement("a");
    element.className = `social-link ${link.platform}`;
    element.href = link.url?.trim() ? link.url : "#";
    element.target = link.url && link.url !== "#" ? "_blank" : "_self";
    element.rel = "noreferrer";
    element.innerHTML = `
      <span class="icon">${renderIconMarkup(link.icon, 18)}</span>
      <span class="link-label">${link.label}</span>
    `;
    linksContainer.appendChild(element);
  });

  previewLocaleButtons.forEach((button, index) => {
    const langs = ["tr", "en", "de"];
    button.classList.toggle("is-active", langs[index] === activeLanguage);
  });

  updateRouteUI();
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#d64545" : "";
}

function refreshLinkRowMeta(row) {
  const platform = row.querySelector('[data-role="platform"]').value;
  const meta = getPlatformMeta(platform);
  row.querySelector(".icon").innerHTML = renderIconMarkup(meta.icon, 18);
  row.querySelector(".link-badge span:nth-child(2)").textContent = meta.label;
  row.querySelector(".link-hint").textContent = meta.hint;
  row.querySelector('[data-role="url"]').placeholder = meta.hint;
  if (!row.querySelector('[data-role="label"]').value.trim()) {
    row.querySelector('[data-role="label"]').value = meta.label;
  }
}

async function saveProfile() {
  try {
    const draftData = collectFormData();
    const accountResult = await window.authStore.updateAccountSettings({
      currentUsername: currentUser.username,
      email: form.elements.accountEmail.value,
      username: draftData.username,
      name: draftData.name,
      currentPassword: form.elements.currentPassword.value,
    });

    if (!accountResult.ok) {
      setStatus(accountResult.message, true);
      return;
    }

    currentUser = accountResult.user;
    profileData = await window.profileStore.saveProfileData(currentUser.username, draftData, currentUser.name);
    editableLinks = [...profileData.links];
    buildLinkEditor();
    fillForm();
    if (sessionName) sessionName.textContent = currentUser.name;
    if (sessionUsername) sessionUsername.textContent = `@${currentUser.username}`;
    form.elements.currentPassword.value = "";
    window.history.replaceState({}, "", `admin.html?session=${currentUser.username}`);
    renderPreview(profileData);
    setStatus(
      accountResult.emailChanged
        ? "Profil kaydedildi. E-posta değişikliği yaptıysan onay mailini de kontrol et."
        : "Profil kaydedildi. Linkin paylaşılmaya hazır."
    );
  } catch (error) {
    setStatus(error.message || "Profil kaydedilemedi.", true);
  }
}

async function downloadQrSvg() {
  try {
    if (!window.sojialQr?.toSvg) {
      throw new Error("QR aracı hazır değil.");
    }

    const svgMarkup = await window.sojialQr.toSvg(getPublicProfileUrl());
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${currentUser.username}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setStatus("QR kodu SVG olarak indirildi.");
  } catch (error) {
    setStatus("QR kodu oluşturulamadı.", true);
  }
}

function readAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Fotoğraf okunamadı."));
    reader.readAsDataURL(file);
  });
}

function setBlogStatus(message, isError = false) {
  if (!blogStatusMessage) {
    return;
  }

  blogStatusMessage.textContent = message;
  blogStatusMessage.style.color = isError ? "#d64545" : "";
}

function renderBlogCoverPreview() {
  if (!blogCoverPreview) {
    return;
  }

  if (blogCoverImage) {
    blogCoverPreview.classList.remove("is-empty");
    blogCoverPreview.innerHTML = `<img src="${blogCoverImage}" alt="Blog kapak önizlemesi" />`;
    return;
  }

  blogCoverPreview.classList.add("is-empty");
  blogCoverPreview.innerHTML = renderIconMarkup("image", 26);
}

function updateBlogSlugPreview() {
  if (!blogForm || !blogSlugPreview) {
    return;
  }

  const title = blogForm.elements.blogTitle.value.trim();
  const slug = window.profileStore.slugifyBlogTitle(title) || "blog-basligi";
  blogSlugPreview.textContent = `/${slug}`;
}

function resetBlogForm(post = null) {
  if (!blogForm) {
    return;
  }

  blogForm.reset();
  blogForm.elements.blogId.value = post?.id || "";
  blogForm.elements.blogTitle.value = post?.title || "";
  blogForm.elements.blogPublishedAt.value = post?.publishedAt ? formatBlogDateForInput(post.publishedAt) : formatBlogDateForInput(new Date().toISOString());
  blogForm.elements.blogExcerpt.value = post?.excerpt || "";
  blogForm.elements.blogContent.value = post?.content || "";
  blogForm.elements.blogPublished.checked = post ? post.isPublished !== false : true;
  blogCoverImage = post?.coverImage || "";

  if (blogCoverInput) {
    blogCoverInput.value = "";
  }

  renderBlogCoverPreview();
  updateBlogSlugPreview();
}

function renderBlogList() {
  if (!blogList) {
    return;
  }

  if (!blogPosts.length) {
    blogList.innerHTML = `<p class="blog-list-empty">Henüz kayıtlı blog yazısı yok.</p>`;
    return;
  }

  blogList.innerHTML = blogPosts
    .map(
      (post) => `
        <article class="blog-list-item" data-blog-id="${post.id}">
          <div class="blog-list-item-cover${post.coverImage ? "" : " is-empty"}">
            ${post.coverImage ? `<img src="${post.coverImage}" alt="${post.title} kapak görseli" />` : renderIconMarkup("text", 20)}
          </div>
          <div class="blog-list-item-copy">
            <div class="blog-list-item-meta">
              <span>${formatBlogDate(post.publishedAt)}</span>
              <span>/${post.slug}</span>
            </div>
            <h3>${post.title}</h3>
            <p>${post.excerpt || "Kısa özet eklenmedi."}</p>
          </div>
          <div class="blog-list-item-actions">
            <a class="action secondary" href="${getBlogHref(post.slug)}" target="_blank" rel="noreferrer">Aç</a>
            <button class="action secondary" type="button" data-role="edit-blog">Düzenle</button>
            <button class="action secondary danger" type="button" data-role="delete-blog">Sil</button>
          </div>
        </article>
      `
    )
    .join("");

  window.sojialIcons?.mount(blogList);
}

function collectBlogFormData() {
  const title = blogForm.elements.blogTitle.value.trim();
  const excerpt = blogForm.elements.blogExcerpt.value.trim();
  const content = blogForm.elements.blogContent.value.trim();

  return window.profileStore.normalizeBlogPost({
    id: blogForm.elements.blogId.value || undefined,
    title,
    slug: window.profileStore.slugifyBlogTitle(title),
    excerpt,
    content,
    coverImage: blogCoverImage,
    publishedAt: new Date(blogForm.elements.blogPublishedAt.value || new Date().toISOString()).toISOString(),
    isPublished: blogForm.elements.blogPublished.checked,
    authorUsername: currentUser.username,
  });
}

async function loadBlogsForAdmin() {
  if (!canManageBlogs()) {
    return;
  }

  blogPosts = await window.profileStore.listAdminBlogPosts();
  renderBlogList();
  resetBlogForm();
}

async function saveBlogPost() {
  try {
    const draft = collectBlogFormData();

    if (!draft.title || !draft.content) {
      setBlogStatus("Blog başlığı ve içerik zorunlu.", true);
      return;
    }

    const savedPost = await window.profileStore.saveBlogPost(draft);
    blogPosts = await window.profileStore.listAdminBlogPosts();
    renderBlogList();
    resetBlogForm(savedPost);
    setBlogStatus("Blog yazısı kaydedildi.");
  } catch (error) {
    setBlogStatus(error.message || "Blog kaydedilemedi.", true);
  }
}

async function initializeAdmin() {
  try {
    currentUser = await window.authStore.requireAuth();

    if (!currentUser) {
      return;
    }

    profileData = await window.profileStore.loadProfileData(currentUser.username, currentUser.name);
    editableLinks = [...profileData.links];

    if (sessionName) sessionName.textContent = currentUser.name;
    if (sessionUsername) sessionUsername.textContent = `@${currentUser.username}`;
    if (managementLink && isAdminUser()) {
      managementLink.classList.remove("is-hidden");
    }

    buildLinkEditor();
    fillForm();
    renderPreview(profileData);
    window.sojialIcons?.mount(document);

    if (canManageBlogs()) {
      blogAdminCard?.classList.remove("is-hidden");
      await loadBlogsForAdmin();
    }

    form.addEventListener("input", () => {
      renderAvatarPreview(form.elements.name.value.trim() || currentUser.name);
      renderPreview(collectFormData());
      setStatus("Önizleme güncellendi.");
    });

    previewLocaleButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        const langs = ["tr", "en", "de"];
        form.elements.activeLanguage.value = langs[index];
        renderPreview(collectFormData());
        setStatus("Birincil dil güncellendi.");
      });
    });

    linkEditor.addEventListener("change", (event) => {
      const row = event.target.closest(".link-row");
      if (!row) return;
      if (event.target.dataset.role === "platform") {
        refreshLinkRowMeta(row);
      }
      renderPreview(collectFormData());
    });

    linkEditor.addEventListener("click", (event) => {
      const button = event.target.closest('[data-role="remove"]');
      if (!button) return;
      button.closest(".link-row").remove();
      renderPreview(collectFormData());
      setStatus("Bağlantı kaldırıldı.");
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveProfile();
    });

    resetButton.addEventListener("click", async () => {
      const defaultData = window.profileStore.buildDefaultProfile(currentUser.username, currentUser.name);
      profileData = await window.profileStore.saveProfileData(currentUser.username, defaultData, currentUser.name);
      editableLinks = [...profileData.links];
      buildLinkEditor();
      fillForm();
      renderPreview(profileData);
      setStatus("Varsayılan profil geri yüklendi.");
    });

    addLinkButton.addEventListener("click", () => {
      editableLinks.push(window.profileStore.createLink(`link-${Date.now()}`, "telegram"));
      buildLinkEditor();
      renderPreview(collectFormData());
      setStatus("Yeni sosyal bağlantı alanı eklendi.");
    });

    downloadQrButton?.addEventListener("click", downloadQrSvg);

    copyProfileLinkButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(getPublicProfileUrl());
        setStatus("Profil linki panoya kopyalandı.");
      } catch (error) {
        setStatus("Link kopyalanamadı. Tarayıcı izinlerini kontrol et.", true);
      }
    });

    logoutButton.addEventListener("click", async () => {
      await window.authStore.clearSession();
      window.location.href = "login.html";
    });

    avatarUploadInput?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setStatus("Sadece görsel dosyaları yükleyebilirsin.", true);
        return;
      }

      try {
        avatarImage = await readAvatarFile(file);
        renderPreview(collectFormData());
        renderAvatarPreview(form.elements.name.value.trim() || currentUser.name);
        setStatus("Profil fotoğrafı önizlemeye eklendi.");
      } catch (error) {
        setStatus(error.message || "Fotoğraf yüklenemedi.", true);
      }
    });

    removeAvatarButton?.addEventListener("click", () => {
      avatarImage = "";
      if (avatarUploadInput) {
        avatarUploadInput.value = "";
      }
      renderPreview(collectFormData());
      renderAvatarPreview(form.elements.name.value.trim() || currentUser.name);
      setStatus("Profil fotoğrafı kaldırıldı. Baş harfler gösterilecek.");
    });

    blogForm?.addEventListener("input", (event) => {
      if (event.target.name === "blogTitle") {
        updateBlogSlugPreview();
      }
    });

    blogForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveBlogPost();
    });

    resetBlogFormButton?.addEventListener("click", () => {
      resetBlogForm();
      setBlogStatus("Yeni blog taslağı hazır.");
    });

    blogCoverInput?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setBlogStatus("Sadece görsel dosyaları yükleyebilirsin.", true);
        return;
      }

      try {
        blogCoverImage = await readAvatarFile(file);
        renderBlogCoverPreview();
        setBlogStatus("Blog görseli eklendi.");
      } catch (error) {
        setBlogStatus(error.message || "Görsel yüklenemedi.", true);
      }
    });

    removeBlogCoverButton?.addEventListener("click", () => {
      blogCoverImage = "";
      if (blogCoverInput) {
        blogCoverInput.value = "";
      }
      renderBlogCoverPreview();
      setBlogStatus("Blog görseli kaldırıldı.");
    });

    blogList?.addEventListener("click", async (event) => {
      const item = event.target.closest(".blog-list-item");
      if (!item) {
        return;
      }

      const targetId = item.dataset.blogId;

      if (event.target.closest('[data-role="edit-blog"]')) {
        const targetPost = blogPosts.find((post) => post.id === targetId);
        if (targetPost) {
          resetBlogForm(targetPost);
          setBlogStatus("Blog yazısı düzenlemeye açıldı.");
        }
        return;
      }

      if (event.target.closest('[data-role="delete-blog"]')) {
        try {
          await window.profileStore.deleteBlogPost(targetId);
          blogPosts = await window.profileStore.listAdminBlogPosts();
          renderBlogList();
          resetBlogForm();
          setBlogStatus("Blog yazısı kaldırıldı.");
        } catch (error) {
          setBlogStatus(error.message || "Blog yazısı kaldırılamadı.", true);
        }
      }
    });
  } catch (error) {
    setStatus(error?.message || "Kontrol paneli yüklenirken bir sorun oluştu.", true);
  } finally {
    document.body.classList.remove("admin-pending");
  }
}

initializeAdmin();
