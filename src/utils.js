// Tambahkan fungsi-fungsi berikut ke utils.js

const DB_NAME = "story-app-db";
const DB_VERSION = 1;
const STORY_STORE = "stories";
const FAVORITE_STORE = "favorites";

// Track favorite attempts per story
const favoriteAttempts = {};

// Open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject("Error opening database: " + event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores
      if (!db.objectStoreNames.contains(STORY_STORE)) {
        db.createObjectStore(STORY_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(FAVORITE_STORE)) {
        db.createObjectStore(FAVORITE_STORE, { keyPath: "id" });
      }
    };
  });
};

// Save stories to IndexedDB
export const saveStoriesToIndexedDB = async (stories) => {
  try {
    // Ensure stories is an array
    if (!Array.isArray(stories)) {
      console.error("saveStoriesToIndexedDB received non-array:", stories);
      stories = [];
    }

    const db = await openDB();
    const tx = db.transaction(STORY_STORE, "readwrite");
    const store = tx.objectStore(STORY_STORE);

    // Clear existing data
    await store.clear();

    // Add new stories
    for (const story of stories) {
      try {
        if (story && typeof story === "object" && story.id) {
          store.add(story);
        } else {
          console.warn("Skipping invalid story:", story);
        }
      } catch (itemError) {
        console.error("Error adding story item:", itemError);
        // Continue with other items
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => {
        console.error(
          "Transaction error in saveStoriesToIndexedDB:",
          event.target.error
        );
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("Error saving stories to IndexedDB:", error);
    return false;
  }
};

// Get stories from IndexedDB
export const getStoriesFromIndexedDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORY_STORE, "readonly");
    const store = tx.objectStore(STORY_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Ensure we always return an array
        const result = Array.isArray(request.result) ? request.result : [];
        resolve(result);
      };
      request.onerror = (event) => {
        console.error("Error in getAll request:", event.target.error);
        resolve([]); // Return empty array on error
      };
    });
  } catch (error) {
    console.error("Error getting stories from IndexedDB:", error);
    return [];
  }
};

// Add story to favorites
export const addToFavorites = async (story) => {
  try {
    const db = await openDB();

    // First check if story already exists in favorites
    const checkTx = db.transaction(FAVORITE_STORE, "readonly");
    const checkStore = checkTx.objectStore(FAVORITE_STORE);
    const checkRequest = checkStore.get(story.id);

    return new Promise((resolve, reject) => {
      checkRequest.onsuccess = async () => {
        // If story already exists in favorites, just return true
        if (checkRequest.result) {
          resolve(true);
          return;
        }

        // If story doesn't exist, add it
        try {
          const addTx = db.transaction(FAVORITE_STORE, "readwrite");
          const addStore = addTx.objectStore(FAVORITE_STORE);
          const addRequest = addStore.add(story);

          addRequest.onsuccess = () => resolve(true);
          addRequest.onerror = (event) => {
            console.error("Error in add request:", event.target.error);
            reject(event.target.error);
          };
        } catch (addError) {
          console.error("Error adding to favorites:", addError);
          reject(addError);
        }
      };

      checkRequest.onerror = (event) => {
        console.error("Error checking favorites:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("Error in addToFavorites:", error);
    return false;
  }
};

// Remove story from favorites
export const removeFromFavorites = async (storyId) => {
  try {
    // Reset attempt counter when removing from favorites
    if (favoriteAttempts[storyId]) {
      delete favoriteAttempts[storyId];
    }

    const db = await openDB();
    const tx = db.transaction(FAVORITE_STORE, "readwrite");
    const store = tx.objectStore(FAVORITE_STORE);

    store.delete(storyId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Error removing from favorites:", error);
    return false;
  }
};

// Get favorite stories
export const getFavoriteStories = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(FAVORITE_STORE, "readonly");
    const store = tx.objectStore(FAVORITE_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Ensure we always return an array
        const result = Array.isArray(request.result) ? request.result : [];
        resolve(result);
      };
      request.onerror = (event) => {
        console.error("Error in getAll request:", event.target.error);
        resolve([]); // Return empty array on error
      };
    });
  } catch (error) {
    console.error("Error getting favorite stories:", error);
    return [];
  }
};

// Check if story is in favorites
export const isStoryInFavorites = async (storyId) => {
  try {
    const db = await openDB();
    const tx = db.transaction(FAVORITE_STORE, "readonly");
    const store = tx.objectStore(FAVORITE_STORE);
    const request = store.get(storyId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Error checking if story is in favorites:", error);
    return false;
  }
};

// Existing function
export const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
