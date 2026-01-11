import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { Database } from '@/integrations/supabase/types';
import { 
  Loader2, 
  Home, 
  Car, 
  Briefcase, 
  ShoppingCart,
  Utensils,
  Heart,
  Book,
  Plane,
  Phone,
  Wifi,
  Zap,
  Droplet,
  Wrench,
  Gift,
  Music,
  Film,
  LucideIcon
} from 'lucide-react';

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ExpenseCategory | null;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  car: Car,
  briefcase: Briefcase,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  heart: Heart,
  book: Book,
  plane: Plane,
  phone: Phone,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  tool: Wrench,
  gift: Gift,
  music: Music,
  film: Film,
};

const ICONS = Object.keys(ICON_MAP);

export const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  onOpenChange,
  category,
}) => {
  const { createCategory, updateCategory } = useExpenseCategories();

  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color || COLORS[0]);
      setIcon(category.icon || ICONS[0]);
    } else {
      setName('');
      setColor(COLORS[0]);
      setIcon(ICONS[0]);
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && category) {
      await updateCategory.mutateAsync({
        id: category.id,
        data: { name, color, icon },
      });
    } else {
      await createCategory.mutateAsync({ name, color, icon });
    }

    onOpenChange(false);
  };

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alimentação"
              required
            />
          </div>

          <div>
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ICONS.map((i) => {
                const IconComponent = ICON_MAP[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`p-2 rounded-lg border transition-all ${
                      icon === i
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
