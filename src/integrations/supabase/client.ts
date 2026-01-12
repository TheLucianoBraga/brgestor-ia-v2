// BR Gestor - Cliente VPS (substitui Supabase)
// Data: 12/01/2026 - Migração concluída para VPS

import { vpsApi } from '@/integrations/vps/client';

// Exportar vpsApi como supabase para compatibilidade
export const supabase = vpsApi;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
