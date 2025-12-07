export interface VisualizadorArea {
  id?: string;
  created_at?: string;
  updated_at?: string;
  nombre: string;
  color?: string;
  orden?: number;
  activo?: boolean;
  created_by?: string;
  updated_by?: string;
}

export interface VisualizadorLink {
  id?: string;
  created_at?: string;
  updated_at?: string;
  area_id: string;
  titulo: string;
  descripcion?: string;
  url: string;
  tipo_archivo?: string;
  activo?: boolean;
  created_by?: string;
  updated_by?: string;
}
