// @ts-nocheck
// Edge Function: create-user
// Permite a administradores crear usuarios con múltiples roles
// Deploy: supabase functions deploy create-user
// Actualizado: 2025-11-20 - Soporte para roles múltiples

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Roles que pueden crear usuarios
const ROLES_CREADORES = [
  'Gerente Plataforma',
  'Sistemas',
  'DESARROLLADOR'
]

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente Supabase con service role (admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar que quien llama es admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el usuario tiene permisos para crear usuarios
    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('active')
      .eq('id', user.id)
      .single()

    if (!perfil?.active) {
      return new Response(
        JSON.stringify({ error: 'Usuario inactivo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener roles del usuario desde roles_usuario
    const { data: userRoles } = await supabaseAdmin
      .from('roles_usuario')
      .select('role_id, roles!inner(name)')
      .eq('user_id', user.id)
    
    const rolesUsuario = userRoles?.map((r: any) => r.roles.name) || []

    // Verificar si tiene alguno de los roles autorizados
    const tienePermisoCrear = rolesUsuario.some((rol: string) => 
      ROLES_CREADORES.includes(rol)
    )

    if (!tienePermisoCrear) {
      return new Response(
        JSON.stringify({ 
          error: 'No tienes permisos para crear usuarios',
          requiere_roles: ROLES_CREADORES,
          tus_roles: rolesUsuario
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener datos del body
    const { 
      email, 
      password, 
      nombre, 
      telefono, 
      contratista_id,  // ID del contratista si aplica
      roles,           // Array de roles
      nivel,           // Nivel jerárquico
      avatar_url,
      metadata 
    } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email y password son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar roles
    let rolesFinales = ['USUARIO'] // Por defecto
    if (roles && Array.isArray(roles) && roles.length > 0) {
      // Verificar que los roles existen en la tabla roles
      const { data: rolesValidos } = await supabaseAdmin
        .from('roles')
        .select('name')
        .in('name', roles)
      
      if (rolesValidos && rolesValidos.length > 0) {
        rolesFinales = rolesValidos.map((r: any) => r.name)
      }
    }

    // Crear usuario en auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        nombre: nombre || '',
        roles: rolesFinales
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar si ya existe el perfil (puede quedar de intentos anteriores)
    const { data: perfilExistente } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('id', newUser.user.id)
      .maybeSingle()

    let perfilError = null
    
    if (perfilExistente) {
      // Si existe, actualizar en lugar de fallar
      console.log('⚠️ Perfil ya existe, actualizando:', newUser.user.id)
      const { error } = await supabaseAdmin
        .from('usuarios')
        .update({
          email: email,
          name: nombre || email.split('@')[0],
          telefono: telefono || null,
          contratista_id: contratista_id || null,
          nivel: nivel || 'Usuario',
          avatar_url: avatar_url || null,
          active: true
        })
        .eq('id', newUser.user.id)
      perfilError = error
    } else {
      // Crear perfil nuevo
      console.log('📝 Creando perfil para:', newUser.user.id, email)
      const { error } = await supabaseAdmin
        .from('usuarios')
        .insert({
          id: newUser.user.id,
          email: email,
          name: nombre || email.split('@')[0],
          telefono: telefono || null,
          contratista_id: contratista_id || null,
          nivel: nivel || 'Usuario',
          avatar_url: avatar_url || null,
          active: true
        })
      perfilError = error
    }

    if (perfilError) {
      console.error('❌ Error creando perfil:', perfilError)
      // Si falla crear perfil, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ 
          error: 'Error creando perfil: ' + perfilError.message,
          details: perfilError,
          code: perfilError.code
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ Perfil creado exitosamente')

    // Insertar roles en roles_usuario
    if (rolesFinales && rolesFinales.length > 0) {
      // Obtener IDs de los roles desde la tabla roles
      const { data: catalogoRoles } = await supabaseAdmin
        .from('roles')
        .select('id, name')
        .in('name', rolesFinales)
      
      if (catalogoRoles && catalogoRoles.length > 0) {
        const rolesInsert = catalogoRoles.map((rol: any) => ({
          user_id: newUser.user.id,
          role_id: rol.id,
          assigned_by: user.id,
          assigned_at: new Date().toISOString()
        }))

        const { error: rolesError } = await supabaseAdmin
          .from('roles_usuario')
          .insert(rolesInsert)

        if (rolesError) {
          console.error('Error asignando roles:', rolesError)
          // No fallar la creación del usuario por esto, solo logearlo
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          nombre,
          telefono,
          contratista_id,
          roles: rolesFinales,
          nivel
        },
        message: `Usuario creado exitosamente con roles: ${rolesFinales.join(', ')}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
