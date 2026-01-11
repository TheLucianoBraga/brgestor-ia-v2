import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SetupInitialTenant() {
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);

    const { error } = await supabase.functions.invoke(
      "setup-initial-admin"
    );

    if (error) {
      console.error(error);
      toast.error("Erro ao criar acesso inicial");
      setLoading(false);
      return;
    }

    toast.success("Acesso inicial criado. Recarregando...");
    window.location.reload();
  }

  return (
    <Button
      className="w-full"
      onClick={handleSetup}
      disabled={loading}
    >
      {loading ? "Configurando..." : "Criar acesso inicial (Owner)"}
    </Button>
  );
}
