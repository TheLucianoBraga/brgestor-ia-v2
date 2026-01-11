-- Criar bucket para mídia do WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp_media', 'whatsapp_media', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload via service_role (Edge Functions)
CREATE POLICY "Allow service role uploads" ON storage.objects
FOR INSERT TO authenticated, anon
WITH CHECK (bucket_id = 'whatsapp_media');

-- Política para leitura pública
CREATE POLICY "Public read access for whatsapp_media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'whatsapp_media');