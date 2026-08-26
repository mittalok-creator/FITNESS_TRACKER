// Minimal IndexedDB wrapper for storing progress-photo blobs (kept out of localStorage to avoid quota issues).
const PhotoDB = (() => {
  const DB_NAME = "fittrack-photos";
  const STORE = "photos";
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function put(id, blob) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ id, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function get(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  async function del(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return { put, get, delete: del };
})();

// Resize + compress an image file client-side before storing. Returns a Blob.
function compressImage(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
      else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob); }, "image/jpeg", quality);
    };
    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
