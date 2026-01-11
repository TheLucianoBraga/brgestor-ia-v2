-- Drop the old check constraint and add new one with all types
ALTER TABLE public.chatbot_knowledge_base DROP CONSTRAINT IF EXISTS chatbot_knowledge_base_type_check;

ALTER TABLE public.chatbot_knowledge_base ADD CONSTRAINT chatbot_knowledge_base_type_check 
CHECK (type IN ('faq', 'document', 'snippet', 'procedure', 'pricing', 'policy', 'persona', 'contact', 'link', 'glossary', 'error_response'));