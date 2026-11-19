-- Se quita la opción de borrar todo el historial de ventas.
-- La función vaciaba las tablas de ventas con permisos de dueño (security definer)
-- y cualquier usuario autenticado podía llamarla directamente desde la API de Supabase.
-- Las ventas se siguen pudiendo eliminar de a una con eliminar_venta(), que devuelve el stock.
drop function if exists public.limpiar_ventas();
