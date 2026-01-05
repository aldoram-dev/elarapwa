-- ============================================
-- SIMPLIFICACIÓN DE RLS
-- Elimina todas las políticas existentes y crea
-- una sola política permisiva para usuarios autenticados
-- Para TODAS las tablas del schema public de forma dinámica
-- ============================================

DO $$
DECLARE
    tabla_record RECORD;
    politica_record RECORD;
BEGIN
    -- Iterar sobre todas las tablas del schema public
    FOR tabla_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        RAISE NOTICE 'Procesando tabla: %', tabla_record.tablename;
        
        -- Eliminar todas las políticas existentes de la tabla
        FOR politica_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = tabla_record.tablename
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                          politica_record.policyname, 
                          tabla_record.tablename);
            RAISE NOTICE '  - Eliminada política: %', politica_record.policyname;
        END LOOP;
        
        -- Crear la política "all" para la tabla
        EXECUTE format('CREATE POLICY "all" ON public.%I AS PERMISSIVE FOR ALL TO public USING (true)', 
                      tabla_record.tablename);
        RAISE NOTICE '  ✓ Creada política "all" para %', tabla_record.tablename;
        
        -- Habilitar RLS en la tabla
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', 
                      tabla_record.tablename);
        RAISE NOTICE '  ✓ RLS habilitado para %', tabla_record.tablename;
        
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Proceso completado exitosamente';
    RAISE NOTICE '========================================';
END $$;
