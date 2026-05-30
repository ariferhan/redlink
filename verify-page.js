const verifyForm = document.querySelector("#verify-form");
const verifyMessage = document.querySelector("#verify-message");
const verifyEmail = document.querySelector("#verify-email");
const verifyModeLabel = document.querySelector("#verify-mode-label");
const resendButton = document.querySelector("#resend-code-button");
const verifySignupFallback = document.querySelector("#verify-signup-fallback");
const params = new URLSearchParams(window.location.search);
const authSwitch = document.querySelector(".auth-switch");
let isRedirecting = false;

function setVerifyMessage(message, isError = false) {
  if (!verifyMessage) {
    return;
  }

  verifyMessage.textContent = message;
  verifyMessage.style.color = isError ? "#d64545" : "var(--muted)";
}

function revealVerifyPage() {
  document.body.classList.remove("auth-page-pending");
}

function redirectTo(url) {
  isRedirecting = true;
  revealVerifyPage();
  window.location.href = url;
}

function getVerifyContext() {
  return {
    email: (params.get("email") || "").trim(),
    username: (params.get("username") || "").trim(),
    mode: params.get("mode") === "signup" ? "signup" : "login",
  };
}

function getSignupFallbackValues(context) {
  return {
    name:
      verifyForm?.elements.name?.value?.trim() ||
      context.username ||
      context.email.split("@")[0] ||
      "Yeni kullanıcı",
    username:
      verifyForm?.elements.username?.value?.trim() ||
      context.username ||
      context.email.split("@")[0] ||
      "profil",
    password: verifyForm?.elements.password?.value || "",
  };
}

async function sendCodeAgain(context) {
  if (context.mode === "signup") {
    const pendingSignup = window.authStore.readPendingSignup?.();
    const fallbackValues = getSignupFallbackValues(context);
    return window.authStore.requestSignupCode({
      name: pendingSignup?.name || fallbackValues.name,
      email: context.email,
      username: pendingSignup?.username || fallbackValues.username,
      password: pendingSignup?.password || fallbackValues.password,
    });
  }

  return window.authStore.requestLoginCode(context.email);
}

async function initializeVerifyPage() {
  try {
    const currentUser = await window.authStore.getCurrentUser();
    if (currentUser) {
      setVerifyMessage("Bu hesap zaten doğrulanmış ve giriş yapılmış durumda.");
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

    const context = getVerifyContext();

    if (!context.email) {
      redirectTo("login.html");
      return;
    }

    if (verifyEmail) {
      verifyEmail.textContent = context.email;
    }

    if (verifyModeLabel) {
      verifyModeLabel.textContent =
        context.mode === "signup" ? "Üyeliğini kod ile tamamla" : "Giriş kodunu doğrula";
    }

    if (context.mode === "signup" && verifySignupFallback) {
      const pendingSignup = window.authStore.readPendingSignup?.();
      const needsFallback = !pendingSignup || pendingSignup.email !== context.email;
      verifySignupFallback.hidden = !needsFallback;

      if (needsFallback) {
        verifyForm.elements.name.value = context.username || context.email.split("@")[0] || "";
        verifyForm.elements.username.value = context.username || "";
      }
    }

    verifyForm?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const token = verifyForm.elements.token.value;
      let signupFallback = null;

      if (context.mode === "signup") {
        const pendingSignup = window.authStore.readPendingSignup?.();
        if (!pendingSignup || pendingSignup.email !== context.email) {
          signupFallback = getSignupFallbackValues(context);

          if (!signupFallback.name || !signupFallback.username || !signupFallback.password) {
            setVerifyMessage("Üyeliği tamamlamak için ad, kullanıcı adı ve şifre alanlarını doldur.", true);
            return;
          }
        }
      }

      const result = await window.authStore.verifyEmailCode(context.email, token, context.mode, signupFallback);

      if (!result.ok) {
        setVerifyMessage(result.message, true);
        return;
      }

      setVerifyMessage("Kod doğrulandı, paneline yönlendiriliyorsun.");
      redirectTo(`admin.html?session=${result.user.username}`);
    });

    resendButton?.addEventListener("click", async () => {
      const result = await sendCodeAgain(context);

      if (!result.ok) {
        setVerifyMessage(result.message, true);
        return;
      }

      setVerifyMessage("Yeni kod gönderildi. Gelen kutunu tekrar kontrol et.");
    });
  } catch (error) {
    setVerifyMessage(error?.message || "Doğrulama ekranı hazırlanırken bir sorun oluştu.", true);
  } finally {
    if (!isRedirecting) {
      revealVerifyPage();
    }
  }
}

window.setTimeout(revealVerifyPage, 1200);
initializeVerifyPage();
