export interface Forum {
  id?: string;
  proyecto_id?: string;
  nombre: string;
  titulo?: string;
  descripcion?: string;
  tipo: 'general' | 'proyecto' | 'obra';
  activo: boolean;
  usuarios_asignados?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  empresa_id?: string;
  _dirty?: boolean;
  _deleted?: boolean;
}
