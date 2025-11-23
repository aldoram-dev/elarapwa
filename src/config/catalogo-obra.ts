// Catálogo jerárquico de Categorías, Partidas y Subpartidas
// Para la administración de obra inmobiliaria

export interface CatalogoItem {
  categoria: string
  partida: string
  subpartida: string
}

export const catalogoObra: CatalogoItem[] = [
  // PRECONSTRUCCION
  { categoria: "PRECONSTRUCCION", partida: "TERRENO", subpartida: "DALAS" },
  { categoria: "PRECONSTRUCCION", partida: "TERRENO", subpartida: "CASTILLO" },
  { categoria: "PRECONSTRUCCION", partida: "TERRENO", subpartida: "FIRME" },
  
  // CONSTRUCCION
  { categoria: "CONSTRUCCION", partida: "PROYECTO", subpartida: "CASTILLO" },
  { categoria: "CONSTRUCCION", partida: "ESTRUCTURA TORRE", subpartida: "PETREO" },
  { categoria: "CONSTRUCCION", partida: "ALBAÑILERIA", subpartida: "VITREO" },
  { categoria: "CONSTRUCCION", partida: "IMPERMEABILIZACION", subpartida: "CERAMICO" },
  { categoria: "CONSTRUCCION", partida: "OBRA FALSA", subpartida: "WPC" },
  { categoria: "CONSTRUCCION", partida: "PINTURA", subpartida: "VINILICO" },
  { categoria: "CONSTRUCCION", partida: "HERRERIAS", subpartida: "ALFOMBRA" },
  { categoria: "CONSTRUCCION", partida: "CARPINTERIAS", subpartida: "MADERA" },
  { categoria: "CONSTRUCCION", partida: "CANCELERIAS", subpartida: "MELAMINA" },
  { categoria: "CONSTRUCCION", partida: "HVAC", subpartida: "PINTURA" },
  { categoria: "CONSTRUCCION", partida: "SISTEMA DE PUESTA A TIERRAS", subpartida: "ACERO ESTRUCTURAL" },
  { categoria: "CONSTRUCCION", partida: "BAJA TENSION", subpartida: "ACERO DE REFUERZO" },
  { categoria: "CONSTRUCCION", partida: "INSTALACION HIDRAULICA", subpartida: "CONCRETO" },
  { categoria: "CONSTRUCCION", partida: "INSTALACION PLUVIAL", subpartida: "HERRERIA" },
  { categoria: "CONSTRUCCION", partida: "INSTALACION SANITARIA", subpartida: "ALUMINO" },
  { categoria: "CONSTRUCCION", partida: "INSTALACION DE GAS", subpartida: "PVC" },
  { categoria: "CONSTRUCCION", partida: "INSTALACION CONTRA INCENDIO", subpartida: "ESTRATO ALTO" },
  
  // INDIRECTOS DE CONSTRUCCION
  { categoria: "INDIRECTOS DE CONSTRUCCION", partida: "TRAMITES, LICENCIAS Y PERMISOS", subpartida: "FIRME" },
  { categoria: "INDIRECTOS DE CONSTRUCCION", partida: "TRAMITES, LICENCIAS Y PERMISOS", subpartida: "APLANADO" },
  
  // ADQUISICIONES
  { categoria: "ADQUISICIONES", partida: "GESTORIA PRECONSTRUCCION", subpartida: "APLANADO" },
  { categoria: "ADQUISICIONES", partida: "GESTORIA PRECONSTRUCCION", subpartida: "REGISTRO" },
  
  // VENTA
  { categoria: "VENTA", partida: "GERENCIA PRECONSTRUCCION", subpartida: "REGISTRO" },
  { categoria: "VENTA", partida: "GERENCIA PRECONSTRUCCION", subpartida: "NICHO" },
  
  // COSTO FINANCIERO
  { categoria: "COSTO FINANCIERO", partida: "ESTUDIOS PRELIMINARES", subpartida: "NICHO" },
  { categoria: "COSTO FINANCIERO", partida: "ESTUDIOS PRELIMINARES", subpartida: "MURO" },
  
  // INDIRECTOS
  { categoria: "INDIRECTOS", partida: "CONSULTORIA DE PRECONSTRUCCION", subpartida: "MURO" },
  { categoria: "INDIRECTOS", partida: "CONSULTORIA DE PRECONSTRUCCION", subpartida: "TIERRA COMPACTADA" },
  
  // URBANIZACION
  { categoria: "URBANIZACION", partida: "LIMPIEZA DE TERRENO", subpartida: "TIERRA COMPACTADA" },
  { categoria: "URBANIZACION", partida: "LIMPIEZA DE TERRENO", subpartida: "MAMPOSTERIA" },
  
  // OBRAS EXTERIORES
  { categoria: "OBRAS EXTERIORES", partida: "EXCAVACION", subpartida: "MAMPOSTERIA" },
  { categoria: "OBRAS EXTERIORES", partida: "EXCAVACION", subpartida: "SARDINEL" },
  { categoria: "OBRAS EXTERIORES", partida: "MUROS DE CONTENCION", subpartida: "SARDINEL" },
  { categoria: "OBRAS EXTERIORES", partida: "MUROS DE CONTENCION", subpartida: "BANQUETON" },
  
  // IMPREVISTOS
  { categoria: "IMPREVISTOS", partida: "CIMENTACION", subpartida: "BANQUETON" },
  { categoria: "IMPREVISTOS", partida: "CIMENTACION", subpartida: "PETREO" },
  
  // POST VENTA
  { categoria: "POST VENTA", partida: "ESTRUCTURA TORRE", subpartida: "PETREO" },
  { categoria: "POST VENTA", partida: "ESTRUCTURA TORRE", subpartida: "VITREO" },
  
  // GERENCIA PRECONSTRUCCION
  { categoria: "GERENCIA PRECONSTRUCCION", partida: "ALBAÑILERIA", subpartida: "VITREO" },
  { categoria: "GERENCIA PRECONSTRUCCION", partida: "ALBAÑILERIA", subpartida: "CERAMICO" },
]

// Funciones helper para obtener opciones únicas
export const getCategorias = (): string[] => {
  return Array.from(new Set(catalogoObra.map(item => item.categoria)))
}

export const getPartidasByCategoria = (categoria: string): string[] => {
  return Array.from(new Set(
    catalogoObra
      .filter(item => item.categoria === categoria)
      .map(item => item.partida)
  ))
}

export const getSubpartidasByPartida = (partida: string): string[] => {
  return Array.from(new Set(
    catalogoObra
      .filter(item => item.partida === partida)
      .map(item => item.subpartida)
  ))
}

export const getAllPartidas = (): string[] => {
  return Array.from(new Set(catalogoObra.map(item => item.partida)))
}

export const getAllSubpartidas = (): string[] => {
  return Array.from(new Set(catalogoObra.map(item => item.subpartida)))
}
