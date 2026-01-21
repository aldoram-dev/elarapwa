-- Agregar campo para guardar URL del XML de la factura
-- Esto permite subir tanto el PDF como el XML de la factura en las solicitudes de pago

-- Agregar columna factura_xml_url a solicitudes_pago
ALTER TABLE solicitudes_pago 
ADD COLUMN IF NOT EXISTS factura_xml_url text;

-- Comentario descriptivo
COMMENT ON COLUMN solicitudes_pago.factura_xml_url IS 'URL del archivo XML de la factura (opcional, complementa al PDF en comprobante_pago_url)';

-- Nota: comprobante_pago_url se mantiene para el PDF de la factura
COMMENT ON COLUMN solicitudes_pago.comprobante_pago_url IS 'URL del archivo PDF de la factura / comprobante de pago';
