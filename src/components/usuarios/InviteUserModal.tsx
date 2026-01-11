import React, { useState } from 'react';
import { Copy, Check, UserPlus, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateInvite: () => Promise<{ code: number } | undefined>;
  isLoading: boolean;
  canInvite: boolean;
  seatsMessage?: string;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  open,
  onOpenChange,
  onCreateInvite,
  isLoading,
  canInvite,
  seatsMessage,
}) => {
  const [inviteCode, setInviteCode] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateInvite = async () => {
    const result = await onCreateInvite();
    if (result?.code) {
      setInviteCode(result.code);
    }
  };

  const inviteLink = inviteCode 
    ? `${window.location.origin}/r/${inviteCode}` 
    : '';

  const handleCopy = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setInviteCode(null);
      setCopied(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Convidar Usuário
          </DialogTitle>
          <DialogDescription>
            {inviteCode 
              ? 'Compartilhe o link abaixo para convidar um novo usuário.'
              : 'Gere um link de convite para adicionar um novo usuário ao tenant.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!inviteCode ? (
            <>
              {!canInvite && seatsMessage && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {seatsMessage}
                </div>
              )}
              <Button
                onClick={handleCreateInvite}
                disabled={isLoading || !canInvite}
                className="w-full btn-gradient-primary"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Gerar Link de Convite
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="invite-link">Link de Convite</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-link"
                  value={inviteLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link é de uso único. O usuário será adicionado ao tenant atual ao criar a conta.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
