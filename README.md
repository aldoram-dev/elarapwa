# 🎯 Wicho Template PWA

**Template empresarial production-ready** con React + TypeScript + Vite + Supabase + PWA para clonarse y personalizarse por cliente en minutos.

---

## ✨ Características

### Core
- ✅ **Autenticación completa** (Supabase Auth + perfiles)
- ✅ **Sistema de permisos dinámico** (auto-descubrimiento desde rutas, ACL granular)
- ✅ **Roles protegidos** (soft-delete, auditoría, auto-permisos para roles core)
- ✅ **Multi-empresa** (aislamiento por empresa_id, RLS)
- ✅ **PWA Offline-First** (IndexedDB, sync automático, funciona sin internet) 🆕

### Gestión
- 🏢 **Empresas y Proyectos** (contenedor general extensible)
- 👥 **Usuarios y Roles** (asignación, creación, edición)
- 🔔 **Sistema de notificaciones** (targeting por rol/usuario, tracking de lectura/click)
- 📁 **Storage seguro** (documents privado con RLS)

### Personalización
- 🎨 **Theming dinámico** (ColorPicker avanzado, CSS vars, escala 50-900 generada)
- 🏷️ **Branding por empresa** (logo, favicon, colores corporativos, live-apply)
- 🌐 **Multi-idioma** preparado (i18n hooks, config global)
- 📱 **Responsive** (mobile-first, Tailwind CSS)

---

## 📚 Documentación

### 🎯 Guía Principal
👉 **[docs/GUIA-COMPLETA.md](docs/GUIA-COMPLETA.md)** – **TODO LO QUE NECESITAS SABER**
- Setup inicial para nuevos clientes
- Cómo crear módulos nuevos (paso a paso completo)
- Sistema de permisos
- Personalización y branding
- Theming dinámico
- Deployment y checklist

### Guías Complementarias
- **[docs/DEPLOYMENT-GUIDE.md](docs/DEPLOYMENT-GUIDE.md)** – Deploy detallado (Vercel, Netlify, Supabase)
- **[docs/THEMING-GUIDE.md](docs/THEMING-GUIDE.md)** – Sistema de theming avanzado
- **[docs/PERMISSIONS.md](docs/PERMISSIONS.md)** – ACL profundo y patrones
- **[docs/OFFLINE-GUIDE.md](docs/OFFLINE-GUIDE.md)** – PWA offline, sincronización
- **[docs/ARCHITECTURE-ROLES.md](docs/ARCHITECTURE-ROLES.md)** – Decisiones arquitectura roles

---

## 🚀 Quick Start (Local)

```bash
# 1. Clonar e instalar
git clone [URL] proyecto-cliente
cd proyecto-cliente
pnpm install

# 2. Configurar Supabase
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 3. Setup base de datos
# Ejecutar supabase/schema.sql y supabase/seed.sql en Supabase SQL Editor

# 4. Iniciar desarrollo
pnpm dev
```

👉 Ver [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) para instrucciones completas

---

## 📁 Estructura

```
src/
├── components/       # UI components (Button, Input, Card, Modal, etc.)
├── pages/           # Páginas principales + config
├── lib/
│   ├── core/        # Supabase, permisos, ACL
│   ├── hooks/       # Custom hooks (useEmpresas, usePermissions, etc.)
│   ├── routing/     # Router + metadata de permisos
│   └── services/    # Lógica de negocio
├── stores/          # Zustand state management
├── context/         # React contexts (Auth, Permissions, Project)
├── db/              # Dexie (offline-first DB)
└── sync/            # Servicio de sincronización offline

supabase/
├── schema.sql       # Schema completo (single source of truth)
├── seed.sql         # Datos iniciales
└── functions/       # Edge functions
```

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI primitives, CSS custom properties
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State**: Zustand + React Context
- **Offline**: Dexie.js + Service Worker
- **PWA**: vite-plugin-pwa (Workbox)
- **Routing**: React Router v6

---

## ✅ Checklist Pre-Producción

- [ ] Variables de entorno configuradas
- [ ] Schema + seed ejecutados en Supabase
- [ ] Usuario admin creado y probado
- [ ] Storage buckets creados (`documents`, `branding`)
- [ ] Branding personalizado (logo, colores, nombre)
- [ ] Build sin errores (`pnpm build`)
- [ ] PWA manifest actualizado con datos del cliente
- [ ] SSL/HTTPS configurado en producción
- [ ] Backup inicial de base de datos

---

## 📞 Soporte

Para dudas sobre implementación o personalización:
- 📧 Email: soporte@wicho.dev
- 📖 Docs: Ver carpeta de documentación

---

**Template Version**: v1.0.0  
**License**: Proprietary (solo para clientes autorizados)  
**Last Updated**: Noviembre 2025
