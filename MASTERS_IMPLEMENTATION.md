# Implementación de Módulo Maestros (Master Data Management)

## Resumen
Se ha creado un nuevo módulo completo de administración de datos maestros en el panel de administración. Este módulo permite a los administradores configurar y gestionar datos dinámicos que se utilizan en toda la aplicación.

## Fecha de Implementación
21 de Enero de 2025

---

## 📋 Componentes Creados

### 1. **MastersTab.tsx** - Contenedor Principal
**Ubicación:** `/client/src/components/admin/MastersTab.tsx`

Componente principal que contiene las pestañas del módulo maestros:
- Categorías de Regiones
- Plantillas de Premios
- Tipos de Productos

### 2. **RegionCategoriesManager.tsx**
**Ubicación:** `/client/src/components/admin/masters/RegionCategoriesManager.tsx`

**Funcionalidad:**
- ✅ CRUD completo para categorías de regiones
- ✅ Campos: Región, Categoría, Subcategoría, Nivel
- ✅ Agrupación visual por región
- ✅ Validación de datos
- ✅ Diálogos de confirmación para eliminación

**Ejemplos de Uso:**
- Región: NOLA, SOLA, BRASIL, MEXICO
- Categoría: Diamond, Gold, Silver
- Subcategoría: Premier, Standard
- Nivel: 1, 2, 3

### 3. **PrizeTemplatesManager.tsx**
**Ubicación:** `/client/src/components/admin/masters/PrizeTemplatesManager.tsx`

**Funcionalidad:**
- ✅ CRUD completo para plantillas de premios
- ✅ Soporta dos tipos: Premio Recurrente y Premio Mayor
- ✅ Campos según requerimientos del Excel:
  - Nombre del Premio
  - Descripción
  - Imagen (upload JPG/PNG)
  - Regla del Premio (JSON o texto libre)
  - Talla (dropdown: XS, S, M, L, XL, XXL, N/A)
  - Vigencia (fecha desde - fecha hasta)
- ✅ Vista separada para premios recurrentes vs premios mayores
- ✅ Upload de imágenes integrado
- ✅ Visualización de tarjetas con información completa

### 4. **ProductTypesManager.tsx**
**Ubicación:** `/client/src/components/admin/masters/ProductTypesManager.tsx`

**Funcionalidad:**
- ✅ CRUD completo para tipos de productos
- ✅ Campos: Nombre, Categoría, Descripción, Estado (Activo/Inactivo)
- ✅ Toggle de activación/desactivación sin eliminar
- ✅ Agrupación por categoría
- ✅ Estadísticas: Total, Activos, Inactivos
- ✅ Filtros visuales por estado

---

## 🗄️ Base de Datos

### Tablas Creadas

