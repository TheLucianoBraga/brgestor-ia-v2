import React from 'react';
import { Card } from '@/components/ui/card';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export function QRCodeDisplay({ value, size = 150 }: QRCodeDisplayProps) {
  // Usando API pública do QR Code Generator
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=svg`;

  return (
    <Card className="p-4 inline-block bg-white">
      <img 
        src={qrCodeUrl} 
        alt="QR Code do link de indicação"
        width={size}
        height={size}
        className="rounded"
      />
    </Card>
  );
}
