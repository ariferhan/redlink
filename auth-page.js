const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const authMessage = document.querySelector("#auth-message");
const params = new URLSearchParams(window.location.search);
const draftHint = document.querySelector("#draft-hint");
const authSwitch = document.querySelector(".auth-switch");
let isRedirecting = false;

function setMessage(message, isError = false) {
  if (!authMessage) {
    return;
  }

  authMessage.textContent = message;
  authMessage.style.color = isError ? "#d64545" : "var(--muted)";
}

function revealAuthPage() {
  document.body.classList.remove("auth-page-pending");
}

function redirectTo(url) {
  isRedirecting = true;
  revealAuthPage();
  window.location.href = url;
}

async function bootAuthPage() {
  try {
    const currentUser = await window.authStore.getCurrentUser();

    if (currentUser) {
      setMessage("Zaten giriş yaptın. İstersen doğrudan kontrol paneline dönebilirsin.");
      if (authSwitch) {
        authSwitch.innerHTML = `Kontrol paneline dönmek için <a href="admin.html?session=${currentUser.username}">buraya tıkla</a>.`;
      }
      const primaryTopbarAction = document.querySelector(".topbar-actions .pill-button.solid");
      if (primaryTopbarAction) {
        primaryTopbarAction.textContent = "Panele dön";
        primaryTopbarAction.href = `admin.html?session=${currentUser.username}`;
      }
      return;
    }

    const draftFromQuery = params.get("draft");

    if (draftHint && draftFromQuery) {
      draftHint.hidden = false;
      draftHint.textContent = `Başlamak istediğin konu: "${draftFromQuery}"`;
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const identifier = loginForm.elements.identifier.value;
        const password = loginForm.elements.password.value;
        const result = await window.authStore.loginUser(identifier, password);

        if (!result.ok) {
          setMessage(result.message, true);
          return;
        }

        setMessage("Giriş başarılı, panele yönlendiriliyorsun.");
        redirectTo(`admin.html?session=${result.user.username}`);
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const result = await window.authStore.requestSignupCode({
          name: registerForm.elements.name.value,
          email: registerForm.elements.email.value,
          username: registerForm.elements.username.value,
          password: registerForm.elements.password.value,
        });

        if (!result.ok) {
          setMessage(result.message, true);
          return;
        }

        setMessage("Kod gönderildi. Şimdi e-postandaki doğrulama kodunu gir.");
        const verifyUrl = `verify.html?mode=signup&email=${encodeURIComponent(
          registerForm.elements.email.value.trim()
        )}&username=${encodeURIComponent(registerForm.elements.username.value.trim())}`;
        window.setTimeout(() => {
          redirectTo(verifyUrl);
        }, 700);
      });
    }

    const queryUsername = params.get("username");
    const queryPassword = params.get("password");

    if (queryUsername && queryPassword) {
      const result = await window.authStore.loginUser(queryUsername, queryPassword);

      if (result.ok) {
        redirectTo(`admin.html?session=${result.user.username}`);
        return;
      }

      setMessage(result.message, true);
    }
  } catch (error) {
    setMessage(error?.message || "Giriş ekranı hazırlanırken bir sorun oluştu. Sayfayı yenileyip tekrar dene.", true);
  } finally {
    if (!isRedirecting) {
      revealAuthPage();
    }
  }
}

window.setTimeout(revealAuthPage, 1200);
bootAuthPage();