#### 1. `region_categories`
```sql
CREATE TABLE region_categories (
  id VARCHAR PRIMARY KEY,
  region TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  level TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `prize_templates`
```sql
CREATE TABLE prize_templates (
  id VARCHAR PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  prize_rule TEXT NOT NULL,
  size TEXT,
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,
  type TEXT NOT NULL, -- 'recurring' o 'grand'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `product_types`
```sql
CREATE TABLE product_types (
  id VARCHAR PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Estado:** ✅ Migración aplicada exitosamente con `npm run db:push`

---

## 🔌 API Endpoints

### Region Categories
- `GET /api/admin/region-categories` - Listar todas las categorías
- `POST /api/admin/region-categories` - Crear nueva categoría
- `PATCH /api/admin/region-categories/:id` - Actualizar categoría
- `DELETE /api/admin/region-categories/:id` - Eliminar categoría

### Prize Templates
- `GET /api/admin/prize-templates` - Listar todas las plantillas
- `POST /api/admin/prize-templates` - Crear nueva plantilla
- `PATCH /api/admin/prize-templates/:id` - Actualizar plantilla
- `DELETE /api/admin/prize-templates/:id` - Eliminar plantilla

### Product Types
- `GET /api/admin/product-types` - Listar todos los tipos
- `POST /api/admin/product-types` - Crear nuevo tipo
- `PATCH /api/admin/product-types/:id` - Actualizar tipo
- `DELETE /api/admin/product-types/:id` - Eliminar tipo

**Ubicación:** `/server/routes.ts` (líneas 3303-3542)
**Autenticación:** Requiere rol `admin`, `regional-admin` o `super-admin`

---

## 📦 Storage Layer

Se agregaron 12 métodos nuevos en `/server/storage.ts`:

**Region Categories:**
- `getRegionCategories()`
- `createRegionCategory(data)`
- `updateRegionCategory(id, updates)`
- `deleteRegionCategory(id)`

**Prize Templates:**
- `getPrizeTemplates()`
- `createPrizeTemplate(data)`
- `updatePrizeTemplate(id, updates)`
- `deletePrizeTemplate(id)`

**Product Types:**
- `getProductTypes()`
- `createProductType(data)`
- `updateProductType(id, updates)`
- `deleteProductType(id)`

**Ubicación:** `/server/storage.ts` (líneas 2431-2546)

---

## 🎨 Interfaz de Usuario

### Integración en Admin Panel

**Archivo:** `/client/src/pages/admin.tsx`

**Cambios realizados:**
1. ✅ Agregado import de `MastersTab`
2. ✅ Agregado import de icono `Database` de lucide-react
3. ✅ Modificado TabsList de 7 a 8 columnas (grid-cols-8)
4. ✅ Agregada pestaña "Maestros" con icono de base de datos
5. ✅ Agregado TabsContent para el módulo maestros

**Posición:** Entre "Regions" y "Settings"

### Diseño Visual

**Características:**
- 🎨 Diseño consistente con el resto del admin panel
- 🎨 Uso de shadcn/ui components (Card, Dialog, Badge, etc.)
- 🎨 Iconos de lucide-react apropiados para cada sección
- 🎨 Responsive design
- 🎨 Confirmaciones de acciones destructivas (AlertDialog)
- 🎨 Toasts informativos para feedback al usuario
- 🎨 Loading states durante operaciones

---

## 🔐 Seguridad

- ✅ Todas las rutas requieren autenticación
- ✅ Control de acceso basado en roles (admin/regional-admin/super-admin)
- ✅ Validación en backend de todos los datos
- ✅ Sanitización de inputs
- ✅ Protección CSRF mediante sesiones

---

## ✅ Testing

### Pasos para Probar

1. **Iniciar servidor local:**
   ```bash
   nvm use 18.19.1
   npm run dev
   ```

2. **Acceder al admin panel:**
   - URL: http://localhost:3000
   - Login con usuario admin/super-admin

3. **Navegar a la pestaña "Maestros"**
   - Click en tab con icono de Database

4. **Probar cada sub-módulo:**
   - Categorías de Regiones: Crear, editar, eliminar
   - Plantillas de Premios: Crear con imagen, editar, eliminar
   - Tipos de Productos: Crear, activar/desactivar, eliminar

---

## 📝 Notas de Implementación

### Dependencias Utilizadas
- **Frontend:**
  - React Query (@tanstack/react-query) - Gestión de estado y caché
  - shadcn/ui - Componentes UI
  - lucide-react - Iconos
  - zod - Validación de esquemas

- **Backend:**
  - Drizzle ORM - ORM para PostgreSQL
  - nanoid - Generación de IDs únicos
  - Express - Framework web

### Estructura de Archivos
```
client/src/
  ├── components/
  │   └── admin/
  │       ├── MastersTab.tsx
  │       └── masters/
  │           ├── RegionCategoriesManager.tsx
  │           ├── PrizeTemplatesManager.tsx
  │           └── ProductTypesManager.tsx
  └── pages/
      └── admin.tsx (modificado)

server/
  ├── routes.ts (agregadas rutas)
  └── storage.ts (agregados métodos)

shared/
  └── schema.ts (agregadas tablas)
```

---

## 🚀 Próximos Pasos Sugeridos

1. **Integración con Funcionalidades Existentes:**
   - Usar categorías de regiones en la configuración de regiones
   - Aplicar plantillas de premios en MonthlyPrizesTab y GrandPrizeTab
   - Usar tipos de productos en el módulo de deals

2. **Mejoras Futuras:**
   - Exportar/importar configuraciones maestras (JSON/CSV)
   - Historial de cambios (audit log)
   - Búsqueda y filtros avanzados
   - Paginación para grandes volúmenes de datos
   - Validaciones más específicas por tipo de dato
   - Drag & drop para ordenamiento

3. **Internacionalización:**
   - Agregar traducciones al archivo de i18n
   - Soportar múltiples idiomas en maestros

---

## 📞 Soporte

Para preguntas o problemas con este módulo, contactar al equipo de desarrollo.

**Última actualización:** 21 de Enero de 2025
