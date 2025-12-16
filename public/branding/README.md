# Branding - Logos y Recursos de Marca

Esta carpeta contiene los recursos de marca oficiales del Proyecto Elara.

## Archivos

### `applogo.svg`
- **Uso**: Logo principal de la aplicación
- **Formato**: SVG vectorial escalable
- **Colores**: Gris claro (#D4D4D4)
- **Aplicaciones**: 
  - Favicon del sitio web
  - Logo en la barra de navegación
  - Splash screens
  - Documentación

## Uso en el código

### Como favicon (index.html)
```html
<link rel="icon" type="image/svg+xml" href="/branding/applogo.svg" />
```

### En componentes React
```tsx
import logo from '/branding/applogo.svg';

<img src={logo} alt="Elara Logo" />
```

### Como background image
```css
background-image: url('/branding/applogo.svg');
```

## Colores de marca

- **Gris Principal**: `#D4D4D4` - Usado en el logo y elementos principales
- **Morado/Púrpura**: `#9c27b0` - Color secundario para acentos

## Notas

- El logo está diseñado para funcionar bien en fondos claros y oscuros
- El formato SVG permite escalado sin pérdida de calidad
- Mantener la proporción del icono de pétalos con el texto ELARA
