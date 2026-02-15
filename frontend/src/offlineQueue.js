/**
 * Offline Request Queue using IndexedDB
 * 
 * Patent claim: Offline-first disaster reporting with automatic sync
 * when connectivity is restored.
 */

const DB_NAME = 'relieflink-offline';
const STORE_NAME = 'pending-requests';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineRequest(requestData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({
      ...requestData,
      queued_at: new Date().toISOString(),
      synced: false,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedRequests() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getAll = store.getAll();
    getAll.onsuccess = () => resolve(getAll.result);
    getAll.onerror = () => reject(getAll.error);
  });
}

export async function removeQueuedRequest(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncQueuedRequests(createRequestFn) {
  const queued = await getQueuedRequests();
  const results = [];
  
  for (const item of queued) {
    try {
      const { id, queued_at, synced, ...requestData } = item;
      await createRequestFn(requestData);
      await removeQueuedRequest(id);
      results.push({ id, status: 'synced' });
    } catch (err) {
      results.push({ id: item.id, status: 'failed', error: err.message });
    }
  }
  
  return results;
}

export function getQueuedCount() {
  return getQueuedRequests().then(items => items.length).catch(() => 0);
}
