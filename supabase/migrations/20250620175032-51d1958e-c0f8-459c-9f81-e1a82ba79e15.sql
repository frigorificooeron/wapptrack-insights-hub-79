
-- Criar tabela para links compartilhados
CREATE TABLE public.shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_shared_links_token ON public.shared_links(token);
CREATE INDEX idx_shared_links_user_id ON public.shared_links(user_id);

-- RLS policies
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Policy para usuários verem apenas seus próprios links
CREATE POLICY "Users can view their own shared links" 
  ON public.shared_links 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy para usuários criarem links
CREATE POLICY "Users can create shared links" 
  ON public.shared_links 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy para usuários atualizarem seus próprios links
CREATE POLICY "Users can update their own shared links" 
  ON public.shared_links 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy para usuários deletarem seus próprios links
CREATE POLICY "Users can delete their own shared links" 
  ON public.shared_links 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Policy para acesso público aos links ativos (sem autenticação)
CREATE POLICY "Public access to active shared links" 
  ON public.shared_links 
  FOR SELECT 
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );
