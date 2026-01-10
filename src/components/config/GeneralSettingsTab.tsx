import React, { useState, useEffect, useRef } from 'react';
import { Building2, Upload, Globe, Save, Loader2, X, ImageIcon, Link } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useTenant } from '@/contexts/TenantContext';
import { useImageUpload } from '@/hooks/useImageUpload';

const timezones = [
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' },
];

export const GeneralSettingsTab: React.FC = () => {
  const { settings, updateMultipleSettings } = useTenantSettings();
  const { currentTenant } = useTenant();
  const { uploadImage, isUploading, progress } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [customDomain, setCustomDomain] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings['company_name'] || currentTenant?.name || '');
      setLogoUrl(settings['logo_url'] || '');
      setPrimaryColor(settings['theme_primary_color'] || '#3b82f6');
      setAccentColor(settings['theme_accent_color'] || '#10b981');
      setTimezone(settings['timezone'] || 'America/Sao_Paulo');
      setCustomDomain(settings['custom_domain'] || '');
    }
  }, [settings, currentTenant]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadImage(file, {
      folder: 'logos',
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.9,
    });

    if (result) {
      setLogoUrl(result.url);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMultipleSettings.mutateAsync({
        company_name: companyName,
        logo_url: logoUrl,
        theme_primary_color: primaryColor,
        theme_accent_color: accentColor,
        timezone,
        custom_domain: customDomain,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Configurações Gerais
        </CardTitle>
        <CardDescription>
          Informações básicas da sua empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              <div className="relative w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                {logoUrl ? (
                  <>
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploading ? 'Enviando...' : 'Enviar Imagem'}
                </Button>
                
                {isUploading && (
                  <Progress value={progress} className="h-2" />
                )}

                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP ou GIF. Máximo 10MB.
                  Imagens são comprimidas automaticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#10b981"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Fuso Horário
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-domain" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Domínio Personalizado
            </Label>
            <Input
              id="custom-domain"
              type="url"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="https://seudominio.com.br"
            />
            <p className="text-xs text-muted-foreground">
              URL completa do seu domínio. Usado para gerar links de cadastro e indicação.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
