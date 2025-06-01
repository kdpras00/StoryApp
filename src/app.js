import Model from "./model.js";
import View from "./view.js";
import Presenter from "./presenter.js";
import swRegister from "./register-sw.js";

import "./style.css";

// Initialize app
const app = async () => {
  const model = new Model();
  const view = new View();
  const presenter = new Presenter(model, view);

  // Register service worker
  await swRegister();

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data;

    if (data && data.type === "AUTH_ERROR") {
      console.warn("Received auth error from service worker:", data.message);
      // Clear token
      model.logout();
      // Update UI
      view.updateNav(false);
      view.showMessage(
        "Sesi Anda telah berakhir. Silakan login kembali.",
        true
      );
      view.navigateTo("login");
    }
  });

  // Add global error handler for unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled Promise Rejection:", event.reason);

    // Check if it's related to iterating non-iterables
    if (
      event.reason &&
      event.reason.message &&
      event.reason.message.includes("iterate non-iterable")
    ) {
      console.warn(
        "Caught iteration error - this may be related to IndexedDB operations"
      );
      // Prevent the error from propagating
      event.preventDefault();
    }
  });
};

window.addEventListener("load", app);
