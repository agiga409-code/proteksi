// Camera Photo Capture App - script.js
// Handles camera access, photo capture, IndexedDB storage, and gallery display

class PhotoCaptureApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startCamera');
        this.captureBtn = document.getElementById('capture');
        this.stopBtn = document.getElementById('stopCamera');
        this.clearBtn = document.getElementById('clearAll');
        this.gallery = document.getElementById('gallery');
        
        this.stream = null;
        this.db = null;
        this.photos = [];
        
        this.init();
    }
    
    async init() {
        // Initialize IndexedDB
        await this.initDB();
        await this.loadPhotos();
        
        // Event listeners
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.clearBtn.addEventListener('click', () => this.clearAllPhotos());
        
        // Modal handling
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PhotoCaptureDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
            };
        });
    }
    
    async loadPhotos() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.getAll();
            
            request.onsuccess = () => {
                this.photos = request.result;
                this.renderGallery();
                resolve();
            };
        });
    }
    
    async savePhoto(dataUrl, timestamp) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.add({ dataUrl, timestamp });
            
            request.onsuccess = () => {
                const id = request.result;
                this.photos.push({ id, dataUrl, timestamp });
                this.renderGallery();
                resolve(id);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async deletePhoto(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                this.photos = this.photos.filter(photo => photo.id !== id);
                this.renderGallery();
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            this.video.srcObject = this.stream;
            
            this.startBtn.disabled = true;
            this.captureBtn.disabled = false;
            this.stopBtn.disabled = false;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            };
        } catch (err) {
            alert('Error accessing camera: ' + err.message + '\\nPlease allow camera permission and try again.');
        }
    }
    
    async capturePhoto() {
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const dataUrl = this.canvas.toDataURL('image/jpeg', 0.9);
        const timestamp = new Date().toLocaleString();
        
        await this.savePhoto(dataUrl, timestamp);
        
        // Visual feedback
        this.captureBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.captureBtn.style.transform = 'scale(1)';
        }, 150);
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.startBtn.disabled = false;
        this.captureBtn.disabled = true;
        this.stopBtn.disabled = true;
    }
    
    async clearAllPhotos() {
        if (confirm('Are you sure you want to delete all photos?')) {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.clear();
            
            request.onsuccess = () => {
                this.photos = [];
                this.renderGallery();
            };
        }
    }
    
    renderGallery() {
        if (this.photos.length === 0) {
            this.gallery.innerHTML = '<p>No photos captured yet. Take some photos!</p>';
            return;
        }
        
        this.gallery.innerHTML = this.photos.map(photo => `
            <div class="photo-thumbnail" onclick="app.showPhoto('${photo.dataUrl}')">
                <img src="${photo.dataUrl}" alt="Captured photo">
                <div class="photo-overlay">${new Date(photo.timestamp).toLocaleString('id-ID')}</div>
            </div>
        `).join('');
    }
    
    showPhoto(dataUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <span class="close-modal">&amp;times;</span>
            <img src="${dataUrl}" alt="Full size photo">
        `;
        document.body.appendChild(modal);
    }
    
    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
    }
}

// Multi-mode PhotoCaptureApp (capture/gallery)
class PhotoCaptureApp {
    constructor(mode = 'interactive') {
        this.mode = mode; // 'capture', 'gallery', 'interactive'
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gallery = document.getElementById('gallery');
        this.statusEl = document.getElementById('status');
        this.successEl = document.getElementById('success');
        this.timestampEl = document.getElementById('timestamp');
        
        this.stream = null;
        this.db = null;
        this.photos = [];
        
        this.init();
    }
    
    async init() {
        await this.initDB();
        
        if (this.mode === 'gallery') {
            await this.loadPhotos();
        } else if (this.mode === 'capture') {
            await this.autoCapture();
        }
        // 'interactive' does nothing extra (old mode)
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SecretCaptureDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const store = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            };
        });
    }
    
    async loadPhotos() {
        return new Promise((resolve) => {
            if (!this.db) return resolve();
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.getAll();
            
            request.onsuccess = () => {
                this.photos = request.result.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                this.renderGallery();
                resolve();
            };
        });
    }
    
    async savePhoto(dataUrl, timestamp) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.add({ dataUrl, timestamp });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    renderGallery() {
        const galleryEl = document.getElementById('gallery');
        if (!galleryEl) return;
        
        if (this.photos.length === 0) {
            galleryEl.innerHTML = '<p>Belum ada foto. Jepret di <a href="capture.html">capture.html</a>!</p>';
            return;
        }
        
        galleryEl.innerHTML = this.photos.map(photo => `
            <div class="photo-thumbnail" onclick="app.showPhoto('${photo.dataUrl}')">
                <img src="${photo.dataUrl}" alt="Foto ${photo.timestamp}">
                <div class="photo-overlay">${new Date(photo.timestamp).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}</div>
            </div>
        `).join('');
    }
    
    showPhoto(dataUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <span class="close-modal" onclick="this.parentElement.remove()">&times;</span>
            <img src="${dataUrl}" alt="Foto besar">
        `;
        document.body.appendChild(modal);
    }
    
    async autoCapture() {
        try {
            if (this.statusEl) this.statusEl.textContent = 'Meminta izin kamera...';
            
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: {ideal: 1280}, height: {ideal: 720}, facingMode: 'user' } 
            });
            
        this.video.srcObject = this.stream;
        this.video.style.display = 'block';
        
        // Wait for 'loadeddata' + delay for stable frame
        await new Promise((resolve, reject) => {
            const onLoaded = () => {
                this.canvas.width = this.video.videoWidth || 640;
                this.canvas.height = this.video.videoHeight || 480;
                setTimeout(() => {
                    this.video.onloadeddata = null;
                    resolve();
                }, 2000); // 2s delay for stable
            };
            this.video.onloadeddata = onLoaded;
            this.video.onloadedmetadata = onLoaded;
            setTimeout(reject, 10000); // Timeout 10s
        });
            
            // Jepret foto!
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const dataUrl = this.canvas.toDataURL('image/jpeg', 0.85);
            const timestamp = new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'});
            
            await this.savePhoto(dataUrl, timestamp);
            
            // Stop stream
            this.stream.getTracks().forEach(track => track.stop());
            
            // Show success
            if (this.statusEl) this.statusEl.style.display = 'none';
            if (this.successEl && this.timestampEl) {
                this.timestampEl.textContent = `Waktu: ${timestamp}`;
                this.successEl.classList.remove('hidden');
            }
            
        } catch (err) {
            const msg = `❌ Gagal: ${err.message || err.name}\\n\\n1. Izinkan kamera\\n2. HTTPS/localhost required\\n3. Coba Chrome/Firefox`;
            alert(msg);
            if (this.statusEl) {
                this.statusEl.textContent = 'Gagal capture. Cek permission.';
                this.statusEl.style.color = 'red';
            }
        }
    }
    
    async clearAllPhotos() {
        if (!confirm('Hapus SEMUA foto?')) return;
        
        const transaction = this.db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        const request = store.clear();
        
        request.onsuccess = () => {
            this.photos = [];
            this.renderGallery();
        };
    }
}

// Global app reference for onclick events
let app;


