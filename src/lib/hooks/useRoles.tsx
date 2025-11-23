/**
 * Hook para verificar roles y permisos del usuario
 * Soporta múltiples roles simultáneos
 */

import { useMemo } from 'react';
import { useAuth } from '@context/AuthContext';

// Roles del sistema
export const ROLES = {
  GERENTE_PLATAFORMA: 'Gerente Plataforma',
  ADMINISTRADOR: 'Administrador',
  DESARROLLADOR: 'Desarrollador',
  SUPERVISOR_LOUVA: 'Supervisor Louva',
  CONTRATISTA: 'Contratista',
  ADMINISTRACION: 'Administración',
  FINANZAS: 'Finanzas',
  USUARIO: 'Usuario',
} as const;

// Roles que pueden crear usuarios
export const ROLES_CREADORES = [
  ROLES.GERENTE_PLATAFORMA,
  ROLES.ADMINISTRADOR,
  ROLES.DESARROLLADOR,
] as const;

// Roles que pueden ver configuración
export const ROLES_CONFIGURACION = [
  ROLES.GERENTE_PLATAFORMA,
  ROLES.ADMINISTRADOR,
  ROLES.DESARROLLADOR,
  ROLES.ADMINISTRACION,
  ROLES.FINANZAS,
] as const;

export function useRoles() {
  const { perfil } = useAuth();
  
  const roles = useMemo(() => perfil?.roles || [], [perfil?.roles]);
  
  /**
   * Verifica si el usuario tiene un rol específico
   */
  const tieneRol = (rol: string): boolean => {
    return roles.includes(rol);
  };
  
  /**
   * Verifica si el usuario tiene al menos uno de los roles especificados
   */
  const tieneAlgunoDeRoles = (rolesAVerificar: readonly string[]): boolean => {
    return rolesAVerificar.some(rol => roles.includes(rol));
  };
  
  /**
   * Verifica si el usuario tiene todos los roles especificados
   */
  const tieneTodosLosRoles = (rolesAVerificar: readonly string[]): boolean => {
    return rolesAVerificar.every(rol => roles.includes(rol));
  };
  
  /**
   * Roles específicos del usuario
   */
  const esGerentePlataforma = tieneRol(ROLES.GERENTE_PLATAFORMA);
  const esAdministrador = tieneRol(ROLES.ADMINISTRADOR);
  const esDesarrollador = tieneRol(ROLES.DESARROLLADOR);
  const esSupervisorLouva = tieneRol(ROLES.SUPERVISOR_LOUVA);
  const esContratista = tieneRol(ROLES.CONTRATISTA);
  const esAdministracion = tieneRol(ROLES.ADMINISTRACION);
  const esFinanzas = tieneRol(ROLES.FINANZAS);
  
  /**
   * Permisos derivados
   */
  const puedeCrearUsuarios = tieneAlgunoDeRoles(ROLES_CREADORES);
  const puedeVerConfiguracion = tieneAlgunoDeRoles(ROLES_CONFIGURACION);
  const esRolAdministrativo = esGerentePlataforma || esAdministrador || esDesarrollador;
  
  return {
    // Estado
    roles,
    tieneRoles: roles.length > 0,
    
    // Funciones de verificación
    tieneRol,
    tieneAlgunoDeRoles,
    tieneTodosLosRoles,
    
    // Roles específicos
    esGerentePlataforma,
    esAdministrador,
    esDesarrollador,
    esSupervisorLouva,
    esContratista,
    esAdministracion,
    esFinanzas,
    
    // Permisos
    puedeCrearUsuarios,
    puedeVerConfiguracion,
    esRolAdministrativo,
  };
}

/**
 * Hook para verificar si el usuario puede acceder a una página
 */
export function usePuedeAcceder(rolesRequeridos: readonly string[]) {
  const { tieneAlgunoDeRoles } = useRoles();
  return tieneAlgunoDeRoles(rolesRequeridos);
}

/**
 * Componente HOC para proteger rutas por roles
 */
import { ReactNode } from 'react';
import { Alert, Container } from '@mui/material';

interface RequireRolesProps {
  roles: readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRoles({ roles: rolesRequeridos, children, fallback }: RequireRolesProps) {
  const puedeAcceder = usePuedeAcceder(rolesRequeridos);
  
  if (!puedeAcceder) {
    return fallback || (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">
          No tienes permisos para acceder a esta página.
          Se requiere uno de los siguientes roles: {rolesRequeridos.join(', ')}
        </Alert>
      </Container>
    );
  }
  
  return <>{children}</>;
}
