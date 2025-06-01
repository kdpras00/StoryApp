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

    // Story filtering elements
    this.storySearch = document.getElementById("story-search");
    this.searchButton = document.getElementById("search-button");
    this.filterTabs = document.querySelectorAll(".filter-tab");

    // Auth elements
    this.authContainer = document.getElementById("auth-container");
    this.appHeader = document.getElementById("app-header");
    this.loginSection = document.getElementById("login");
    this.registerSection = document.getElementById("register");

    // Camera control elements
    this.openCameraBtn = document.getElementById("open-camera");
    this.closeCameraBtn = document.getElementById("close-camera");
    this.cameraContainer = document.getElementById("camera-container");

    // Detail elements - Ditambahkan untuk kriteria wajib IndexedDB
    this.detailContent = document.getElementById("detail-content");
    this.editStoryBtn = document.getElementById("edit-story");
    this.deleteStoryBtn = document.getElementById("delete-story");
    this.editStoryForm = document.getElementById("edit-story-form");
    this.editPreview = document.getElementById("edit-preview");
    this.editPhotoInput = document.getElementById("edit-photo");
    this.editDescription = document.getElementById("edit-description");
    this.editStoryId = document.getElementById("edit-story-id");
    this.backToDetailBtn = document.getElementById("back-to-detail");

    this.map = null;
    this.storyMap = null;
    this.currentMarker = null;
    this.storyMarkers = [];
    this.stream = null;
    this.capturedImageData = null;
    this.isCameraActive = false;
    this.currentStoryId = null; // Untuk menyimpan ID cerita yang sedang ditampilkan

    // Story filtering state
    this.allStories = []; // Store all stories for filtering
    this.favoriteStories = []; // Store favorite stories
    this.currentFilter = "all"; // Default filter
    this.searchQuery = ""; // Current search query
    this.searchDebounceTimer = null; // For debouncing search input

    this.onRegisterSubmit = null;
    this.onLoginSubmit = null;
    this.onStorySubmit = null;
    this.onCaptureClick = null;
    this.onNavLinkClick = null;
    this.onMapClick = null;
    this.onFavoriteClick = null; // Added for favorite functionality
    this.onFilterChange = null; // Added for filter functionality
    this.onStoryClick = null; // Untuk menangani klik pada cerita
    this.onEditStorySubmit = null; // Untuk menangani submit form edit cerita
    this.onDeleteStory = null; // Untuk menangani hapus cerita

    this._initializeEventListeners();
    this._setupImageErrorHandling();
    this._setupAuthLinks();
    this._setupStoryFilters();
    this._setupStoryDetailActions();
  }

  _initializeEventListeners() {
    this._setupSkipToContent();
    this._setupPhotoInput();
    this._setupFormEventListeners();
    this._setupNavigationEventListeners();
    this._setupPasswordToggle();
    this._setupFormValidation();
    this._setupEditPhotoInput(); // Ditambahkan untuk input foto edit
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

      // Validate form before submission
      const nameInput = e.target.querySelector("#register-name");
      const emailInput = e.target.querySelector("#register-email");
      const passwordInput = e.target.querySelector("#register-password");

      if (
        !nameInput.validity.valid ||
        !emailInput.validity.valid ||
        !passwordInput.validity.valid
      ) {
        // Show error messages for invalid fields
        this._validateInput(nameInput);
        this._validateInput(emailInput);
        this._validateInput(passwordInput);

        this.showMessage("Harap perbaiki form sebelum mendaftar.", true);
        return;
      }

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

        this.onRegisterSubmit(data)
          .catch((err) => console.error("Register error:", err))
          .finally(() => {
            this._setButtonLoading(submitBtn, false);
          });
      }
    });

    this.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Validate form before submission
      const emailInput = e.target.querySelector("#login-email");
      const passwordInput = e.target.querySelector("#login-password");

      if (!emailInput.validity.valid || !passwordInput.validity.valid) {
        // Show error messages for invalid fields
        this._validateInput(emailInput);
        this._validateInput(passwordInput);

        this.showMessage("Harap perbaiki form sebelum login.", true);
        return;
      }

      if (this.onLoginSubmit) {
        const formData = new FormData(e.target);
        const data = {
          email: formData.get("email"),
          password: formData.get("password"),
        };

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this._setButtonLoading(submitBtn, true);

        this.onLoginSubmit(data)
          .catch((err) => console.error("Login error:", err))
          .finally(() => {
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

    // Setup camera control buttons
    if (this.openCameraBtn) {
      this.openCameraBtn.addEventListener("click", async () => {
        await this.openCamera();
      });
    }

    if (this.closeCameraBtn) {
      this.closeCameraBtn.addEventListener("click", () => {
        this.closeCamera();
      });
    }
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
        const icon = button.querySelector("i");

        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
          button.setAttribute("aria-label", "Sembunyikan password");
        } else {
          passwordInput.type = "password";
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
          button.setAttribute("aria-label", "Tampilkan password");
        }
      });
    });
  }

  _setupAuthLinks() {
    // Set up event listeners for authentication links
    document.querySelectorAll(".auth-switch a").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetSection = link.getAttribute("href").substring(1);
        this.showAuthSection(targetSection);
        window.location.hash = targetSection; // Update URL hash
      });
    });
  }

  showAuthSection(section) {
    // Hide both sections first
    this.loginSection.classList.add("hidden");
    this.registerSection.classList.add("hidden");

    // Show the selected section
    if (section === "login") {
      this.loginSection.classList.remove("hidden");
    } else if (section === "register") {
      this.registerSection.classList.remove("hidden");
    }
  }

  updateNav(isLoggedIn) {
    if (isLoggedIn) {
      // Show header with nav and hide auth container
      this.appHeader.classList.remove("hidden");
      this.authContainer.classList.add("hidden");

      // Find the first available page to display
      const firstPage = "home";
      this.showPage(firstPage);
    } else {
      // Hide header and show auth container
      this.appHeader.classList.add("hidden");
      this.authContainer.classList.remove("hidden");

      // Get current hash or default to login
      const currentHash = window.location.hash.slice(1) || "login";

      // Show appropriate auth section
      if (currentHash === "register") {
        this.showAuthSection("register");
      } else {
        this.showAuthSection("login");
      }

      // Hide all content pages
      this.pages.forEach((page) => {
        page.classList.add("hidden");
      });
    }
  }

  displayStories(stories, favorites = []) {
    // Store all stories for filtering
    if (!this.searchQuery && this.currentFilter === "all") {
      this.allStories = [...stories];
    }

    // Store favorites
    if (favorites.length) {
      this.favoriteStories = [...favorites];
    }

    this.storyList.innerHTML = "";
    this.clearStoryMapMarkers();

    stories.forEach((story) => {
      const card = document.createElement("div");
      card.className = "story-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("data-story-id", story.id);

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
        <button class="view-detail-btn" data-story-id="${story.id}">
          <i class="fas fa-eye"></i> Lihat Detail
        </button>
      `;

      // Add to DOM
      this.storyList.appendChild(card);

      // Setup favorite button
      const favoriteBtn = card.querySelector(".favorite-btn");
      favoriteBtn.addEventListener("click", (e) => {
        // Prevent event bubbling
        e.stopPropagation();
        
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

      // Setup view detail button
      const viewDetailBtn = card.querySelector(".view-detail-btn");
      viewDetailBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.onStoryClick) {
          this.onStoryClick(story.id);
        }
      });

      // Setup click on card for detail view
      card.addEventListener("click", () => {
        if (this.onStoryClick) {
          this.onStoryClick(story.id);
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

        // Add to favorites list if not already there
        if (!this.favoriteStories.some((story) => story.id === storyId)) {
          const story = this.allStories.find((story) => story.id === storyId);
          if (story) {
            this.favoriteStories.push(story);
          }
        }
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

        // Remove from favorites list
        this.favoriteStories = this.favoriteStories.filter(
          (story) => story.id !== storyId
        );

        // Reapply filter if we're currently viewing favorites
        if (this.currentFilter === "favorites") {
          this._applyFiltersAndSearch();
        }
      }

      // Reset processing state
      button.setAttribute("data-processing", "false");
    }
  }

  displayFavoriteStories(favoriteStories) {
    this.favoriteStories = [...favoriteStories];

    // Set active tab to favorites
    this.filterTabs.forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.getAttribute("data-filter") === "favorites"
      );
    });

    this.currentFilter = "favorites";
    this._displayFilteredStories(favoriteStories);
  }

  setActiveFilter(filter) {
    if (!["all", "newest", "oldest", "favorites"].includes(filter)) {
      filter = "all";
    }

    this.currentFilter = filter;

    // Update UI
    this.filterTabs.forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.getAttribute("data-filter") === filter
      );
    });

    // Apply filter
    this._applyFiltersAndSearch();
  }

  clearSearch() {
    if (this.storySearch) {
      this.storySearch.value = "";
      this.searchQuery = "";
      this._applyFiltersAndSearch();
    }
  }

  _applyFiltersAndSearch() {
    if (!this.allStories.length) return;

    let filteredStories = [...this.allStories];

    // Apply search if there's a query
    if (this.searchQuery) {
      filteredStories = filteredStories.filter((story) => {
        return (
          story.name.toLowerCase().includes(this.searchQuery) ||
          story.description.toLowerCase().includes(this.searchQuery)
        );
      });
    }

    // Apply sorting/filtering based on current filter
    switch (this.currentFilter) {
      case "newest":
        filteredStories.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        break;
      case "oldest":
        filteredStories.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        break;
      case "favorites":
        filteredStories = this.favoriteStories;
        break;
      default: // "all" - newest first by default
        filteredStories.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    // Display the filtered stories
    this._displayFilteredStories(filteredStories);
  }

  _displayFilteredStories(stories) {
    this.storyList.innerHTML = "";
    this.clearStoryMapMarkers();

    if (stories.length === 0) {
      let message = "Tidak ada cerita yang ditemukan";

      if (this.searchQuery) {
        message = `Tidak ada cerita yang cocok dengan "${this.searchQuery}"`;
      } else if (this.currentFilter === "favorites") {
        message = "Belum ada cerita favorit";
      }

      this.storyList.innerHTML = `
        <div class="empty-state">
        <i class="fas fa-search fa-3x"></i>
        <h3>${message}</h3>
        <p>Coba dengan pencarian lain atau pilih filter yang berbeda.</p>
        </div>
      `;
      return;
    }

    // Tampilkan stories tanpa staggered effect atau timeout
    stories.forEach((story) => {
      const card = document.createElement("div");
      card.className = "story-card";
      card.setAttribute("role", "listitem");

      const isFavorited = this.favoriteStories.some(
        (fav) => fav.id === story.id
      );

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

  async openCamera() {
    if (this.isCameraActive) return;

    try {
      // Tampilkan container kamera
      if (this.cameraContainer) {
        this.cameraContainer.classList.remove("hidden");
      }

      // Tampilkan loading indicator
      const loadingIndicator = document.createElement("div");
      loadingIndicator.className = "camera-loading";
      loadingIndicator.innerHTML =
        '<div class="loading-spinner"></div><p>Memulai kamera...</p>';
      this.cameraContainer.appendChild(loadingIndicator);

      // Minta akses kamera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "environment", // Gunakan kamera belakang secara default
        },
      });

      // Hilangkan loading indicator setelah kamera siap
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }

      // Set stream ke video element
      this.camera.srcObject = stream;
      this.stream = stream;
      this.isCameraActive = true;

      // Play video
      await this.camera.play();

      // Sembunyikan tombol open camera
      if (this.openCameraBtn) {
        this.openCameraBtn.classList.add("hidden");
      }
    } catch (error) {
      // Hapus loading indicator jika terjadi error
      const loadingIndicator =
        this.cameraContainer.querySelector(".camera-loading");
      if (loadingIndicator) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }

      this.showMessage("Tidak dapat mengakses kamera: " + error.message, true);
      this.closeCamera();
    }
  }

  closeCamera() {
    // Stop kamera
    this.stopCamera();
    this.isCameraActive = false;

    // Sembunyikan container kamera
    if (this.cameraContainer) {
      this.cameraContainer.classList.add("hidden");
    }

    // Tampilkan tombol open camera
    if (this.openCameraBtn) {
      this.openCameraBtn.classList.remove("hidden");
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      this.camera.srcObject = null;
    }
  }

  async setupCamera() {
    // Tidak perlu implementasi lagi di sini karena kita hanya membuka kamera
    // saat user menekan tombol open camera
    return true;
  }

  captureImage() {
    if (!this.stream || !this.isCameraActive) {
      return null;
    }

    try {
      const context = this.canvas.getContext("2d");

      // Make sure canvas has the same size as video
      const width = this.camera.videoWidth;
      const height = this.camera.videoHeight;

      // Set canvas size to match video
      this.canvas.width = width;
      this.canvas.height = height;

      // Draw video to canvas
      context.drawImage(this.camera, 0, 0, width, height);

      // Compress image for better performance
      this.capturedImageData = this.canvas.toDataURL("image/jpeg", 0.85); // 85% quality
      return this.capturedImageData;
    } catch (error) {
      console.error("Error capturing image:", error);
      return null;
    }
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

    // Tangerang coordinates
    const tangerangCoordinates = [-6.1783, 106.6319];
    this.map = L.map(this.mapContainer).setView(tangerangCoordinates, 13);

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

    const dark = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
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

    // Use OpenStreetMap as default
    osm.addTo(this.map);

    // Tambahkan layer control dengan lebih banyak opsi
    const baseLayers = {
      OpenStreetMap: osm,
      "Dark Theme": dark,
      "Light Theme": carto,
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

    // Indonesia's center coordinates and better zoom level
    const indonesiaCenter = [-2.5, 118];
    const zoomLevel = 5;

    this.storyMap = L.map(this.storyMapContainer, {
      center: indonesiaCenter,
      zoom: zoomLevel,
      scrollWheelZoom: true,
      zoomControl: true,
      maxBounds: [
        [-13, 93], // Southwest corner (approximate bounds of Indonesia)
        [8, 142], // Northeast corner
      ],
      minZoom: 5, // Prevent zooming out too far
    });

    // Add multiple tile layers
    const osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    );

    const dark = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    );

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "© Esri",
        maxZoom: 19,
      }
    );

    const topo = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenTopoMap contributors",
        maxZoom: 19,
      }
    );

    // Add CartoDB Light theme
    const light = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    );

    // Use OpenStreetMap as default
    osm.addTo(this.storyMap);

    // Add layer control
    const baseLayers = {
      OpenStreetMap: osm,
      "Dark Theme": dark,
      "Light Theme": light,
      Satellite: satellite,
      Topographic: topo,
    };

    L.control.layers(baseLayers).addTo(this.storyMap);

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
    console.log(`Showing message: ${message}, isError: ${isError}`);

    // Check if SweetAlert2 is available
    if (typeof Swal === "undefined") {
      console.error("SweetAlert2 is not loaded. Falling back to alert.");
      alert(message);
      return;
    }

    try {
      Swal.fire({
        title: isError ? "Gagal!" : "Sukses!",
        text: message,
        icon: isError ? "error" : "success",
        confirmButtonColor: "#3B82F6",
        timer: isError ? undefined : 2000,
        showConfirmButton: isError,
        background: "#2d3536", // Dark background
        color: "#ffffff", // White text
        iconColor: isError ? "#dc3545" : "#4BB543", // Red for error, green for success
        position: "top", // Changed from top-end to top to avoid header overlap
        toast: !isError,
        timerProgressBar: !isError,
        // Add custom padding to avoid header overlap
        customClass: {
          container: "swal2-container-custom",
          popup: "swal2-popup-custom",
        },
        // Add padding to the top to avoid header overlap
        padding: "1em",
        // Ensure toast is shown below the header
        didOpen: (toast) => {
          if (!isError) {
            toast.style.marginTop = "70px";
          }
        },
      });
    } catch (error) {
      console.error("Error showing SweetAlert2 message:", error);
      alert(message);
    }
  }

  resetStoryForm() {
    this.storyForm.reset();
    this.photoPreview.classList.add("hidden");
    this.photoPreview.src = "";
    this.photoInput.value = "";
    this.capturedImageData = null;

    // Make sure camera is closed when resetting form
    this.closeCamera();
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
    // Update active navbar link
    this._updateActiveNavLink(pageId);

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

  _updateActiveNavLink(pageId) {
    // Remove active class from all links
    this.navLinks.forEach((link) => {
      link.classList.remove("active");
    });

    // Add active class to current page link
    const activeLink = document.querySelector(`nav a[href="#${pageId}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
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
      // Store original text
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
      }
      // Clear text when loading
      button.innerHTML = "";
      // Add aria-busy for accessibility
      button.setAttribute("aria-busy", "true");
    } else {
      button.disabled = false;
      button.classList.remove("loading");
      // Restore original text
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        // Clean up
        delete button.dataset.originalText;
      }
      // Reset aria-busy
      button.removeAttribute("aria-busy");
    }
  }

  addStoryMarker(story) {
    if (!this.storyMap || !story.lat || !story.lon) return;

    // Create a custom icon with a more visible design
    const storyIcon = L.divIcon({
      html: `<div class="custom-marker"><i class="fas fa-map-marker-alt"></i></div>`,
      className: "story-marker-icon",
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });

    const marker = L.marker([story.lat, story.lon], { icon: storyIcon }).addTo(
      this.storyMap
    );
    marker.bindPopup(
      `
      <div class="marker-popup">
        <h4>${story.name}</h4>
        <p>${story.description.substring(0, 100)}${
        story.description.length > 100 ? "..." : ""
      }</p>
        <div class="popup-image">
          <img src="${story.photoUrl}" alt="Foto cerita ${
        story.name
      }" style="max-width: 100%; max-height: 120px; object-fit: cover; border-radius: 4px;">
        </div>
        <p class="popup-date">Dibuat: ${new Date(
          story.createdAt
        ).toLocaleDateString("id-ID")}</p>
      </div>
    `,
      {
        maxWidth: 300,
        className: "story-popup",
      }
    );

    this.storyMarkers.push(marker);
  }

  async reverseGeocode(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      return data.display_name || "Unknown location";
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return "Unknown location";
    }
  }

  _setupStoryFilters() {
    // Setup search functionality
    if (this.storySearch && this.searchButton) {
      // Tambahkan event listener untuk realtime search
      this.storySearch.addEventListener("input", (e) => {
        // Bersihkan timer sebelumnya untuk debouncing
        clearTimeout(this.searchDebounceTimer);

        // Set timer baru untuk debouncing (delay 300ms)
        this.searchDebounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          this._applyFiltersAndSearch();
        }, 300);
      });

      // Tetap pertahankan search button untuk aksesibilitas
      this.searchButton.addEventListener("click", () => {
        this.searchQuery = this.storySearch.value.trim().toLowerCase();
        this._applyFiltersAndSearch();
      });

      this.storySearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.searchQuery = this.storySearch.value.trim().toLowerCase();
          this._applyFiltersAndSearch();
        }
      });
    }

    // Setup filter tabs
    if (this.filterTabs) {
      this.filterTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          // Remove active class from all tabs
          this.filterTabs.forEach((t) => t.classList.remove("active"));

          // Add active class to clicked tab
          tab.classList.add("active");

          // Set current filter
          this.currentFilter = tab.getAttribute("data-filter");

          // Apply filter
          this._applyFiltersAndSearch();

          // Call callback if it exists
          if (this.onFilterChange) {
            this.onFilterChange(this.currentFilter);
          }
        });
      });
    }
  }

  _setupFormValidation() {
    // Login form validation
    if (this.loginForm) {
      const emailInput = this.loginForm.querySelector("#login-email");
      const passwordInput = this.loginForm.querySelector("#login-password");

      // Add validation messages if they don't exist
      this._addValidationMessage(emailInput, "Masukkan email yang valid");
      this._addValidationMessage(passwordInput, "Password minimal 6 karakter");

      // Live validation
      emailInput.addEventListener("input", () => {
        this._validateInput(emailInput);
      });

      passwordInput.addEventListener("input", () => {
        this._validateInput(passwordInput);
      });
    }

    // Register form validation
    if (this.registerForm) {
      const nameInput = this.registerForm.querySelector("#register-name");
      const emailInput = this.registerForm.querySelector("#register-email");
      const passwordInput =
        this.registerForm.querySelector("#register-password");

      // Add validation messages
      this._addValidationMessage(nameInput, "Nama minimal 3 karakter");
      this._addValidationMessage(emailInput, "Masukkan email yang valid");
      this._addValidationMessage(passwordInput, "Password minimal 6 karakter");

      // Live validation
      nameInput.addEventListener("input", () => {
        this._validateInput(nameInput);
      });

      emailInput.addEventListener("input", () => {
        this._validateInput(emailInput);
      });

      passwordInput.addEventListener("input", () => {
        this._validateInput(passwordInput);
      });
    }
  }

  _addValidationMessage(input, message) {
    // Check if a validation message already exists
    let validationMsg = input.nextElementSibling;
    if (
      !validationMsg ||
      !validationMsg.classList.contains("validation-message")
    ) {
      validationMsg = document.createElement("div");
      validationMsg.className = "validation-message";
      validationMsg.innerText = message;

      // For password inputs, add after the password-input div
      if (input.id === "login-password" || input.id === "register-password") {
        const passwordInputDiv = input.closest(".password-input");
        passwordInputDiv.parentNode.insertBefore(
          validationMsg,
          passwordInputDiv.nextSibling
        );
      } else {
        // For other inputs, add right after the input
        input.parentNode.insertBefore(validationMsg, input.nextSibling);
      }
    }
  }

  _validateInput(input) {
    // Remove existing classes
    input.classList.remove("error", "success");

    if (input.validity.valid) {
      input.classList.add("success");
    } else {
      input.classList.add("error");
    }
  }

  // Ditambahkan untuk kriteria wajib IndexedDB - Setup event untuk edit foto
  _setupEditPhotoInput() {
    if (this.editPhotoInput) {
      this.editPhotoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
          if (file.size > 1 * 1024 * 1024) {
            this.showMessage("Ukuran foto terlalu besar. Maksimal 1MB.", true);
            this.editPhotoInput.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            this.editPreview.src = event.target.result;
            this.editPreview.classList.remove("hidden");
          };
          reader.readAsDataURL(file);
        } else {
          this.showMessage("Harap pilih file gambar yang valid.", true);
          this.editPhotoInput.value = "";
        }
      });
    }
  }

  // Ditambahkan untuk kriteria wajib IndexedDB - Setup action pada halaman detail
  _setupStoryDetailActions() {
    // Setup edit button
    if (this.editStoryBtn) {
      this.editStoryBtn.addEventListener("click", () => {
        if (this.currentStoryId) {
          this.navigateTo("edit-story-page");
        }
      });
    }

    // Setup delete button
    if (this.deleteStoryBtn) {
      this.deleteStoryBtn.addEventListener("click", () => {
        if (this.currentStoryId && this.onDeleteStory) {
          // Konfirmasi sebelum menghapus
          this._showDeleteConfirmation(this.currentStoryId);
        }
      });
    }

    // Setup edit story form submission
    if (this.editStoryForm) {
      this.editStoryForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (this.onEditStorySubmit) {
          const storyId = this.editStoryId.value;
          const description = this.editDescription.value;
          const photoFile = this.editPhotoInput.files[0];

          // Show loading state
          const submitBtn = e.target.querySelector('button[type="submit"]');
          this._setButtonLoading(submitBtn, true);

          this.onEditStorySubmit(storyId, description, photoFile)
            .catch((err) => console.error("Edit story error:", err))
            .finally(() => {
              this._setButtonLoading(submitBtn, false);
            });
        }
      });
    }
  }

  // Tampilkan konfirmasi hapus
  _showDeleteConfirmation(storyId) {
    Swal.fire({
      title: 'Hapus Cerita?',
      text: "Cerita yang sudah dihapus tidak dapat dikembalikan",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus cerita',
      cancelButtonText: 'Batal',
      customClass: {
        container: 'swal2-container-custom',
        popup: 'swal2-popup-custom',
      },
    }).then((result) => {
      if (result.isConfirmed && this.onDeleteStory) {
        this._setButtonLoading(this.deleteStoryBtn, true);
        this.onDeleteStory(storyId)
          .catch((err) => console.error("Delete story error:", err))
          .finally(() => {
            this._setButtonLoading(this.deleteStoryBtn, false);
          });
      }
    });
  }

  // Ditambahkan untuk kriteria wajib IndexedDB - Menampilkan detail cerita
  displayStoryDetail(story) {
    if (!story || !this.detailContent) return;

    this.currentStoryId = story.id;

    // Format location display
    let locationDisplay = "Lokasi tidak tersedia";
    if (story.lat && story.lon) {
      const lat = parseFloat(story.lat).toFixed(4);
      const lon = parseFloat(story.lon).toFixed(4);
      locationDisplay = `${lat}, ${lon}`;
    }

    // Tampilkan detail cerita
    this.detailContent.innerHTML = `
      <img src="${story.photoUrl}" alt="Foto cerita ${story.name}">
      <h2>${story.name}</h2>
      <div class="meta">
        <span><i class="fas fa-calendar"></i> ${new Date(story.createdAt).toLocaleDateString("id-ID")}</span>
        ${story.lastUpdated ? `<span><i class="fas fa-edit"></i> Diedit: ${new Date(story.lastUpdated).toLocaleDateString("id-ID")}</span>` : ''}
      </div>
      <p>${story.description}</p>
      <div class="location">
        <i class="fas fa-map-marker-alt"></i> ${locationDisplay}
      </div>
    `;

    // Set data untuk form edit
    if (this.editStoryId) this.editStoryId.value = story.id;
    if (this.editDescription) this.editDescription.value = story.description;
    if (this.editPreview) {
      this.editPreview.src = story.photoUrl;
      this.editPreview.classList.remove("hidden");
    }

    // Tampilkan halaman detail
    this.navigateTo("story-detail");
  }
}

export default View;
