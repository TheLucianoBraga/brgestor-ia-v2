import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Users, 
  Bell, 
  MessageCircle, 
  BarChart3, 
  Check, 
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Shield,
  Zap,
  Bot,
  Loader2,
  Star,
  ArrowRight,
  Play,
  Send,
  Lock,
  Crown,
  Store,
  Building2,
  CreditCard,
  Clock,
  RefreshCcw,
  Wallet,
  Package,
  MessageSquare,
  ChevronDown,
  ExternalLink,
  Rocket,
  Heart,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { WhatsAppFloatingButton } from "@/components/public/WhatsAppFloatingButton";
import { SYSTEM_FEATURES, type Category, type SubCategory, type Feature } from "@/data/systemFeatures";
import logoBraga from "@/assets/logo-braga.png";
import { FAQ } from "@/components/landing/FAQ";
import { Testimonials } from "@/components/landing/Testimonials";

interface Plan {
  id: string;
  name: string;
  base_price: number | null;
  max_users: number | null;
  plan_type: string;
  per_active_revenda_price: number | null;
  effective_price?: number;
  description?: string;
}

// Testimonials moved to separate component

// Will be set dynamically from master tenant

// Animation variants - using proper Easing type
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6 }
  }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const floatingAnimation = {
  y: [-10, 10, -10],
  transition: {
    duration: 4,
    repeat: Infinity
  }
};

// Animated Counter Component
const AnimatedCounter = ({ value, suffix = "" }: { value: string; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (isInView) {
      const numericValue = parseInt(value.replace(/\D/g, '')) || 0;
      const duration = 2000;
      const steps = 60;
      const increment = numericValue / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current).toString());
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{displayValue}{suffix}</span>;
};

