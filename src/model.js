import {
  saveStoriesToIndexedDB,
  getStoriesFromIndexedDB,
  addToFavorites,
  removeFromFavorites,
  getFavoriteStories,
  isStoryInFavorites,
} from "./utils.js";

const API_BASE_URL = "https://story-api.dicoding.dev/v1";

class Model {
  constructor() {
    this.API_BASE_URL = API_BASE_URL;
    this.token = localStorage.getItem("token") || null;
    this._isLoggedIn = !!this.token;
    this.stories = [];
    this.favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    this.initIndexedDB();
  }

  // Initialize IndexedDB for offline support
  async initIndexedDB() {
    try {
      // Check if IndexedDB is supported
      if (!("indexedDB" in window)) {
        console.warn("IndexedDB not supported");
        return;
      }

      // Open the database
      const dbPromise = indexedDB.open("story-app-db", 1);

      // Handle database creation/upgrades
      dbPromise.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains("stories")) {
          const storyStore = db.createObjectStore("stories", { keyPath: "id" });
          storyStore.createIndex("by-date", "createdAt", { unique: false });
        }

        if (!db.objectStoreNames.contains("favorites")) {
          db.createObjectStore("favorites", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("offlineActions")) {
          const actionsStore = db.createObjectStore("offlineActions", {
            keyPath: "timestamp",
          });
          actionsStore.createIndex("by-type", "type", { unique: false });
        }
      };

      // Handle database open success
      dbPromise.onsuccess = (event) => {
        this.db = event.target.result;
        console.log("IndexedDB initialized successfully");
        this.syncOfflineData();
      };

      // Handle database open error
      dbPromise.onerror = (event) => {
        console.error("IndexedDB initialization failed:", event.target.error);
      };
    } catch (error) {
      console.error("Error initializing IndexedDB:", error);
    }
  }

  // Store stories in IndexedDB
  async saveStoriesToIndexedDB(stories) {
    if (!this.db) return;

    try {
      const tx = this.db.transaction("stories", "readwrite");
      const store = tx.objectStore("stories");

      for (const story of stories) {
        store.put(story);
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.error("Error saving stories to IndexedDB:", error);
    }
  }

  // Get stories from IndexedDB
  async getStoriesFromIndexedDB() {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction("stories", "readonly");
      const store = tx.objectStore("stories");
      const index = store.index("by-date");
      const stories = await index.getAll();

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(stories);
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.error("Error getting stories from IndexedDB:", error);
      return [];
    }
  }

  // Store favorites in IndexedDB
  async saveFavoritesToIndexedDB(favorites) {
    if (!this.db) return;

    try {
      const tx = this.db.transaction("favorites", "readwrite");
      const store = tx.objectStore("favorites");

      // Clear previous favorites
      store.clear();

      // Add current favorites
      for (const favorite of favorites) {
        store.put(favorite);
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.error("Error saving favorites to IndexedDB:", error);
    }
  }

  // Get favorites from IndexedDB
  async getFavoritesFromIndexedDB() {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction("favorites", "readonly");
      const store = tx.objectStore("favorites");
      const favorites = await store.getAll();

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(favorites);
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.error("Error getting favorites from IndexedDB:", error);
      return [];
    }
  }

  // Add offline action to be synced later
  async addOfflineAction(type, data) {
    if (!this.db) return;

    try {
      const tx = this.db.transaction("offlineActions", "readwrite");
      const store = tx.objectStore("offlineActions");

      const action = {
        timestamp: Date.now(),
        type,
        data,
        synced: false,
      };

      store.add(action);

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.error("Error adding offline action:", error);
    }
  }

  // Sync offline data when back online
  async syncOfflineData() {
    if (!this.db || !navigator.onLine || !this.isLoggedIn()) return;

    try {
      // First check if the offlineActions store exists
      if (!Array.from(this.db.objectStoreNames).includes("offlineActions")) {
        console.log("offlineActions store doesn't exist yet, skipping sync");
        return;
      }

      const tx = this.db.transaction("offlineActions", "readwrite");
      const store = tx.objectStore("offlineActions");
      const actions = await store.getAll();

      for (const action of actions) {
        if (action.synced) continue;

        try {
          switch (action.type) {
            case "addStory":
              await this.addStoryOnline(action.data);
              break;
            case "toggleFavorite":
              // We don't need to sync favorites to server, just local storage
              break;
            // Add more action types as needed
          }

          // Mark action as synced
          action.synced = true;
          store.put(action);
        } catch (error) {
          console.error(`Error syncing action ${action.type}:`, error);
        }
      }

      try {
        // Clean up synced actions if by-type index exists
        if (store.indexNames.contains("by-type")) {
          const cleanupTx = this.db.transaction("offlineActions", "readwrite");
          const cleanupStore = cleanupTx.objectStore("offlineActions");
          const syncedActions = await cleanupStore
            .index("by-type")
            .getAll(IDBKeyRange.only(true));

          for (const action of syncedActions) {
            cleanupStore.delete(action.timestamp);
          }
        }
      } catch (cleanupError) {
        console.warn("Error during cleanup of synced actions:", cleanupError);
        // Continue execution - cleanup failure is not critical
      }
    } catch (error) {
      console.error("Error syncing offline data:", error);
    }
  }

  // Login method
  async login(emailOrData, passwordParam) {
    try {
      let email, password;

      // Check if first parameter is an object (from form data)
      if (typeof emailOrData === "object" && emailOrData !== null) {
        email = emailOrData.email;
        password = emailOrData.password;
      } else {
        // Otherwise use the parameters directly
        email = emailOrData;
        password = passwordParam;
      }

      const response = await fetch(`${this.API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json();

      if (responseData.error) {
        throw new Error(responseData.message);
      }

      this.token = responseData.loginResult.token;
      this._isLoggedIn = true;
      localStorage.setItem("token", this.token);

      // Retrieve favorites from IndexedDB after login
      const favorites = await this.getFavoritesFromIndexedDB();
      if (favorites.length > 0) {
        this.favorites = favorites;
      }

      return responseData;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Register method
  async register(name, email, password) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const responseData = await response.json();

      if (responseData.error) {
        throw new Error(responseData.message);
      }

      return responseData;
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // Logout method
  logout() {
    localStorage.removeItem("token");
    this.token = null;
    this._isLoggedIn = false;
    // Clear data
    this.stories = [];
  }

  // Add isLoggedIn method
  isLoggedIn() {
    return !!this.token;
  }

  // Get stories with offline support
  async getStories() {
    try {
      if (navigator.onLine) {
        // Online: get from API and store in IndexedDB
        const response = await fetch(`${this.API_BASE_URL}/stories`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        const responseData = await response.json();

        if (responseData.error) {
          throw new Error(responseData.message);
        }

        this.stories = responseData.listStory;

        // Save stories to IndexedDB for offline access
        await this.saveStoriesToIndexedDB(this.stories);

        return this.stories;
      } else {
        // Offline: get from IndexedDB
        this.stories = await this.getStoriesFromIndexedDB();
        return this.stories;
      }
    } catch (error) {
      console.error("Error getting stories:", error);

      // If API call fails, try to get from IndexedDB
      this.stories = await this.getStoriesFromIndexedDB();
      return this.stories;
    }
  }

  // Alias for getStories for backward compatibility
  async fetchStories() {
    return this.getStories();
  }

  // Alias for getFavoriteStories for backward compatibility
  async getFavorites() {
    return this.getFavoriteStories();
  }

  // Add story with offline support
  async addStory(description, photo, lat, lon) {
    const formData = new FormData();
    formData.append("description", description);
    formData.append("photo", photo);

    if (lat && lon) {
      formData.append("lat", lat);
      formData.append("lon", lon);
    }

    try {
      if (navigator.onLine) {
        return await this.addStoryOnline(formData);
      } else {
        // Save action for later sync
        await this.addOfflineAction("addStory", {
          description,
          photo: URL.createObjectURL(photo),
          lat,
          lon,
          createdAt: new Date().toISOString(),
        });

        // Add temporary story to local cache with a temporary ID
        const tempStory = {
          id: `temp-${Date.now()}`,
          description,
          photoUrl: URL.createObjectURL(photo),
          lat,
          lon,
          createdAt: new Date().toISOString(),
          name: "You (offline)",
        };

        this.stories.unshift(tempStory);
        await this.saveStoriesToIndexedDB(this.stories);

        return {
          error: false,
          message:
            "Story added (offline mode). It will be synced when you're back online.",
        };
      }
    } catch (error) {
      throw new Error(`Failed to add story: ${error.message}`);
    }
  }

  // Helper method to add story online
  async addStoryOnline(formData) {
    const response = await fetch(`${this.API_BASE_URL}/stories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const responseData = await response.json();

    if (responseData.error) {
      throw new Error(responseData.message);
    }

    // Refresh stories list after adding new story
    await this.getStories();

    return responseData;
  }

  // Toggle favorite with offline support
  async toggleFavorite(storyId) {
    const isFavorite = this.favorites.includes(storyId);

    if (isFavorite) {
      // Remove from favorites
      this.favorites = this.favorites.filter((id) => id !== storyId);
    } else {
      // Add to favorites
      this.favorites.push(storyId);
    }

    // Save to localStorage
    localStorage.setItem("favorites", JSON.stringify(this.favorites));

    // Save to IndexedDB
    await this.saveFavoritesToIndexedDB(
      this.stories.filter((story) => this.favorites.includes(story.id))
    );

    // Record action for sync (not needed for server, but for completeness)
    await this.addOfflineAction("toggleFavorite", {
      storyId,
      isFavorite: !isFavorite,
    });

    return {
      error: false,
      message: isFavorite ? "Removed from favorites" : "Added to favorites",
    };
  }

  // Get favorite stories
  async getFavoriteStories() {
    const stories = await this.getStories();
    return stories.filter((story) => this.favorites.includes(story.id));
  }

  // Check if story is in favorites
  async isStoryFavorited(storyId) {
    return this.favorites.includes(storyId);
  }

  // Add story to favorites
  async addStoryToFavorites(story) {
    if (!this.favorites.includes(story.id)) {
      this.favorites.push(story.id);
      localStorage.setItem("favorites", JSON.stringify(this.favorites));

      // Save to IndexedDB
      await this.saveFavoritesToIndexedDB(
        this.stories.filter((s) => this.favorites.includes(s.id))
      );
      return true;
    }
    return false;
  }

  // Remove story from favorites
  async removeStoryFromFavorites(storyId) {
    if (this.favorites.includes(storyId)) {
      this.favorites = this.favorites.filter((id) => id !== storyId);
      localStorage.setItem("favorites", JSON.stringify(this.favorites));

      // Save to IndexedDB
      await this.saveFavoritesToIndexedDB(
        this.stories.filter((story) => this.favorites.includes(story.id))
      );
      return true;
    }
    return false;
  }

  // Subscribe to push notifications
  async subscribePush(subscription) {
    if (!this.token) {
      return { success: true };
    }

    try {
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(
            String.fromCharCode.apply(
              null,
              new Uint8Array(subscription.getKey("p256dh"))
            )
          ),
          auth: btoa(
            String.fromCharCode.apply(
              null,
              new Uint8Array(subscription.getKey("auth"))
            )
          ),
        },
      };

      const response = await fetch(
        `${this.API_BASE_URL}/notifications/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(subscriptionData),
        }
      );

      const responseData = await response.json();

      if (responseData.error) {
        console.warn("Push subscription warning:", responseData.message);
      }

      return responseData;
    } catch (error) {
      console.warn("Push subscription error:", error);
      return { success: false, message: error.message };
    }
  }

  // Get detail of a story
  async getStoryDetail(id) {
    try {
      if (navigator.onLine) {
        // Online: get from API
        const response = await fetch(`${this.API_BASE_URL}/stories/${id}`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        const responseData = await response.json();

        if (responseData.error) {
          throw new Error(responseData.message);
        }

        return responseData.story;
      } else {
        // Offline: get from IndexedDB
        const stories = await this.getStoriesFromIndexedDB();
        const story = stories.find((s) => s.id === id);

        if (!story) {
          throw new Error("Story not found in offline storage");
        }

        return story;
      }
    } catch (error) {
      throw new Error(`Failed to get story detail: ${error.message}`);
    }
  }
}

export default Model;
