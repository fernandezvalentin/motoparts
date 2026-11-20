-- =============================================================================
-- Moto Parts — Carga de stock desde el celular + historial de movimientos
-- Cada cambio de stock queda registrado (qué, cuánto, quién y cuándo) para
-- poder revisarlo y corregirlo a distancia.
-- =============================================================================

create table public.stock_movimientos (
  id                 bigint generated always as identity primary key,
  fecha              timestamptz not null default now(),
  producto_id        bigint references public.productos (id) on delete set null,
  producto_sku       text        not null default '',
  producto_nombre    text        not null default '',
  -- ingreso | conteo | alta | venta | anulacion_venta | importacion | edicion | deshacer
  tipo               text        not null,
  cantidad_anterior  integer     not null,
  cantidad_nueva     integer     not null,
  diferencia         integer     generated always as (cantidad_nueva - cantidad_anterior) stored,
  usuario            text        not null default '',
  deshecho           boolean     not null default false
);

create index stock_movimientos_fecha_idx on public.stock_movimientos (fecha desc, id desc);
create index stock_movimientos_producto_idx on public.stock_movimientos (producto_id);

-- Solo lectura desde la API: las filas las escriben el trigger y las funciones de abajo
alter table public.stock_movimientos enable row level security;
create policy "autenticados_leen" on public.stock_movimientos
  for select to authenticated using (true);
revoke all on public.stock_movimientos from anon, authenticated;
grant select on public.stock_movimientos to authenticated;

-- -----------------------------------------------------------------------------
-- Trigger: registra cualquier cambio de stock_actual.
-- El motivo lo indica cada función con set_config('motoparts.motivo', ...);
-- si no hay motivo (por ejemplo, edición desde el formulario) se usa "edicion".
-- -----------------------------------------------------------------------------
create or replace function public.registrar_movimiento_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo  text := nullif(current_setting('motoparts.motivo', true), '');
  v_usuario text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', '');
begin
  if tg_op = 'INSERT' then
    if new.stock_actual = 0 then
      return new;
    end if;
    insert into public.stock_movimientos
      (producto_id, producto_sku, producto_nombre, tipo, cantidad_anterior, cantidad_nueva, usuario)
    values (new.id, new.sku, new.nombre, coalesce(v_motivo, 'alta'), 0, new.stock_actual, v_usuario);
  elsif new.stock_actual is distinct from old.stock_actual then
    insert into public.stock_movimientos
      (producto_id, producto_sku, producto_nombre, tipo, cantidad_anterior, cantidad_nueva, usuario)
    values (new.id, new.sku, new.nombre, coalesce(v_motivo, 'edicion'), old.stock_actual, new.stock_actual, v_usuario);
  end if;
  return new;
end;
$$;

create trigger productos_movimiento_stock
after insert or update of stock_actual on public.productos
for each row execute function public.registrar_movimiento_stock();

-- -----------------------------------------------------------------------------
-- Las funciones existentes ahora indican el motivo del cambio de stock
-- -----------------------------------------------------------------------------
create or replace function public.registrar_venta(
  p_detalles   jsonb,
  p_metodo_pago text default 'Efectivo',
  p_descuento  numeric default 0
)
returns jsonb
language plpgsql
as $$
declare
  v_venta_id  bigint;
  v_item      record;
  v_producto  public.productos;
  v_subtotal  numeric := 0;
  v_descuento numeric := case when coalesce(p_descuento, 0) between 0 and 100 then coalesce(p_descuento, 0) else 0 end;
begin
  perform set_config('motoparts.motivo', 'venta', true);
  if p_detalles is null or jsonb_typeof(p_detalles) <> 'array' or jsonb_array_length(p_detalles) = 0 then
    raise exception 'La venta debe tener al menos un producto.';
  end if;

  insert into public.ventas (metodo_pago, descuento_porcentaje, total)
  values (coalesce(nullif(btrim(p_metodo_pago), ''), 'Efectivo'), v_descuento, 0)
  returning id into v_venta_id;

  -- Agrupamos por producto y bloqueamos las filas para evitar ventas simultáneas sobre el mismo stock
  for v_item in
    select (e->>'productoId')::bigint as producto_id, sum((e->>'cantidad')::integer)::integer as cantidad
    from jsonb_array_elements(p_detalles) e
    group by 1
    order by 1
  loop
    if v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a cero.';
    end if;

    select * into v_producto from public.productos where id = v_item.producto_id for update;

    if not found then
      raise exception 'El producto con ID % no existe.', v_item.producto_id;
    end if;

    if v_producto.stock_actual < v_item.cantidad then
      raise exception 'Stock insuficiente para el producto: %. Stock actual: %, solicitado: %.',
        v_producto.nombre, v_producto.stock_actual, v_item.cantidad;
    end if;

    update public.productos
    set stock_actual = stock_actual - v_item.cantidad
    where id = v_producto.id;

    insert into public.venta_detalles (venta_id, producto_id, producto_sku, producto_nombre, cantidad, precio_unitario)
    values (v_venta_id, v_producto.id, v_producto.sku, v_producto.nombre, v_item.cantidad, v_producto.precio);

    v_subtotal := v_subtotal + v_item.cantidad * v_producto.precio;
  end loop;

  update public.ventas
  set total = round(v_subtotal * (1 - v_descuento / 100), 2)
  where id = v_venta_id;

  return public.venta_json(v_venta_id);
