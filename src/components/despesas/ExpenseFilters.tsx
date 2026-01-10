import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useExpenseCostCenters } from '@/hooks/useExpenseCostCenters';
import { ExpenseFilters as IExpenseFilters } from '@/hooks/useExpenses';
import { Search, X, Filter, Calendar, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseFiltersProps {
  filters: IExpenseFilters;
  onFiltersChange: (filters: IExpenseFilters) => void;
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const { categories } = useExpenseCategories();
  const { costCenters } = useExpenseCostCenters();

  const updateFilter = (key: keyof IExpenseFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasFilters = Object.values(filters).some(v => v);

  return (
    <Card className="rounded-xl bg-muted/20 border-muted/50 shadow-sm p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar despesas..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="pl-9 bg-background/80 border-muted/50 rounded-lg h-10"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros:</span>
          </div>

          <Select
            value={filters.status || 'all'}
            onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[130px] h-9 bg-background/80 border-muted/50 rounded-lg text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.category_id || 'all'}
            onValueChange={(v) => updateFilter('category_id', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[140px] h-9 bg-background/80 border-muted/50 rounded-lg text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.cost_center_id || 'all'}
            onValueChange={(v) => updateFilter('cost_center_id', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[160px] h-9 bg-background/80 border-muted/50 rounded-lg text-sm">
              <SelectValue placeholder="Centro de Custo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Centros</SelectItem>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    {cc.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
              className="w-[130px] h-9 bg-background/80 border-muted/50 rounded-lg text-sm"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
              className="w-[130px] h-9 bg-background/80 border-muted/50 rounded-lg text-sm"
            />
          </div>

          {hasFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="h-9 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
