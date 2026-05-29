import QRCode from "qrcode/lib/browser.js";

globalThis.sojialQr = {
  async toSvg(text) {
    return QRCode.toString(text, {
      type: "svg",
      width: 512,
      margin: 1,
      color: {
        dark: "#1d2538",
        light: "#ffffff",
      },
    });
  },
};
