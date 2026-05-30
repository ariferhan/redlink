const body = document.body;
const themeToggle = document.querySelector("#theme-toggle");
const composerField = document.querySelector("#composer-field");
const composerModeButton = document.querySelector(".composer-mode");
const composerSubmitButton = document.querySelector(".composer-submit");
const composerModeLabel = composerModeButton?.querySelector("span:nth-child(2)");
const ideaChips = document.querySelectorAll(".idea-chip");
const primaryAuthLink = document.querySelector("#primary-auth-link");
const secondaryAuthLink = document.querySelector("#secondary-auth-link");
const logoutAuthButton = document.querySelector("#logout-auth-button");
const blogRail = document.querySelector("#blog-rail");
const blogEmpty = document.querySelector("#blog-empty");
const blogPrevButton = document.querySelector("#blog-prev");
const blogNextButton = document.querySelector("#blog-next");
const BLOG_CACHE_PREFIX = "sojial-blog-cache";

const THEME_KEY = "sojial-theme";
const DRAFT_KEY = "sojial-composer-draft";
const COMPOSER_MODE_KEY = "sojial-composer-mode";
const composerModes = [
  { id: "discuss", label: "Tartış", icon: "discuss", placeholder: "Düşünceni paylaş, bir sohbet başlat..." },
  { id: "ask", label: "Soru sor", icon: "ask", placeholder: "Sormak istediğin konuyu yaz..." },
  { id: "help", label: "Destek ol", icon: "help", placeholder: "Yardım edebileceğin konuyu yaz..." },
  { id: "explore", label: "Keşfet", icon: "explore", placeholder: "Keşfetmek istediğin alanı yaz..." },
];

function safeRead(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {}
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  body.classList.toggle("is-dark", isDark);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.innerHTML = window.sojialIcons?.renderIcon("sparkles", { size: 18 }) || "";
  }
}

function getComposerMode() {
  const savedMode = safeRead(COMPOSER_MODE_KEY, composerModes[0].id);
  return composerModes.find((mode) => mode.id === savedMode) || composerModes[0];
}

function applyComposerMode(mode) {
  if (composerModeLabel) {
    composerModeLabel.textContent = mode.label;
  }

  const composerBadge = composerModeButton?.querySelector(".composer-badge");
  if (composerBadge) {
    composerBadge.dataset.icon = mode.icon;
    composerBadge.innerHTML = window.sojialIcons?.renderIcon(mode.icon, { size: 16 }) || "";
  }

  if (composerField) {
    composerField.placeholder = mode.placeholder;
  }

  safeWrite(COMPOSER_MODE_KEY, mode.id);
}

function cycleComposerMode() {
  const currentMode = getComposerMode();
  const currentIndex = composerModes.findIndex((mode) => mode.id === currentMode.id);
  const nextMode = composerModes[(currentIndex + 1) % composerModes.length];
  applyComposerMode(nextMode);
}

function submitComposerIntent() {
  if (!composerField) {
    return;
  }

  const draft = composerField?.value.trim() || "";
  const mode = getComposerMode();
  safeWrite(DRAFT_KEY, JSON.stringify({ mode: mode.id, draft }));

  const destination = `register.html${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`;
  window.location.href = destination;
}

function loadTheme() {
  applyTheme(safeRead(THEME_KEY, "light"));
}

function applySignedInActions(user) {
  if (!user || !primaryAuthLink || !secondaryAuthLink) {
    return;
  }

  primaryAuthLink.textContent = "Profilini görüntüle";
  primaryAuthLink.href = `profile.html?u=${user.username}`;

  secondaryAuthLink.textContent = "Panele dön";
  secondaryAuthLink.href = `admin.html?session=${user.username}`;

  if (logoutAuthButton) {
    logoutAuthButton.classList.remove("is-hidden");
  }
}

function hydrateAuthLinksSync() {
  const sessionUser = window.authStore?.getSession?.();
  const hasRemoteAuth = window.supabaseService?.isReady?.();
  const isLocalSession = sessionUser?.mode === "local";

  if (isLocalSession && sessionUser?.username) {
    applySignedInActions(sessionUser);
  }

  if (!hasRemoteAuth || isLocalSession) {
    body.classList.remove("auth-pending");
  }
}

async function hydrateAuthLinks() {
  try {
    const currentUser = await window.authStore?.getCurrentUser?.();

    if (currentUser && primaryAuthLink && secondaryAuthLink) {
      applySignedInActions(currentUser);
    } else if (logoutAuthButton) {
      logoutAuthButton.classList.add("is-hidden");
    }
  } catch (error) {
    if (logoutAuthButton) {
      logoutAuthButton.classList.add("is-hidden");
    }
  }

  body.classList.remove("auth-pending");
  window.sojialIcons?.mount(document);
}

