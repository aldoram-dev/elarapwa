-- Tabla para almacenar áreas/categorías
CREATE TABLE IF NOT EXISTS public.visualizador_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  nombre TEXT NOT NULL,
  color TEXT DEFAULT '#0891b2',
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Tabla para almacenar links del visualizador Autodesk
CREATE TABLE IF NOT EXISTS public.visualizador_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  area_id UUID REFERENCES public.visualizador_areas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  url TEXT NOT NULL,
  tipo_archivo TEXT, -- 'rvt', 'ifc', 'dwg', 'nwd', etc.
  activo BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_visualizador_areas_activo ON public.visualizador_areas(activo);
CREATE INDEX IF NOT EXISTS idx_visualizador_links_area ON public.visualizador_links(area_id);
CREATE INDEX IF NOT EXISTS idx_visualizador_links_activo ON public.visualizador_links(activo);

-- RLS Policies para áreas
ALTER TABLE public.visualizador_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver visualizador_areas"
  ON public.visualizador_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin puede crear visualizador_areas"
  ON public.visualizador_areas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin puede actualizar visualizador_areas"
  ON public.visualizador_areas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin puede eliminar visualizador_areas"
  ON public.visualizador_areas FOR DELETE TO authenticated USING (true);

-- RLS Policies para links
ALTER TABLE public.visualizador_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver visualizador_links"
  ON public.visualizador_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin puede crear visualizador_links"
  ON public.visualizador_links FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin puede actualizar visualizador_links"
  ON public.visualizador_links FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin puede eliminar visualizador_links"
  ON public.visualizador_links FOR DELETE TO authenticated USING (true);

-- Triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_visualizador_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_visualizador_areas_updated_at
  BEFORE UPDATE ON public.visualizador_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_visualizador_updated_at();

CREATE TRIGGER trigger_update_visualizador_links_updated_at
  BEFORE UPDATE ON public.visualizador_links
  FOR EACH ROW
  EXECUTE FUNCTION update_visualizador_updated_at();

-- Insertar áreas por defecto
INSERT INTO public.visualizador_areas (nombre, color, orden) VALUES
  ('Arquitectura', '#3b82f6', 1),
  ('Estructura', '#ef4444', 2),
  ('Instalaciones Electricas', '#f59e0b', 3),
  ('Instalaciones Hidrosanitarias', '#10b981', 4),
  ('Instalaciones HVAC', '#8b5cf6', 5),
  ('Instalaciones Espaciales', '#0891b2', 6)
ON CONFLICT DO NOTHING;
