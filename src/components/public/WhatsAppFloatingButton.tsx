import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MASTER_TENANT_ID = "a0000000-0000-0000-0000-000000000001";

export function WhatsAppFloatingButton() {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetchMasterWhatsApp = async () => {
      // Busca o número de WhatsApp do master nas configurações
      const { data } = await supabase
        .from("tenant_settings")
        .select("value")
        .eq("tenant_id", MASTER_TENANT_ID)
        .eq("key", "whatsapp_support")
        .maybeSingle();

      if (data?.value) {
        setWhatsappNumber(data.value);
      } else {
        // Fallback: busca o telefone do chatbot do master
        const { data: chatbotData } = await supabase
          .from("chatbot_config")
          .select("whatsapp_number")
          .eq("tenant_id", MASTER_TENANT_ID)
          .maybeSingle();

        if (chatbotData?.whatsapp_number) {
          setWhatsappNumber(chatbotData.whatsapp_number);
        }
      }
    };

    fetchMasterWhatsApp();
  }, []);

  if (!whatsappNumber) return null;

  const handleClick = () => {
    // Formata o número removendo caracteres não numéricos
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    
    // Mensagem padrão para solicitar link de cadastro
    const message = encodeURIComponent(
      "Olá! Gostaria de receber o link para cadastro no BRGestor."
    );
    
    // Abre o WhatsApp com a mensagem pré-definida
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, "_blank");
  };

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl transition-all duration-300 p-0"
      aria-label="Fale conosco no WhatsApp"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </Button>
  );
}
