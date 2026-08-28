import { ImageUploadResult } from '../../types';

export interface ImageUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export class ImageService {
  /**
   * Validate image file size and type
   */
  static validateImage(file: File, options?: ImageUploadOptions): { valid: boolean; error?: string } {
    const maxSize = (options?.maxSizeMB || DEFAULT_MAX_SIZE_MB) * 1024 * 1024;
    const allowedTypes = options?.allowedTypes || DEFAULT_ALLOWED_TYPES;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Formato no soportado (${file.type || 'desconocido'}). Usa JPG, PNG o WebP.`,
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
   * Upload image via backend proxy to ImgBB (protecting API key)
   */
  static async uploadImage(
    fileOrBase64: File | string,
    imageName?: string,
    options?: ImageUploadOptions
  ): Promise<ImageUploadResult> {
    try {
      options?.onProgress?.(15);

      let base64Data = '';
      if (typeof fileOrBase64 === 'string') {
        base64Data = fileOrBase64;
      } else {
        const validation = this.validateImage(fileOrBase64, options);
        if (!validation.valid) {
          throw new Error(validation.error || 'Archivo de imagen no válido.');
        }
        options?.onProgress?.(35);
        base64Data = await this.fileToBase64(fileOrBase64);
      }

      options?.onProgress?.(60);

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error en servidor al subir imagen (${response.status})`);
      }

      const result = await response.json();
      options?.onProgress?.(100);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Respuesta inválida del servicio de imágenes');
      }

      return {
        id: result.data.id,
        url: result.data.url,
        display_url: result.data.display_url || result.data.url,
        thumb: result.data.thumb || result.data.url,
        delete_url: result.data.delete_url,
        isSimulated: result.isSimulated,
      };
    } catch (error: any) {
      console.error('Image upload failed:', error);
      throw new Error(error.message || 'Error al procesar la imagen.');
    }
  }
}

export const imageService = ImageService;
