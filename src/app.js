import Model from "./model.js";
import View from "./view.js";
import Presenter from "./presenter.js";

// Register service worker for offline capability
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

// Inisialisasi aplikasi
document.addEventListener("DOMContentLoaded", () => {
  const model = new Model();
  const view = new View();
  const presenter = new Presenter(model, view);
});