end;
$$;

create or replace function public.eliminar_venta(p_venta_id bigint)
returns boolean
language plpgsql
as $$
begin
  perform set_config('motoparts.motivo', 'anulacion_venta', true);
  if not exists (select 1 from public.ventas where id = p_venta_id) then
    return false;
  end if;

  update public.productos p
  set stock_actual = p.stock_actual + d.cantidad
  from (
    select producto_id, sum(cantidad) as cantidad
    from public.venta_detalles
    where venta_id = p_venta_id and producto_id is not null
    group by producto_id
  ) d
  where p.id = d.producto_id;

  delete from public.ventas where id = p_venta_id;
  return true;
end;
$$;

create or replace function public.importar_productos(p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_item        jsonb;
  v_sku         text;
  v_nombre      text;
  v_precio_lista numeric;
  v_precio_pub  numeric;
  v_stock       integer;
  v_proveedor   text;
  v_marca       text;
  v_modelo      text;
  v_id          bigint;
  v_actualizados integer := 0;
  v_creados     integer := 0;
begin
  perform set_config('motoparts.motivo', 'importacion', true);
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Formato de importación inválido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_nombre := btrim(coalesce(v_item->>'nombre', ''));
    continue when v_nombre = '';

    v_sku          := btrim(coalesce(v_item->>'sku', ''));
    v_precio_lista := coalesce((v_item->>'precioLista')::numeric, 0);
    v_precio_pub   := coalesce((v_item->>'precioPublico')::numeric, 0);
    v_stock        := coalesce((v_item->>'stock')::numeric, -1)::integer;
    v_proveedor    := btrim(coalesce(v_item->>'proveedor', ''));
    v_marca        := btrim(coalesce(v_item->>'marca', ''));
    v_modelo       := btrim(coalesce(v_item->>'modelo', ''));

    v_id := null;
    if v_sku <> '' then
      select id into v_id from public.productos where lower(sku) = lower(v_sku) limit 1;
    end if;
    if v_id is null then
      select id into v_id from public.productos where lower(nombre) = lower(v_nombre) order by id limit 1;
    end if;

    if v_id is not null then
      update public.productos set
        nombre       = v_nombre,
        precio_lista = case when v_precio_lista > 0 then round(v_precio_lista, 2) else precio_lista end,
        precio       = case when v_precio_pub > 0 then round(v_precio_pub, 2) else precio end,
        stock_actual = case when v_stock >= 0 then v_stock else stock_actual end,
        proveedor    = case when v_proveedor <> '' then v_proveedor else proveedor end,
        marca        = case when v_marca <> '' then v_marca else marca end,
        modelo       = case when v_modelo <> '' then v_modelo else modelo end
      where id = v_id;
      v_actualizados := v_actualizados + 1;
    else
      insert into public.productos (sku, nombre, precio_lista, precio, stock_actual, proveedor, marca, modelo, categoria)
      values (
        case when v_sku <> '' then v_sku else public.generar_sku_alternativo(v_nombre) end,
        v_nombre,
        round(v_precio_lista, 2),
        round(case when v_precio_pub > 0 then v_precio_pub else v_precio_lista end, 2),
        greatest(v_stock, 0),
        v_proveedor,
        v_marca,
        v_modelo,
        'Otros'
      );
      v_creados := v_creados + 1;
    end if;
  end loop;

  return jsonb_build_object('actualizados', v_actualizados, 'creados', v_creados);
end;
$$;

-- -----------------------------------------------------------------------------
-- Carga de stock: "sumar" (llegó mercadería) o "fijar" (conteo del estante)
-- -----------------------------------------------------------------------------
create or replace function public.ajustar_stock(
  p_producto_id bigint,
  p_modo        text,
  p_cantidad    integer
)
returns jsonb
language plpgsql
as $$
declare
  v_producto public.productos;
  v_nuevo    integer;
begin
  if p_modo not in ('sumar', 'fijar') then
    raise exception 'Modo inválido.';
  end if;
  if p_cantidad is null or p_cantidad < 0 or p_cantidad > 1000000 then
    raise exception 'Cantidad inválida.';
  end if;
  if p_modo = 'sumar' and p_cantidad = 0 then
    raise exception 'La cantidad a sumar debe ser mayor a cero.';
  end if;

  select * into v_producto from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'El producto ya no existe.';
  end if;

  v_nuevo := case when p_modo = 'sumar' then v_producto.stock_actual + p_cantidad else p_cantidad end;

  perform set_config('motoparts.motivo', case when p_modo = 'sumar' then 'ingreso' else 'conteo' end, true);
  update public.productos set stock_actual = v_nuevo where id = p_producto_id
  returning * into v_producto;

  return jsonb_build_object(
    'producto', public.producto_json(v_producto),
    -- now() es la hora de inicio de la transacción: identifica el movimiento recién creado
    'movimientoId', (
      select id from public.stock_movimientos
      where producto_id = p_producto_id and fecha = now()
      order by id desc limit 1
    )
  );
end;
$$;

-- Alta rápida desde el celular: solo nombre, precio y cantidad (el código es opcional)
create or replace function public.alta_rapida_producto(
  p_nombre    text,
  p_precio    numeric,
  p_cantidad  integer,
  p_sku       text default null,
  p_proveedor text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_nombre   text := btrim(coalesce(p_nombre, ''));
  v_sku      text := upper(btrim(coalesce(p_sku, '')));
  v_producto public.productos;
begin
  if v_nombre = '' then
    raise exception 'El nombre es obligatorio.';
  end if;
  if p_precio is null or p_precio < 0 then
    raise exception 'Precio inválido.';
  end if;
  if p_cantidad is null or p_cantidad < 0 or p_cantidad > 1000000 then
    raise exception 'Cantidad inválida.';
  end if;
  if v_sku <> '' and exists (select 1 from public.productos where lower(sku) = lower(v_sku)) then
    raise exception 'Ya existe un producto con el código %.', v_sku;
  end if;

  perform set_config('motoparts.motivo', 'alta', true);
  insert into public.productos (sku, nombre, precio, stock_actual, proveedor)
  values (
    case when v_sku <> '' then v_sku else public.generar_sku_alternativo(v_nombre) end,
    v_nombre,
    round(p_precio, 2),
    p_cantidad,
    btrim(coalesce(p_proveedor, ''))
  )
  returning * into v_producto;

  return jsonb_build_object('producto', public.producto_json(v_producto));
end;
$$;

-- Deshace una carga manual (ingreso o conteo) aplicando la diferencia inversa.
-- security definer: debe poder marcar el movimiento como deshecho, y la tabla
-- es de solo lectura para la API.
create or replace function public.deshacer_movimiento(p_movimiento_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov      public.stock_movimientos;
  v_producto public.productos;
begin
  select * into v_mov from public.stock_movimientos where id = p_movimiento_id for update;
  if not found then
    raise exception 'Movimiento no encontrado.';
  end if;
  if v_mov.tipo not in ('ingreso', 'conteo') then
    raise exception 'Solo se pueden deshacer cargas de stock (ingresos y conteos).';
  end if;
  if v_mov.deshecho then
    raise exception 'Este movimiento ya fue deshecho.';
  end if;
  if v_mov.producto_id is null then
    raise exception 'El producto fue eliminado; no se puede deshacer.';
  end if;

  select * into v_producto from public.productos where id = v_mov.producto_id for update;
  if v_producto.stock_actual - v_mov.diferencia < 0 then
    raise exception 'No se puede deshacer: el stock de % quedaría negativo (hay %).',
      v_producto.nombre, v_producto.stock_actual;
  end if;

  perform set_config('motoparts.motivo', 'deshacer', true);
  update public.productos
  set stock_actual = stock_actual - v_mov.diferencia
  where id = v_mov.producto_id
  returning * into v_producto;

  update public.stock_movimientos set deshecho = true where id = p_movimiento_id;

  return jsonb_build_object('producto', public.producto_json(v_producto));
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function
  public.registrar_movimiento_stock(),
  public.ajustar_stock(bigint, text, integer),
  public.alta_rapida_producto(text, numeric, integer, text, text),
  public.deshacer_movimiento(bigint)
from public, anon;

grant execute on function
  public.ajustar_stock(bigint, text, integer),
  public.alta_rapida_producto(text, numeric, integer, text, text),
  public.deshacer_movimiento(bigint)
to authenticated;
