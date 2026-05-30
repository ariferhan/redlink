const resetPasswordForm = document.querySelector("#reset-password-form");
const resetPasswordMessage = document.querySelector("#reset-password-message");
let recoveredUser = null;

function setResetPasswordMessage(message, isError = false) {
  if (!resetPasswordMessage) {
    return;
  }

  resetPasswordMessage.textContent = message;
  resetPasswordMessage.style.color = isError ? "#d64545" : "var(--muted)";
}

function revealResetPasswordPage() {
  document.body.classList.remove("auth-page-pending");
}

async function waitForRecoveryUser(attempt = 0) {
  const currentUser = await window.authStore.getCurrentUser();

  if (currentUser || attempt >= 5) {
    return currentUser;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return waitForRecoveryUser(attempt + 1);
}

async function initializeResetPasswordPage() {
  try {
    recoveredUser = await waitForRecoveryUser();

    if (!recoveredUser) {
      setResetPasswordMessage(
        "Şifre yenileme oturumu bulunamadı. Maildeki bağlantıya tekrar tıkla ya da yeni bağlantı iste.",
        true
      );
      return;
    }

    resetPasswordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const password = resetPasswordForm.elements.password.value;
      const passwordConfirm = resetPasswordForm.elements.passwordConfirm.value;

      if (password !== passwordConfirm) {
        setResetPasswordMessage("Şifre tekrar alanı eşleşmiyor.", true);
        return;
      }

      const result = await window.authStore.updatePasswordAfterRecovery(password);

      if (!result.ok) {
        setResetPasswordMessage(result.message, true);
        return;
      }

      setResetPasswordMessage("Şifren güncellendi. Kontrol paneline yönlendiriliyorsun.");
      window.setTimeout(() => {
        window.location.href = `admin.html?session=${result.user.username}`;
      }, 700);
    });
  } catch (error) {
    setResetPasswordMessage(
      error?.message || "Yeni şifre ekranı hazırlanırken bir sorun oluştu. Sayfayı yenileyip tekrar dene.",
      true
    );
  } finally {
    revealResetPasswordPage();
    window.sojialIcons?.mount(document);
  }
}

window.setTimeout(revealResetPasswordPage, 1200);
initializeResetPasswordPage();
