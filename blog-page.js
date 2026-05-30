const blogTitle = document.querySelector("#blog-title");
const blogDate = document.querySelector("#blog-date");
const blogSlug = document.querySelector("#blog-slug");
const blogExcerpt = document.querySelector("#blog-excerpt");
const blogCover = document.querySelector("#blog-cover");
const blogContent = document.querySelector("#blog-content");
const primaryAuthLink = document.querySelector("#primary-auth-link");
const secondaryAuthLink = document.querySelector("#secondary-auth-link");
const logoutAuthButton = document.querySelector("#logout-auth-button");

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

function renderBlog(post) {
  blogTitle.textContent = post.title;
  blogDate.textContent = formatBlogDate(post.publishedAt);
  blogSlug.textContent = `/${post.slug}`;
  blogExcerpt.textContent = post.excerpt || "";
  document.title = `sojial | ${post.title}`;

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

  if (!slug) {
    blogTitle.textContent = "Blog yazısı bulunamadı";
    blogContent.innerHTML = "<p>Geçerli bir blog bağlantısı bulunamadı.</p>";
    return;
  }

  const post = await window.profileStore.getBlogPostBySlug(slug);

  if (!post) {
    blogTitle.textContent = "Blog yazısı bulunamadı";
    blogContent.innerHTML = "<p>Aradığın yazı yayında değil ya da kaldırılmış olabilir.</p>";
    return;
  }

  renderBlog(post);
})();
