import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Carlos Silva",
    role: "Dono de Revenda",
    avatar: "CS",
    content: "O BRGestor revolucionou a forma como gerencio meus clientes. As cobranças automáticas me economizam horas toda semana!",
    rating: 5,
  },
  {
    name: "Ana Paula",
    role: "Gestora de Assinaturas",
    avatar: "AP",
    content: "A integração com WhatsApp é incrível. Meus clientes recebem lembretes automáticos e a inadimplência caiu 40%.",
    rating: 5,
  },
  {
    name: "Roberto Santos",
    role: "Empreendedor",
    avatar: "RS",
    content: "Interface intuitiva e relatórios completos. Consigo acompanhar todo o meu negócio em tempo real.",
    rating: 5,
  },
  {
    name: "Mariana Costa",
    role: "Administradora",
    avatar: "MC",
    content: "O suporte é excepcional e a plataforma está sempre evoluindo. Melhor investimento que fiz para meu negócio.",
    rating: 5,
  },
];

export const Testimonials = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">O que nossos clientes dizem</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Junte-se a centenas de empreendedores que já transformaram sua gestão com o BRGestor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
