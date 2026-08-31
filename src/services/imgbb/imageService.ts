import { ImageUploadResult } from '../../types';

export interface ImageUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  maxWidthOrHeight?: number;
  quality?: number;
  onProgress?: (progress: number) => void;
}

const DEFAULT_MAX_SIZE_MB = 15;
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/heic',
  'image/heif',
  'image/gif',
  '',
];

export class ImageService {
  /**
   * Validate image file size and type (with permissive fallback for mobile uploads)
   */
  static validateImage(file: File, options?: ImageUploadOptions): { valid: boolean; error?: string } {
    const maxSize = (options?.maxSizeMB || DEFAULT_MAX_SIZE_MB) * 1024 * 1024;
    const allowedTypes = options?.allowedTypes || DEFAULT_ALLOWED_TYPES;

    if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Formato no soportado (${file.type}). Usa JPG, PNG o WebP.`,
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `El tamaño excede el límite permitido de ${options?.maxSizeMB || DEFAULT_MAX_SIZE_MB}MB.`,
      };
    }

    return { valid: true };
  }

  /**
   * Resizes and compresses image in browser using Canvas to prevent huge payloads and memory crashes on mobile
   */
  static compressImage(
    file: File,
    maxDimension: number = 1280,
    quality: number = 0.85
  ): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert file to base64 string
   */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  }

  /**
   * Upload image via backend proxy to ImgBB and return the URL string directly
   */
  static async uploadImage(
    fileOrBase64: File | string,
    imageName?: string,
    options?: ImageUploadOptions
  ): Promise<string> {
    const details = await this.uploadImageDetails(fileOrBase64, imageName, options);
    return details.url;
  }

  /**
   * Upload image via backend proxy to ImgBB with automatic fallback
   */
  static async uploadImageDetails(
    fileOrBase64: File | string,
    imageName?: string,
    options?: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    options?.onProgress?.(15);

    let base64Data = '';
    if (typeof fileOrBase64 === 'string') {
      base64Data = fileOrBase64;
    } else {
      const validation = this.validateImage(fileOrBase64, options);
      if (!validation.valid) {
        throw new Error(validation.error || 'Archivo de imagen no válido.');
      }
      options?.onProgress?.(30);
      // Auto compress for mobile performance and reliability
      try {
        base64Data = await this.compressImage(fileOrBase64, options?.maxWidthOrHeight || 1280, options?.quality || 0.85);
      } catch {
        base64Data = await this.fileToBase64(fileOrBase64);
      }
    }

    if (!base64Data) {
      throw new Error('No se pudo leer la información de la imagen.');
    }

    options?.onProgress?.(60);

    try {
      const response = await fetch('/api/imgbb/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          name: imageName || `monarca_${Date.now()}`,
        }),
      });

      options?.onProgress?.(85);

      if (response.ok) {
        const result = await response.json().catch(() => null);
        if (result && result.success && result.data) {
          options?.onProgress?.(100);
          const rawUrl = result.data.url || result.data.display_url || '';
          return {
            id: result.data.id || `img_${Date.now()}`,
            url: typeof rawUrl === 'string' ? rawUrl : String(rawUrl),
            display_url: result.data.display_url || rawUrl,
            thumb: result.data.thumb || rawUrl,
            delete_url: result.data.delete_url || '',
            isSimulated: Boolean(result.isSimulated),
          };
        }
      }
    } catch (networkError) {
      console.warn('Backend upload proxy error, applying fallback data uri:', networkError);
    }

    // Direct fallback (Data URI) so mobile user never receives a 404 block
    options?.onProgress?.(100);
    const dataUri = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
    return {
      id: `local_${Date.now()}`,
      url: dataUri,
      display_url: dataUri,
      thumb: dataUri,
      delete_url: '',
      isSimulated: true,
    };
  }
}

export const imageService = ImageService;
