import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WahaCreateSessionResponse {
  success: boolean;
  session_name?: string;
  user_id?: string;
  qr_code?: string;
  connected?: boolean;
  status?: string;
  session_status?: string;
  error?: string;
}

export function useWahaCreateSession() {
  const { user } = useAuth();

  return useMutation<WahaCreateSessionResponse, Error>({
    mutationFn: async () => {
      console.log('🔵 [useWahaCreateSession] Iniciando...');
      
      if (!user?.id) {
        console.error('❌ Usuário não autenticado!');
        throw new Error("Usuário não autenticado");
      }

      console.log('✅ User ID:', user.id);

      // Obter o token JWT atual
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      console.log('🔑 Token obtido:', accessToken ? 'SIM' : 'NÃO');

      // Usar whatsapp-test temporariamente
      const { data, error } = await supabase.functions.invoke("whatsapp-test", {
        body: { userId: user.id },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('❌ Erro da edge function:', error);
        throw error;
      }

      console.log('✅ Resposta da edge function:', data);
      return data as WahaCreateSessionResponse;
    },
  });
}
