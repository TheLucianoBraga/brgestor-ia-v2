/**
 * Image compression utility
 * Reduces image file size while maintaining acceptable quality
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  outputType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const defaultOptions: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  outputType: 'image/webp', // WebP offers best compression
};

/**
 * Compresses an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compressed blob and metadata
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; width: number; height: number; originalSize: number; compressedSize: number }> => {
  const opts = { ...defaultOptions, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > opts.maxWidth! || height > opts.maxHeight!) {
        const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width,
              height,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        opts.outputType,
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Formats file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Calculates compression percentage
 */
export const getCompressionRatio = (originalSize: number, compressedSize: number): number => {
  return Math.round((1 - compressedSize / originalSize) * 100);
};
