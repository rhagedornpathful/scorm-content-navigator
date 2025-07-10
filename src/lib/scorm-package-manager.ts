import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { SCORMManifestParser, type SCORMManifest } from './scorm-manifest';

export interface SCORMPackage {
  id: string;
  name: string;
  uploadDate: Date;
  manifest: SCORMManifest;
  files: Map<string, Blob>;
  size: number;
}

export interface UploadProgress {
  stage: 'uploading' | 'extracting' | 'parsing' | 'storing' | 'complete';
  progress: number;
  message: string;
}

export class SCORMPackageManager {
  private static readonly STORAGE_KEY = 'scorm_packages';
  private static readonly MAX_PACKAGE_SIZE = 100 * 1024 * 1024; // 100MB limit

  static async uploadPackage(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<SCORMPackage> {
    // Validate file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      throw new Error('SCORM packages must be ZIP files');
    }

    if (file.size > this.MAX_PACKAGE_SIZE) {
      throw new Error(`Package size exceeds ${this.MAX_PACKAGE_SIZE / (1024 * 1024)}MB limit`);
    }

    onProgress?.({
      stage: 'uploading',
      progress: 0,
      message: 'Reading package file...'
    });

    // Extract ZIP contents
    onProgress?.({
      stage: 'extracting',
      progress: 20,
      message: 'Extracting package contents...'
    });

    const zip = new JSZip();
    const zipContents = await zip.loadAsync(file);

    // Find and parse manifest
    onProgress?.({
      stage: 'parsing',
      progress: 40,
      message: 'Parsing SCORM manifest...'
    });

    const manifestFile = zipContents.file('imsmanifest.xml');
    if (!manifestFile) {
      throw new Error('Invalid SCORM package: imsmanifest.xml not found');
    }

    const manifestXml = await manifestFile.async('text');
    const manifest = await SCORMManifestParser.parseFromXML(manifestXml);

    // Validate manifest
    if (!manifest.organizations || manifest.organizations.length === 0) {
      throw new Error('Invalid SCORM manifest: No organizations found');
    }

    // Extract all files
    onProgress?.({
      stage: 'storing',
      progress: 60,
      message: 'Processing content files...'
    });

    const files = new Map<string, Blob>();
    const filePromises: Promise<void>[] = [];

    zipContents.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        filePromises.push(
          zipEntry.async('blob').then(blob => {
            files.set(relativePath, blob);
          })
        );
      }
    });

    await Promise.all(filePromises);

    // Create package object
    const scormPackage: SCORMPackage = {
      id: this.generatePackageId(),
      name: DOMPurify.sanitize(file.name.replace('.zip', ''), { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      }),
      uploadDate: new Date(),
      manifest,
      files,
      size: file.size
    };

    // Store package
    onProgress?.({
      stage: 'storing',
      progress: 80,
      message: 'Saving package...'
    });

    await this.storePackage(scormPackage);

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Package uploaded successfully!'
    });

    return scormPackage;
  }

  static async storePackage(scormPackage: SCORMPackage): Promise<void> {
    try {
      // Store files in IndexedDB for better performance
      const db = await this.openDatabase();
      const transaction = db.transaction(['packages', 'files'], 'readwrite');
      
      const packageStore = transaction.objectStore('packages');
      const fileStore = transaction.objectStore('files');

      // Store package metadata
      const packageData = {
        id: scormPackage.id,
        name: scormPackage.name,
        uploadDate: scormPackage.uploadDate.toISOString(),
        manifest: scormPackage.manifest,
        size: scormPackage.size
      };

      await new Promise((resolve, reject) => {
        const request = packageStore.put(packageData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Store files
      for (const [path, blob] of scormPackage.files) {
        await new Promise((resolve, reject) => {
          const request = fileStore.put({
            packageId: scormPackage.id,
            path,
            blob
          });
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

    } catch (error) {
      // Fallback to localStorage for smaller packages
      console.warn('IndexedDB storage failed, falling back to localStorage:', error);
      
      const packages = this.getStoredPackageList();
      packages.push({
        id: scormPackage.id,
        name: scormPackage.name,
        uploadDate: scormPackage.uploadDate.toISOString(),
        manifest: scormPackage.manifest,
        size: scormPackage.size
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(packages));
    }
  }

  static async getStoredPackages(): Promise<SCORMPackage[]> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['packages'], 'readonly');
      const store = transaction.objectStore('packages');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const packages = request.result.map(pkg => ({
            ...pkg,
            uploadDate: new Date(pkg.uploadDate),
            files: new Map() // Files loaded on demand
          }));
          resolve(packages);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      // Fallback to localStorage
      const packages = this.getStoredPackageList();
      return packages.map(pkg => ({
        ...pkg,
        uploadDate: new Date(pkg.uploadDate),
        files: new Map()
      }));
    }
  }

  static async getPackageById(packageId: string): Promise<SCORMPackage | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['packages'], 'readonly');
      const store = transaction.objectStore('packages');

      return new Promise((resolve, reject) => {
        const request = store.get(packageId);
        request.onsuccess = () => {
          if (request.result) {
            resolve({
              ...request.result,
              uploadDate: new Date(request.result.uploadDate),
              files: new Map() // Files loaded on demand
            });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      // Fallback to localStorage
      const packages = this.getStoredPackageList();
      const pkg = packages.find(p => p.id === packageId);
      return pkg ? {
        ...pkg,
        uploadDate: new Date(pkg.uploadDate),
        files: new Map()
      } : null;
    }
  }

  static async getPackageFile(packageId: string, filePath: string): Promise<Blob | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const index = store.index('packageId');

      return new Promise((resolve, reject) => {
        const request = index.get([packageId, filePath]);
        request.onsuccess = () => {
          resolve(request.result?.blob || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return null;
    }
  }

  static async deletePackage(packageId: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['packages', 'files'], 'readwrite');
      
      const packageStore = transaction.objectStore('packages');
      const fileStore = transaction.objectStore('files');
      const fileIndex = fileStore.index('packageId');

      // Delete package
      await new Promise((resolve, reject) => {
        const request = packageStore.delete(packageId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Delete associated files
      const fileRequest = fileIndex.getAll(packageId);
      fileRequest.onsuccess = () => {
        const files = fileRequest.result;
        files.forEach(file => {
          fileStore.delete(file.id);
        });
      };

    } catch (error) {
      // Fallback to localStorage
      const packages = this.getStoredPackageList();
      const filtered = packages.filter(pkg => pkg.id !== packageId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }
  }

  private static async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SCORMPackages', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create packages store
        if (!db.objectStoreNames.contains('packages')) {
          const packageStore = db.createObjectStore('packages', { keyPath: 'id' });
          packageStore.createIndex('name', 'name', { unique: false });
        }
        
        // Create files store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
          fileStore.createIndex('packageId', 'packageId', { unique: false });
          fileStore.createIndex('packagePath', ['packageId', 'path'], { unique: true });
        }
      };
    });
  }

  private static getStoredPackageList(): any[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private static generatePackageId(): string {
    return `scorm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}