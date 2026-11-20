-- =============================================================================
-- Moto Parts — Reinicio de datos (solo administradores)
-- Permite volver a empezar de cero durante la etapa de prueba: borra productos,
-- ventas, facturas e historial de movimientos, y mantiene los usuarios.
--
-- Quién es administrador: el usuario con app_metadata.rol = 'admin' en Supabase
-- Auth. app_metadata no se puede modificar desde la app (solo desde el panel de
-- Supabase o con SQL), así que un usuario común no puede darse permisos solo.
-- Para dar o quitar el rol:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol":"admin"}' where email = '...';
--   update auth.users set raw_app_meta_data = raw_app_meta_data - 'rol' where email = '...';
-- El cambio se aplica al volver a iniciar sesión.
-- =============================================================================

-- Lee el rol del token del usuario (PostgREST lo deja en request.jwt.claims)
create or replace function public.es_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'rol',
    ''
  ) = 'admin';
$$;

-- security definer: reiniciar los IDs (restart identity) requiere ser dueño de las tablas.
-- La verificación de administrador está adentro, así que no alcanza con estar autenticado.
create or replace function public.reiniciar_datos(p_confirmacion text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resumen jsonb;
  v_archivos jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede reiniciar los datos.';
  end if;
  if coalesce(btrim(p_confirmacion), '') <> 'BORRAR TODO' then
    raise exception 'Para confirmar escribí BORRAR TODO.';
  end if;

  v_resumen := jsonb_build_object(
    'productos', (select count(*) from public.productos),
    'ventas', (select count(*) from public.ventas),
    'facturas', (select count(*) from public.facturas),
    'movimientos', (select count(*) from public.stock_movimientos)
  );

  -- Rutas de los PDFs: el servidor los borra de Storage después (no se borran con SQL)
  select coalesce(jsonb_agg(ruta_archivo), '[]'::jsonb) into v_archivos
  from public.facturas
  where ruta_archivo is not null;

  truncate table
    public.venta_detalles,
    public.ventas,
    public.stock_movimientos,
    public.facturas,
    public.productos
  restart identity;

  return v_resumen || jsonb_build_object('archivos', v_archivos);
end;
$$;

revoke execute on function public.es_admin(), public.reiniciar_datos(text) from public, anon;
grant execute on function public.es_admin(), public.reiniciar_datos(text) to authenticated;
