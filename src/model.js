const API_BASE_URL = 'https://story-api.dicoding.dev/v1';

class Model {
  constructor() {
    this.token = localStorage.getItem('token') || null;
  }

  async register({ name, email, password }) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mendaftar.');
      }
      return data;
    } catch (error) {
      return { error: true, message: error.message || 'Gagal mendaftar. Silakan coba lagi.' };
    }
  }

  async login({ email, password }) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login gagal.');
      }
      if (!data.error) {
        this.token = data.loginResult.token;
        localStorage.setItem('token', this.token);
      }
      return data;
    } catch (error) {
      return { error: true, message: error.message || 'Login gagal. Periksa koneksi Anda.' };
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async fetchStories() {
    try {
      const response = await fetch(`${API_BASE_URL}/stories?location=1`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil cerita.');
      }
      const data = await response.json();
      return data.listStory || [];
    } catch (error) {
      console.error('Fetch stories error:', error);
      return [];
    }
  }

  async addStory(formData) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal menambahkan cerita.');
      }
      return data;
    } catch (error) {
      console.error('Add story error:', error);
      return { error: true, message: error.message || 'Gagal menambahkan cerita. Silakan coba lagi.' };
    }
  }

  async subscribePush(subscription) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) {
        throw new Error('Gagal berlangganan notifikasi.');
      }
      return await response.json();
    } catch (error) {
      console.error('Subscribe push error:', error);
      return { error: true };
    }
  }

  isLoggedIn() {
    return !!this.token;
  }
}

export default Model;