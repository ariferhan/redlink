const managementLink = document.querySelector("#management-link");
const controlPanelLink = document.querySelector("#control-panel-link");
const logoutButton = document.querySelector("#logout-button");
const sessionName = document.querySelector("#session-name");
const sessionUsername = document.querySelector("#session-username");
const blogForm = document.querySelector("#blog-form");
const blogSlugPreview = document.querySelector("#blog-slug-preview");
const blogStatusMessage = document.querySelector("#blog-status-message");
const blogList = document.querySelector("#blog-list");
const blogCoverInput = document.querySelector("#blog-cover-input");
const removeBlogCoverButton = document.querySelector("#remove-blog-cover-button");
const resetBlogFormButton = document.querySelector("#reset-blog-form");
const blogCoverPreview = document.querySelector("#blog-cover-preview");

let currentUser = null;
let blogPosts = [];
let blogCoverImage = "";

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function renderIconMarkup(iconName, size = 18, className = "") {
  return window.sojialIcons?.renderIcon(iconName, { size, className }) || "";
}

function setBlogStatus(message, isError = false) {
  if (!blogStatusMessage) {
    return;
  }

  blogStatusMessage.textContent = message;
  blogStatusMessage.style.color = isError ? "#d64545" : "";
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

function getBlogHref(slug) {
  return `blog.html?slug=${encodeURIComponent(slug)}`;
}

function withSession(pathname) {
  const username = currentUser?.username || "admin";
  return `${pathname}?session=${encodeURIComponent(username)}`;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Görsel okunamadı."));
    reader.readAsDataURL(file);
  });
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
  const rawId = (blogForm.elements.blogId.value || "").trim();

  return window.profileStore.normalizeBlogPost({
    id: isUuid(rawId) ? rawId : undefined,
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
  if (!window.authStore?.canManageBlogs?.(currentUser?.role)) {
    blogPosts = [];
    renderBlogList();
    setBlogStatus("Bu alan için admin veya editör rolü gerekiyor.", true);
    return;
  }

  if (window.supabaseService?.isReady() && window.authStore?.getSession?.()?.mode === "local") {
    setBlogStatus(
      "Demo admin ile eklediğin bloglar yalnızca bu tarayıcıda görünür. Canlıda görünmesi için gerçek admin ya da editör hesabınla giriş yap.",
      true
    );
  } else {
    setBlogStatus("Blog listesi güncellendi.");
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

async function initializeBlogManagement() {
  try {
    currentUser = await window.authStore.requireAuth("login.html");

    if (!currentUser) {
      return;
    }

    if (!window.authStore?.canManageBlogs?.(currentUser.role)) {
      window.location.href = `admin.html?session=${currentUser.username}`;
      return;
    }

    sessionName.textContent = currentUser.name;
    sessionUsername.textContent = `@${currentUser.username}`;

    if (controlPanelLink) {
      controlPanelLink.href = withSession("admin.html");
    }

    if (currentUser.role === "admin" && managementLink) {
      managementLink.href = withSession("yonetim.html");
      managementLink.classList.remove("is-hidden");
    }

    window.sojialIcons?.mount(document);
    await loadBlogsForAdmin();

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
        blogCoverImage = await readImageFile(file);
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

    logoutButton?.addEventListener("click", async () => {
      await window.authStore.clearSession();
      window.location.href = "login.html";
    });
  } catch (error) {
    setBlogStatus(error?.message || "Blog yönetimi yüklenirken bir sorun oluştu.", true);
  } finally {
    document.body.classList.remove("admin-pending");
  }
}

initializeBlogManagement();
