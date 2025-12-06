-- =============================================
-- CREAR BUCKET PARA DOCUMENTOS
-- Este script crea el bucket de almacenamiento necesario
-- para guardar archivos adjuntos de aditivas/deductivas
-- =============================================

-- Crear el bucket 'documentos' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,  -- Público para que las URLs sean accesibles
  52428800,  -- 50 MB límite por archivo
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el bucket

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden ver todos los documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden actualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Administradores pueden eliminar documentos" ON storage.objects;

-- 1. Permitir a usuarios autenticados subir archivos
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- 2. Permitir a usuarios autenticados ver todos los documentos
CREATE POLICY "Usuarios pueden ver todos los documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');

-- 3. Permitir a usuarios autenticados actualizar archivos
CREATE POLICY "Usuarios pueden actualizar documentos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos');

-- 4. Permitir a administradores eliminar archivos
CREATE POLICY "Administradores pueden eliminar documentos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos' 
  AND EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.nivel = 'Administrador'
  )
);

-- Verificar que el bucket se creó correctamente
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'documentos';

-- Verificar políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%documentos%';
