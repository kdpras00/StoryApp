class View {
  constructor() {
    this.storyList = document.getElementById("story-list");
    this.storyForm = document.getElementById("story-form");
    this.loginForm = document.getElementById("login-form");
    this.registerForm = document.getElementById("register-form");
    this.camera = document.getElementById("camera");
    this.canvas = document.getElementById("canvas");
    this.captureBtn = document.getElementById("capture");
    this.mapContainer = document.getElementById("map");
    this.storyMapContainer = document.getElementById("story-map");
    this.pages = document.querySelectorAll(".page");
    this.photoInput = document.getElementById("photo");
    this.photoPreview = document.getElementById("preview");
    this.navList = document.getElementById("nav-list");
    this.navLinks = document.querySelectorAll("nav a");

    this.map = null;
    this.storyMap = null;
    this.currentMarker = null;
    this.storyMarkers = [];
    this.stream = null;
    this.capturedImageData = null;

    this.onRegisterSubmit = null;
    this.onLoginSubmit = null;
    this.onStorySubmit = null;
    this.onCaptureClick = null;
    this.onNavLinkClick = null;
    this.onMapClick = null;
    this.onFavoriteClick = null; // Added for favorite functionality

    this._initializeEventListeners();
    this._setupImageErrorHandling();
  }

  _initializeEventListeners() {
    this._setupSkipToContent();
    this._setupPhotoInput();
    this._setupFormEventListeners();
    this._setupNavigationEventListeners();
    this._setupPasswordToggle();
  }

  _setupSkipToContent() {
    const mainContent = document.querySelector("#main-content");
    const skipLink = document.querySelector(".skip-to-content");

    if (skipLink && mainContent) {
      skipLink.addEventListener("click", (event) => {
        event.preventDefault();
        skipLink.blur();
        mainContent.focus();
        mainContent.scrollIntoView();
      });
    }
  }

  _setupPhotoInput() {
    this.photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith("image/")) {
        if (file.size > 1 * 1024 * 1024) {
          this.showMessage("Ukuran foto terlalu besar. Maksimal 1MB.", true);
          this.photoInput.value = "";
          return;
        }
        this._previewImageFile(file);
      } else {
        this.showMessage("Harap pilih file gambar yang valid.", true);
        this.photoInput.value = "";
      }
    });
  }

  _previewImageFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      this.photoPreview.src = event.target.result;
      this.photoPreview.classList.remove("hidden");
      this.capturedImageData = null;
    };
    reader.readAsDataURL(file);
  }

  _setupFormEventListeners() {
    this.registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.onRegisterSubmit) {
        const formData = new FormData(e.target);
        const data = {
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        };

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this._setButtonLoading(submitBtn, true);

        this.onRegisterSubmit(data).finally(() => {
          this._setButtonLoading(submitBtn, false);
        });
      }
    });

    this.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.onLoginSubmit) {
        const formData = new FormData(e.target);
        const data = {
          email: formData.get("email"),
          password: formData.get("password"),
        };

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this._setButtonLoading(submitBtn, true);

        this.onLoginSubmit(data).finally(() => {
          this._setButtonLoading(submitBtn, false);
        });
      }
    });

    this.storyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.onStorySubmit) {
        const description = e.target.description.value.trim();
        const photoFile = this.getPhotoFromInput();

        const storyData = {
          description,
          photoFile,
          imageData: this.capturedImageData,
        };

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this._setButtonLoading(submitBtn, true);

        this.onStorySubmit(storyData).finally(() => {
          this._setButtonLoading(submitBtn, false);
        });
      }
    });

    this.captureBtn.addEventListener("click", () => {
      if (this.onCaptureClick) {
        this.onCaptureClick();
      }
    });
  }

  _setupNavigationEventListeners() {
    this.navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        if (this.onNavLinkClick) {
          const targetPage = link.getAttribute("href").substring(1);
          this.onNavLinkClick(e, targetPage);
        }
      });
    });
  }

  _setupPasswordToggle() {
    const toggleButtons = document.querySelectorAll(".toggle-password");
    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-target");
        const passwordInput = document.getElementById(targetId);

        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          button.classList.remove("fa-eye");
          button.classList.add("fa-eye-slash");
        } else {
          passwordInput.type = "password";
          button.classList.remove("fa-eye-slash");
          button.classList.add("fa-eye");
        }
      });
    });
  }

  updateNav(isLoggedIn) {
    const loginNav = this.navList.querySelector(".login-nav");
    const registerNav = this.navList.querySelector(".register-nav");
    const logoutNav = this.navList.querySelector(".logout-nav");

    if (isLoggedIn) {
      loginNav.classList.add("hidden");
      registerNav.classList.add("hidden");
      logoutNav.classList.remove("hidden");
    } else {
      loginNav.classList.remove("hidden");
      registerNav.classList.remove("hidden");
      logoutNav.classList.add("hidden");
    }
  }

  displayStories(stories, favorites = []) {
    this.storyList.innerHTML = "";
    this.clearStoryMapMarkers();

    stories.forEach((story) => {
      const card = document.createElement("div");
      card.className = "story-card";
      card.setAttribute("role", "listitem");

      const isFavorited = favorites.some((fav) => fav.id === story.id);

      // Format location display
      let locationDisplay = "Lokasi tidak tersedia";
      if (story.lat && story.lon) {
        // Format coordinates to 4 decimal places for readability
        const lat = parseFloat(story.lat).toFixed(4);
        const lon = parseFloat(story.lon).toFixed(4);
        locationDisplay = `${lat}, ${lon}`;
      }

      card.innerHTML = `
        <div class="img-container">
          <img src="${story.photoUrl}" alt="Foto cerita ${
        story.name
      }" loading="lazy">
        </div>
        <h3>${story.name}</h3>
        <p>${story.description}</p>
        <div class="location-display">
          <i class="fas fa-map-marker-alt"></i> ${locationDisplay}
        </div>
        <p>Dibuat: ${new Date(story.createdAt).toLocaleDateString("id-ID")}</p>
        <button class="favorite-btn ${isFavorited ? "favorited" : ""}"
                 data-story-id="${story.id}"
                 data-processing="false"
                 data-favorited="${isFavorited}"
                 aria-label="${
                   isFavorited ? "Hapus dari favorit" : "Tambah ke favorit"
                 }">
          <i class="fas fa-heart"></i>
          <span class="favorite-text">${
            isFavorited ? "Hapus dari Favorit" : "Tambah ke Favorit"
          }</span>
        </button>
      `;

      // Add to DOM
      this.storyList.appendChild(card);

      // Setup favorite button
      const favoriteBtn = card.querySelector(".favorite-btn");
      favoriteBtn.addEventListener("click", () => {
        // Prevent multiple clicks while processing
        if (favoriteBtn.getAttribute("data-processing") === "true") {
          return;
        }

        if (this.onFavoriteClick) {
          // Get current favorited state
          const currentFavorited =
            favoriteBtn.getAttribute("data-favorited") === "true";

          // Mark as processing and show loading state
          favoriteBtn.setAttribute("data-processing", "true");
          this._setButtonLoading(favoriteBtn, true);

          // Toggle favorite status - if currently favorited, remove it, otherwise add it
          this.onFavoriteClick(story, !currentFavorited).finally(() => {
            // Reset processing state
            favoriteBtn.setAttribute("data-processing", "false");
            this._setButtonLoading(favoriteBtn, false);
          });
        }
      });

      // Add marker to map if coordinates exist
      if (story.lat && story.lon) {
        this.addStoryMarker(story);
      }

      // Handle image error if needed
      const img = card.querySelector("img");
      if (img.complete && img.naturalHeight === 0) {
        this._handleImageError(img);
      }
    });
  }

  updateFavoriteButton(storyId, isFavorited) {
    const button = document.querySelector(
      `.favorite-btn[data-story-id="${storyId}"]`
    );
    if (button) {
      // Update the data-favorited attribute
      button.setAttribute("data-favorited", isFavorited);

      // Update visual state
      if (isFavorited) {
        button.classList.add("favorited");
        // Safely update text content
        const textSpan = button.querySelector(".favorite-text");
        if (textSpan) {
          textSpan.textContent = "Hapus dari Favorit";
        } else {
          // If span doesn't exist, update the entire button content
          button.innerHTML =
            '<i class="fas fa-heart"></i> <span class="favorite-text">Hapus dari Favorit</span>';
        }
        button.setAttribute("aria-label", "Hapus dari favorit");
      } else {
        button.classList.remove("favorited");
        // Safely update text content
        const textSpan = button.querySelector(".favorite-text");
        if (textSpan) {
          textSpan.textContent = "Tambah ke Favorit";
        } else {
          // If span doesn't exist, update the entire button content
          button.innerHTML =
            '<i class="fas fa-heart"></i> <span class="favorite-text">Tambah ke Favorit</span>';
        }
        button.setAttribute("aria-label", "Tambah ke favorit");
      }

      // Reset processing state
      button.setAttribute("data-processing", "false");
    }
  }

  // Method to display only favorite stories
  displayFavoriteStories(favoriteStories) {
    this.storyList.innerHTML = "";
    this.clearStoryMapMarkers();

    if (favoriteStories.length === 0) {
      this.storyList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-heart-broken fa-3x"></i>
          <h3>Belum Ada Cerita Favorit</h3>
          <p>Tambahkan cerita ke favorit dari halaman beranda.</p>
        </div>
      `;
      return;
    }

    this.displayStories(favoriteStories, favoriteStories);
  }

  async setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.camera.srcObject = stream;
      this.stream = stream;
      return stream;
    } catch (error) {
      throw new Error("Tidak dapat mengakses kamera: " + error.message);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      this.camera.srcObject = null;
    }
  }

  captureImage() {
    if (!this.stream) {
      return null;
    }

    const context = this.canvas.getContext("2d");
    this.canvas.width = this.camera.videoWidth;
    this.canvas.height = this.camera.videoHeight;
    context.drawImage(this.camera, 0, 0);

    this.capturedImageData = this.canvas.toDataURL("image/jpeg");
    return this.capturedImageData;
  }

  showImagePreview(imageData) {
    this.photoPreview.src = imageData;
    this.photoPreview.classList.remove("hidden");
    this.photoInput.value = "";
  }

  setupMap() {
    if (this.map) {
      return this.map;
    }
    this.mapContainer.setAttribute(
      "aria-label",
      "Peta interaktif untuk memilih lokasi cerita"
    );
    this.map = L.map(this.mapContainer).setView([-6.185931, 106.552764], 17);

    // Tambahkan beragam tile layers
    const osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors",
      }
    );

    const carto = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      {
        attribution: "© CartoDB",
      }
    );

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "© Esri",
      }
    );

    const topo = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenTopoMap contributors",
      }
    );

    osm.addTo(this.map);

    // Tambahkan layer control dengan lebih banyak opsi
    const baseLayers = {
      OpenStreetMap: osm,
      "CartoDB Light": carto,
      Satellite: satellite,
      Topographic: topo,
    };

    L.control.layers(baseLayers).addTo(this.map);

    this.map.on("click", (e) => {
      if (this.onMapClick) {
        this.onMapClick(e.latlng);
      }
    });

    return this.map;
  }

  setupStoryMap() {
    if (this.storyMap) return this.storyMap;

    this.storyMap = L.map(this.storyMapContainer, {
      center: [-2.5489, 118.0149], // Indonesia center
      zoom: 5,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.storyMap);

    // Add fullscreen control
    if (L.control.fullscreen) {
      L.control
        .fullscreen({
          position: "topleft",
          title: "Tampilkan peta penuh",
          titleCancel: "Keluar dari mode penuh",
          forceSeparateButton: true,
        })
        .addTo(this.storyMap);
    }

    // Add locate control
    if (L.control.locate) {
      L.control
        .locate({
          position: "topleft",
          strings: {
            title: "Tunjukkan lokasi saya",
          },
          locateOptions: {
            enableHighAccuracy: true,
          },
        })
        .addTo(this.storyMap);
    }

    // Add cluster support for markers
    this.markerClusterGroup = L.markerClusterGroup();
    this.storyMap.addLayer(this.markerClusterGroup);

    return this.storyMap;
  }

  updateMapMarker(latlng) {
    if (!this.map) return;

    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }

    this.currentMarker = L.marker([latlng.lat, latlng.lng]).addTo(this.map);
    this.currentMarker.bindPopup("Lokasi Cerita").openPopup();
  }

  clearMapMarkers() {
    if (this.map && this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
      this.currentMarker = null;
    }
  }

  clearStoryMapMarkers() {
    if (this.storyMap && this.storyMarkers.length > 0) {
      this.storyMarkers.forEach((marker) => this.storyMap.removeLayer(marker));
      this.storyMarkers = [];
    }
  }

  showPage(pageId) {
    this.pages.forEach((page) => {
      page.classList.toggle("hidden", page.id !== pageId);
    });
  }

  showMessage(message, isError = false) {
    Swal.fire({
      title: isError ? "Gagal!" : "Success!",
      text: message,
      icon: isError ? "error" : "success",
      confirmButtonColor: "#3B82F6",
      timer: isError ? undefined : 2000,
      showConfirmButton: isError,
      background: isError ? "#2d3536" : "#2d3536", // Same dark background for both
      color: "#ffffff", // White text
      iconColor: isError ? "#dc3545" : "#4BB543", // Red for error, green for success
      customClass: {
        popup: isError ? "error-popup" : "success-popup",
        title: isError ? "error-title" : "success-title",
        content: isError ? "error-content" : "success-content",
      },
    });
  }

  resetStoryForm() {
    this.storyForm.reset();
    this.photoPreview.classList.add("hidden");
    this.photoPreview.src = "";
    this.photoInput.value = "";
    this.capturedImageData = null;
  }

  getPhotoFromInput() {
    return this.photoInput.files.length > 0 ? this.photoInput.files[0] : null;
  }

  navigateTo(hash) {
    window.location.hash = hash;
  }

  getCurrentHash() {
    return window.location.hash.slice(1) || "login";
  }

  handlePageViewTransition(pageId, callback) {
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        // Tambahkan animasi custom untuk transisi halaman
        const oldPage = document.querySelector(".page:not(.hidden)");
        const newPage = document.getElementById(pageId);

        if (oldPage) {
          oldPage.style.animation = "fadeOut 0.3s ease-out forwards";
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        this.showPage(pageId);

        if (newPage) {
          newPage.style.animation = "fadeIn 0.5s ease-in forwards";
        }

        if (callback) {
          await callback();
        }
      });
    } else {
      this.showPage(pageId);
      if (callback) {
        callback();
      }
    }
  }

  setupNotificationButton(callback) {
    let notifButton = document.querySelector("#notification-button");

    if (!notifButton) {
      notifButton = document.createElement("button");
      notifButton.id = "notification-button";
      notifButton.textContent = "Aktifkan Notifikasi";
      notifButton.className = "btn-secondary";
      notifButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        padding: 10px 15px;
        background: #3B82F6;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      `;

      document.body.appendChild(notifButton);
    }

    notifButton.addEventListener("click", callback);
  }

  updateNotificationUI(isEnabled) {
    const notifButton = document.querySelector("#notification-button");
    if (notifButton) {
      if (isEnabled) {
        notifButton.textContent = "Notifikasi Aktif";
        notifButton.style.background = "#10B981";
        notifButton.disabled = true;
      } else {
        notifButton.textContent = "Aktifkan Notifikasi";
        notifButton.style.background = "#3B82F6";
        notifButton.disabled = false;
      }
    }
  }

  _setupImageErrorHandling() {
    // Add global handler for image errors
    document.addEventListener(
      "error",
      (e) => {
        if (e.target.tagName.toLowerCase() === "img") {
          this._handleImageError(e.target);
        }
      },
      true
    ); // Use capture phase to catch all image errors
  }

  _handleImageError(img) {
    // Don't apply to preview images
    if (img.id === "preview") return;

    // Add error class
    img.classList.add("error");

    // If in a story card, show placeholder
    const storyCard = img.closest(".story-card");
    if (storyCard) {
      // Create container if needed
      let container = img.parentElement;
      if (!container.classList.contains("img-container")) {
        // Wrap image in container
        container = document.createElement("div");
        container.className = "img-container";
        img.parentNode.insertBefore(container, img);
        container.appendChild(img);
      }

      // Add error message if not already there
      if (!container.querySelector(".img-error")) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "img-error";
        errorMsg.innerHTML =
          '<i class="fas fa-image"></i><br>Gambar tidak tersedia';
        container.appendChild(errorMsg);
      }
    }
  }

  _setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.classList.add("loading");
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = "";
    } else {
      button.disabled = false;
      button.classList.remove("loading");
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
      }
    }
  }

  addStoryMarker(story) {
    if (!this.storyMap || !story.lat || !story.lon) return;

    const marker = L.marker([story.lat, story.lon]).addTo(this.storyMap);
    marker.bindPopup(`
      <b>${story.name}</b><br>
      ${story.description.substring(0, 100)}${
      story.description.length > 100 ? "..." : ""
    }<br>
      <img src="${story.photoUrl}" alt="Foto cerita ${
      story.name
    }" style="max-width: 100px; max-height: 100px; margin-top: 8px;">
    `);
    this.storyMarkers.push(marker);
  }
}

export default View;
