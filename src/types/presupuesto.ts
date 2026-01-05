export interface ConceptoPresupuesto {
  id: string
  categoria: string
  partida: string
  subpartida: string
  ubicacion: string
  concepto_id: string
  unidad: string
  volumetria_arranque: number
  pu_parametrico: number
  presupuesto_base: number
  presupuesto_concursado?: number
  presupuesto_contratado?: number
  presupuesto_ejercido?: number
  created_at?: string
  updated_at?: string
  proyecto_id?: string
}

export interface ResumenPresupuesto {
  categoria: string
  partida: string
  subpartida: string
  presupuesto_base: number
  presupuesto_concursado: number
  presupuesto_contratado: number
  presupuesto_real: number
  presupuesto_ejercido: number
  faltante_por_pagar: number
}
