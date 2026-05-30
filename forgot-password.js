const forgotPasswordForm = document.querySelector("#forgot-password-form");
const forgotPasswordMessage = document.querySelector("#forgot-password-message");

function setForgotPasswordMessage(message, isError = false) {
  if (!forgotPasswordMessage) {
    return;
  }

  forgotPasswordMessage.textContent = message;
  forgotPasswordMessage.style.color = isError ? "#d64545" : "var(--muted)";
}

function revealForgotPasswordPage() {
  document.body.classList.remove("auth-page-pending");
}

async function initializeForgotPasswordPage() {
  try {
    const currentUser = await window.authStore.getCurrentUser();

    if (currentUser) {
      setForgotPasswordMessage("Zaten giriş yaptın. İstersen kontrol paneline dönebilirsin.");
      const authSwitch = document.querySelector(".auth-switch");
      if (authSwitch) {
        authSwitch.innerHTML = `Kontrol paneline dönmek için <a href="admin.html?session=${currentUser.username}">buraya tıkla</a>.`;
      }
      const primaryTopbarAction = document.querySelector(".topbar-actions .pill-button.solid");
      if (primaryTopbarAction) {
        primaryTopbarAction.textContent = "Panele dön";
        primaryTopbarAction.href = `admin.html?session=${currentUser.username}`;
      }
    }

    forgotPasswordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = forgotPasswordForm.elements.email.value;
      const result = await window.authStore.requestPasswordReset(email);

      if (!result.ok) {
        setForgotPasswordMessage(result.message, true);
        return;
      }

      setForgotPasswordMessage("Şifre sıfırlama bağlantısı gönderildi. Mail kutunu kontrol et.");
    });
  } catch (error) {
    setForgotPasswordMessage(
      error?.message || "Şifre sıfırlama sayfası hazırlanırken bir sorun oluştu. Sayfayı yenileyip tekrar dene.",
      true
    );
  } finally {
    revealForgotPasswordPage();
    window.sojialIcons?.mount(document);
  }
}

window.setTimeout(revealForgotPasswordPage, 1200);
initializeForgotPasswordPage();
