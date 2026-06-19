# Huella | Mascotas Perdidas

MVP responsive en Next.js 15 para reportar mascotas perdidas/encontradas, ver reportes en mapa, publicar avistamientos, editar reportes propios, cerrar casos y contactar por WhatsApp.

## Stack

- Next.js 15 + TypeScript
- Tailwind CSS
- shadcn/ui compatible: componentes base en `components/ui`
- Supabase: tablas `pets`, `sightings` y Storage bucket `pets`
- OpenStreetMap + React Leaflet
- Deploy en Vercel

## Inicio local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Sin Supabase configurado, la app carga 12 mascotas demo y guarda nuevos reportes/avistamientos en `localStorage`.

## Conectar Supabase

1. Crea un proyecto en Supabase.
2. Ve a SQL Editor y ejecuta `supabase/schema.sql`.
3. Ejecuta `supabase/seed.sql` para cargar los 12 reportes y avistamientos demo.
4. Copia Project URL y anon public key.
5. Crea `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

El bucket público `pets` se crea desde `schema.sql`. El formulario sube fotos a Supabase Storage cuando las variables de entorno están configuradas; sin Supabase, usa una URL o placeholder para mantener la demo funcional.

## Actualización MVP 1.1

Para una base existente, ejecuta:

```sql
supabase/migrations/20260609_mvp_1_1.sql
```

Agrega edición de reportes propios con `localStorage`, cierre como reunido, eliminación con confirmación, fotos y estados en avistamientos, notificaciones internas, características distintivas, recompensa opcional, urgencia, historial del caso, compartir enlace y afiche descargable desde el navegador.

## Actualización MVP 1.2

Para una base existente, ejecuta después:

```sql
supabase/migrations/20260609_mvp_1_2.sql
```

Agrega hasta 5 fotos por mascota, galería móvil sin deformar imágenes, compresión local antes de guardar, afiche 1080x1350 con imagen proporcional y QR más grande, alias de mascota, condiciones especiales, fecha/hora de avistamiento, edición/eliminación de avistamientos propios, coincidencias geográficas cercanas y perfil simple de colaborador.

## Sprint MVP 1.4

Para una base existente, ejecuta:

```sql
supabase/migrations/20260610_mvp_1_4.sql
```

Configura Supabase Auth con email y contraseña. La app usa el bucket público `mascotas` para fotos de mascotas registradas.

Nuevas secciones:

- `/auth`: registro e inicio de sesión.
- `/mis-mascotas`: crear, editar y eliminar mascotas del usuario.
- `/perdi-mi-mascota`: flujo rápido para publicar reporte desde una mascota registrada.
- `/mis-reportes`: reportes activos e histórico de reunidos, con editar, marcar reunido, reabrir y compartir.

Nuevas tablas/campos:

- `pets`: registro permanente de mascotas con `user_id`, `especie`, `color`, `sexo`, `edad`, `foto_url`, `created_at`.
- `reports`: reportes persistentes con propietario, `pet_id`, `tipo_reporte`, `estado`, `latitude`, `longitude`, fechas y foto.

## Sprint MVP 1.5

Para una base existente, ejecuta:

```sql
supabase/migrations/20260610_mvp_1_5.sql
```

Mejora búsqueda y avistamientos:

- Avistamientos con detalle público en `/avistamiento/[id]`.
- Ubicación, fecha y descripción obligatorias en avistamientos.
- Estados privados de revisión para el dueño del reporte.
- Feed principal ordenado por cercanía geográfica y fecha.
- Filtros `Activos` y `Reunidos`; por defecto solo activos.
- Distancia visible en reportes cuando el navegador comparte ubicación.
- Último avistamiento y actualización reciente en la ficha/feed.
- Compartir reportes y avistamientos.
- Teléfonos/correos no se muestran públicamente.
- Tablas preparadas para comunidad futura: `volunteers`, `messages`, `notifications`.

## Sprint MVP 1.6

Para una base existente, ejecuta:

```sql
supabase/migrations/20260610_mvp_1_6.sql
```

Mejora confianza, historial y calidad de datos:

- Historial por mascota en `/mascota/[id]/historial`.
- Visualizaciones de reportes visibles solo para el propietario.
- Revisión privada de avistamientos con resultado `Ayudó a encontrarla`.
- Mensaje de retroalimentación para quien reportó un avistamiento útil.
- Advertencias de posibles duplicados antes de crear reportes o avistamientos.
- Página `/historias-de-exito` con mascotas reunidas.
- Flujo único `Reportar avistamiento` con situación observada.
- Métricas básicas de mascotas, reportes activos, reunidas y avistamientos.

## Ajustes finales pre-beta

Para una base existente, ejecuta:

```sql
supabase/migrations/20260610_pre_beta.sql
```

- Onboarding inicial en Inicio sin obligar a registrar mascota.
- Inicios de sesión y registros vuelven a Home.
- Acción pública `/reportar-avistamiento` disponible sin cuenta.
- Navegación principal sin ambigüedad entre crear reportes y gestionar reportes.
- Avistamientos enlazados al reporte público mediante `report_id`.

## Sprint MVP 1.7

Para una base existente, ejecuta:

```sql
supabase/migrations/20260610_mvp_1_7.sql
```

- Mis Mascotas muestra primero la lista y abre el formulario solo desde Agregar mascota.
- Home prioriza novedades cuando existen reportes propios y evita paneles administrativos.
- Flujo público separado `/mascota-rescatada` para mascotas bajo resguardo.
- Avistamientos y rescates priorizan ubicación/GPS, placa o medalla y foto opcional.
- Confirmación post-reporte con afiche, compartir y copiar enlace.
- Reportar contenido con motivos básicos.
- Perfil incluye sección de ayuda, privacidad y consejos.

## Sprint MVP 1.8

Para una base existente, ejecuta:

```sql
supabase/migrations/20260610_mvp_1_8.sql
```

- `Perdí mi mascota` usa un formulario único: crea mascota, crea reporte y publica aviso.
- `Reportar avistamiento` ya no exige seleccionar una mascota; guarda avistamientos abiertos.
- Avistamientos abiertos incluyen especie, tamaño, color, distrito, ubicación y foto opcional.
- Home prioriza las acciones `Perdí mi mascota` y `Vi una mascota`.
- Sección independiente de `Avistamientos recientes`.
- Coincidencias básicas por especie, color, tamaño, distrito y distancia en avistamientos/rescates.
- `Reportar publicación` usa motivos: spam, información falsa, foto incorrecta y broma.

## HUELLA v2.0

Para una base existente, ejecuta:

```sql
supabase/migrations/20260610_v2_0.sql
```

Refacción final de producto:

- Home centrado en dos acciones: `Perdí mi mascota` y `Vi una mascota`.
- Se elimina el mapa de la navegación principal y del Home.
- `Vi una mascota` absorbe el caso bajo cuidado temporal con una pregunta dentro del mismo flujo.
- Registro de mascotas completo desde el inicio: alias, salud, esterilizado, placa, rasgos, contacto, hasta 5 fotos y rasgo privado.
- `Perdí mi mascota` permite seleccionar mascota registrada; si no existe, crea mascota y reporte automáticamente.
- Matching básico por especie, raza, tamaño, color, distrito, rasgos distintivos y distancia, con score y razones.
- Mis Reportes se organiza en `Mis mascotas perdidas` y `Mis avistamientos`.
- Privacidad reforzada: zona aproximada y contacto desde el reporte sin mostrar el número públicamente.

## Despliegue en Vercel

1. Sube el proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Agrega las mismas variables de entorno de Supabase.
4. Build command: `npm run build`.
5. Output: automático de Next.js.

## Alcance del MVP

Incluye: autenticación básica, mascotas registradas, reportes persistentes, edición, eliminación, búsqueda por texto/distrito, filtros por estado, mapa, detalle, galería de fotos, avistamientos con foto/fecha/ubicación, confirmación/descartado, edición de avistamientos propios, notificaciones internas, WhatsApp privado, compartir, coincidencias cercanas y afiche descargable.

No incluye: reconocimiento visual por IA, automatización de redes, pagos, recompensas ni machine learning.

