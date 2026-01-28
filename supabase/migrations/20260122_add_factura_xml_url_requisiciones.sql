-- Agregar campo para guardar URL del XML de la factura en requisiciones_pago
-- Esto permite subir tanto el PDF como el XML de la factura en las requisiciones

-- Agregar columna factura_xml_url a requisiciones_pago
ALTER TABLE requisiciones_pago 
ADD COLUMN IF NOT EXISTS factura_xml_url text;

-- Comentario descriptivo
COMMENT ON COLUMN requisiciones_pago.factura_xml_url IS 'URL del archivo XML de la factura (opcional, complementa al PDF en factura_url)';

-- Nota: factura_url se mantiene para el PDF de la factura
COMMENT ON COLUMN requisiciones_pago.factura_url IS 'URL del archivo PDF de la factura';
        