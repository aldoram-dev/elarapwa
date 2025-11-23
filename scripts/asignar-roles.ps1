# =====================================================
# Script: Asignar Roles Correctos a Usuarios
# Fecha: 2025-11-19
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Asignar Roles a Usuarios Principales" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path "supabase/migrations/20251119_asignar_roles_correctos.sql")) {
    Write-Host "❌ Error: No se encuentra el archivo de migración" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Archivo de migración encontrado" -ForegroundColor Green
Write-Host ""

# Mostrar lo que se va a hacer
Write-Host "Este script asignará:" -ForegroundColor Yellow
Write-Host "  • aldoram@louvastudio.com  → Gerente Plataforma + Administracion" -ForegroundColor White
Write-Host "  • lotorresm10@gmail.com    → Sistemas + Administracion" -ForegroundColor White
Write-Host ""

# Preguntar confirmación
$confirmation = Read-Host "¿Desea continuar? (S/N)"
if ($confirmation -ne 'S' -and $confirmation -ne 's') {
    Write-Host "❌ Operación cancelada" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Ejecutando migración..." -ForegroundColor Cyan

# Método 1: Usar Supabase CLI (si está disponible)
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "✓ Supabase CLI detectado" -ForegroundColor Green
    
    # Verificar si está conectado
    $status = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Supabase CLI está conectado" -ForegroundColor Green
        Write-Host ""
        
        # Ejecutar migración
        Get-Content "supabase/migrations/20251119_asignar_roles_correctos.sql" | supabase db execute
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  ✅ MIGRACIÓN COMPLETADA" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Verificar en la UI:" -ForegroundColor Yellow
            Write-Host "  1. Ir a Configuración → Usuarios" -ForegroundColor White
            Write-Host "  2. Verificar roles asignados" -ForegroundColor White
            Write-Host "  3. Hacer logout/login si es necesario" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "❌ Error al ejecutar la migración" -ForegroundColor Red
            Write-Host "   Revisar el log arriba para más detalles" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Supabase CLI no está conectado" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Por favor ejecuta:" -ForegroundColor Yellow
        Write-Host "  supabase start" -ForegroundColor White
        Write-Host "  o" -ForegroundColor White
        Write-Host "  supabase link" -ForegroundColor White
        Write-Host ""
        Write-Host "Luego ejecuta este script de nuevo." -ForegroundColor Yellow
    }
} else {
    # Método 2: Mostrar instrucciones manuales
    Write-Host "⚠️  Supabase CLI no está instalado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPCIÓN 1: Instalar Supabase CLI" -ForegroundColor Cyan
    Write-Host "  scoop install supabase" -ForegroundColor White
    Write-Host "  o" -ForegroundColor White
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "OPCIÓN 2: Ejecutar manualmente en Supabase Dashboard" -ForegroundColor Cyan
    Write-Host "  1. Ir a: https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "  2. Seleccionar tu proyecto" -ForegroundColor White
    Write-Host "  3. Ir a SQL Editor" -ForegroundColor White
    Write-Host "  4. Copiar el contenido de:" -ForegroundColor White
    Write-Host "     supabase/migrations/20251119_asignar_roles_correctos.sql" -ForegroundColor Yellow
    Write-Host "  5. Pegar y ejecutar en el SQL Editor" -ForegroundColor White
    Write-Host ""
    
    # Abrir el archivo para facilitar copy/paste
    $openFile = Read-Host "¿Desea abrir el archivo SQL en el editor? (S/N)"
    if ($openFile -eq 'S' -or $openFile -eq 's') {
        code "supabase/migrations/20251119_asignar_roles_correctos.sql"
        Write-Host "✓ Archivo abierto en VS Code" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Documentación completa en:" -ForegroundColor Cyan
Write-Host "  docs/ASIGNAR-ROLES-USUARIOS.md" -ForegroundColor White
Write-Host ""

# Pausar para que el usuario pueda leer los mensajes
Read-Host "Presiona Enter para salir"
