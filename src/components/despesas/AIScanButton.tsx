import React, { useRef, useState } from 'react';
import { Camera, Loader2, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface ScannedExpense {
  description?: string;
  amount?: number;
  supplier?: string;
  due_date?: string;
  category?: string;
}

interface AIScanButtonProps {
  onScanComplete: (data: ScannedExpense) => void;
}

export const AIScanButton: React.FC<AIScanButtonProps> = ({ onScanComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { currentTenant } = useTenant();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    if (!currentTenant?.id) {
      toast.error('Tenant não encontrado');
      return;
    }

    setIsScanning(true);
    try {
      // Upload to Supabase Storage
      const fileName = `scan-${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('expense-scans')
        .upload(`${currentTenant.id}/${fileName}`, file);

      if (uploadError) {
        // If bucket doesn't exist, try without it
        console.warn('Upload error:', uploadError);
      }

      // Convert to base64 for AI
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Send to AI for analysis
      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'chat',
          prompt: `Analise esta imagem de comprovante/nota fiscal e extraia:
          - Valor total (amount)
          - Descrição/produto (description) 
          - Fornecedor/estabelecimento (supplier)
          - Data (due_date no formato YYYY-MM-DD)
          - Categoria sugerida (category)
          
          Responda APENAS no formato JSON: {"amount": 123.45, "description": "...", "supplier": "...", "due_date": "YYYY-MM-DD", "category": "..."}`,
          context: { 
            tenantId: currentTenant.id,
            fileUrl: base64,
            fileType: 'image'
          }
        }
      });

      if (error) throw error;

      // Parse AI response
      const responseText = data?.text || '';
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        onScanComplete({
          description: parsed.description,
          amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount?.replace(/[^\d.,]/g, '').replace(',', '.')) || undefined,
          supplier: parsed.supplier,
          due_date: parsed.due_date,
          category: parsed.category
        });
        toast.success('Comprovante analisado com sucesso!');
        setIsOpen(false);
      } else {
        toast.error('Não foi possível extrair dados da imagem');
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao analisar comprovante');
    } finally {
      setIsScanning(false);
      setPreview(null);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Escanear com IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Escanear Comprovante
            </DialogTitle>
            <DialogDescription>
              Tire uma foto ou faça upload de um comprovante. A IA irá extrair automaticamente os dados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-contain rounded-lg bg-muted"
                />
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm font-medium">Analisando...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isScanning}
                >
                  <Camera className="w-8 h-8" />
                  <span>Câmera</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                >
                  <Upload className="w-8 h-8" />
                  <span>Upload</span>
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
