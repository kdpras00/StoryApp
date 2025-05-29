import { urlBase64ToUint8Array } from './utils.js';

const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

class Presenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.location = { lat: null, lng: null };
    this.map = null;
    this._currentHash = null;
    
    this.view.onRegisterSubmit = this.handleRegisterSubmit.bind(this);
    this.view.onLoginSubmit = this.handleLoginSubmit.bind(this);
    this.view.onStorySubmit = this.handleStorySubmit.bind(this);
    this.view.onCaptureClick = this.handleCaptureClick.bind(this);
    this.view.onNavLinkClick = this.handleNavLinkClick.bind(this);
    this.view.onMapClick = this.handleMapClick.bind(this);
    
    this.init();
  }

  async init() {
    await this.setupPushNotification();
    this.view.updateNav(this.model.isLoggedIn());
    this.setupRouting();
    
    if (this.model.isLoggedIn()) {
      await this.loadStories();
    } else {
      this.view.navigateTo('login');
    }
    
    window.addEventListener('hashchange', this.handleRouteChange.bind(this));
    this.handleRouteChange();
  }

  handleMapClick(latlng) {
    this.location = { lat: latlng.lat, lng: latlng.lng };
    this.view.updateMapMarker(latlng);
  }

  handleCaptureClick() {
    const imageData = this.view.captureImage();
    if (imageData) {
      this.view.showImagePreview(imageData);
    } else {
      this.view.showMessage('Gagal mengambil gambar dari kamera.', true);
    }
  }

  async handleRegisterSubmit(data) {
    const result = await this.model.register(data);
    this.view.showMessage(result.message, result.error);
    if (!result.error) {
      this.view.navigateTo('login');
    }
  }

  async handleLoginSubmit(data) {
    const result = await this.model.login(data);
    this.view.showMessage(result.message, result.error);
    if (!result.error) {
      this.view.updateNav(true);
      this.view.navigateTo('home');
      await this.loadStories();
      if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await this.subscribeToPush(registration);
        }
      }
    }
  }

  async handleStorySubmit(storyData) {
    if (!this.model.isLoggedIn()) {
      this.view.showMessage('Silakan login terlebih dahulu', true);
      this.view.navigateTo('login');
      return;
    }

    const { description, photoFile, imageData } = storyData;

    if (!description) {
      this.view.showMessage('Deskripsi tidak boleh kosong.', true);
      return;
    }

    if (!this.location.lat || !this.location.lng) {
      this.view.showMessage('Harap pilih lokasi di peta.', true);
      return;
    }

    const formData = new FormData();
    let photoBlob;

    if (photoFile) {
      if (photoFile.size > 1 * 1024 * 1024) {
        this.view.showMessage('Ukuran foto terlalu besar. Maksimal 1MB.', true);
        return;
      }
      photoBlob = photoFile;
    } else if (imageData) {
      try {
        photoBlob = await (await fetch(imageData)).blob();
        if (photoBlob.size > 1 * 1024 * 1024) {
          this.view.showMessage('Ukuran foto terlalu besar. Maksimal 1MB.', true);
          return;
        }
      } catch (error) {
        this.view.showMessage('Gagal memproses gambar dari kamera.', true);
        return;
      }
    } else {
      this.view.showMessage('Harap pilih foto atau ambil gambar.', true);
      return;
    }

    formData.append('description', description);
    formData.append('photo', photoBlob, 'story.jpg');
    formData.append('lat', this.location.lat);
    formData.append('lon', this.location.lng);

    try {
      const result = await this.model.addStory(formData);
      this.view.showMessage(result.message, result.error);
      if (!result.error) {
        this.cleanupAfterStorySubmit();
        await this.loadStories();
        this.view.navigateTo('home');
      }
    } catch (error) {
      this.view.showMessage('Gagal menambahkan cerita: ' + error.message, true);
    }
  }

  cleanupAfterStorySubmit() {
    this.view.stopCamera();
    this.view.resetStoryForm();
    this.location = { lat: null, lng: null };
    this.view.clearMapMarkers();
  }

  handleNavLinkClick(event, targetPage) {
    if (!this.model.isLoggedIn() && (targetPage === 'home' || targetPage === 'add-story')) {
      event.preventDefault();
      this.view.showMessage('Silakan login terlebih dahulu', true);
      this.view.navigateTo('login');
    } else if (targetPage === 'logout') {
      event.preventDefault();
      this.handleLogout();
    }
  }

  handleLogout() {
    this.model.logout();
    this.view.updateNav(false);
    this.view.stopCamera();
    this.view.showMessage('Berhasil logout', false);
    this.view.navigateTo('login');
  }

  handleRouteChange() {
    const hash = this.view.getCurrentHash();
    const previousHash = this._currentHash;
    this._currentHash = hash;
    
    if (!this.model.isLoggedIn() && (hash === 'home' || hash === 'add-story')) {
      this.view.navigateTo('login');
      return;
    }
    
    // Matikan kamera jika berpindah dari halaman add-story
    if (previousHash === 'add-story' && hash !== 'add-story') {
      this.view.stopCamera();
    }
    
    this.view.handlePageViewTransition(hash, async () => {
      await this.handlePageSpecificSetup(hash);
    });
  }

  async handlePageSpecificSetup(pageId) {
    switch (pageId) {
      case 'home':
        await this.loadStories();
        if (!this.view.storyMap) {
          this.view.setupStoryMap();
        }
        break;
      case 'add-story':
        await this.setupAddStoryPage();
        break;
      default:
        this.view.stopCamera();
        break;
    }
  }

  async setupAddStoryPage() {
    try {
      await this.view.setupCamera();
      if (!this.map) {
        this.map = this.view.setupMap();
      }
      this.location = { lat: null, lng: null };
      this.view.clearMapMarkers();
    } catch (error) {
      this.view.showMessage('Kamera tidak tersedia', true);
    }
  }

  async loadStories() {
    if (!this.model.isLoggedIn()) return;
    
    try {
      const stories = await this.model.fetchStories();
      this.view.displayStories(stories);
    } catch (error) {
      this.view.showMessage('Gagal memuat cerita: ' + error.message, true);
    }
  }

  async setupPushNotification() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported in this browser');
      return;
    }
  
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permissionStatus = Notification.permission;
      
      switch (permissionStatus) {
        case 'granted':
          await this.subscribeToPush(registration);
          break;
        case 'denied':
          console.log('Push notification permission was denied');
          this.view.updateNotificationUI(false);
          break;
        case 'default':
        default:
          this.view.showMessage('Aplikasi akan meminta izin untuk menampilkan notifikasi', false);
          this.view.setupNotificationButton(() => this.requestNotificationPermission(registration));
          break;
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  async requestNotificationPermission(registration) {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        await this.subscribeToPush(registration);
        this.view.showMessage('Notifikasi berhasil diaktifkan!', false);
        this.view.updateNotificationUI(true);
      } else {
        this.view.updateNotificationUI(false);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      this.view.showMessage('Gagal meminta izin notifikasi', true);
      if (error.name === 'NotAllowedError') {
        this.view.showMessage('Notifikasi tidak diizinkan. Ubah pengaturan browser untuk mengaktifkan notifikasi.', false);
        this.view.updateNotificationUI(false);
      }
    }
  }
  
  async subscribeToPush(registration) {
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      
      if (this.model.isLoggedIn()) {
        await this.model.subscribePush(subscription);
        console.log('Push notification subscription successful');
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
      if (error.name === 'NotAllowedError') {
        this.view.showMessage('Notifikasi tidak diizinkan. Ubah pengaturan browser untuk mengaktifkan notifikasi.', false);
        this.view.updateNotificationUI(false);
      }
    }
  }

  setupRouting() {
    const hash = this.view.getCurrentHash();
    this.handleRouteChange();
  }
}

export default Presenter;