class View {
  constructor() {
    this.storyList = document.getElementById('story-list');
    this.storyForm = document.getElementById('story-form');
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.camera = document.getElementById('camera');
    this.canvas = document.getElementById('canvas');
    this.captureBtn = document.getElementById('capture');
    this.mapContainer = document.getElementById('map');
    this.storyMapContainer = document.getElementById('story-map');
    this.pages = document.querySelectorAll('.page');
    this.photoInput = document.getElementById('photo');
    this.photoPreview = document.getElementById('preview');
    this.navList = document.getElementById('nav-list');
    this.navLinks = document.querySelectorAll('nav a');
    
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
  }

  _initializeEventListeners() {
    this._setupSkipToContent();
    this._setupPhotoInput();
    this._setupFormEventListeners();
    this._setupNavigationEventListeners();
    this._setupPasswordToggle();
  }

  _setupSkipToContent() {
    const mainContent = document.querySelector('#main-content');
    const skipLink = document.querySelector('.skip-to-content');
    
    if (skipLink && mainContent) {
      skipLink.addEventListener('click', (event) => {
        event.preventDefault();
        skipLink.blur();
        mainContent.focus();
        mainContent.scrollIntoView();
      });
    }
  }

  _setupPhotoInput() {
    this.photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        if (file.size > 1 * 1024 * 1024) {
          this.showMessage('Ukuran foto terlalu besar. Maksimal 1MB.', true);
          this.photoInput.value = '';
          return;
        }
        this._previewImageFile(file);
      } else {
        this.showMessage('Harap pilih file gambar yang valid.', true);
        this.photoInput.value = '';
      }
    });
  }

  _previewImageFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      this.photoPreview.src = event.target.result;
      this.photoPreview.classList.remove('hidden');
      this.capturedImageData = null;
    };
    reader.readAsDataURL(file);
  }

  _setupFormEventListeners() {
    this.registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.onRegisterSubmit) {
        const formData = new FormData(e.target);
        const data = {
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
        };
        this.onRegisterSubmit(data);
      }
    });

    this.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.onLoginSubmit) {
        const formData = new FormData(e.target);
        const data = {
          email: formData.get('email'),
          password: formData.get('password'),
        };
        this.onLoginSubmit(data);
      }
    });

    this.storyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.onStorySubmit) {
        const description = e.target.description.value.trim();
        const photoFile = this.getPhotoFromInput();
        
        const storyData = {
          description,
          photoFile,
          imageData: this.capturedImageData
        };
        
        this.onStorySubmit(storyData);
      }
    });

    this.captureBtn.addEventListener('click', () => {
      if (this.onCaptureClick) {
        this.onCaptureClick();
      }
    });
  }

  _setupNavigationEventListeners() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        if (this.onNavLinkClick) {
          const targetPage = link.getAttribute('href').substring(1);
          this.onNavLinkClick(e, targetPage);
        }
      });
    });
  }

  _setupPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          button.classList.remove('fa-eye');
          button.classList.add('fa-eye-slash');
        } else {
          passwordInput.type = 'password';
          button.classList.remove('fa-eye-slash');
          button.classList.add('fa-eye');
        }
      });
    });
  }

  updateNav(isLoggedIn) {
    const loginNav = this.navList.querySelector('.login-nav');
    const registerNav = this.navList.querySelector('.register-nav');
    const logoutNav = this.navList.querySelector('.logout-nav');
    
    if (isLoggedIn) {
      loginNav.classList.add('hidden');
      registerNav.classList.add('hidden');
      logoutNav.classList.remove('hidden');
    } else {
      loginNav.classList.remove('hidden');
      registerNav.classList.remove('hidden');
      logoutNav.classList.add('hidden');
    }
  }

  displayStories(stories, favorites = []) {
    this.storyList.innerHTML = '';
    this.clearStoryMapMarkers();
    
    stories.forEach(story => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.setAttribute('role', 'listitem');
      
      const isFavorited = favorites.some(fav => fav.id === story.id);
      
      card.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto cerita ${story.name}" loading="lazy">
        <h3>${story.name}</h3>
        <p>${story.description}</p>
        <p>Lokasi: ${story.lat ?? '-'}, ${story.lon ?? '-'}</p>
        <p>Dibuat: ${new Date(story.createdAt).toLocaleDateString('id-ID')}</p>
        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}"
                 data-story-id="${story.id}"
                 aria-label="${isFavorited ? 'Hapus dari favorit' : 'Tambah ke favorit'}"
                 aria-pressed="${isFavorited}">
            <i class="fas fa-heart"></i> ${isFavorited ? 'Hapus Favorit' : 'Tambah Favorit'}
        </button>
      `;
      
      this.storyList.appendChild(card);

      // Add map marker if coordinates exist
      if (story.lat && story.lon && this.storyMap) {
        const marker = L.marker([story.lat, story.lon]).addTo(this.storyMap);
        marker.bindPopup(`
          <b>${story.name}</b><br>
          ${story.description}<br>
          <img src="${story.photoUrl}" alt="Foto cerita ${story.name}" style="max-width: 100px;">
        `);
        this.storyMarkers.push(marker);
      }
    });

    // Add event listeners for favorite buttons
    this.storyList.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const storyId = btn.getAttribute('data-story-id');
        const story = stories.find(s => s.id === storyId);
        const addToFavorite = !btn.classList.contains('favorited');
        
        if (this.onFavoriteClick && story) {
          this.onFavoriteClick(story, addToFavorite);
        }
      });
    });
  }

  // Method to update favorite button state after favorite action
  updateFavoriteButton(storyId, isFavorited) {
    const btn = this.storyList.querySelector(`[data-story-id="${storyId}"]`);
    if (btn) {
      if (isFavorited) {
        btn.classList.add('favorited');
        btn.innerHTML = '<i class="fas fa-heart"></i> Hapus Favorit';
        btn.setAttribute('aria-label', 'Hapus dari favorit');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('favorited');
        btn.innerHTML = '<i class="fas fa-heart"></i> Tambah Favorit';
        btn.setAttribute('aria-label', 'Tambah ke favorit');
        btn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  // Method to display only favorite stories
  displayFavoriteStories(favoriteStories) {
    this.storyList.innerHTML = '';
    this.clearStoryMapMarkers();
    
    if (favoriteStories.length === 0) {
      this.storyList.innerHTML = '<p class="no-favorites">Belum ada cerita favorit.</p>';
      return;
    }
    
    // Display favorites with all stories marked as favorited
    this.displayStories(favoriteStories, favoriteStories);
  }

  async setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.camera.srcObject = stream;
      this.stream = stream;
      return stream;
    } catch (error) {
      throw new Error('Tidak dapat mengakses kamera: ' + error.message);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.camera.srcObject = null;
    }
  }

  captureImage() {
    if (!this.stream) {
      return null;
    }
    
    const context = this.canvas.getContext('2d');
    this.canvas.width = this.camera.videoWidth;
    this.canvas.height = this.camera.videoHeight;
    context.drawImage(this.camera, 0, 0);
    
    this.capturedImageData = this.canvas.toDataURL('image/jpeg');
    return this.capturedImageData;
  }

  showImagePreview(imageData) {
    this.photoPreview.src = imageData;
    this.photoPreview.classList.remove('hidden');
    this.photoInput.value = '';
  }

  setupMap() {
    if (this.map) {
      return this.map;
    }
    this.mapContainer.setAttribute('aria-label', 'Peta interaktif untuk memilih lokasi cerita');
    this.map = L.map(this.mapContainer).setView([-6.185931, 106.552764], 17);
    
    // Tambahkan beragam tile layers
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    });
    
    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '© CartoDB',
    });
    
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
    });
    
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap contributors',
    });

    osm.addTo(this.map);

    // Tambahkan layer control dengan lebih banyak opsi
    const baseLayers = {
      "OpenStreetMap": osm,
      "CartoDB Light": carto,
      "Satellite": satellite,
      "Topographic": topo
    };
    
    L.control.layers(baseLayers).addTo(this.map);

    this.map.on('click', (e) => {
      if (this.onMapClick) {
        this.onMapClick(e.latlng);
      }
    });

    return this.map;
  }

  setupStoryMap() {
    if (this.storyMap) {
      return this.storyMap;
    }
    this.storyMapContainer.setAttribute('aria-label', 'Peta interaktif untuk menampilkan lokasi cerita');

    this.storyMap = L.map(this.storyMapContainer).setView([-6.185931, 106.552764], 10);
    
    // Tambahkan beragam tile layers
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    });
    
    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '© CartoDB',
    });
    
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
    });
    
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap contributors',
    });

    osm.addTo(this.storyMap);

    // Tambahkan layer control dengan lebih banyak opsi
    const baseLayers = {
      "OpenStreetMap": osm,
      "CartoDB Light": carto,
      "Satellite": satellite,
      "Topographic": topo
    };
    
    L.control.layers(baseLayers).addTo(this.storyMap);

    return this.storyMap;
  }

  updateMapMarker(latlng) {
    if (!this.map) return;
    
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }
    
    this.currentMarker = L.marker([latlng.lat, latlng.lng]).addTo(this.map);
    this.currentMarker.bindPopup('Lokasi Cerita').openPopup();
  }

  clearMapMarkers() {
    if (this.map && this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
      this.currentMarker = null;
    }
  }

  clearStoryMapMarkers() {
    if (this.storyMap && this.storyMarkers.length > 0) {
      this.storyMarkers.forEach(marker => this.storyMap.removeLayer(marker));
      this.storyMarkers = [];
    }
  }

  showPage(pageId) {
    this.pages.forEach(page => {
      page.classList.toggle('hidden', page.id !== pageId);
    });
  }

  showMessage(message, isError = false) {
    Swal.fire({
      title: isError ? 'Error!' : 'Success!',
      text: message,
      icon: isError ? 'error' : 'success',
      confirmButtonColor: '#3B82F6',
      timer: isError ? undefined : 2000,
      showConfirmButton: isError,
    });
  }

  resetStoryForm() {
    this.storyForm.reset();
    this.photoPreview.classList.add('hidden');
    this.photoPreview.src = '';
    this.photoInput.value = '';
    this.capturedImageData = null;
  }

  getPhotoFromInput() {
    return this.photoInput.files.length > 0 ? this.photoInput.files[0] : null;
  }

  navigateTo(hash) {
    window.location.hash = hash;
  }

  getCurrentHash() {
    return window.location.hash.slice(1) || 'login';
  }

  handlePageViewTransition(pageId, callback) {
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        // Tambahkan animasi custom untuk transisi halaman
        const oldPage = document.querySelector('.page:not(.hidden)');
        const newPage = document.getElementById(pageId);
        
        if (oldPage) {
          oldPage.style.animation = 'fadeOut 0.3s ease-out forwards';
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        this.showPage(pageId);
        
        if (newPage) {
          newPage.style.animation = 'fadeIn 0.5s ease-in forwards';
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
    let notifButton = document.querySelector('#notification-button');
    
    if (!notifButton) {
      notifButton = document.createElement('button');
      notifButton.id = 'notification-button';
      notifButton.textContent = 'Aktifkan Notifikasi';
      notifButton.className = 'btn-secondary';
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
    
    notifButton.addEventListener('click', callback);
  }
  
  updateNotificationUI(isEnabled) {
    const notifButton = document.querySelector('#notification-button');
    if (notifButton) {
      if (isEnabled) {
        notifButton.textContent = 'Notifikasi Aktif';
        notifButton.style.background = '#10B981';
        notifButton.disabled = true;
      } else {
        notifButton.textContent = 'Aktifkan Notifikasi';
        notifButton.style.background = '#3B82F6';
        notifButton.disabled = false;
      }
    }
  }
}

export default View;