-- Migración: Eliminar campos categoria, partida y subpartida de contratistas
-- Fecha: 2026-01-02
-- Descripción: Estos campos no se usan para contratistas, solo para contratos que obtienen
--              las combinaciones validadas del presupuesto

-- Eliminar columnas si existen
ALTER TABLE contratistas 
  DROP COLUMN IF EXISTS categoria,
  DROP COLUMN IF EXISTS partida,
  DROP COLUMN IF EXISTS subpartida;

-- Comentario
COMMENT ON TABLE contratistas IS 'Tabla de contratistas sin campos de categorización - la categorización se hace a nivel de contrato desde el presupuesto validado';
