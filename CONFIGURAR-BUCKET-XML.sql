-- =====================================================
-- CONFIGURACIÓN DEL BUCKET PARA PERMITIR ARCHIVOS XML
-- =====================================================
-- Ejecutar en Supabase SQL Editor

-- Actualizar el bucket 'documents' para permitir archivos XML
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/xml',
    'text/xml',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE name = 'documents';

-- Verificar la configuración
SELECT name, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'documents';
