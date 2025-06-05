import { urlBase64ToUint8Array } from "./utils.js";

const VAPID_PUBLIC_KEY =
  "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

class Presenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.location = { lat: null, lng: null };
    this.map = null;
    this._currentHash = null;
    this.geocoder = null;
    this._processingFavorites = {};

    // Bind event handlers
    this.view.onFavoriteClick = this.handleFavoriteClick.bind(this);
    this.view.onRegisterSubmit = this.handleRegisterSubmit.bind(this);
    this.view.onLoginSubmit = this.handleLoginSubmit.bind(this);
    this.view.onStorySubmit = this.handleStorySubmit.bind(this);
    this.view.onCaptureClick = this.handleCaptureClick.bind(this);
    this.view.onNavLinkClick = this.handleNavLinkClick.bind(this);
    this.view.onMapClick = this.handleMapClick.bind(this);
    this.view.onFilterChange = this.handleFilterChange.bind(this);
    this.view.onStoryClick = this.handleStoryClick.bind(this);
    this.view.onEditStorySubmit = this.handleEditStorySubmit.bind(this);
    this.view.onDeleteStory = this.handleDeleteStory.bind(this);

    this.init();
  }

  async init() {
    await this.setupPushNotification();
    this.view.updateNav(this.model.isLoggedIn());
    this.setupRouting();

    if (this.model.isLoggedIn()) {
      await this.loadStories();
      this.view.navigateTo("home");
    } else {
      // For non-authenticated users, always show login first
      this.view.navigateTo("login");
    }

    window.addEventListener("hashchange", this.handleRouteChange.bind(this));
    this.handleRouteChange();

    // Tambahkan di presenter.js
    setInterval(() => {
      this.checkForNewStories();
    }, 60000); // Cek setiap 1 menit

    // Check for offline status
    window.addEventListener("online", () => {
      this.view.showMessage("Anda kembali online", false);
      this.model.syncOfflineData();
    });

    window.addEventListener("offline", () => {
      this.view.showMessage(
        "Anda offline. Beberapa fitur mungkin tidak tersedia.",
        true
      );
    });
  }

  handleMapClick(latlng) {
    this.location = { lat: latlng.lat, lng: latlng.lng };
    this.view.updateMapMarker(latlng);

    // Show immediate feedback that location was selected
    this.view.showMessage(
      `Lokasi dipilih: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
      false
    );

    // Try to get location name if geocoder is available
    this.reverseGeocode(latlng.lat, latlng.lng)
      .then((locationName) => {
        if (locationName) {
          // Update message with location name once geocoding is complete
          this.view.showMessage(`Lokasi dipilih: ${locationName}`, false);
        }
      })
      .catch((error) => {
        console.error("Error in geocoding:", error);
        // We already showed a success message, so no need to show an error
      });
  }

  async reverseGeocode(lat, lng) {
    try {
      console.log("Starting reverse geocoding for:", lat, lng);

      // Use Nominatim OpenStreetMap service for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "StoryApp/1.0", // Nominatim requires a user agent
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding service error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Geocoding response:", data);

      // Extract location name
      if (data && data.display_name) {
        // Get a simplified version of the address
        const parts = data.display_name.split(", ");
        // Return only the first 2-3 parts for readability
        return parts.slice(0, 3).join(", ");
      }

      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  }

  handleCaptureClick() {
    const imageData = this.view.captureImage();
    if (imageData) {
      this.view.showImagePreview(imageData);
    } else {
      this.view.showMessage("Gagal mengambil gambar dari kamera.", true);
    }
  }

  async handleRegisterSubmit(data) {
    try {
      // Validate input
      if (!data.name || !data.email || !data.password) {
        this.view.showMessage("Semua field harus diisi.", true);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        this.view.showMessage("Format email tidak valid.", true);
        return;
      }

      // Validate password length
      if (data.password.length < 6) {
        this.view.showMessage("Password minimal 6 karakter.", true);
        return;
      }

      const result = await this.model.register(data);
      this.view.showMessage(result.message, result.error);
      if (!result.error) {
        this.view.navigateTo("login");
      }
      return result;
    } catch (error) {
      this.view.showMessage("Gagal mendaftar: " + error.message, true);
      throw error;
    }
  }

  async handleLoginSubmit(data) {
    try {
      // Validate input
      if (!data.email || !data.password) {
        this.view.showMessage("Email dan password harus diisi.", true);
        return;
      }

      const result = await this.model.login(data);
      this.view.showMessage(result.message, result.error);
      if (!result.error) {
        this.view.updateNav(true);
        this.view.navigateTo("home");

        // Initialize the story map before loading stories
        if (!this.view.storyMap) {
          this.view.setupStoryMap();
        }

        await this.loadStories();

        // Setup push notification after successful login
        if (Notification.permission === "granted") {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await this.subscribeToPush(registration);
          }
        }
      }
      return result;
    } catch (error) {
      this.view.showMessage("Gagal login: " + error.message, true);
      throw error;
    }
  }

  async handleStorySubmit(storyData) {
    if (!this.model.isLoggedIn()) {
      this.view.showMessage("Silakan login terlebih dahulu", true);
      this.view.navigateTo("login");
      return;
    }

    const { description, photoFile, imageData } = storyData;

    if (!description) {
      this.view.showMessage("Deskripsi tidak boleh kosong.", true);
      return;
    }

    if (!this.location.lat || !this.location.lng) {
      this.view.showMessage("Harap pilih lokasi di peta.", true);
      return;
    }

    const formData = new FormData();

    formData.append("description", description);

    // Ensure we're sending a Blob or File object for the photo
    if (photoFile instanceof Blob || photoFile instanceof File) {
      formData.append("photo", photoFile, "story.jpg");
    } else if (imageData) {
      // Try to fetch the image data and convert to blob again
      try {
        const response = await fetch(imageData);
        const blob = await response.blob();
        formData.append("photo", blob, "story.jpg");
      } catch (error) {
        this.view.showMessage("Gagal memproses gambar: " + error.message, true);
        return;
      }
    } else {
      this.view.showMessage("Harap pilih foto untuk diunggah", true);
      return;
    }

    formData.append("lat", this.location.lat);
    formData.append("lon", this.location.lng);

    try {
      const result = await this.model.addStory(formData);
      this.view.showMessage(result.message, result.error);
      if (!result.error) {
        this.cleanupAfterStorySubmit();
        await this.loadStories();
        this.view.navigateTo("home");
      }
      return result;
    } catch (error) {
      this.view.showMessage("Gagal menambahkan cerita: " + error.message, true);
      throw error;
    }
  }

  cleanupAfterStorySubmit() {
    this.view.stopCamera();
    this.view.resetStoryForm();
    this.location = { lat: null, lng: null };
    this.view.clearMapMarkers();
  }

  handleNavLinkClick(event, targetPage) {
    if (
      !this.model.isLoggedIn() &&
      (targetPage === "home" ||
        targetPage === "add-story" ||
        targetPage === "favorites")
    ) {
      event.preventDefault();
      this.view.showMessage("Silakan login terlebih dahulu", true);
      this.view.navigateTo("login");
    } else if (targetPage === "logout") {
      event.preventDefault();
      this.handleLogout();
    }
  }

  handleLogout() {
    // Show confirmation dialog before logout
    if (typeof Swal !== "undefined") {
      Swal.fire({
        title: "Konfirmasi Logout",
        text: "Apakah Anda yakin ingin keluar?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Logout",
        cancelButtonText: "Batal",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        background: "#2d3536",
        color: "#ffffff",
      }).then((result) => {
        if (result.isConfirmed) {
          this._performLogout();
        }
      });
    } else {
      // Fallback if SweetAlert is not available
      if (confirm("Apakah Anda yakin ingin keluar?")) {
        this._performLogout();
      }
    }
  }

  _performLogout() {
    this.model.logout();
    this.view.updateNav(false);
    this.view.stopCamera();
    this.view.showMessage("Berhasil logout", false);
    this.view.navigateTo("login");
  }

  handleRouteChange() {
    const hash = window.location.hash.slice(1) || "login";

    // Validate token first if it exists
    if (this.model.token) {
      try {
        // Simple token validation (check if it's a valid JWT format)
        const tokenParts = this.model.token.split(".");
        if (tokenParts.length !== 3) {
          console.error("Invalid token format detected");
          this.model.logout();
          this.view.updateNav(false);
          this.view.showMessage(
            "Sesi Anda telah berakhir. Silakan login kembali.",
            true
          );
          this.view.navigateTo("login");
          return;
        }
      } catch (error) {
        console.error("Token validation error:", error);
        this.model.logout();
      }
    }

    // If trying to access protected pages without being logged in
    if (
      !this.model.isLoggedIn() &&
      (hash === "home" || hash === "add-story" || hash === "favorites")
    ) {
      this.view.showMessage("Silakan login terlebih dahulu", true);
      this.view.navigateTo("login");
      return;
    }

    // Special handling for login/register when user is already logged in
    if (this.model.isLoggedIn() && (hash === "login" || hash === "register")) {
      this.view.navigateTo("home");
      return;
    }

    // Handle auth section navigation for non-logged in users
    if (!this.model.isLoggedIn() && (hash === "login" || hash === "register")) {
      this.view.showAuthSection(hash);
      return;
    }

    if (hash === "logout") {
      this.handleLogout();
      return;
    }

    // For actual page navigation
    const pageElement = document.getElementById(hash);
    if (pageElement && pageElement.classList.contains("page")) {
      this.view.handlePageViewTransition(hash, () => {
        this.handlePageSpecificSetup(hash);
      });
    } else {
      this.showNotFoundPage();
    }

    this._currentHash = hash;
  }

  showNotFoundPage() {
    const notFoundPage = document.getElementById("not-found");
    if (notFoundPage) {
      this.view.showPage("not-found");
    } else {
      // If no not-found page exists, redirect to home or login
      if (this.model.isLoggedIn()) {
        this.view.navigateTo("home");
      } else {
        this.view.navigateTo("login");
      }
    }
    this.view.showMessage("Halaman tidak ditemukan", true);
  }

  async handlePageSpecificSetup(pageId) {
    switch (pageId) {
      case "home":
        if (this.model.isLoggedIn()) {
          await this.loadStories();
          if (!this.view.storyMap) {
            this.view.setupStoryMap();
          }
        }
        break;
      case "add-story":
        if (this.model.isLoggedIn()) {
          await this.setupAddStoryPage();
        }
        break;
      case "favorites":
        if (this.model.isLoggedIn()) {
          await this.loadFavoriteStories();
        }
        break;
      case "story-detail":
      case "edit-story-page":
        // Tidak perlu setup khusus untuk halaman detail dan edit
        // Data sudah diisi saat navigasi ke halaman ini
        break;
      default:
        this.view.stopCamera();
        break;
    }
  }

  async setupAddStoryPage() {
    this.view.setupMap();
    // Tidak perlu setup kamera secara otomatis
    // Kamera akan dibuka saat user menekan tombol open camera
  }

  async loadStories() {
    try {
      // Check if user is still logged in
      if (!this.model.isLoggedIn()) {
        console.warn("User not logged in, redirecting to login page");
        this.view.showMessage(
          "Sesi Anda telah berakhir. Silakan login kembali.",
          true
        );
        this.view.updateNav(false);
        this.view.navigateTo("login");
        return;
      }

      // Ensure storyMap is initialized before loading stories
      if (!this.view.storyMap) {
        this.view.setupStoryMap();
      }

      const stories = await this.model.fetchStories();

      // If stories fetch returns empty due to auth error, redirect to login
      if (Array.isArray(stories) && stories.length === 0 && navigator.onLine) {
        // Check if this might be due to an auth error
        if (!this.model.isLoggedIn()) {
          console.warn("Authentication failed, redirecting to login");
          this.view.showMessage(
            "Sesi Anda telah berakhir. Silakan login kembali.",
            true
          );
          this.view.updateNav(false);
          this.view.navigateTo("login");
          return;
        }
      }

      // Clear existing map markers before displaying new stories
      this.view.clearStoryMapMarkers();

      const favorites = await this.model.getFavorites();
      this.view.displayStories(stories, favorites);

      // Reset to default filter after loading
      this.view.setActiveFilter("all");
      this.view.clearSearch();
    } catch (error) {
      console.error("Load stories error:", error);

      // Check if this is an authentication error
      if (error.message && error.message.includes("Authentication")) {
        this.view.showMessage(
          "Sesi Anda telah berakhir. Silakan login kembali.",
          true
        );
        this.view.updateNav(false);
        this.view.navigateTo("login");
        return;
      }

      this.view.showMessage("Gagal memuat cerita. Coba lagi nanti.", true);
    }
  }

  async loadFavoriteStories() {
    try {
      const favorites = await this.model.getFavorites();
      this.view.displayFavoriteStories(favorites);
    } catch (error) {
      console.error("Load favorite stories error:", error);
      this.view.showMessage(
        "Gagal memuat cerita favorit. Coba lagi nanti.",
        true
      );
    }
  }

  async setupPushNotification() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported in this browser");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permissionStatus = Notification.permission;

      switch (permissionStatus) {
        case "granted":
          await this.subscribeToPush(registration);
          this.view.updateNotificationUI(true);
          break;
        case "denied":
          console.log("Push notification permission was denied");
          this.view.updateNotificationUI(false);
          break;
        case "default":
        default:
          this.view.setupNotificationButton(() =>
            this.requestNotificationPermission(registration)
          );
          this.view.updateNotificationUI(false);
          break;
      }
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  }

  async requestNotificationPermission(registration) {
    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        await this.subscribeToPush(registration);
        this.view.showMessage("Notifikasi berhasil diaktifkan!", false);
        this.view.updateNotificationUI(true);
      } else {
        this.view.showMessage("Notifikasi tidak diaktifkan", false);
        this.view.updateNotificationUI(false);
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      this.view.showMessage("Gagal meminta izin notifikasi", true);
      this.view.updateNotificationUI(false);
    }
  }

  async subscribeToPush(registration) {
    try {
      // Check if already subscribed to avoid redundant subscriptions
      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("Already subscribed to push notifications");
        if (this.model.isLoggedIn()) {
          try {
            await this.model.subscribePush(existingSubscription);
            console.log("Push notification subscription updated successfully");
            return true;
          } catch (err) {
            console.warn(
              "Failed to update subscription, but continuing anyway:",
              err
            );
            return true;
          }
        }
        return true;
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      if (this.model.isLoggedIn()) {
        try {
          await this.model.subscribePush(subscription);
          console.log("Push notification subscription successful");
        } catch (error) {
          console.warn("Push subscription API error, but continuing:", error);
        }
      } else {
        console.log("User not logged in, skipping server subscription");
      }

      return true;
    } catch (error) {
      console.error("Push subscription error:", error);
      // Don't throw error, just log it and continue
      return false;
    }
  }

  async handleFavoriteClick(story, addToFavorite) {
    // Prevent multiple simultaneous favorite operations on the same story
    if (this._processingFavorites && this._processingFavorites[story.id]) {
      console.log("Favorite operation already in progress for this story");
      return false;
    }

    // Initialize processing tracker if needed
    if (!this._processingFavorites) {
      this._processingFavorites = {};
    }

    // Mark this story as being processed
    this._processingFavorites[story.id] = true;

    try {
      let result;

      // Check if story is already in favorites
      const isInFavorites = await this.model.isStoryFavorited(story.id);

      if (addToFavorite) {
        // If we're trying to add and it's already in favorites, just return success
        if (isInFavorites) {
          this.view.updateFavoriteButton(story.id, true);
          return true;
        }

        result = await this.model.addStoryToFavorites(story);
        if (result) {
          this.view.updateFavoriteButton(story.id, true);
          this.view.showMessage(
            `Cerita "${story.name}" ditambahkan ke favorit.`,
            false
          );
        } else {
          // This is the case when the operation fails
          this.view.showMessage(
            `Cerita "${story.name}" gagal ditambahkan ke favorit.`,
            true
          );
          // Don't update the button state since the operation failed
        }
      } else {
        // If we're trying to remove and it's not in favorites, just return success
        if (!isInFavorites) {
          this.view.updateFavoriteButton(story.id, false);
          return true;
        }

        result = await this.model.removeStoryFromFavorites(story.id);
        if (result) {
          this.view.updateFavoriteButton(story.id, false);
          this.view.showMessage(
            `Cerita "${story.name}" dihapus dari favorit.`,
            false
          );
        } else {
          this.view.showMessage(
            `Cerita "${story.name}" gagal dihapus dari favorit.`,
            true
          );
          // Don't update the button state since the operation failed
        }
      }

      // Realtime update hanya jika filter favorites
      if (result) {
        // If we're currently viewing favorites, reload them
        if (this.view.currentFilter === "favorites") {
          await this.loadFavoriteStories();
        }
        // Hilangkan refresh UI untuk filter lain
        // else {
        //   this.view._applyFiltersAndSearch();
        // }
      }

      return result;
    } catch (error) {
      console.error("Favorite action error:", error);
      this.view.showMessage(
        `Gagal ${addToFavorite ? "menambahkan" : "menghapus"} cerita "${
          story.name
        }" ${addToFavorite ? "ke" : "dari"} favorit.`,
        true
      );
      throw error;
    } finally {
      // Clear processing state regardless of success/failure
      if (this._processingFavorites) {
        this._processingFavorites[story.id] = false;
      }
    }
  }

  async handleFilterChange(filter) {
    if (!this.model.isLoggedIn()) return;

    // Apply the appropriate actions based on filter
    switch (filter) {
      case "favorites":
        await this.loadFavoriteStories();
        break;
      case "newest":
      case "oldest":
      case "all":
      default:
        // These are handled by the view's _applyFiltersAndSearch method
        break;
    }
  }

  setupRouting() {
    // Initial route handling
    this.handleRouteChange();
  }

  async checkForNewStories() {
    const currentStories = await this.model.getStories();
    const lastKnownStoryId = localStorage.getItem("lastKnownStoryId");

    if (
      currentStories.length > 0 &&
      lastKnownStoryId !== currentStories[0].id
    ) {
      // Ada cerita baru, tampilkan notifikasi
      if (Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.showNotification("Cerita Baru", {
            body: "Ada cerita baru yang ditambahkan!",
            icon: "/icons/icon-144x144.png",
            badge: "/icons/error-icon-72x72.png",
          });
        }
      }

      // Simpan ID cerita terbaru
      localStorage.setItem("lastKnownStoryId", currentStories[0].id);
    }
  }

  async handleStoryClick(storyId) {
    try {
      const story = await this.model.getStoryDetail(storyId);
      this.view.displayStoryDetail(story);
    } catch (error) {
      console.error("Error getting story detail:", error);
      this.view.showMessage(
        "Gagal memuat detail cerita. " + error.message,
        true
      );
    }
  }

  async handleEditStorySubmit(storyId, description, photoFile) {
    try {
      if (!description.trim()) {
        this.view.showMessage("Deskripsi cerita tidak boleh kosong", true);
        return;
      }

      // Buat object data untuk update
      const updatedData = { description };

      // Tambahkan photo jika ada perubahan foto
      if (photoFile) {
        updatedData.photo = photoFile;
      }

      // Update cerita
      const result = await this.model.updateStory(storyId, updatedData);

      if (result.error) {
        throw new Error(result.message);
      }

      // Tampilkan pesan sukses
      this.view.showMessage(
        result.message || "Cerita berhasil diperbarui",
        false
      );

      // Kembali ke halaman detail cerita yang sudah diupdate
      await this.handleStoryClick(storyId);

      // Refresh daftar cerita di halaman home
      await this.loadStories();
    } catch (error) {
      console.error("Error updating story:", error);
      this.view.showMessage("Gagal memperbarui cerita: " + error.message, true);
    }
  }

  async handleDeleteStory(storyId) {
    try {
      const result = await this.model.deleteStory(storyId);

      if (result.error) {
        throw new Error(result.message);
      }

      // Tampilkan pesan sukses
      this.view.showMessage(result.message || "Cerita berhasil dihapus", false);

      // Kembali ke halaman home
      this.view.navigateTo("home");

      // Refresh daftar cerita
      await this.loadStories();
    } catch (error) {
      console.error("Error deleting story:", error);
      this.view.showMessage("Gagal menghapus cerita: " + error.message, true);
    }
  }
}

export default Presenter;