function formatBlogDate(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getBlogHref(slug) {
  return `blog.html?slug=${encodeURIComponent(slug)}`;
}

function cacheBlogPost(post) {
  try {
    window.sessionStorage.setItem(`${BLOG_CACHE_PREFIX}:${post.slug}`, JSON.stringify(post));
  } catch (error) {}
}

function renderBlogCard(post) {
  cacheBlogPost(post);
  const article = document.createElement("article");
  article.className = "blog-card";
  article.innerHTML = `
    <a class="blog-card-link" href="${getBlogHref(post.slug)}">
      <div class="blog-card-media${post.coverImage ? "" : " is-empty"}">
        ${post.coverImage ? `<img src="${post.coverImage}" alt="${post.title} kapak görseli" />` : `<span data-icon="text" data-icon-size="24"></span>`}
      </div>
      <div class="blog-card-copy">
        <div class="blog-card-meta">
          <span class="blog-card-date">${formatBlogDate(post.publishedAt)}</span>
          <span class="blog-card-slug">/${post.slug}</span>
        </div>
        <h3>${post.title}</h3>
        <p>${post.excerpt || "Bu yazıyı okumak için içeri gir."}</p>
      </div>
    </a>
  `;
  return article;
}

function updateBlogSliderButtons() {
  if (!blogRail || !blogPrevButton || !blogNextButton) {
    return;
  }

  const maxScrollLeft = blogRail.scrollWidth - blogRail.clientWidth;
  blogPrevButton.disabled = blogRail.scrollLeft <= 8;
  blogNextButton.disabled = blogRail.scrollLeft >= maxScrollLeft - 8;
}

function getBlogScrollStep() {
  if (!blogRail) {
    return 0;
  }

  const firstCard = blogRail.querySelector(".blog-card");
  if (!firstCard) {
    return Math.round(blogRail.clientWidth * 0.78);
  }

  const gap = parseFloat(window.getComputedStyle(blogRail).columnGap || window.getComputedStyle(blogRail).gap || "0");
  return firstCard.getBoundingClientRect().width + gap;
}

function scrollBlogRail(direction) {
  if (!blogRail) {
    return;
  }

  blogRail.scrollBy({
    left: direction * getBlogScrollStep(),
    behavior: "smooth",
  });
}

function enableBlogRailDrag() {
  if (!blogRail) {
    return;
  }

  let isPointerDown = false;
  let startX = 0;
  let startScrollLeft = 0;

  blogRail.addEventListener("pointerdown", (event) => {
    isPointerDown = true;
    startX = event.clientX;
    startScrollLeft = blogRail.scrollLeft;
    blogRail.classList.add("is-dragging");
    blogRail.setPointerCapture?.(event.pointerId);
  });

  blogRail.addEventListener("pointermove", (event) => {
    if (!isPointerDown) {
      return;
    }

    const delta = event.clientX - startX;
    blogRail.scrollLeft = startScrollLeft - delta;
  });

  const endDrag = (event) => {
    if (!isPointerDown) {
      return;
    }

    isPointerDown = false;
    blogRail.classList.remove("is-dragging");
    if (typeof event?.pointerId !== "undefined") {
      blogRail.releasePointerCapture?.(event.pointerId);
    }
    updateBlogSliderButtons();
  };

  blogRail.addEventListener("pointerup", endDrag);
  blogRail.addEventListener("pointercancel", endDrag);
  blogRail.addEventListener("pointerleave", endDrag);
  blogRail.addEventListener("scroll", updateBlogSliderButtons, { passive: true });

  if (blogPrevButton) {
    blogPrevButton.addEventListener("click", () => scrollBlogRail(-1));
  }

  if (blogNextButton) {
    blogNextButton.addEventListener("click", () => scrollBlogRail(1));
  }
}

async function hydrateBlogs() {
  if (!blogRail) {
    return;
  }

  const posts = await window.profileStore.listPublishedBlogPosts();
  blogRail.innerHTML = "";

  if (!posts.length) {
    blogEmpty?.classList.remove("is-hidden");
    updateBlogSliderButtons();
    return;
  }

  blogEmpty?.classList.add("is-hidden");
  posts.forEach((post) => blogRail.appendChild(renderBlogCard(post)));
  window.sojialIcons?.mount(blogRail);
  updateBlogSliderButtons();
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = body.classList.contains("is-dark") ? "light" : "dark";
    safeWrite(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

if (composerModeButton) {
  composerModeButton.addEventListener("click", cycleComposerMode);
}

if (composerSubmitButton) {
  composerSubmitButton.addEventListener("click", submitComposerIntent);
}

if (composerField) {
  composerField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitComposerIntent();
    }
  });
}

ideaChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    if (!composerField) {
      return;
    }

    composerField.value = chip.textContent.trim();
    composerField.focus();
  });
});

if (logoutAuthButton) {
  logoutAuthButton.addEventListener("click", async () => {
    await window.authStore?.clearSession?.();
    window.location.href = "index.html";
  });
}

loadTheme();
applyComposerMode(getComposerMode());
hydrateAuthLinksSync();
hydrateAuthLinks();
hydrateBlogs();
enableBlogRailDrag();
