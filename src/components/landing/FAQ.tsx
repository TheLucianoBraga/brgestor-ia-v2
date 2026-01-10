import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Como funciona o período de teste de 7 dias?",
    answer: "Você tem acesso total a todas as funcionalidades do sistema por 7 dias. Não solicitamos cartão de crédito para começar. Após o período, você escolhe o plano que melhor se adapta ao seu negócio."
  },
  {
    question: "O sistema faz cobranças automáticas pelo WhatsApp?",
    answer: "Sim! O BRGestor envia lembretes de vencimento, avisos de cobrança e confirmações de pagamento automaticamente via WhatsApp, reduzindo drasticamente a inadimplência."
  },
  {
    question: "Posso gerenciar mais de uma revenda?",
    answer: "Sim, dependendo do plano escolhido, você pode gerenciar múltiplas revendas ou unidades de negócio de forma centralizada."
  },
  {
    question: "O suporte está incluso?",
    answer: "Com certeza. Oferecemos suporte humanizado via WhatsApp e e-mail para todos os nossos clientes, independente do plano."
  },
  {
    question: "É seguro colocar os dados dos meus clientes?",
    answer: "A segurança é nossa prioridade. Utilizamos criptografia de ponta e os servidores mais seguros do mercado (Supabase/AWS) para garantir que seus dados estejam sempre protegidos."
  }
];

export const FAQ = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
          <p className="text-muted-foreground">
            Tire suas dúvidas sobre como o BRGestor pode transformar sua gestão.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
