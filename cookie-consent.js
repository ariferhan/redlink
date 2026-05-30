const COOKIE_KEY = "sojial-cookie-consent";

function getCookieConsent() {
  try {
    return window.localStorage.getItem(COOKIE_KEY);
  } catch (error) {
    return null;
  }
}

function setCookieConsent(value) {
  try {
    window.localStorage.setItem(COOKIE_KEY, value);
  } catch (error) {}
}

function createCookieBanner() {
  const banner = document.createElement("aside");
  banner.className = "cookie-consent is-hidden";
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = `
    <p>
      Sojial deneyimini iyileştirmek, oturumunu korumak ve performans verilerini anlamak için
      çerezler kullanıyoruz. “Çerezlere izin ver” diyerek bu kullanıma onay verebilirsin.
    </p>
    <div class="cookie-consent-actions">
      <a class="cookie-consent-link" href="cookies.html">Çerez politikası</a>
      <button class="cookie-consent-button" type="button">Çerezlere izin ver</button>
    </div>
    <button class="cookie-consent-dismiss" type="button">Şimdilik kapat</button>
  `;

  const acceptButton = banner.querySelector(".cookie-consent-button");
  const dismissButton = banner.querySelector(".cookie-consent-dismiss");

  acceptButton?.addEventListener("click", () => {
    setCookieConsent("accepted");
    banner.classList.add("is-hidden");
  });

  dismissButton?.addEventListener("click", () => {
    setCookieConsent("dismissed");
    banner.classList.add("is-hidden");
  });

  return banner;
}

(function initializeCookieConsent() {
  if (getCookieConsent()) {
    return;
  }

  const banner = createCookieBanner();
  document.body.appendChild(banner);

  window.requestAnimationFrame(() => {
    banner.classList.remove("is-hidden");
  });
})();