// Feature Modal Component
const FeatureModal = ({ 
  category, 
  isOpen, 
  onClose,
  signupLink
}: { 
  category: Category | null; 
  isOpen: boolean; 
  onClose: () => void;
  signupLink: string;
}) => {
  const [expandedSub, setExpandedSub] = useState<number | null>(0);

  if (!category) return null;

  const Icon = category.icon;
  const totalFeatures = category.subCategories.reduce((acc, sub) => acc + sub.features.length, 0);
  const activeFeatures = category.subCategories.reduce((acc, sub) => 
    acc + sub.features.filter(f => f.status === 'active').length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ${category.color}`}
            >
              <Icon className="w-8 h-8" />
            </motion.div>
            <div>
              <DialogTitle className="text-2xl">{category.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {category.description}
              </DialogDescription>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary">
              <Check className="w-3 h-3 mr-1" />
              {activeFeatures} recursos ativos
            </Badge>
            <Badge variant="outline">
              {totalFeatures} total
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4 mt-4">
          <motion.div 
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {category.subCategories.map((sub, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSub(expandedSub === idx ? null : idx)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="text-left">
                    <h4 className="font-semibold">{sub.name}</h4>
                    <p className="text-sm text-muted-foreground">{sub.description}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedSub === idx ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {expandedSub === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 grid gap-2">
                        {sub.features.map((feature, fIdx) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <motion.div
                              key={fIdx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: fIdx * 0.05 }}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              {FeatureIcon && <FeatureIcon className="w-5 h-5 text-primary" />}
                              <div className="flex-1">
                                <span className="font-medium text-sm">{feature.name}</span>
                                <p className="text-xs text-muted-foreground">{feature.description}</p>
                              </div>
                              <Badge 
                                variant={feature.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {feature.status === 'active' ? 'Ativo' : 
                                 feature.status === 'beta' ? 'Beta' : 
                                 feature.status === 'soon' ? 'Em breve' : 'Premium'}
                              </Badge>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <Button asChild className="w-full" size="lg">
            <Link to={signupLink}>
              <Rocket className="mr-2 w-5 h-5" />
              Começar 7 Dias Grátis
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// AI Demo Chat Component
const AIDemoChat = ({ shouldOpen, signupLink }: { shouldOpen: boolean; signupLink: string }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownInitial, setHasShownInitial] = useState(false);

  useEffect(() => {
    if (shouldOpen && !hasShownInitial) {
      setIsOpen(true);
      setHasShownInitial(true);
      setMessages([
        { 
          role: 'assistant', 
          content: '👋 Olá! Vi que você está conhecendo o BRGestor!\n\n🔒 Para ter acesso completo, você precisa se cadastrar como **revenda**.\n\n🎁 Ganhe **7 dias grátis** no plano básico!\n\n📲 Quer começar agora?' 
        }
      ]);
    }
  }, [shouldOpen, hasShownInitial]);

  const demoResponses: Record<string, string> = {
    'link': `🎉 Ótimo! Para se cadastrar como revenda e ter **7 dias grátis**, acesse:\n\n👉 [Clique aqui para se cadastrar](${signupLink})\n\nAcesso imediato a todas as funcionalidades!`,
    'cadastro': `Para se cadastrar no BRGestor:\n\n1️⃣ Acesse o link de cadastro\n2️⃣ Ganhe **7 dias grátis**\n3️⃣ Acesso completo!\n\n📲 [Cadastrar agora](${signupLink})`,
    'funcionalidades': `✨ O BRGestor oferece:\n\n✅ Gestão completa de clientes\n✅ Cobranças automáticas (PIX, Boleto, Cartão)\n✅ WhatsApp integrado\n✅ Relatórios com IA\n✅ Portal do cliente\n✅ Atendimento 24/7 com IA\n\n🔒 [Assinar agora](${signupLink})`,
    'preço': `💰 Planos a partir de R$ 49,90/mês!\n\n🏪 **Planos Revenda**: Mensalidade fixa\n📊 **Planos Admin**: Para gerenciar revendas\n\n🎁 **7 dias grátis!**\n\n👉 [Ver planos](${signupLink})`,
    'default': `🤖 Sou o assistente IA em modo demo!\n\nNo sistema completo, posso:\n• Gerar cobranças PIX\n• Listar seus serviços\n• Responder 24/7\n\n🔒 [Cadastrar grátis](${signupLink})`
  };

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const userMessage = input.toLowerCase();
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let response = demoResponses.default;
      
      if (userMessage.includes('link') || userMessage.includes('acesso') || userMessage.includes('quero') || userMessage.includes('sim')) {
        response = demoResponses.link;
      } else if (userMessage.includes('cadastr') || userMessage.includes('registr') || userMessage.includes('criar conta')) {
        response = demoResponses.cadastro;
      } else if (userMessage.includes('funcionalidade') || userMessage.includes('recurso') || userMessage.includes('faz')) {
        response = demoResponses.funcionalidades;
      } else if (userMessage.includes('preço') || userMessage.includes('valor') || userMessage.includes('custo') || userMessage.includes('plano')) {
        response = demoResponses.preço;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 1000);
  }, [input]);

  const renderMessage = (content: string) => {
    const parts = content.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return (
          <Link key={i} to={linkMatch[2]} className="text-primary underline font-medium hover:text-primary/80">
            {linkMatch[1]}
          </Link>
        );
      }
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`${i}-${j}`}>{bp.slice(2, -2)}</strong>;
        }
        return <span key={`${i}-${j}`}>{bp}</span>;
      });
    });
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-xl flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={shouldOpen && !isOpen ? { 
          scale: [1, 1.15, 1],
          boxShadow: [
            "0 0 0 0 rgba(var(--primary), 0.4)",
            "0 0 0 20px rgba(var(--primary), 0)",
            "0 0 0 0 rgba(var(--primary), 0)"
          ]
        } : {}}
        transition={{ repeat: shouldOpen && !isOpen ? Infinity : 0, duration: 2 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Bot className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && shouldOpen && (
          <motion.span 
            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-40 right-6 z-40 w-80 sm:w-96 bg-card border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary to-accent p-4 text-primary-foreground">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Bot className="w-6 h-6" />
                </motion.div>
                <div>
                  <h4 className="font-semibold">Assistente IA</h4>
                  <p className="text-xs opacity-80">Tire suas dúvidas</p>
                </div>
              </div>
            </div>

            <Link 
              to={signupLink}
              className="flex items-center justify-between text-sm bg-accent/10 border-b px-4 py-2 hover:bg-accent/20 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-accent" />
                <span className="font-medium">7 dias grátis</span>
              </span>
              <span className="flex items-center gap-1 text-primary">
                Cadastrar <ExternalLink className="w-3 h-3" />
              </span>
            </Link>

            <ScrollArea className="h-56 p-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-muted p-3 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            <div className="px-4 py-2 border-t bg-muted/30 flex gap-2 overflow-x-auto">
              {['Quero começar!', 'Preços', 'Recursos'].map((action) => (
                <motion.button
                  key={action}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setMessages(prev => [...prev, { role: 'user', content: action }]);
                    setIsTyping(true);
                    setTimeout(() => {
                      let response = demoResponses.default;
                      if (action.includes('começar')) response = demoResponses.link;
                      if (action.includes('Preços')) response = demoResponses.preço;
                      if (action.includes('Recursos')) response = demoResponses.funcionalidades;
                      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
                      setIsTyping(false);
                    }, 800);
                  }}
                  className="px-3 py-1.5 text-xs bg-background border rounded-full hover:bg-muted transition-colors whitespace-nowrap"
                >
                  {action}
                </motion.button>
              ))}
            </div>

            <div className="p-4 border-t bg-background">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua dúvida..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Feature Card with hover animation
const FeatureCategoryCard = ({ 
  category, 
  onClick,
  index 
}: { 
  category: Category; 
  onClick: () => void;
  index: number;
}) => {
  const Icon = category.icon;
  const activeFeatures = category.subCategories.reduce((acc, sub) => 
    acc + sub.features.filter(f => f.status === 'active').length, 0);

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:border-primary/50 group overflow-hidden relative">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardHeader className="relative">
          <motion.div 
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 ${category.color}`}
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Icon className="w-7 h-7" />
          </motion.div>
          <CardTitle className="text-xl group-hover:text-primary transition-colors">
            {category.name}
          </CardTitle>
          <CardDescription>{category.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="relative">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Check className="w-3 h-3 mr-1" />
              {activeFeatures} recursos
            </Badge>
            <motion.div
              initial={{ x: 0, opacity: 0.5 }}
              whileHover={{ x: 5, opacity: 1 }}
            >
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

  const Index = () => {
  const navigate = useNavigate();

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Header height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  
  const [adminPlans, setAdminPlans] = useState<Plan[]>([]);
  const [revendaPlans, setRevendaPlans] = useState<Plan[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [shouldOpenChat, setShouldOpenChat] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [masterRefCode, setMasterRefCode] = useState<number | null>(null);
  
  // Dynamic signup link based on master ref code
  const REVENDA_SIGNUP_LINK = masterRefCode 
    ? `/cadastro-cliente/revenda?ref=${masterRefCode}` 
    : '/cadastro-cliente/revenda';
  
  const pricingSectionRef = useRef<HTMLElement>(null);
  const hasPassedPricing = useRef(false);
  const heroRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  // Open chat trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!shouldOpenChat) setShouldOpenChat(true);
    }, 12000);

    const handleScroll = () => {
      if (pricingSectionRef.current && !hasPassedPricing.current) {
        const rect = pricingSectionRef.current.getBoundingClientRect();
        if (rect.bottom < 0) {
          hasPassedPricing.current = true;
          setShouldOpenChat(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [shouldOpenChat]);

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setIsRedirecting(true);
      if (!tenantLoading) {
        if (currentTenant) {
          if (currentTenant.type === 'cliente') {
            navigate('/cliente/dashboard', { replace: true });
          } else {
            navigate('/app/dashboard', { replace: true });
          }
        } else {
          navigate('/app/select-tenant', { replace: true });
        }
      }
    }
  }, [isAuthenticated, authLoading, currentTenant, tenantLoading, navigate]);

  // Fetch plans and master ref code
  useEffect(() => {
    console.log("Fetching plans data...");
    const fetchData = async () => {
      // Fetch plans
      const { data: adminData } = await supabase
        .from("plans")
        .select("*")
        .eq("plan_type", "adm")
        .eq("active", true)
        .order("base_price", { ascending: true });
      
      const { data: revendaData } = await supabase
        .from("plans")
        .select("*")
        .eq("plan_type", "revenda")
        .eq("active", true)
        .order("base_price", { ascending: true });

      if (adminData) setAdminPlans(adminData);
      if (revendaData) setRevendaPlans(revendaData);

      // Fetch master tenant ref code for signup using public RPC
      const { data: refCodes } = await supabase.rpc('get_master_signup_ref_code');
      
      if (refCodes && Array.isArray(refCodes) && refCodes.length > 0) {
        const revendaCode = refCodes.find((r: any) => r && r.kind === 'signup_revenda');
        if (revendaCode && revendaCode.ref_code) {
          setMasterRefCode(revendaCode.ref_code);
        }
      }
    };
    fetchData();
  }, []);



  const stats = useMemo(() => {
    try {
      const totalFeatures = (SYSTEM_FEATURES || []).reduce((acc, cat) => 
        acc + (cat?.subCategories || []).reduce((subAcc, sub) => subAcc + (sub?.features?.length || 0), 0), 0
      );
      const activeFeatures = (SYSTEM_FEATURES || []).reduce((acc, cat) => 
        acc + (cat?.subCategories || []).reduce((subAcc, sub) => 
          subAcc + (sub?.features || []).filter(f => f?.status === 'active').length, 0
        ), 0
      );
      return { totalFeatures, activeFeatures };
    } catch (e) {
      console.error("Error calculating stats:", e);
      return { totalFeatures: 0, activeFeatures: 0 };
    }
  }, []);

  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-primary" />
          </motion.div>
          <p className="text-muted-foreground">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <title>BRGestor - Gestão Inteligente para Revendas e Assinaturas</title>
        <meta name="description" content="Automatize suas cobranças, gerencie clientes via WhatsApp e escale seu negócio com o BRGestor. Teste grátis por 7 dias!" />
        <meta property="og:title" content="BRGestor - Gestão Inteligente para Revendas" />
        <meta property="og:description" content="A plataforma completa para gestão de assinaturas e revendas com automação de WhatsApp." />
        <meta property="og:image" content="/og-image.png" />
        <meta name="keywords" content="gestão de revendas, automação de cobrança, whatsapp marketing, gestão de assinaturas, brgestor" />
      </Helmet>
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <motion.img 
                src={logoBraga} 
                alt="BRGestor" 
                className="h-10 w-auto"
                whileHover={{ scale: 1.05 }}
              />
              <span className="font-bold text-xl hidden sm:inline">BRGestor</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {['beneficios', 'funcionalidades', 'planos', 'depoimentos'].map((item) => (
                <motion.a 
                  key={item}
                  href={`#${item}`} 
                  onClick={(e) => scrollToSection(e, item)}
                  className="text-muted-foreground hover:text-foreground transition-colors capitalize cursor-pointer"
                  whileHover={{ y: -2 }}
                >
                  {item}
                </motion.a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/auth/login">Entrar</Link>
              </Button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Link to={REVENDA_SIGNUP_LINK}>
                    Começar Grátis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90 }} animate={{ rotate: 0 }} exit={{ rotate: -90 }}>
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden py-4 border-t overflow-hidden"
              >
                <nav className="flex flex-col gap-4">
                  {['beneficios', 'funcionalidades', 'planos', 'depoimentos'].map((item, i) => (
                    <motion.a 
                      key={item}
                      href={`#${item}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="text-muted-foreground hover:text-foreground capitalize cursor-pointer"
                      onClick={(e) => scrollToSection(e, item)}
                    >
                      {item}
                    </motion.a>
                  ))}
                  <div className="pt-4 border-t space-y-2">
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/auth/login">Entrar</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to={REVENDA_SIGNUP_LINK}>Começar Grátis</Link>
                    </Button>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 relative overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
            transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          />
        </div>
        
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={scaleIn}>
                <Badge variant="secondary" className="mb-6 py-2 px-4 text-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {stats.activeFeatures}+ funcionalidades • 7 dias grátis
                </Badge>
              </motion.div>
              
              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
              >
                Automatize seu negócio
                <br />
                <motion.span 
                  className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent"
                  animate={{ backgroundPosition: ["0%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                >
                  e aumente sua receita
                </motion.span>
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8"
              >
                Cobranças automáticas, WhatsApp integrado, IA e muito mais.
                <strong className="text-foreground"> Comece grátis hoje.</strong>
              </motion.p>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" asChild className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                    <Link to={REVENDA_SIGNUP_LINK}>
                      <Rocket className="mr-2 w-5 h-5" />
                      Começar 7 Dias Grátis
                      <ChevronRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                    <a href="#planos">
                      <Play className="mr-2 w-5 h-5" />
                      Ver Planos
                    </a>
                  </Button>
                </motion.div>
              </motion.div>

              <motion.p variants={fadeInUp} className="text-sm text-muted-foreground">
                ✓ Sem cartão de crédito &nbsp; ✓ Acesso imediato &nbsp; ✓ Cancele quando quiser
              </motion.p>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto"
          >
            {[
              { value: "10k", suffix: "+", label: "Clientes Gerenciados", icon: Users },
              { value: "99.9", suffix: "%", label: "Uptime Garantido", icon: Shield },
              { value: "40", suffix: "%", label: "Redução Inadimplência", icon: TrendingUp },
              { value: "24", suffix: "/7", label: "Suporte + IA", icon: Bot },
            ].map((stat, index) => (
              <motion.div key={index} variants={scaleIn}>
                <Card className="text-center p-6 border-muted/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }}>
                    <stat.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  </motion.div>
                  <div className="text-3xl font-bold text-primary">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4">Por que escolher o BRGestor?</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-bold mb-4">
              Tudo que seu negócio precisa
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Recursos poderosos que economizam seu tempo e aumentam sua receita
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {[
              { icon: RefreshCcw, title: "Cobranças Automáticas", description: "Configure uma vez, receba sempre. PIX, boleto e cartão com confirmação instantânea.", highlight: "Reduza inadimplência em até 40%" },
              { icon: MessageSquare, title: "WhatsApp Integrado", description: "Envie lembretes, cobranças e atualizações direto no WhatsApp dos seus clientes.", highlight: "Templates prontos para usar" },
              { icon: Bot, title: "Atendimento com IA", description: "Chatbot inteligente que responde dúvidas, gera PIX e atende 24 horas por dia.", highlight: "Atendimento 24/7 automático" },
              { icon: BarChart3, title: "Relatórios Inteligentes", description: "Dashboards em tempo real com métricas de receita, crescimento e previsões.", highlight: "Insights automáticos com IA" },
              { icon: Package, title: "Gestão de Produtos", description: "Planos, produtos, descontos e cupons. Controle total do seu catálogo.", highlight: "Assinaturas recorrentes" },
              { icon: Building2, title: "Multi-tenant", description: "Gerencie múltiplas empresas, revendas e clientes em uma única plataforma.", highlight: "Escalável para seu crescimento" },
            ].map((benefit, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-muted/50 group">
                    <CardHeader>
                      <motion.div 
                        className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-4"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                      >
                        <benefit.icon className="w-7 h-7 text-primary" />
                      </motion.div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {benefit.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base mb-4">{benefit.description}</CardDescription>
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {benefit.highlight}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" asChild>
                <Link to={REVENDA_SIGNUP_LINK}>
                  Quero essas funcionalidades
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Interactive */}
      <section id="funcionalidades" className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4">Clique para explorar</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-bold mb-4">
              {stats.activeFeatures}+ recursos para seu negócio
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Clique em cada categoria para ver todos os recursos disponíveis
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {SYSTEM_FEATURES.map((category, index) => (
              <FeatureCategoryCard
                key={category.id}
                category={category}
                onClick={() => setSelectedCategory(category)}
                index={index}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Card className="max-w-2xl mx-auto p-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <motion.div animate={floatingAnimation}>
                <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-2">Acesso completo com assinatura</h3>
              <p className="text-muted-foreground mb-6">
                Todas as {stats.activeFeatures} funcionalidades disponíveis. Teste grátis por 7 dias!
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" asChild>
                  <Link to={REVENDA_SIGNUP_LINK}>
                    <Crown className="mr-2 w-5 h-5" />
                    Começar 7 Dias Grátis
                  </Link>
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" ref={pricingSectionRef} className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Planos e Preços</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Escolha o seu plano ideal
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Planos flexíveis • <strong>7 dias grátis</strong>
            </p>
          </div>

          {/* Revenda Plans */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8 justify-center">
              <Store className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">Planos Revenda</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {Array.isArray(revendaPlans) && revendaPlans.length > 0 ? (
                revendaPlans.map((plan, index) => {
                  if (!plan) return null;
                  const isPopular = index === 1;
                  return (
                    <div key={plan.id || index} className="h-full">
                      <div className="h-full transition-transform hover:-translate-y-2 duration-300">
                        <Card className={`relative h-full ${
                          isPopular 
                            ? 'border-primary shadow-xl md:scale-105 bg-gradient-to-b from-primary/5 to-background' 
                            : 'border-muted hover:border-primary/50 hover:shadow-lg'
                        } transition-all duration-300`}>
                          {isPopular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                              <Badge className="bg-primary px-4 py-1 shadow-lg">
                                <Star className="w-3 h-3 mr-1" />
                                Mais Popular
                              </Badge>
                            </div>
                          )}
                          
                          <CardHeader className="text-center pb-2 pt-8">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <div className="mt-4">
                              <span className="text-5xl font-bold">
                                {plan.base_price ? `R$ ${plan.base_price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                              </span>
                              {plan.base_price && <span className="text-muted-foreground">/mês</span>}
                            </div>
                            <Badge variant="secondary" className="mt-3">
                              <Clock className="w-3 h-3 mr-1" />
                              7 dias grátis
                            </Badge>
                          </CardHeader>
                          
                          <CardContent className="pt-6">
                            <ul className="space-y-3 mb-8">
                              {[
                                `${plan.max_users || 'Ilimitados'} usuários`,
                                'Cobranças automáticas',
                                'WhatsApp integrado',
                                'Relatórios completos',
                                'Suporte via WhatsApp'
                              ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            
                            <Button 
                              className={`w-full ${isPopular ? 'bg-gradient-to-r from-primary to-accent' : ''}`}
                              variant={isPopular ? "default" : "outline"}
                              size="lg"
                              asChild
                            >
                              <Link to={REVENDA_SIGNUP_LINK}>
                                Começar Grátis
                                <ArrowRight className="ml-2 w-4 h-4" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Carregando planos...</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Plans */}
          <div>
            <div className="flex items-center gap-3 mb-8 justify-center">
              <Crown className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">Planos Admin</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {Array.isArray(adminPlans) && adminPlans.length > 0 ? (
                adminPlans.map((plan, index) => {
                  if (!plan) return null;
                  return (
                    <div key={plan.id || index} className="h-full">
                      <div className="h-full transition-transform hover:-translate-y-2 duration-300">
                        <Card className="relative h-full border-muted hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                          <CardHeader className="text-center pb-2 pt-8">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <div className="mt-4">
                              <span className="text-5xl font-bold">
                                {plan.base_price ? `R$ ${plan.base_price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                              </span>
                              {plan.base_price && <span className="text-muted-foreground">/mês</span>}
                            </div>
                            {plan.per_active_revenda_price && plan.per_active_revenda_price > 0 && (
                              <p className="text-sm text-muted-foreground mt-2">
                                + R$ {plan.per_active_revenda_price.toFixed(2).replace('.', ',')} por revenda ativa
                              </p>
                            )}
                            <Badge variant="secondary" className="mt-3">
                              <Clock className="w-3 h-3 mr-1" />
                              7 dias grátis
                            </Badge>
                          </CardHeader>
                          
                          <CardContent className="pt-6">
                            <ul className="space-y-3 mb-8">
                              {[
                                `${plan.max_users || 'Ilimitados'} usuários`,
                                'Gestão de revendas',
                                'Relatórios consolidados',
                                'Suporte prioritário',
                                'Personalização total'
                              ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            
                            <Button 
                              className="w-full"
                              variant="outline"
                              size="lg"
                              asChild
                            >
                              <Link to={REVENDA_SIGNUP_LINK}>
                                Começar Grátis
                                <ArrowRight className="ml-2 w-4 h-4" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Carregando planos...</p>
                </div>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <motion.div 
              className="inline-flex items-center gap-3 bg-success/10 text-success px-6 py-3 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">7 dias de garantia — Satisfação ou seu dinheiro de volta</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Testimonials />
      <FAQ />

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/10 via-primary/5 to-background relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
        >
          <motion.div 
            className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
            animate={{ y: [0, 30, 0] }}
            transition={{ repeat: Infinity, duration: 5 }}
          />
          <motion.div 
            className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl"
            animate={{ y: [0, -30, 0] }}
            transition={{ repeat: Infinity, duration: 7 }}
          />
        </motion.div>

        <div className="container mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-bold mb-6">
              Pronto para transformar seu negócio?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground mb-8">
              Junte-se a milhares de empresas que já automatizaram suas cobranças e aumentaram sua receita.
            </motion.p>
            
            <motion.div variants={scaleIn} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(var(--primary), 0)",
                    "0 0 0 10px rgba(var(--primary), 0.1)",
                    "0 0 0 0 rgba(var(--primary), 0)"
                  ]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Button size="lg" asChild className="text-lg px-10 py-7 bg-gradient-to-r from-primary to-accent shadow-xl">
                  <Link to={REVENDA_SIGNUP_LINK}>
                    <Rocket className="mr-2 w-6 h-6" />
                    Começar 7 Dias Grátis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
            >
              {[
                { icon: Check, text: '7 dias grátis' },
                { icon: CreditCard, text: 'Sem cartão de crédito' },
                { icon: Heart, text: 'Suporte humanizado' },
                { icon: X, text: 'Cancele quando quiser' }
              ].map((item, i) => (
                <motion.span 
                  key={i}
                  className="flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                >
                  <item.icon className="w-4 h-4 text-primary" />
                  {item.text}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center gap-3 mb-4">
                <img src={logoBraga} alt="BRGestor" className="h-10 w-auto" />
                <span className="font-bold text-xl">BRGestor</span>
              </Link>
              <p className="text-muted-foreground text-sm">
                A plataforma completa para gestão de clientes, cobranças e automação com IA.
              </p>
            </div>

            {[
              { title: 'Produto', links: [{ label: 'Funcionalidades', href: '#funcionalidades' }, { label: 'Preços', href: '#planos' }, { label: 'Depoimentos', href: '#depoimentos' }] },
              { title: 'Suporte', links: [{ label: 'Central de Ajuda', href: '#' }, { label: 'Contato', href: '#' }, { label: 'WhatsApp', href: '#' }] },
              { title: 'Legal', links: [{ label: 'Termos de Uso', href: '#' }, { label: 'Privacidade', href: '#' }] }
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-foreground transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BRGestor. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              Feito com <Heart className="w-4 h-4 text-destructive fill-destructive" /> no Brasil
            </div>
          </div>
        </div>
      </footer>

      {/* Feature Modal */}
      <FeatureModal 
        category={selectedCategory} 
        isOpen={!!selectedCategory} 
        onClose={() => setSelectedCategory(null)}
        signupLink={REVENDA_SIGNUP_LINK}
      />

      {/* AI Demo Chat */}
      <AIDemoChat shouldOpen={shouldOpenChat} signupLink={REVENDA_SIGNUP_LINK} />

      {/* WhatsApp Button */}
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Index;
