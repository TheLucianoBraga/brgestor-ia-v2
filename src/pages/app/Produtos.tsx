import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Package, ShoppingBag, Percent, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { useTenantPlans, TenantPlan, TenantPlanFormData } from '@/hooks/useTenantPlans';
import { useTenantProducts, TenantProduct, TenantProductFormData } from '@/hooks/useTenantProducts';
import { useTenantDiscounts, Discount, DiscountFormData } from '@/hooks/useTenantDiscounts';

import { TenantPlanModal } from '@/components/produtos/TenantPlanModal';
import { TenantProductModal } from '@/components/produtos/TenantProductModal';
import { DiscountModal } from '@/components/produtos/DiscountModal';
import { PlanCard } from '@/components/produtos/PlanCard';
import { ProductCard } from '@/components/produtos/ProductCard';
import { DiscountCard } from '@/components/produtos/DiscountCard';

export default function Produtos() {
  const [activeTab, setActiveTab] = useState('plans');
  
  // Plans state
  const { 
    plans, 
    isLoading: plansLoading, 
    createPlan, 
    updatePlan, 
    deletePlan, 
    toggleActive: togglePlanActive 
  } = useTenantPlans();
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<TenantPlan | null>(null);

  // Products state
  const { 
    products, 
    isLoading: productsLoading, 
    createProduct, 
    updateProduct, 
    deleteProduct, 
    toggleActive: toggleProductActive 
  } = useTenantProducts();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<TenantProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<TenantProduct | null>(null);

  // Discounts state
  const { 
    discounts, 
    isLoading: discountsLoading, 
    createDiscount, 
    updateDiscount, 
    deleteDiscount, 
    toggleActive: toggleDiscountActive 
  } = useTenantDiscounts();
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);

  // Plan handlers
  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setPlanModalOpen(true);
  };

  const handleEditPlan = (plan: TenantPlan) => {
    setSelectedPlan(plan);
    setPlanModalOpen(true);
  };

  const handlePlanSubmit = async (data: TenantPlanFormData) => {
    if (selectedPlan) {
      return updatePlan(selectedPlan.id, data);
    }
    return createPlan(data);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    await deletePlan(planToDelete.id);
    setPlanToDelete(null);
  };

  // Product handlers
  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product: TenantProduct) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (data: TenantProductFormData) => {
    if (selectedProduct) {
      return updateProduct(selectedProduct.id, data);
    }
    return createProduct(data);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    await deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  // Discount handlers
  const handleCreateDiscount = () => {
    setSelectedDiscount(null);
    setDiscountModalOpen(true);
  };

  const handleEditDiscount = (discount: Discount) => {
    setSelectedDiscount(discount);
    setDiscountModalOpen(true);
  };

  const handleDiscountSubmit = async (data: DiscountFormData) => {
    if (selectedDiscount) {
      return updateDiscount(selectedDiscount.id, data);
    }
    return createDiscount(data);
  };

  const handleDeleteDiscount = async () => {
    if (!discountToDelete) return;
    await deleteDiscount(discountToDelete.id);
    setDiscountToDelete(null);
  };

  const isLoading = plansLoading || productsLoading || discountsLoading;

  return (
    <PageTransition>
      <div className="page-container space-y-4 sm:space-y-6">
        <PageHeader
          title="Planos e Produtos"
          description="Gerencie planos, produtos e descontos"
          icon={Package}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
                <TabsTrigger value="plans" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Planos</span>
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Produtos</span>
                </TabsTrigger>
                <TabsTrigger value="discounts" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                  <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Descontos</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-shrink-0">
              {activeTab === 'plans' && (
                <Button onClick={handleCreatePlan} className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="ml-1 sm:ml-2">Novo Plano</span>
                </Button>
              )}
              {activeTab === 'products' && (
                <Button onClick={handleCreateProduct} className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="ml-1 sm:ml-2">Novo Produto</span>
                </Button>
              )}
              {activeTab === 'discounts' && (
                <Button onClick={handleCreateDiscount} className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="ml-1 sm:ml-2">Novo Desconto</span>
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="plans" className="mt-0">
                {plans.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Nenhum plano cadastrado"
                    description="Crie seu primeiro plano para oferecer aos clientes"
                    actionLabel="Criar Plano"
                    onAction={handleCreatePlan}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {plans.map(plan => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onEdit={handleEditPlan}
                        onDelete={(p) => setPlanToDelete(p)}
                        onToggleActive={(p) => togglePlanActive(p.id, !p.is_active)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="products" className="mt-0">
                {products.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title="Nenhum produto cadastrado"
                    description="Crie seu primeiro produto para vender aos clientes"
                    actionLabel="Criar Produto"
                    onAction={handleCreateProduct}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={handleEditProduct}
                        onDelete={(p) => setProductToDelete(p)}
                        onToggleActive={(p) => toggleProductActive(p.id, !p.is_active)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="discounts" className="mt-0">
                {discounts.length === 0 ? (
                  <EmptyState
                    icon={Percent}
                    title="Nenhum desconto cadastrado"
                    description="Crie descontos para aplicar em planos e produtos"
                    actionLabel="Criar Desconto"
                    onAction={handleCreateDiscount}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {discounts.map(discount => (
                      <DiscountCard
                        key={discount.id}
                        discount={discount}
                        plans={plans}
                        products={products}
                        onEdit={handleEditDiscount}
                        onDelete={(d) => setDiscountToDelete(d)}
                        onToggleActive={(d) => toggleDiscountActive(d.id, !d.is_active)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Modals */}
      <TenantPlanModal
        open={planModalOpen}
        onOpenChange={setPlanModalOpen}
        plan={selectedPlan}
        onSubmit={handlePlanSubmit}
      />

      <TenantProductModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        product={selectedProduct}
        onSubmit={handleProductSubmit}
      />

      <DiscountModal
        open={discountModalOpen}
        onOpenChange={setDiscountModalOpen}
        discount={selectedDiscount}
        plans={plans}
        products={products}
        onSubmit={handleDiscountSubmit}
      />

      {/* Delete Confirmations */}
      <ConfirmDialog
        open={!!planToDelete}
        onOpenChange={(open) => !open && setPlanToDelete(null)}
        title="Excluir Plano"
        description={`Tem certeza que deseja excluir o plano "${planToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeletePlan}
      />

      <ConfirmDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        title="Excluir Produto"
        description={`Tem certeza que deseja excluir o produto "${productToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeleteProduct}
      />

      <ConfirmDialog
        open={!!discountToDelete}
        onOpenChange={(open) => !open && setDiscountToDelete(null)}
        title="Excluir Desconto"
        description={`Tem certeza que deseja excluir o desconto "${discountToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeleteDiscount}
      />
    </PageTransition>
  );
}
