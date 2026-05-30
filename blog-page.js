const blogTitle = document.querySelector("#blog-title");
const blogDate = document.querySelector("#blog-date");
const blogSlug = document.querySelector("#blog-slug");
const blogExcerpt = document.querySelector("#blog-excerpt");
const blogCover = document.querySelector("#blog-cover");
const blogContent = document.querySelector("#blog-content");
const primaryAuthLink = document.querySelector("#primary-auth-link");
const secondaryAuthLink = document.querySelector("#secondary-auth-link");
const logoutAuthButton = document.querySelector("#logout-auth-button");
const shareCopyLink = document.querySelector("#share-copy");
const shareWhatsappLink = document.querySelector("#share-whatsapp");
const shareXLink = document.querySelector("#share-x");
const shareLinkedinLink = document.querySelector("#share-linkedin");
const BLOG_CACHE_PREFIX = "sojial-blog-cache";

function formatBlogDate(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getBlogSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || "";
}

function readCachedBlog(slug) {
  try {
    const raw = window.sessionStorage.getItem(`${BLOG_CACHE_PREFIX}:${slug}`);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeCachedBlog(post) {
  try {
    window.sessionStorage.setItem(`${BLOG_CACHE_PREFIX}:${post.slug}`, JSON.stringify(post));
  } catch (error) {}
}

function buildShareUrl(post) {
  const current = new URL(window.location.href);
  current.searchParams.set("slug", post.slug);
  return current.toString();
}

function hydrateShareActions(post) {
  const shareUrl = encodeURIComponent(buildShareUrl(post));
  const shareText = encodeURIComponent(`${post.title} | sojial blog`);

  if (shareWhatsappLink) {
    shareWhatsappLink.href = `https://wa.me/?text=${shareText}%20${shareUrl}`;
  }

  if (shareXLink) {
    shareXLink.href = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  }

  if (shareLinkedinLink) {
    shareLinkedinLink.href = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;
  }

  if (shareCopyLink) {
    shareCopyLink.onclick = async (event) => {
      event.preventDefault();

      try {
        await navigator.clipboard.writeText(buildShareUrl(post));
        shareCopyLink.textContent = "Kld.";
        window.setTimeout(() => {
          shareCopyLink.textContent = "Kp.";
        }, 1400);
      } catch (error) {
        shareCopyLink.textContent = "Hta.";
        window.setTimeout(() => {
          shareCopyLink.textContent = "Kp.";
        }, 1400);
      }
    };
  }
}

function renderBlog(post) {
  blogTitle.textContent = post.title;
  blogDate.textContent = formatBlogDate(post.publishedAt);
  blogSlug.textContent = `/${post.slug}`;
  blogExcerpt.textContent = post.excerpt || "";
  document.title = `sojial | ${post.title}`;
  hydrateShareActions(post);

  if (post.coverImage) {
    blogCover.classList.remove("is-hidden");
    blogCover.innerHTML = `<img src="${post.coverImage}" alt="${post.title} kapak görseli" />`;
  } else {
    blogCover.classList.add("is-hidden");
    blogCover.innerHTML = "";
  }

  const paragraphs = (post.content || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");

  blogContent.innerHTML = paragraphs || "<p>Bu yazı için içerik bulunamadı.</p>";
}

async function hydrateAuthLinks() {
  const currentUser = await window.authStore?.getCurrentUser?.();

  if (currentUser && primaryAuthLink && secondaryAuthLink) {
    primaryAuthLink.textContent = "Profilini görüntüle";
    primaryAuthLink.href = `profile.html?u=${currentUser.username}`;
    secondaryAuthLink.textContent = "Panele dön";
    secondaryAuthLink.href = `admin.html?session=${currentUser.username}`;

    if (logoutAuthButton) {
      logoutAuthButton.classList.remove("is-hidden");
    }
  } else if (logoutAuthButton) {
    logoutAuthButton.classList.add("is-hidden");
  }

  document.body.classList.remove("auth-pending");
  window.sojialIcons?.mount(document);
}

if (logoutAuthButton) {
  logoutAuthButton.addEventListener("click", async () => {
    await window.authStore?.clearSession?.();
    window.location.href = "index.html";
  });
}

(async function initializeBlogPage() {
  await hydrateAuthLinks();
  const slug = getBlogSlug();
  const cachedPost = slug ? readCachedBlog(slug) : null;
  let loadingTimer = null;

  if (!slug) {
    blogTitle.textContent = "Blog yazısı bulunamadı";
    blogContent.innerHTML = "<p>Geçerli bir blog bağlantısı bulunamadı.</p>";
    return;
  }

  if (cachedPost) {
    renderBlog(cachedPost);
  } else {
    loadingTimer = window.setTimeout(() => {
      blogTitle.textContent = "Yazı yükleniyor...";
      blogExcerpt.textContent = "İçerik hazırlanıyor.";
    }, 180);
  }

  const post = await window.profileStore.getBlogPostBySlug(slug);

  if (loadingTimer) {
    window.clearTimeout(loadingTimer);
  }

  if (!post) {
    blogTitle.textContent = "Blog yazısı bulunamadı";
    blogContent.innerHTML = "<p>Aradığın yazı yayında değil ya da kaldırılmış olabilir.</p>";
    return;
  }

  writeCachedBlog(post);
  renderBlog(post);
})();
