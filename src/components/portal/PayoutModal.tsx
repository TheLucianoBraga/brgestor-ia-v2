import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Wallet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/formatters';

interface PayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onRequestPayout: (pixKey: string) => void;
  isLoading?: boolean;
}

export function PayoutModal({
  open,
  onOpenChange,
  availableBalance,
  onRequestPayout,
  isLoading
}: PayoutModalProps) {
  const [pixKeyType, setPixKeyType] = useState<string>('cpf');
  const [pixKey, setPixKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pixKey.trim()) {
      onRequestPayout(pixKey.trim());
      onOpenChange(false);
      setPixKey('');
    }
  };

  // formatCurrency importado de @/lib/formatters

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Solicitar Saque
          </DialogTitle>
          <DialogDescription>
            Informe sua chave PIX para receber o valor disponível
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Saldo disponível</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(availableBalance)}
            </p>
          </div>

          {availableBalance < 50 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O valor mínimo para saque é R$ 50,00
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Tipo de Chave PIX</Label>
            <Select value={pixKeyType} onValueChange={setPixKeyType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder={
                pixKeyType === 'cpf' ? '000.000.000_00' :
                pixKeyType === 'cnpj' ? '00.000.000/0000_00' :
                pixKeyType === 'email' ? 'email@exemplo.com' :
                pixKeyType === 'phone' ? '(00) 00000_0000' :
                'Cole sua chave aleatória'
              }
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || availableBalance < 50 || !pixKey.trim()}
            >
              {isLoading ? 'Solicitando...' : 'Solicitar Saque'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
