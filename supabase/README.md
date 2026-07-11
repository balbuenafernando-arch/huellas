# HUELLA Supabase Backend

Este directorio contiene el esquema consolidado de Supabase para HUELLA.

## Migracion maestra

La unica migracion activa es:

- `migrations/20260718_initial_schema.sql`

Las migraciones anteriores se conservan solo como historial en:

- `migrations/archive/`

Para reconstruir la base desde cero, crear un proyecto Supabase limpio y ejecutar `migrations/20260718_initial_schema.sql` desde el SQL Editor o mediante la herramienta de migraciones de Supabase. No es necesario ejecutar los archivos archivados.

## Tablas principales

- `profiles`: perfil automatico vinculado a `auth.users`.
- `pets`: mascotas registradas y datos publicos de mascota.
- `pet_private_details`: telefono y rasgos privados de mascotas, visibles solo para el propietario.
- `lost_reports`: busquedas activas, cerradas o archivadas.
- `pet_reports`: vista de compatibilidad sobre `lost_reports`.
- `report_private_contacts`: contacto privado del reporte.
- `sightings`: avistamientos reportados por usuarios.
- `report_images`: metadatos de fotografias asociadas.
- `matches`: coincidencias entre reportes y avistamientos.
- `notifications`: notificaciones por usuario.
- `contact_requests`: solicitudes de contacto seguro.
- `reunion_stories`: historias de reencuentro.
- `favorites`: favoritos por usuario.
- `comments`: comentarios publicos o privados.
- `feedback`: feedback y reportes de error.
- `user_settings`: preferencias de notificacion.
- `moderation_reports`: reportes de moderacion.

## Storage

Bucket activo:

- `pet-photos`

Uso esperado:

- fotos de mascotas;
- fotos de busquedas;
- fotos de avistamientos;
- fotos de historias de reencuentro.

El bucket es publico para lectura y requiere usuario autenticado para subir, modificar o eliminar objetos propios.

## RPC y Auth

Funciones principales:

- `handle_new_user_profile()`: crea o actualiza `profiles` cuando se registra un usuario de Supabase Auth.
- `ensure_current_profile()`: RPC usada por el cliente para garantizar que el usuario autenticado tenga fila en `profiles`.

El login con Google depende de Supabase Auth. El cliente usa `supabase.auth.getSession()`, `supabase.auth.getUser()` y `supabase.auth.signOut()`.

## RLS y permisos

Todas las tablas activas tienen RLS habilitado. Las reglas base son:

- lectura publica solo para informacion publica de casos, mascotas, avistamientos, imagenes y reencuentros;
- escritura solo para usuarios autenticados;
- actualizacion y eliminacion solo para propietarios;
- datos privados visibles solo para el propietario;
- notificaciones y preferencias visibles solo para el usuario dueño.

La migracion maestra elimina policies antiguas de las tablas activas antes de crear las policies canonicas.

## Dependencias importantes

Variables requeridas en la aplicacion:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Extension requerida:

- `pgcrypto`

## Reconstruccion desde cero

1. Crear un proyecto Supabase nuevo.
2. Configurar Google Auth en Supabase.
3. Ejecutar `migrations/20260718_initial_schema.sql`.
4. Configurar las variables publicas de Supabase en Vercel y local.
5. Ejecutar `npm run build`.

No ejecutar las migraciones dentro de `migrations/archive/` salvo para auditoria historica.
