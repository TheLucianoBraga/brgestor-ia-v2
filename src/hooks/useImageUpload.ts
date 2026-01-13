import { useState } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { compressImage, formatFileSize, getCompressionRatio } from '@/lib/imageCompression';
import { toast } from 'sonner';

interface UploadOptions {
  bucket?: string;
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface UploadResult {
  url: string;
  path: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export const useImageUpload = () => {
  const { currentTenant } = useTenant();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult | null> => {
    if (!currentTenant?.id) {
      toast.error('Tenant não selecionado');
      return null;
    }

    const {
      bucket = 'tenant_assets',
      folder = 'logos',
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.85,
    } = options;

    setIsUploading(true);
    setProgress(10);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return null;
      }

      // Validate file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 10MB');
        return null;
      }

      setProgress(20);

      // Compress the image
      const compressed = await compressImage(file, {
        maxWidth,
        maxHeight,
        quality,
        outputType: 'image/webp',
      });

      setProgress(50);

      const compressionRatio = getCompressionRatio(compressed.originalSize, compressed.compressedSize);
      
      console.log(
        `Image compressed: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)} (${compressionRatio}% reduction)`
      );

      // Generate unique filename
      const timestamp = Date.now();
      const extension = 'webp';
      const fileName = `${folder}/${timestamp}.${extension}`;
      const filePath = `${currentTenant.id}/${fileName}`;

      setProgress(70);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressed.blob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload da imagem');
        return null;
      }

      setProgress(90);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);

      toast.success(
        `Imagem enviada! Redução de ${compressionRatio}% (${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)})`
      );

      return {
        url: urlData.publicUrl,
        path: filePath,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        compressionRatio,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao processar imagem');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const deleteImage = async (url: string, bucket = 'tenant_assets'): Promise<boolean> => {
    try {
      // Extract path from URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      
      if (!pathMatch) {
        console.error('Could not extract path from URL');
        return false;
      }

      const path = decodeURIComponent(pathMatch[1]);

      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    isUploading,
    progress,
  };
};

