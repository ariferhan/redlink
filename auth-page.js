const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const authMessage = document.querySelector("#auth-message");
const params = new URLSearchParams(window.location.search);
const draftHint = document.querySelector("#draft-hint");

const currentUser = window.authStore.getCurrentUser();

if (currentUser) {
  window.location.href = `admin.html?session=${currentUser.username}`;
}

function setMessage(message, isError = false) {
  if (!authMessage) {
    return;
  }

  authMessage.textContent = message;
  authMessage.style.color = isError ? "#d64545" : "var(--muted)";
}

const draftFromQuery = params.get("draft");

if (draftHint && draftFromQuery) {
  draftHint.hidden = false;
  draftHint.textContent = `Başlamak istediğin konu: "${draftFromQuery}"`;
}

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = loginForm.elements.username.value;
    const password = loginForm.elements.password.value;
    const result = window.authStore.loginUser(username, password);

    if (!result.ok) {
      setMessage(result.message, true);
      return;
    }

    setMessage("Giriş başarılı, panele yönlendiriliyorsun.");
    window.location.href = `admin.html?session=${result.user.username}`;
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const result = window.authStore.registerUser({
      name: registerForm.elements.name.value,
      username: registerForm.elements.username.value,
      password: registerForm.elements.password.value,
    });

    if (!result.ok) {
      setMessage(result.message, true);
      return;
    }

    setMessage("Hesap oluşturuldu, yönetim paneline yönlendiriliyorsun.");
    window.location.href = `admin.html?session=${result.user.username}`;
  });
}

const queryUsername = params.get("username");
const queryPassword = params.get("password");

if (queryUsername && queryPassword) {
  const result = window.authStore.loginUser(queryUsername, queryPassword);

  if (result.ok) {
    window.location.href = `admin.html?session=${result.user.username}`;
  } else {
    setMessage(result.message, true);
  }
}
