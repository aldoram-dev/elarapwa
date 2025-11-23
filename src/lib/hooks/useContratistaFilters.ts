import { useAuth } from '@/context/AuthContext';
import { SolicitudPago } from '@/types/solicitud-pago';
import { RequisicionPago } from '@/types/requisicion-pago';
import { Contrato } from '@/types/contrato';

/**
 * Hook para aplicar filtros basados en el rol CONTRATISTA
 * 
 * Si el usuario es CONTRATISTA, solo puede ver:
 * - Contratos donde él es el contratista (contratista_id match)
 * - Solicitudes cuyas requisiciones pertenecen a sus contratos
 * - Requisiciones de sus contratos
 * 
 * Además, los contratistas NO pueden editar solicitudes ni dar Vo.Bo.
 */
export function useContratistaFilters() {
  const { perfil } = useAuth();

  // Determinar si el usuario es CONTRATISTA
  const isContratista = perfil?.roles?.includes('CONTRATISTA') ?? false;
  const contratistaId = perfil?.contratista_id;

  /**
   * Filtra contratos para que CONTRATISTA solo vea los suyos
   */
  const filterContratos = (contratos: Contrato[]): Contrato[] => {
    if (!isContratista || !contratistaId) {
      return contratos;
    }
    return contratos.filter(con => con.contratista_id === contratistaId);
  };

  /**
   * Filtra solicitudes basándose en los contratos permitidos
   * (Las solicitudes se relacionan con requisiciones que a su vez tienen contrato_id)
   */
  const filterSolicitudes = (solicitudes: SolicitudPago[], contratos: Contrato[]): SolicitudPago[] => {
    if (!isContratista || !contratistaId) {
      return solicitudes;
    }
    
    // IDs de contratos del contratista
    const misContratosIds = contratos
      .filter(c => c.contratista_id === contratistaId)
      .map(c => c.id);
    
    // No podemos filtrar directamente porque SolicitudPago no tiene contrato_id
    // La aplicación debe cargar las requisiciones y verificar
    // Por ahora retornamos todas y dejamos que la UI haga el filtro más específico
    console.log('[useContratistaFilters] Contratista tiene acceso a contratos:', misContratosIds);
    return solicitudes;
  };

  /**
   * Filtra requisiciones para que CONTRATISTA solo vea las de sus contratos
   */
  const filterRequisiciones = (requisiciones: RequisicionPago[], contratos: Contrato[]): RequisicionPago[] => {
    if (!isContratista || !contratistaId) {
      return requisiciones;
    }
    
    const misContratosIds = contratos
      .filter(c => c.contratista_id === contratistaId)
      .map(c => c.id);
    
    return requisiciones.filter(req => misContratosIds.includes(req.contrato_id));
  };

  /**
   * Verifica si una requisición pertenece al contratista
   */
  const isMyRequisicion = (requisicion: RequisicionPago, contratos: Contrato[]): boolean => {
    if (!isContratista || !contratistaId) {
      return true; // No es contratista, puede ver todo
    }
    
    const misContratosIds = contratos
      .filter(c => c.contratista_id === contratistaId)
      .map(c => c.id);
    
    return misContratosIds.includes(requisicion.contrato_id);
  };

  /**
   * Determina si el usuario puede editar una solicitud
   * CONTRATISTA: NO puede editar
   * Otros roles: SÍ pueden editar
   */
  const canEditSolicitud = (solicitud: SolicitudPago): boolean => {
    if (isContratista) {
      return false; // CONTRATISTA nunca puede editar
    }
    return true;
  };

  return {
    isContratista,
    contratistaId,
    filterSolicitudes,
    filterRequisiciones,
    filterContratos,
    isMyRequisicion,
    canEditSolicitud
  };
}