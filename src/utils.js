// Tambahkan fungsi-fungsi berikut ke utils.js

const DB_NAME = 'story-app-db';
const DB_VERSION = 1;
const STORY_STORE = 'stories';
const FAVORITE_STORE = 'favorites';

// Open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject('Error opening database: ' + event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains(STORY_STORE)) {
        db.createObjectStore(STORY_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(FAVORITE_STORE)) {
        db.createObjectStore(FAVORITE_STORE, { keyPath: 'id' });
      }
    };
  });
};

// Save stories to IndexedDB
export const saveStoriesToIndexedDB = async (stories) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORY_STORE, 'readwrite');
    const store = tx.objectStore(STORY_STORE);
    
    // Clear existing data
    await store.clear();
    
    // Add new stories
    stories.forEach((story) => {
      store.add(story);
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error saving stories to IndexedDB:', error);
    return false;
  }
};

// Get stories from IndexedDB
export const getStoriesFromIndexedDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORY_STORE, 'readonly');
    const store = tx.objectStore(STORY_STORE);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error getting stories from IndexedDB:', error);
    return [];
  }
};

// Add story to favorites
export const addToFavorites = async (story) => {
  try {
    const db = await openDB();
    const tx = db.transaction(FAVORITE_STORE, 'readwrite');
    const store = tx.objectStore(FAVORITE_STORE);
    
    store.add(story);
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
};

// Remove story from favorites
export const removeFromFavorites = async (storyId) => {
  try {
    const db = await openDB();
    const tx = db.transaction(FAVORITE_STORE, 'readwrite');
    const store = tx.objectStore(FAVORITE_STORE);
    
    store.delete(storyId);
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
};

// Get favorite stories
export const getFavoriteStories = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(FAVORITE_STORE, 'readonly');
    const store = tx.objectStore(FAVORITE_STORE);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error getting favorite stories:', error);
    return [];
  }
};

// Check if story is in favorites
export const isStoryInFavorites = async (storyId) => {
  try {
    const db = await openDB();
    const tx = db.transaction(FAVORITE_STORE, 'readonly');
    const store = tx.objectStore(FAVORITE_STORE);
    const request = store.get(storyId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error('Error checking if story is in favorites:', error);
    return false;
  }
};

// Existing function
export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}