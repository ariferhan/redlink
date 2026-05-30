const managementStatus = document.querySelector("#management-status");
const accountDirectory = document.querySelector("#account-directory");
const refreshUsersButton = document.querySelector("#refresh-users-button");
const logoutButton = document.querySelector("#logout-button");
const sessionName = document.querySelector("#session-name");
const sessionUsername = document.querySelector("#session-username");
const statsTotal = document.querySelector("#stats-total");
const statsSubtitle = document.querySelector("#stats-subtitle");
const statsAdmin = document.querySelector("#stats-admin");
const statsEditor = document.querySelector("#stats-editor");
const statsMember = document.querySelector("#stats-member");

let currentUser = null;
let managedUsers = [];

function formatDate(value) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function setStatus(message, isError = false) {
  managementStatus.textContent = message;
  managementStatus.style.color = isError ? "#d64545" : "";
}

function renderStats() {
  const counts = managedUsers.reduce(
    (accumulator, user) => {
      accumulator.total += 1;
      accumulator[user.role] += 1;
      return accumulator;
    },
    { total: 0, admin: 0, editor: 0, member: 0 }
  );

  statsTotal.textContent = String(counts.total);
  statsAdmin.textContent = String(counts.admin);
  statsEditor.textContent = String(counts.editor);
  statsMember.textContent = String(counts.member);
  statsSubtitle.textContent = counts.total
    ? "Sojial ekosistemindeki kayıtlı kullanıcılar ve yetkileri."
    : "Sistemde kayıtlı kullanıcı bulunmuyor.";
}

function renderUsers() {
  if (!managedUsers.length) {
    accountDirectory.innerHTML = `
      <div class="account-empty">
        <span class="account-empty-icon">${window.sojialIcons?.renderIcon("users", { size: 22 }) || ""}</span>
        <p>Henüz görüntülenecek kayıtlı kullanıcı yok.</p>
      </div>
    `;
    window.sojialIcons?.mount(accountDirectory);
    renderStats();
    return;
  }

  accountDirectory.innerHTML = managedUsers
    .map(
      (user) => `
        <article class="account-card" data-user-id="${user.id}">
          <div class="account-card-head">
            <div>
              <div class="account-card-title">
                <strong>${user.name}</strong>
                <span class="role-pill role-${user.role}">${user.role}</span>
              </div>
              <p class="account-card-subtitle">@${user.username}</p>
            </div>
            <p class="account-card-date">${formatDate(user.createdAt)}</p>
          </div>

          <dl class="account-meta">
            <div>
              <dt>E-posta</dt>
              <dd>${user.email || "-"}</dd>
            </div>
            <div>
              <dt>Kayıt tarihi</dt>
              <dd>${formatDate(user.createdAt)}</dd>
            </div>
          </dl>

          <div class="account-actions">
            <label class="field role-field">
              <span>Rol</span>
              <select data-role-select>
                ${window.authStore.MANAGEABLE_ROLES.map(
                  (role) => `<option value="${role}" ${role === user.role ? "selected" : ""}>${role}</option>`
                ).join("")}
              </select>
            </label>
            <button class="action secondary" type="button" data-save-role>Rolü kaydet</button>
          </div>
        </article>
      `
    )
    .join("");

  renderStats();
}

async function loadManagedUsers() {
  const result = await window.authStore.listManagedUsers();

  if (!result.ok) {
    managedUsers = [];
    renderUsers();
    setStatus(result.message || "Kullanıcı listesi yüklenemedi.", true);
    return;
  }

  managedUsers = result.users || [];
  renderUsers();
  setStatus("Kullanıcı listesi güncellendi.");
}

async function saveRole(userId, role) {
  const result = await window.authStore.updateManagedUserRole(userId, role);

  if (!result.ok) {
    setStatus(result.message || "Rol güncellenemedi.", true);
    return;
  }

  await loadManagedUsers();
  setStatus("Rol güncellendi.");
}

async function initializeManagementPage() {
  currentUser = await window.authStore.requireAuth("login.html");

  if (!currentUser) {
    return;
  }

  if (currentUser.role !== "admin") {
    window.location.href = `admin.html?session=${currentUser.username}`;
    return;
  }

  sessionName.textContent = currentUser.name;
  sessionUsername.textContent = `@${currentUser.username}`;

  await loadManagedUsers();
  if (window.supabaseService?.isReady() && window.authStore?.getSession?.()?.mode === "local") {
    setStatus(
      "Şu an demo admin oturumundasın. Gerçek kayıtlı kullanıcıları ve e-posta adreslerini görmek için admin rolü verilmiş gerçek hesabınla giriş yap.",
      true
    );
  }
  document.body.classList.remove("admin-pending");

  refreshUsersButton?.addEventListener("click", loadManagedUsers);

  accountDirectory?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-role]");

    if (!button) {
      return;
    }

    const card = button.closest("[data-user-id]");
    const select = card?.querySelector("[data-role-select]");

    if (!card || !select) {
      return;
    }

    await saveRole(card.dataset.userId, select.value);
  });

  logoutButton?.addEventListener("click", async () => {
    await window.authStore.clearSession();
    window.location.href = "login.html";
  });

  window.sojialIcons?.mount(document);
}

initializeManagementPage();
