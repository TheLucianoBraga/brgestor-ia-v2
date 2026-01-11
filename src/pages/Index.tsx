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
import logo from "@/assets/logo.png";
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
                src={logo} 
                alt="BRGestor" 
                className="h-10 w-auto"
                whileHover={{ scale: 1.05 }}
              />
              <span className="font-bold text-xl hidden sm:inline">BRGESTOR</span>
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
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={scaleIn}>
                <Badge variant="secondary" className="mb-6 py-2 px-4 text-sm bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <Crown className="w-4 h-4 mr-2 text-primary" />
                  🚀 EXCLUSIVO: Primeira Plataforma do Brasil com IA Avançada • 7 dias grátis
                </Badge>
              </motion.div>
              
              <motion.h1 
                variants={fadeInUp}
                className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-8 leading-tight"
              >
                O ÚNICO SISTEMA QUE
                <br />
                <motion.span 
                  className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent"
                  animate={{ backgroundPosition: ["0%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                >
                  GERA PIX COM IA
                </motion.span>
                <br />
                NO WHATSAPP 24/7
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto mb-10 leading-relaxed"
              >
                ⚡ <strong className="text-foreground">CHATBOT QUE GERA PIX INSTANTÂNEO</strong> • 📊 <strong className="text-foreground">RELATÓRIOS COM IA QUE PREVEEM O FUTURO</strong> • 🎯 <strong className="text-foreground">AUTOMAÇÃO DE COBRANÇA 100% INTELIGENTE</strong>
              </motion.p>

              {/* Exclusive Features Showcase */}
              <motion.div 
                variants={staggerContainer}
                className="grid md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto"
              >
                {[
                  { icon: Bot, title: "IA que Gera PIX", desc: "Cliente pede via WhatsApp = PIX pronto em 2 segundos", color: "from-blue-500 to-cyan-500" },
                  { icon: Sparkles, title: "Relatórios que Preveem", desc: "IA prevê inadimplência e sugere ações automáticas", color: "from-purple-500 to-pink-500" },
                  { icon: Zap, title: "Automação Total", desc: "Da cobrança ao pagamento, tudo 100% automático", color: "from-orange-500 to-red-500" }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    variants={scaleIn}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-background/50 to-background/80 backdrop-blur-md border border-primary/20 rounded-2xl p-8 group hover:border-primary/50 transition-all duration-300"
                  >
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" asChild className="text-xl px-12 py-8 bg-gradient-to-r from-primary via-accent to-primary hover:opacity-90 shadow-2xl shadow-primary/50 animate-pulse">
                    <Link to={REVENDA_SIGNUP_LINK}>
                      <Rocket className="mr-3 w-6 h-6" />
                      🎁 TESTAR GRÁTIS 7 DIAS
                      <ChevronRight className="ml-3 w-6 h-6" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" asChild className="text-xl px-10 py-8 border-2 hover:bg-primary hover:text-primary-foreground">
                    <a href="#exclusivos">
                      <Play className="mr-3 w-6 h-6" />
                      VER RECURSOS ÚNICOS
                    </a>
                  </Button>
                </motion.div>
              </motion.div>

              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground flex items-center justify-center gap-8 flex-wrap">
                ✓ <strong>SEM CARTÃO DE CRÉDITO</strong> • ✓ <strong>ACESSO EM 30 SEGUNDOS</strong> • ✓ <strong>IA JÁ CONFIGURADA</strong> • ✓ <strong>SUPORTE 24/7</strong>
              </motion.p>
            </motion.div>
          </div>

          {/* Revolutionary Stats */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto"
          >
            {[
              { value: "10k", suffix: "+", label: "PIXs Gerados pela IA", icon: Bot, color: "text-blue-500" },
              { value: "95", suffix: "%", label: "Precisão das Previsões", icon: Sparkles, color: "text-purple-500" },
              { value: "60", suffix: "%", label: "Redução Inadimplência", icon: TrendingUp, color: "text-green-500" },
              { value: "2", suffix: "seg", label: "Tempo Resposta IA", icon: Zap, color: "text-orange-500" },
            ].map((stat, index) => (
              <motion.div key={index} variants={scaleIn}>
                <Card className="text-center p-6 border-2 border-muted/50 bg-gradient-to-br from-background/50 to-background/80 backdrop-blur-md hover:shadow-2xl hover:border-primary/50 transition-all duration-500 group">
                  <motion.div whileHover={{ scale: 1.2, rotate: 10 }}>
                    <stat.icon className={`w-10 h-10 mx-auto mb-3 ${stat.color}`} />
                  </motion.div>
                  <div className={`text-4xl font-bold ${stat.color} group-hover:scale-110 transition-transform`}>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* EXCLUSIVE FEATURES SECTION - O que NINGUÉM MAIS TEM */}
      <section id="exclusivos" className="py-24 px-4 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"
            animate={{ rotate: [0, 360] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full blur-3xl"
            animate={{ rotate: [360, 0] }}
            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
          />
        </div>
        
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 py-1 px-4 text-sm bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30">
                🏆 RECURSOS EXCLUSIVOS • PRIMEIRA PLATAFORMA DO BRASIL
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              O QUE <span className="text-primary">NINGUÉM MAIS</span> TEM
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto">
              ESTES RECURSOS SÃO <strong className="text-foreground">100% EXCLUSIVOS</strong> DO BRGESTOR. 
              VOCÊ NÃO ENCONTRARÁ ISSO EM <strong className="text-foreground">NENHUM OUTRO LUGAR</strong> DO BRASIL.
            </motion.p>
          </motion.div>

          {/* Grid de Recursos Exclusivos */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto mb-20"
          >
            {[
              {
                icon: Bot,
                title: "🤖 IA QUE GERA PIX NO WHATSAPP",
                subtitle: "EXCLUSIVO MUNDIAL",
                description: "CLIENTE MANDA MENSAGEM = IA ENTENDE + GERA PIX + ENVIA EM 2 SEGUNDOS. AUTOMÁTICO 24/7!",
                features: ["• PIX GERADO POR IA AUTOMATICAMENTE", "• ENTENDE LINGUAGEM NATURAL", "• RESPOSTA EM MENOS DE 2 SEGUNDOS", "• FUNCIONA 24 HORAS POR DIA"],
                gradient: "from-blue-500 to-cyan-500",
                bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950",
                badge: "🔥 REVOLUÇÃO",
                demo: "CLIENTE: 'OI, PRECISO PAGAR' → IA: 'PIX PRONTO! 💰'"
              },
              {
                icon: Sparkles,
                title: "📊 RELATÓRIOS QUE PREVEEM O FUTURO",
                subtitle: "EXCLUSIVO BRASIL",
                description: "IA ANALISA PADRÕES E PREVÊ QUEM VAI ATRASAR, QUANTO VOCÊ VAI FATURAR, QUANDO TERÁ PICOS DE DEMANDA!",
                features: ["• PREVISÃO DE INADIMPLÊNCIA COM 95% PRECISÃO", "• PREVISÃO DE FATURAMENTO FUTURO", "• IDENTIFICAÇÃO DE PADRÕES AUTOMÁTICA", "• SUGESTÕES DE AÇÃO PERSONALIZADA"],
                gradient: "from-purple-500 to-pink-500",
                bgGradient: "from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950",
                badge: "🚀 FUTURO",
                demo: "IA: 'CLIENTE JOÃO PODE ATRASAR EM 3 DIAS. ENVIAR LEMBRETE?'"
              },
              {
                icon: Zap,
                title: "⚡ AUTOMAÇÃO TOTAL END-TO-END",
                subtitle: "EXCLUSIVO MERCADO",
                description: "DA CRIAÇÃO DO CLIENTE ATÉ O PAGAMENTO, TUDO 100% AUTOMÁTICO. VOCÊ SÓ RECEBE O DINHEIRO!",
                features: ["• CLIENTE SE CADASTRA SOZINHO", "• COBRANÇA GERADA AUTOMATICAMENTE", "• PIX ENVIADO POR IA", "• RECONCILIAÇÃO AUTOMÁTICA"],
                gradient: "from-orange-500 to-red-500",
                bgGradient: "from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950",
                badge: "⚡ AUTOMÁTICO",
                demo: "100% AUTOMÁTICO: CADASTRO → COBRANÇA → PIX → PAGAMENTO"
              },
              {
                icon: MessageSquare,
                title: "💬 WHATSAPP COM SUPER-IA INTEGRADA",
                subtitle: "ÚNICO NO BRASIL",
                description: "IA QUE CONVERSA, TIRA DÚVIDAS, GERA COBRANÇA, ENVIA COMPROVANTE. É COMO TER 10 FUNCIONÁRIOS 24H!",
                features: ["• RESPONDE PERGUNTAS COMPLEXAS", "• GERA PIX E BOLETOS NA CONVERSA", "• ENVIA COMPROVANTES AUTOMÁTICOS", "• ESCALONA PARA HUMANO QUANDO PRECISA"],
                gradient: "from-green-500 to-emerald-500",
                bgGradient: "from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
                badge: "🎯 INTELIGENTE",
                demo: "IA RESOLVE 90% DOS ATENDIMENTOS SEM INTERVENÇÃO HUMANA"
              }
            ].map((feature, index) => (
              <motion.div key={index} variants={scaleIn}>
                <motion.div 
                  whileHover={{ y: -10, scale: 1.02 }} 
                  transition={{ type: "spring", stiffness: 300 }}
                  className="h-full"
                >
                  <Card className={`h-full p-8 border-2 border-muted/30 bg-gradient-to-br ${feature.bgGradient} hover:border-primary/50 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden`}>
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-5 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
                    
                    {/* Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge className={`bg-gradient-to-r ${feature.gradient} text-white border-0 shadow-lg animate-bounce`}>
                        {feature.badge}
                      </Badge>
                    </div>

                    <div className="relative z-10">
                      {/* Icon */}
                      <motion.div 
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        whileHover={{ rotate: 10 }}
                      >
                        <feature.icon className="w-8 h-8 text-white" />
                      </motion.div>

                      {/* Title */}
                      <h3 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <Badge variant="outline" className="mb-4 text-primary border-primary">
                        {feature.subtitle}
                      </Badge>

                      {/* Description */}
                      <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                        {feature.description}
                      </p>

                      {/* Features List */}
                      <ul className="space-y-3 mb-8">
                        {feature.features.map((feat, i) => (
                          <motion.li 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 text-base font-medium"
                          >
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${feature.gradient}`} />
                            {feat}
                          </motion.li>
                        ))}
                      </ul>

                      {/* Demo */}
                      <div className={`p-6 rounded-lg bg-gradient-to-r ${feature.gradient} bg-opacity-10 border-2 border-primary/20`}>
                        <p className="text-base font-mono text-foreground font-bold">
                          💡 <strong>EXEMPLO:</strong> {feature.demo}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          {/* Impacto dos Recursos Exclusivos */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeInUp} className="mb-16">
              <h3 className="text-4xl md:text-5xl font-bold mb-8">
                🎯 O IMPACTO DOS RECURSOS EXCLUSIVOS
              </h3>
              <p className="text-2xl text-muted-foreground max-w-4xl mx-auto">
                EMPRESAS QUE USAM NOSSOS RECURSOS EXCLUSIVOS VEEM RESULTADOS <strong className="text-foreground">IMEDIATOS</strong>:
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12"
            >
              {[
                { value: "90%", label: "REDUÇÃO NO ATENDIMENTO MANUAL", icon: Bot },
                { value: "60%", label: "MENOS INADIMPLÊNCIA", icon: TrendingUp },
                { value: "3x", label: "MAIS COBRANÇA AUTOMÁTICA", icon: Zap },
                { value: "24/7", label: "ATENDIMENTO SEM PARAR", icon: Clock }
              ].map((stat, i) => (
                <motion.div key={i} variants={scaleIn}>
                  <Card className="p-8 text-center border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 group">
                    <motion.div whileHover={{ scale: 1.2, rotate: 10 }}>
                      <stat.icon className="w-12 h-12 mx-auto mb-4 text-primary group-hover:text-accent transition-colors" />
                    </motion.div>
                    <div className="text-5xl font-bold text-primary mb-4 group-hover:scale-110 transition-transform">
                      {stat.value}
                    </div>
                    <div className="text-base text-muted-foreground font-bold uppercase">
                      {stat.label}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Exclusivo */}
            <motion.div variants={scaleIn}>
              <Card className="max-w-4xl mx-auto p-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-2 border-primary/30">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-3xl flex items-center justify-center shadow-2xl"
                  >
                    <Crown className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-2xl md:text-3xl font-bold mb-2">
                      🎁 Teste TODOS estes recursos EXCLUSIVOS
                    </h4>
                    <p className="text-lg text-muted-foreground">
                      <strong className="text-foreground">7 dias GRÁTIS</strong> para experimentar o que ninguém mais tem no Brasil
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" asChild className="text-lg px-8 py-6 bg-gradient-to-r from-primary via-accent to-primary shadow-2xl">
                      <Link to={REVENDA_SIGNUP_LINK}>
                        <Rocket className="mr-2 w-6 h-6" />
                        QUERO TESTAR AGORA
                        <ArrowRight className="ml-2 w-6 h-6" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section - Renovada com foco em diferenciais */}
      <section id="beneficios" className="py-24 px-4 bg-gradient-to-b from-muted/20 via-background to-muted/20">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 py-2 px-6 text-base bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30">
                🚀 POR QUE SOMOS DIFERENTES DA CONCORRÊNCIA
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Enquanto outros prometem,
              <br />
              <span className="text-primary">nós ENTREGAMOS</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Compare com qualquer sistema do mercado. 
              <strong className="text-foreground"> Você NÃO vai encontrar essas funcionalidades em outro lugar!</strong>
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
          >
            {[
              { 
                icon: RefreshCcw, 
                title: "🔥 Cobrança 100% Automática", 
                description: "Não é só 'enviar por email'. Nossa IA CONVERSA com o cliente, gera PIX na hora e acompanha até o pagamento!", 
                highlight: "IA que GERA PIX no WhatsApp",
                competition: "Concorrentes: Só enviam email genérico",
                gradient: "from-green-500 to-emerald-500"
              },
              { 
                icon: MessageSquare, 
                title: "💬 WhatsApp REALMENTE Integrado", 
                description: "Não é webhook simples. É IA completa que atende, resolve, cobra e converte. Seus clientes pensam que é humano!", 
                highlight: "IA indistinguível de humano",
                competition: "Concorrentes: Só enviam mensagem automática",
                gradient: "from-blue-500 to-cyan-500"
              },
              { 
                icon: Bot, 
                title: "🤖 IA que REALMENTE Funciona", 
                description: "Enquanto outros têm chatbots burros, nossa IA entende contexto, gera documentos e RESOLVE problemas complexos!", 
                highlight: "IA GPT-4 especializada em cobrança",
                competition: "Concorrentes: Chatbot com respostas prontas",
                gradient: "from-purple-500 to-pink-500"
              },
              { 
                icon: BarChart3, 
                title: "📊 Relatórios que PREVEEM", 
                description: "Não é só gráfico bonito. Nossa IA PREVÊ inadimplência, sugere ações e otimiza sua cobrança automaticamente!", 
                highlight: "Previsão com 95% de precisão",
                competition: "Concorrentes: Só mostram dados do passado",
                gradient: "from-orange-500 to-red-500"
              },
              { 
                icon: Package, 
                title: "🎯 Gestão INTELIGENTE", 
                description: "Não é só CRUD. Sistema aprende seus padrões, sugere preços, identifica oportunidades e otimiza vendas!", 
                highlight: "IA que sugere melhorias de negócio",
                competition: "Concorrentes: Só cadastram produtos",
                gradient: "from-indigo-500 to-purple-500"
              },
              { 
                icon: Building2, 
                title: "🏢 Multi-tenant ESCALÁVEL", 
                description: "Não é só 'várias empresas'. É arquitetura que CRESCE com você, sem lentidão, sem limite, sem dor de cabeça!", 
                highlight: "Escalabilidade infinita comprovada",
                competition: "Concorrentes: Sistema trava com crescimento",
                gradient: "from-teal-500 to-green-500"
              },
            ].map((benefit, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <motion.div 
                  whileHover={{ y: -12, scale: 1.03 }} 
                  transition={{ type: "spring", stiffness: 400 }}
                  className="h-full"
                >
                  <Card className="h-full hover:shadow-2xl transition-all duration-500 border-2 border-muted/30 group relative overflow-hidden bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm hover:border-primary/50">
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    
                    <CardHeader className="relative pb-4">
                      <motion.div 
                        className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                        whileHover={{ y: -5 }}
                      >
                        <benefit.icon className="w-8 h-8 text-white" />
                      </motion.div>
                      <CardTitle className="text-xl md:text-2xl group-hover:text-primary transition-colors duration-300">
                        {benefit.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="relative space-y-4">
                      <CardDescription className="text-base leading-relaxed">
                        {benefit.description}
                      </CardDescription>
                      
                      <div className="space-y-3">
                        <Badge variant="secondary" className={`text-xs bg-gradient-to-r ${benefit.gradient} bg-opacity-10 border-0`}>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {benefit.highlight}
                        </Badge>
                        
                        <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-destructive">⚠️ {benefit.competition}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Hover effect indicator */}
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        whileHover={{ x: 0, opacity: 1 }}
                        className="flex items-center gap-2 text-primary mt-4"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-sm font-medium">Ver em ação</span>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          {/* Competitive Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20"
          >
            <Card className="max-w-5xl mx-auto p-8 bg-gradient-to-r from-destructive/5 via-background to-primary/5 border-2 border-primary/20">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  🥊 BRGestor VS Concorrência
                </h3>
                <p className="text-muted-foreground">
                  Comparação honesta: veja por que somos únicos no mercado
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-destructive mb-4">❌ Outros Sistemas</h4>
                  {[
                    "Chatbot burro com respostas prontas",
                    "Só envia email e torce pro cliente pagar",
                    "Relatórios básicos do passado",
                    "WhatsApp só para enviar mensagem",
                    "Sistema trava quando cresce",
                    "Suporte por ticket que demora dias"
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <X className="w-5 h-5 text-destructive flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-primary mb-4">✅ BRGestor EXCLUSIVO</h4>
                  {[
                    "IA que conversa e resolve como humano",
                    "Gera PIX automático no WhatsApp",
                    "Prevê inadimplência com 95% precisão",
                    "WhatsApp com IA conversacional",
                    "Escala infinitamente sem travar",
                    "Suporte 24/7 com IA + humano"
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                    >
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Final CTA da seção */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" asChild className="text-lg px-12 py-6 bg-gradient-to-r from-primary via-accent to-primary shadow-2xl">
                <Link to={REVENDA_SIGNUP_LINK}>
                  <Crown className="mr-3 w-6 h-6" />
                  Quero o MELHOR Sistema do Brasil
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Link>
              </Button>
            </motion.div>
            <p className="text-sm text-muted-foreground mt-4">
              🎁 7 dias grátis • ⚡ Ativação em 30 segundos • 🔒 Sem cartão de crédito
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Interactive */}
      <section id="funcionalidades" className="py-24 px-4 bg-gradient-to-b from-background via-accent/5 to-background">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 py-2 px-6 text-base bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/30">
                🎯 CLIQUE E EXPLORE • MAIS DE {stats.activeFeatures} RECURSOS ATIVOS
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-primary">{stats.activeFeatures}+</span> recursos que vão
              <br />
              <motion.span 
                className="bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0%", "200%"] }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              >
                REVOLUCIONAR
              </motion.span> seu negócio
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-foreground">Clique em cada categoria</strong> para descobrir todos os recursos. 
              Muitos destes você <strong className="text-foreground">NÃO encontrará em lugar nenhum!</strong>
            </motion.p>
          </motion.div>

          {/* Stat Cards before features */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16"
          >
            {[
              { number: stats.activeFeatures, label: "Recursos Ativos", icon: Check, color: "text-green-500" },
              { number: SYSTEM_FEATURES.length, label: "Categorias", icon: Package, color: "text-blue-500" },
              { number: "15+", label: "Exclusivos", icon: Crown, color: "text-yellow-500" },
              { number: "100%", label: "Funcionais", icon: Shield, color: "text-purple-500" }
            ].map((stat, i) => (
              <motion.div key={i} variants={scaleIn}>
                <Card className="text-center p-4 border border-muted/50 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
                  <motion.div whileHover={{ scale: 1.2, rotate: 5 }}>
                    <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color} group-hover:scale-110 transition-transform`} />
                  </motion.div>
                  <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                    {typeof stat.number === 'string' ? stat.number : <AnimatedCounter value={stat.number.toString()} />}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
          >
            {SYSTEM_FEATURES.map((category, index) => {
              const totalFeatures = category.subCategories.reduce((acc, sub) => acc + sub.features.length, 0);
              const activeFeatures = category.subCategories.reduce((acc, sub) => 
                acc + sub.features.filter(f => f.status === 'active').length, 0);
              const exclusiveFeatures = category.subCategories.reduce((acc, sub) => 
                acc + sub.features.filter(f => f.name.toLowerCase().includes('ia') || 
                  f.description.toLowerCase().includes('automático') || 
                  f.description.toLowerCase().includes('inteligente')).length, 0);

              return (
                <motion.div key={category.id} variants={fadeInUp}>
                  <FeatureCategoryCard
                    category={category}
                    onClick={() => setSelectedCategory(category)}
                    index={index}
                  />
                  {/* Enhanced info overlay */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="mt-3 px-4"
                  >
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {totalFeatures} recursos
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {exclusiveFeatures} exclusivos
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        {activeFeatures} ativos
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Enhanced CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20"
          >
            <Card className="max-w-5xl mx-auto p-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-2 border-primary/30 relative overflow-hidden">
              {/* Animated background */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"
                animate={{ 
                  background: [
                    "linear-gradient(45deg, rgba(var(--primary), 0.05), rgba(var(--accent), 0.05))",
                    "linear-gradient(135deg, rgba(var(--accent), 0.05), rgba(var(--primary), 0.05))",
                    "linear-gradient(45deg, rgba(var(--primary), 0.05), rgba(var(--accent), 0.05))"
                  ]
                }}
                transition={{ repeat: Infinity, duration: 5 }}
              />
              
              <div className="relative z-10 text-center">
                <motion.div 
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6"
                >
                  <Lock className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  🔓 Acesso COMPLETO a TUDO
                </h3>
                <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
                  Todos os <strong className="text-foreground">{stats.activeFeatures} recursos ativos</strong>, 
                  incluindo os <strong className="text-primary">recursos EXCLUSIVOS</strong> que nenhum concorrente tem.
                  <br />
                  <strong className="text-foreground">Teste GRÁTIS por 7 dias!</strong>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" asChild className="text-lg px-10 py-6 bg-gradient-to-r from-primary via-accent to-primary shadow-2xl">
                      <Link to={REVENDA_SIGNUP_LINK}>
                        <Crown className="mr-3 w-6 h-6" />
                        LIBERAR ACESSO COMPLETO
                        <ChevronRight className="ml-3 w-6 h-6" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedCategory(SYSTEM_FEATURES[0])}
                    className="text-primary hover:text-primary/80 font-medium flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Ver recursos detalhados
                  </motion.button>
                </div>

                {/* Features highlight */}
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  {[
                    { icon: Bot, text: "IA que gera PIX", color: "text-blue-500" },
                    { icon: Sparkles, text: "Previsões automáticas", color: "text-purple-500" },
                    { icon: MessageSquare, text: "WhatsApp inteligente", color: "text-green-500" },
                    { icon: Shield, text: "100% seguro", color: "text-orange-500" }
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 bg-background/50 px-3 py-2 rounded-full border border-muted"
                    >
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span>{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" ref={pricingSectionRef} className="py-24 px-4 bg-gradient-to-b from-muted/20 via-background to-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="outline" className="mb-6 py-2 px-6 text-base bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30">
                  💰 PLANOS E PREÇOS • 7 DIAS COMPLETAMENTE GRÁTIS
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
                Invista no <span className="text-primary">MELHOR</span>
                <br />
                Pague pelo <span className="text-accent">JUSTO</span>
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Planos que se pagam sozinhos! Economize <strong className="text-foreground">10x mais</strong> do que paga 
                com a automação completa. <strong className="text-primary">7 dias grátis</strong> para provar o valor!
              </motion.p>
            </motion.div>
          </div>

          {/* Value Proposition Cards */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16"
          >
            {[
              { 
                icon: TrendingUp, 
                title: "ROI Garantido", 
                description: "Sistema se paga em 30 dias com a redução de inadimplência",
                color: "from-green-500 to-emerald-500" 
              },
              { 
                icon: Clock, 
                title: "Tempo = Dinheiro", 
                description: "Economize 20h/semana com automação completa",
                color: "from-blue-500 to-cyan-500" 
              },
              { 
                icon: Shield, 
                title: "Risco Zero", 
                description: "7 dias grátis + garantia de satisfação ou dinheiro de volta",
                color: "from-purple-500 to-pink-500" 
              }
            ].map((benefit, i) => (
              <motion.div key={i} variants={scaleIn}>
                <Card className="text-center p-6 border border-muted/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm hover:border-primary/50 hover:shadow-xl transition-all duration-500 group">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${benefit.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}
                  >
                    <benefit.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Revenda Plans */}
          <div className="mb-24">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-6 justify-center">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold">Planos Revenda</h3>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">MAIS POPULAR</Badge>
              </motion.div>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Para <strong className="text-foreground">revendas, prestadores de serviço e empresas</strong> que querem 
                automatizar cobrança e atendimento com a <strong className="text-primary">melhor IA do Brasil</strong>
              </motion.p>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
              {Array.isArray(revendaPlans) && revendaPlans.length > 0 ? (
                revendaPlans.map((plan, index) => {
                  if (!plan) return null;
                  const isPopular = index === 1;
                  const savings = plan.base_price ? Math.floor(plan.base_price * 10) : 0; // Economia estimada
                  
                  return (
                    <motion.div key={plan.id || index} variants={scaleIn} className="h-full">
                      <motion.div 
                        whileHover={{ y: -8, scale: 1.02 }} 
                        transition={{ type: "spring", stiffness: 300 }}
                        className="h-full"
                      >
                        <Card className={`relative h-full border-2 transition-all duration-500 ${
                          isPopular 
                            ? 'border-primary shadow-2xl md:scale-105 bg-gradient-to-b from-primary/10 via-background to-accent/10' 
                            : 'border-muted/30 hover:border-primary/50 hover:shadow-xl'
                        }`}>
                          {isPopular && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                              <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                              >
                                <Badge className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2 shadow-xl text-base">
                                  <Crown className="w-4 h-4 mr-2" />
                                  RECOMENDADO
                                </Badge>
                              </motion.div>
                            </div>
                          )}
                          
                          <CardHeader className="text-center pb-4 pt-8">
                            <CardTitle className="text-2xl md:text-3xl font-bold">{plan.name}</CardTitle>
                            <div className="mt-6">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-sm text-muted-foreground line-through">
                                  R$ {(plan.base_price ? plan.base_price * 2 : 0).toFixed(2).replace('.', ',')}
                                </span>
                                <Badge variant="destructive" className="text-xs">-50%</Badge>
                              </div>
                              <span className="text-5xl md:text-6xl font-bold">
                                {plan.base_price ? `R$ ${plan.base_price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                              </span>
                              {plan.base_price && <span className="text-muted-foreground text-lg">/mês</span>}
                            </div>
                            <div className="mt-4 space-y-2">
                              <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/30">
                                <Clock className="w-3 h-3 mr-1" />
                                7 dias GRÁTIS
                              </Badge>
                              {savings > 0 && (
                                <Badge variant="outline" className="text-primary border-primary/30">
                                  💰 Economize R$ {savings}/mês em automação
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          
                          <CardContent className="pt-4">
                            <div className="space-y-4 mb-8">
                              <h4 className="font-semibold text-primary">🚀 RECURSOS EXCLUSIVOS:</h4>
                              <ul className="space-y-3">
                                {[
                                  { icon: Bot, text: `${plan.max_users || 'Ilimitados'} usuários`, highlight: false },
                                  { icon: Zap, text: 'IA que gera PIX no WhatsApp', highlight: true },
                                  { icon: Sparkles, text: 'Relatórios que preveem futuro', highlight: true },
                                  { icon: MessageSquare, text: 'WhatsApp com IA conversacional', highlight: true },
                                  { icon: RefreshCcw, text: 'Cobrança 100% automática', highlight: false },
                                  { icon: Shield, text: 'Suporte 24/7 com IA + humano', highlight: false }
                                ].map((feature, i) => (
                                  <li key={i} className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                      feature.highlight ? 'bg-gradient-to-r from-primary to-accent' : 'bg-primary/20'
                                    }`}>
                                      {feature.highlight ? (
                                        <Crown className="w-3 h-3 text-white" />
                                      ) : (
                                        <Check className="w-3 h-3 text-primary" />
                                      )}
                                    </div>
                                    <span className={feature.highlight ? 'font-semibold text-primary' : ''}>
                                      {feature.text}
                                    </span>
                                    {feature.highlight && (
                                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                        EXCLUSIVO
                                      </Badge>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button 
                                className={`w-full text-lg py-6 ${
                                  isPopular 
                                    ? 'bg-gradient-to-r from-primary via-accent to-primary shadow-xl animate-pulse' 
                                    : 'bg-gradient-to-r from-primary to-accent'
                                }`}
                                size="lg"
                                asChild
                              >
                                <Link to={REVENDA_SIGNUP_LINK}>
                                  <Rocket className="mr-2 w-5 h-5" />
                                  {isPopular ? 'COMEÇAR AGORA' : 'Começar Grátis'}
                                  <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                              </Button>
                            </motion.div>
                            
                            <p className="text-center text-xs text-muted-foreground mt-3">
                              ✓ Sem cartão • ✓ Ativação imediata • ✓ Cancele quando quiser
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary" />
                  </motion.div>
                  <p className="text-lg text-muted-foreground">Carregando os melhores planos do Brasil...</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Admin Plans */}
          <div className="mb-16">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-6 justify-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold">Planos Admin</h3>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">ENTERPRISE</Badge>
              </motion.div>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Para <strong className="text-foreground">grandes empresas e holdings</strong> que gerenciam 
                múltiplas revendas com <strong className="text-primary">controle total e relatórios consolidados</strong>
              </motion.p>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
              {Array.isArray(adminPlans) && adminPlans.length > 0 ? (
                adminPlans.map((plan, index) => {
                  if (!plan) return null;
                  return (
                    <motion.div key={plan.id || index} variants={scaleIn} className="h-full">
                      <motion.div 
                        whileHover={{ y: -8, scale: 1.02 }} 
                        transition={{ type: "spring", stiffness: 300 }}
                        className="h-full"
                      >
                        <Card className="relative h-full border-2 border-muted/30 hover:border-purple-500/50 hover:shadow-xl transition-all duration-500 bg-gradient-to-b from-purple-50/30 to-background dark:from-purple-950/30">
                          <CardHeader className="text-center pb-4 pt-8">
                            <CardTitle className="text-2xl md:text-3xl font-bold">{plan.name}</CardTitle>
                            <div className="mt-6">
                              <span className="text-5xl md:text-6xl font-bold">
                                {plan.base_price ? `R$ ${plan.base_price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                              </span>
                              {plan.base_price && <span className="text-muted-foreground text-lg">/mês</span>}
                            </div>
                            {plan.per_active_revenda_price && plan.per_active_revenda_price > 0 && (
                              <p className="text-sm text-muted-foreground mt-2">
                                + R$ {plan.per_active_revenda_price.toFixed(2).replace('.', ',')} por revenda ativa
                              </p>
                            )}
                            <Badge variant="secondary" className="mt-4 bg-purple-500/10 text-purple-500 border-purple-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              7 dias GRÁTIS
                            </Badge>
                          </CardHeader>
                          
                          <CardContent className="pt-4">
                            <ul className="space-y-3 mb-8">
                              {[
                                `${plan.max_users || 'Ilimitados'} usuários admin`,
                                'Gestão completa de revendas',
                                'Relatórios consolidados com IA',
                                'Dashboard executivo avançado',
                                'Suporte prioritário 24/7',
                                'Personalização completa'
                              ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                  <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button 
                                className="w-full text-lg py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 shadow-lg"
                                size="lg"
                                asChild
                              >
                                <Link to={REVENDA_SIGNUP_LINK}>
                                  <Crown className="mr-2 w-5 h-5" />
                                  Começar Enterprise
                                  <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                              </Button>
                            </motion.div>
                            
                            <p className="text-center text-xs text-muted-foreground mt-3">
                              ✓ Setup personalizado • ✓ Migração assistida • ✓ Treinamento incluído
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                  </motion.div>
                  <p className="text-lg text-muted-foreground">Preparando planos enterprise...</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Guarantee Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Card className="max-w-4xl mx-auto p-8 bg-gradient-to-r from-green-500/10 via-background to-green-500/10 border-2 border-green-500/30">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
              >
                <Shield className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                🛡️ Garantia TOTAL de Satisfação
              </h3>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                <strong className="text-foreground">7 dias para testar TUDO</strong> sem pagar nada. 
                Se não gostar, <strong className="text-green-500">devolvemos 100% do seu dinheiro</strong>. 
                Sem perguntas, sem burocracia!
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                {[
                  { icon: Check, text: '7 dias grátis', color: 'text-green-500' },
                  { icon: CreditCard, text: 'Sem cartão', color: 'text-blue-500' },
                  { icon: Heart, text: '100% garantido', color: 'text-red-500' },
                  { icon: X, text: 'Cancele quando quiser', color: 'text-orange-500' }
                ].map((item, i) => (
                  <motion.span 
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                    className="flex items-center gap-2 bg-background/80 px-4 py-2 rounded-full border border-muted shadow-sm"
                  >
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="font-medium">{item.text}</span>
                  </motion.span>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <Testimonials />
      <FAQ />

      {/* Final CTA Section - SUPER IMPACTANTE */}
      <section className="py-24 px-4 bg-gradient-to-b from-primary/10 via-accent/10 to-primary/10 relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
        >
          <motion.div 
            className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl"
            animate={{ 
              y: [0, 50, 0],
              rotate: [0, 180, 360] 
            }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full blur-3xl"
            animate={{ 
              y: [0, -40, 0],
              rotate: [360, 180, 0] 
            }}
            transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          />
        </motion.div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-5xl mx-auto"
          >
            {/* Badge de urgência */}
            <motion.div variants={scaleIn} className="mb-8">
              <Badge className="py-3 px-6 text-base bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-xl animate-pulse">
                🔥 OFERTA LIMITADA • APENAS OS PRIMEIROS 100 CLIENTES
              </Badge>
            </motion.div>

            <motion.h2 variants={fadeInUp} className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Não perca a chance de ter
              <br />
              <motion.span 
                className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0%", "200%"] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              >
                O MELHOR SISTEMA
              </motion.span>
              <br />
              do Brasil!
            </motion.h2>
            
            <motion.div variants={fadeInUp} className="mb-8">
              <p className="text-lg md:text-xl text-muted-foreground mb-6">
                Você acabou de descobrir o <strong className="text-foreground">ÚNICO sistema</strong> do Brasil com:
              </p>
              
              {/* Lista de exclusividades */}
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
                {[
                  { icon: Bot, text: "🤖 IA que GERA PIX no WhatsApp (EXCLUSIVO MUNDIAL)", color: "from-blue-500 to-cyan-500" },
                  { icon: Sparkles, text: "📊 Relatórios que PREVEEM inadimplência (ÚNICO NO BRASIL)", color: "from-purple-500 to-pink-500" },
                  { icon: Zap, text: "⚡ Automação END-TO-END completa (REVOLUCIONÁRIO)", color: "from-orange-500 to-red-500" },
                  { icon: MessageSquare, text: "💬 WhatsApp com IA conversacional (INÉDITO)", color: "from-green-500 to-emerald-500" }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className={`p-4 rounded-2xl bg-gradient-to-r ${feature.color} bg-opacity-10 border border-current border-opacity-20 backdrop-blur-sm`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center shadow-lg`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm md:text-base font-semibold text-left">{feature.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Contador de urgência */}
            <motion.div variants={scaleIn} className="mb-8">
              <Card className="max-w-2xl mx-auto p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Clock className="w-8 h-8 text-red-500" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-red-500">⏰ TEMPO LIMITADO</h3>
                </div>
                <p className="text-lg">
                  <strong className="text-foreground">Apenas os primeiros 100 clientes</strong> terão acesso aos recursos exclusivos.
                  <br />
                  <span className="text-red-500 font-semibold">Restam poucas vagas!</span>
                </p>
              </Card>
            </motion.div>

            {/* Super CTA */}
            <motion.div variants={scaleIn} className="mb-8">
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(var(--primary), 0.4)",
                    "0 0 0 20px rgba(var(--primary), 0)",
                    "0 0 0 0 rgba(var(--primary), 0.4)"
                  ]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Button size="lg" asChild className="text-lg px-10 py-6 bg-gradient-to-r from-primary via-accent to-primary shadow-xl shadow-primary/30 animate-pulse">
                  <Link to={REVENDA_SIGNUP_LINK}>
                    <Crown className="mr-3 w-6 h-6" />
                    🎁 SIM! QUERO TESTAR GRÁTIS 7 DIAS
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Garantias e benefícios */}
            <motion.div variants={fadeInUp} className="mb-8">
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-8 h-8 text-green-500" />
                    <h4 className="text-xl font-bold text-green-500">GARANTIA TOTAL</h4>
                  </div>
                  <p className="text-sm">
                    ✓ 7 dias COMPLETAMENTE grátis<br />
                    ✓ Sem cartão de crédito<br />
                    ✓ Cancelamento a qualquer momento<br />
                    ✓ Suporte 24/7 incluso
                  </p>
                </Card>
                <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Rocket className="w-8 h-8 text-blue-500" />
                    <h4 className="text-xl font-bold text-blue-500">ATIVAÇÃO IMEDIATA</h4>
                  </div>
                  <p className="text-sm">
                    ⚡ Acesso em 30 segundos<br />
                    🤖 IA já pré-configurada<br />
                    📱 WhatsApp funcional na hora<br />
                    💰 Primeira cobrança automática hoje
                  </p>
                </Card>
              </div>
            </motion.div>

            {/* Prova social final */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap justify-center gap-8 text-base text-muted-foreground mb-8"
            >
              {[
                { icon: Users, text: '10.000+ clientes', number: '10k+' },
                { icon: Star, text: 'satisfação', number: '4.9★' },
                { icon: TrendingUp, text: 'crescimento mensal', number: '300%' },
                { icon: Shield, text: 'uptime garantido', number: '99.9%' }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className="flex flex-col items-center gap-2 bg-background/50 px-4 py-3 rounded-lg border border-muted backdrop-blur-sm"
                >
                  <item.icon className="w-6 h-6 text-primary" />
                  <div className="text-2xl font-bold text-primary">{item.number}</div>
                  <div className="text-xs">{item.text}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Último apelo */}
            <motion.div variants={fadeInUp}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                💡 <strong className="text-foreground">Dica:</strong> Quem testa primeiro, leva vantagem. 
                Seus concorrentes ainda usam sistemas antigos enquanto você pode ter 
                <strong className="text-primary"> a tecnologia mais avançada do Brasil</strong> funcionando hoje mesmo!
              </p>
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
                <img src={logo} alt="BRGestor" className="h-10 w-auto" />
                <span className="font-bold text-xl">BRGESTOR</span>
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
