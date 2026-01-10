import React, { useState, useEffect, useCallback } from 'react';
import { Package, CheckSquare, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SYSTEM_FEATURES } from '@/data/systemFeatures';
import { cn } from '@/lib/utils';

export interface SelectedFeature {
  category: string;
  subcategory: string;
  feature: string;
}

export interface GestaoPlanoData {
  id?: string;
  name: string;
  plan_type: 'adm' | 'revenda';
  description?: string;
  price_monthly: number;
  price_annual: number;
  min_fee_monthly: number;
  min_fee_annual: number;
  per_active_revenda_price?: number;
  duration_months: number;
  sort_order: number;
  max_users?: number;
  max_clients?: number;
  benefits?: string;
  active: boolean;
  features?: SelectedFeature[];
}

interface GestaoPlanoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: GestaoPlanoData | null;
  planType: 'adm' | 'revenda';
  onSubmit: (data: GestaoPlanoData) => Promise<{ success: boolean; error?: string }>;
}

export const GestaoPlanoModal: React.FC<GestaoPlanoModalProps> = ({
  open,
  onOpenChange,
  plan,
  planType,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceAnnual, setPriceAnnual] = useState(0);
  const [minFeeMonthly, setMinFeeMonthly] = useState(0);
  const [minFeeAnnual, setMinFeeAnnual] = useState(0);
  const [perActiveRevenda, setPerActiveRevenda] = useState(0);
  const [durationMonths, setDurationMonths] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [maxUsers, setMaxUsers] = useState(1);
  const [maxClients, setMaxClients] = useState<number | undefined>(undefined);
  const [benefits, setBenefits] = useState('');
  const [active, setActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Features state
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  const isEditing = !!plan;
  const isRevenda = planType === 'revenda';
  const isAdmin = planType === 'adm';

  // Reset form when modal opens/closes or plan changes
  useEffect(() => {
    if (!open) return;
    
    if (plan) {
      setName(plan.name);
      setDescription(plan.description || '');
      setPriceMonthly(plan.price_monthly || 0);
      setPriceAnnual(plan.price_annual || 0);
      setMinFeeMonthly(plan.min_fee_monthly || 0);
      setMinFeeAnnual(plan.min_fee_annual || 0);
      setPerActiveRevenda(plan.per_active_revenda_price || 0);
      setDurationMonths(plan.duration_months || 1);
      setSortOrder(plan.sort_order || 0);
      setMaxUsers(plan.max_users || 1);
      setMaxClients(plan.max_clients);
      setBenefits(plan.benefits || '');
      setActive(plan.active);
      setSelectedFeatures(plan.features || []);
    } else {
      setName('');
      setDescription('');
      setPriceMonthly(0);
      setPriceAnnual(0);
      setMinFeeMonthly(0);
      setMinFeeAnnual(0);
      setPerActiveRevenda(0);
      setDurationMonths(1);
      setSortOrder(0);
      setMaxUsers(1);
      setMaxClients(undefined);
      setBenefits('');
      setActive(true);
      setSelectedFeatures([]);
    }
    setActiveTab('info');
    setExpandedCategories(new Set());
    setExpandedSubcategories(new Set());
  }, [plan?.id, open]);

  // Feature selection helpers - memoized with useCallback
  const isFeatureSelected = useCallback((category: string, subcategory: string, feature: string) => {
    return selectedFeatures.some(
      (f) => f.category === category && f.subcategory === subcategory && f.feature === feature
    );
  }, [selectedFeatures]);

  const toggleFeature = useCallback((category: string, subcategory: string, feature: string) => {
    if (isLoading) return;
    
    setSelectedFeatures(prev => {
      const exists = prev.some(
        (f) => f.category === category && f.subcategory === subcategory && f.feature === feature
      );
      if (exists) {
        return prev.filter(
          (f) => !(f.category === category && f.subcategory === subcategory && f.feature === feature)
        );
      } else {
        return [...prev, { category, subcategory, feature }];
      }
    });
  }, [isLoading]);

  const toggleCategoryExpand = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const toggleSubcategoryExpand = useCallback((key: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAllInCategory = useCallback((category: typeof SYSTEM_FEATURES[0]) => {
    if (isLoading) return;
    
    const categoryFeatures: SelectedFeature[] = [];
    category.subCategories.forEach((sub) => {
      sub.features.forEach((feat) => {
        categoryFeatures.push({
          category: category.id,
          subcategory: sub.name,
          feature: feat.name,
        });
      });
    });

    setSelectedFeatures(prev => {
      const currentCategoryFeatures = prev.filter((f) => f.category === category.id);
      const allSelected = categoryFeatures.length > 0 && categoryFeatures.every((cf) =>
        currentCategoryFeatures.some(
          (f) => f.subcategory === cf.subcategory && f.feature === cf.feature
        )
      );

      if (allSelected) {
        return prev.filter((f) => f.category !== category.id);
      } else {
        return [...prev.filter((f) => f.category !== category.id), ...categoryFeatures];
      }
    });
  }, [isLoading]);

  const selectAllInSubcategory = useCallback((categoryId: string, subcategory: typeof SYSTEM_FEATURES[0]['subCategories'][0]) => {
    if (isLoading) return;
    
    const subFeatures: SelectedFeature[] = subcategory.features.map((feat) => ({
      category: categoryId,
      subcategory: subcategory.name,
      feature: feat.name,
    }));

    setSelectedFeatures(prev => {
      const currentSubFeatures = prev.filter(
        (f) => f.category === categoryId && f.subcategory === subcategory.name
      );
      const allSelected = subFeatures.length > 0 && subFeatures.every((sf) =>
        currentSubFeatures.some((f) => f.feature === sf.feature)
      );

      if (allSelected) {
        return prev.filter((f) => !(f.category === categoryId && f.subcategory === subcategory.name));
      } else {
        return [
          ...prev.filter((f) => !(f.category === categoryId && f.subcategory === subcategory.name)),
          ...subFeatures,
        ];
      }
    });
  }, [isLoading]);

  const getCategorySelectedCount = useCallback((category: typeof SYSTEM_FEATURES[0]) => {
    return selectedFeatures.filter((f) => f.category === category.id).length;
  }, [selectedFeatures]);

  const getCategoryTotalCount = useCallback((category: typeof SYSTEM_FEATURES[0]) => {
    return category.subCategories.reduce((acc, sub) => acc + sub.features.length, 0);
  }, []);

  const getSubcategorySelectedCount = useCallback((categoryId: string, subcategory: typeof SYSTEM_FEATURES[0]['subCategories'][0]) => {
    return selectedFeatures.filter(
      (f) => f.category === categoryId && f.subcategory === subcategory.name
    ).length;
  }, [selectedFeatures]);

  const totalFeatures = SYSTEM_FEATURES.reduce(
    (acc, cat) => acc + cat.subCategories.reduce((a, sub) => a + sub.features.length, 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Preencha o nome do plano');
      return;
    }

    if (minFeeMonthly <= 0) {
      toast.error('Preencha a taxa mínima mensal');
      return;
    }

    if (durationMonths <= 0) {
      toast.error('Preencha a duração em meses');
      return;
    }

    setIsLoading(true);

    const data: GestaoPlanoData = {
      id: plan?.id,
      name: name.trim(),
      plan_type: planType,
      description: description.trim() || undefined,
      price_monthly: priceMonthly,
      price_annual: priceAnnual,
      min_fee_monthly: minFeeMonthly,
      min_fee_annual: minFeeAnnual,
      per_active_revenda_price: isAdmin ? perActiveRevenda : undefined,
      duration_months: durationMonths,
      sort_order: sortOrder,
      max_users: maxUsers,
      max_clients: isRevenda ? maxClients : undefined,
      benefits: benefits.trim() || undefined,
      active,
      features: selectedFeatures,
    };

    const result = await onSubmit(data);
    setIsLoading(false);

    if (result.success) {
      toast.success(isEditing ? 'Plano atualizado!' : 'Plano criado!');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Erro ao salvar plano');
    }
  };

  const title = isEditing
    ? `Editar Plano ${isRevenda ? 'Revenda' : 'Admin'}`
    : `Novo Plano ${isRevenda ? 'Revenda' : 'Admin'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do plano.'
              : `Configure um novo plano para ${isRevenda ? 'revendas' : 'administradoras'}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Funcionalidades
                {selectedFeatures.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedFeatures.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 flex-1 overflow-auto py-4">
              {/* Nome e Descrição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Plano Básico"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Ordem de exibição</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do plano"
                  disabled={isLoading}
                  rows={2}
                />
              </div>

              {/* Preços */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cobrado por mim Mensal (R$)</Label>
                  <CurrencyInput
                    value={priceMonthly}
                    onChange={setPriceMonthly}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cobrado por mim Anual (R$)</Label>
                  <CurrencyInput
                    value={priceAnnual}
                    onChange={setPriceAnnual}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Taxas Mínimas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taxa Mínima Mensal (R$) *</Label>
                  <CurrencyInput
                    value={minFeeMonthly}
                    onChange={setMinFeeMonthly}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa Mínima Anual (R$)</Label>
                  <CurrencyInput
                    value={minFeeAnnual}
                    onChange={setMinFeeAnnual}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Campo exclusivo para Admin */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Por Ativo (R$)</Label>
                  <CurrencyInput
                    value={perActiveRevenda}
                    onChange={setPerActiveRevenda}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor adicional cobrado por revenda ativa vinculada.
                  </p>
                </div>
              )}

              {/* Duração e Limites */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="durationMonths">Duração (meses) *</Label>
                  <Input
                    id="durationMonths"
                    type="number"
                    min={1}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Máx. Usuários</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min={1}
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                    disabled={isLoading}
                  />
                </div>
                {isRevenda && (
                  <div className="space-y-2">
                    <Label htmlFor="maxClients">Limite Clientes</Label>
                    <Input
                      id="maxClients"
                      type="number"
                      min={0}
                      value={maxClients ?? ''}
                      onChange={(e) => setMaxClients(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Ilimitado"
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>

              {/* Benefícios */}
              <div className="space-y-2">
                <Label htmlFor="benefits">Benefícios (texto livre)</Label>
                <Textarea
                  id="benefits"
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="Liste os benefícios do plano, um por linha"
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="active">Status do plano</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{active ? 'Ativo' : 'Inativo'}</span>
                  <Switch
                    id="active"
                    checked={active}
                    onCheckedChange={setActive}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="flex-1 overflow-hidden py-4">
              <div className="space-y-2 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <Label>Funcionalidades do plano</Label>
                  <span className="text-sm text-muted-foreground">
                    {selectedFeatures.length}/{totalFeatures} selecionadas
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione as funcionalidades que estarão disponíveis neste plano.
                </p>
                
                <ScrollArea className="h-[350px] border rounded-lg p-2">
                  <div className="space-y-1 pr-4">
                    {SYSTEM_FEATURES.map((category) => {
                      const Icon = category.icon;
                      const isExpanded = expandedCategories.has(category.id);
                      const selectedCount = getCategorySelectedCount(category);
                      const totalCount = getCategoryTotalCount(category);
                      const allCategorySelected = selectedCount === totalCount && totalCount > 0;

                      return (
                        <div key={category.id}>
                          {/* Category Header */}
                          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <Checkbox
                              checked={allCategorySelected}
                              disabled={isLoading}
                              onCheckedChange={() => selectAllInCategory(category)}
                              className="data-[state=checked]:bg-primary"
                            />
                            <div 
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() => toggleCategoryExpand(category.id)}
                            >
                              <Icon className={cn('w-4 h-4', category.color)} />
                              <span className="font-medium text-sm flex-1">{category.name}</span>
                              {selectedCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {selectedCount}/{totalCount}
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Subcategories */}
                          {isExpanded && (
                            <div className="pl-6 space-y-1">
                              {category.subCategories.map((sub) => {
                                const subKey = `${category.id}-${sub.name}`;
                                const isSubExpanded = expandedSubcategories.has(subKey);
                                const subSelectedCount = getSubcategorySelectedCount(category.id, sub);
                                const allSubSelected = subSelectedCount === sub.features.length && sub.features.length > 0;

                                return (
                                  <div key={subKey}>
                                    {/* Subcategory Header */}
                                    <div className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 transition-colors">
                                      <Checkbox
                                        checked={allSubSelected}
                                        disabled={isLoading}
                                        onCheckedChange={() => selectAllInSubcategory(category.id, sub)}
                                        className="data-[state=checked]:bg-primary"
                                      />
                                      <div 
                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                        onClick={() => toggleSubcategoryExpand(subKey)}
                                      >
                                        <span className="text-sm text-muted-foreground flex-1">{sub.name}</span>
                                        {subSelectedCount > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            {subSelectedCount}/{sub.features.length}
                                          </Badge>
                                        )}
                                        {isSubExpanded ? (
                                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                        )}
                                      </div>
                                    </div>

                                    {/* Features */}
                                    {isSubExpanded && (
                                      <div className="pl-6 space-y-0.5">
                                        {sub.features.map((feature) => {
                                          const isSelected = isFeatureSelected(category.id, sub.name, feature.name);

                                          return (
                                            <div
                                              key={feature.name}
                                              className={cn(
                                                'flex items-center gap-2 p-1.5 rounded transition-colors',
                                                isSelected ? 'bg-primary/10' : 'hover:bg-muted/20'
                                              )}
                                            >
                                              <Checkbox
                                                checked={isSelected}
                                                disabled={isLoading}
                                                onCheckedChange={() => toggleFeature(category.id, sub.name, feature.name)}
                                                className="data-[state=checked]:bg-primary"
                                              />
                                              <span className="text-xs flex-1">{feature.name}</span>
                                              {feature.status === 'beta' && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0">Beta</Badge>
                                              )}
                                              {feature.status === 'soon' && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0">Em breve</Badge>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="btn-gradient-primary">
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
