-- =============================================================================
-- Moto Parts — esquema inicial para Supabase
-- Reemplaza las migraciones de Entity Framework del backend .NET.
-- Toda la lógica que necesita ser atómica (ventas, stock, importaciones)
-- vive en funciones de Postgres que se llaman vía RPC desde Next.js.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table public.productos (
  id                   bigint generated always as identity primary key,
  sku                  text          not null,
  nombre               text          not null,
  categoria            text          not null default 'Otros',
  descripcion          text          not null default '',
  modelo               text          not null default '',
  proveedor            text          not null default '',
  marca                text          not null default '',
  precio_lista         numeric(18,2) not null default 0,
  precio               numeric(18,2) not null default 0,
  stock_actual         integer       not null default 0,
  stock_minimo         integer       not null default 0,
  fecha_creacion       timestamptz   not null default now(),
  fecha_actualizacion  timestamptz   not null default now(),
  constraint productos_sku_no_vacio check (btrim(sku) <> ''),
  constraint productos_nombre_no_vacio check (btrim(nombre) <> '')
);

-- El SKU es único sin distinguir mayúsculas/minúsculas
create unique index productos_sku_lower_key on public.productos (lower(sku));
create index productos_nombre_lower_idx on public.productos (lower(nombre));
create index productos_proveedor_idx on public.productos (proveedor);

create table public.ventas (
  id                    bigint generated always as identity primary key,
  fecha_venta           timestamptz   not null default now(),
  total                 numeric(18,2) not null default 0,
  descuento_porcentaje  numeric(5,2)  not null default 0,
  metodo_pago           text          not null default 'Efectivo'
);

create index ventas_fecha_venta_idx on public.ventas (fecha_venta desc);

create table public.venta_detalles (
  id               bigint generated always as identity primary key,
  venta_id         bigint        not null references public.ventas (id) on delete cascade,
  -- Si se borra el producto, la venta histórica se conserva con el nombre/sku guardados
  producto_id      bigint        references public.productos (id) on delete set null,
  producto_sku     text          not null default '',
  producto_nombre  text          not null default '',
  cantidad         integer       not null check (cantidad > 0),
  precio_unitario  numeric(18,2) not null
);

create index venta_detalles_venta_idx on public.venta_detalles (venta_id);
create index venta_detalles_producto_idx on public.venta_detalles (producto_id);

-- Mantener fecha_actualizacion al día automáticamente
create or replace function public.tocar_fecha_actualizacion()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion := now();
  return new;
end;
$$;

create trigger productos_fecha_actualizacion
before update on public.productos
for each row execute function public.tocar_fecha_actualizacion();

-- -----------------------------------------------------------------------------
-- Seguridad: solo usuarios autenticados (el registro público debe estar
-- deshabilitado en Supabase Auth; los usuarios se crean desde el dashboard).
-- -----------------------------------------------------------------------------
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_detalles enable row level security;

create policy "autenticados_todo" on public.productos
  for all to authenticated using (true) with check (true);
create policy "autenticados_todo" on public.ventas
  for all to authenticated using (true) with check (true);
create policy "autenticados_todo" on public.venta_detalles
  for all to authenticated using (true) with check (true);

revoke all on public.productos, public.ventas, public.venta_detalles from anon;
grant select, insert, update, delete, truncate
  on public.productos, public.ventas, public.venta_detalles to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- Helper: producto en formato JSON (camelCase, igual que la API anterior)
-- -----------------------------------------------------------------------------
create or replace function public.producto_json(p public.productos)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p.id,
    'sku', p.sku,
    'nombre', p.nombre,
    'categoria', p.categoria,
    'descripcion', p.descripcion,
    'modelo', p.modelo,
    'proveedor', p.proveedor,
    'marca', p.marca,
    'precioLista', p.precio_lista,
    'precio', p.precio,
    'stockActual', p.stock_actual,
    'stockMinimo', p.stock_minimo,
    'fechaCreacion', p.fecha_creacion,
    'fechaActualizacion', p.fecha_actualizacion
  );
$$;

-- -----------------------------------------------------------------------------
-- Productos: listado paginado con filtros
-- -----------------------------------------------------------------------------
create or replace function public.buscar_productos(
  p_busqueda        text    default null,
  p_proveedor       text    default null,
  p_solo_stock_bajo boolean default false,
  p_solo_con_stock  boolean default false,
  p_page            integer default 1,
  p_page_size       integer default 50
)
returns jsonb
language sql
stable
as $$
  with params as (
    select
      lower(nullif(btrim(coalesce(p_busqueda, '')), '')) as term,
      nullif(nullif(p_proveedor, ''), 'Todos') as proveedor,
      greatest(coalesce(p_page, 1), 1) as page,
      least(greatest(coalesce(p_page_size, 50), 1), 500) as page_size
  ),
  filtrados as (
    select p
    from public.productos p, params
    where (params.term is null
           or strpos(lower(p.nombre), params.term) > 0
           or strpos(lower(p.sku), params.term) > 0
           or strpos(lower(p.proveedor), params.term) > 0)
      and (params.proveedor is null or p.proveedor = params.proveedor)
      and (not coalesce(p_solo_stock_bajo, false) or (p.stock_minimo > 0 and p.stock_actual <= p.stock_minimo))
      and (not coalesce(p_solo_con_stock, false) or p.stock_actual > 0)
  ),
  total as (
    select count(*)::integer as n from filtrados
  ),
  pagina as (
    select f.p
    from filtrados f
    order by (f.p).nombre, (f.p).id
    offset (select (page - 1) * page_size from params)
    limit (select page_size from params)
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(public.producto_json(pg.p) order by (pg.p).nombre, (pg.p).id) from pagina pg), '[]'::jsonb),
    'total', total.n,
    'page', params.page,
    'pageSize', params.page_size,
    'totalPages', ceil(total.n::numeric / params.page_size)::integer
  )
  from params, total;
$$;

create or replace function public.listar_proveedores()
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(proveedor order by proveedor), '[]'::jsonb)
  from (
    select distinct proveedor
    from public.productos
    where btrim(proveedor) <> ''
  ) t;
$$;

-- -----------------------------------------------------------------------------
-- Dashboard: estadísticas del inventario
-- -----------------------------------------------------------------------------
create or replace function public.estadisticas_inventario()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'totalProductos', (select count(*) from public.productos),
    'valorInventario', (select coalesce(sum(precio * stock_actual), 0) from public.productos),
    'productosStockCritico', (
      select count(*) from public.productos
      where stock_minimo > 0 and stock_actual <= stock_minimo
    ),
    'totalProveedores', (
      select count(distinct proveedor) from public.productos where proveedor <> ''
    ),
    'productosPorProveedor', (
      select coalesce(jsonb_object_agg(proveedor, cnt), '{}'::jsonb)
      from (
        select proveedor, count(*) as cnt
        from public.productos
        where proveedor <> ''
        group by proveedor
      ) g
    ),
    'alertasStock', (
      select coalesce(jsonb_agg(a order by a."stockActual", a.id), '[]'::jsonb)
      from (
        select p.id, p.nombre, p.sku, p.proveedor,
               p.stock_actual as "stockActual", p.stock_minimo as "stockMinimo"
        from public.productos p
        where p.stock_minimo > 0 and p.stock_actual <= p.stock_minimo
        order by p.stock_actual, p.id
        limit 50
      ) a
    ),
    'topVendidos', (
      select coalesce(jsonb_agg(t order by t."cantidadVendida" desc, t.id), '[]'::jsonb)
      from (
        select p.id, p.nombre, p.sku, p.proveedor,
               sum(d.cantidad)::integer as "cantidadVendida"
        from public.venta_detalles d
        join public.productos p on p.id = d.producto_id
        group by p.id
        order by sum(d.cantidad) desc, p.id
        limit 5
      ) t
    )
  );
$$;

-- -----------------------------------------------------------------------------
-- Productos: operaciones masivas
-- -----------------------------------------------------------------------------
create or replace function public.generar_sku_alternativo(p_nombre text)
returns text
language plpgsql
volatile
as $$
declare
  v_limpio text := upper(regexp_replace(coalesce(p_nombre, ''), '[^[:alnum:]]', '', 'g'));
  v_prefijo text := rpad(left(v_limpio, 3), 3, 'X');
  v_sku text;
begin
  loop
    v_sku := v_prefijo || '-' || (1000 + floor(random() * 9000))::integer;
    exit when not exists (select 1 from public.productos where lower(sku) = lower(v_sku));
  end loop;
  return v_sku;
end;
$$;

-- Importación desde Excel: actualiza por SKU (o por nombre si no hay SKU) y crea los nuevos.
-- Un stock < 0 significa "columna no importada": se conserva el stock existente.
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

-- Aumento masivo de precios. p_tipo: 'Ambos' | 'Costo' | 'Publico' | 'FijarMargen'
create or replace function public.aumento_masivo(
  p_porcentaje numeric,
  p_proveedor  text default null,
  p_marca      text default null,
  p_tipo       text default 'Ambos'
)
returns integer
language plpgsql
as $$
declare
  v_mult  numeric := 1 + coalesce(p_porcentaje, 0) / 100;
  v_tipo  text := coalesce(nullif(btrim(p_tipo), ''), 'Ambos');
  v_count integer;
begin
  if v_tipo not in ('Ambos', 'Costo', 'Publico', 'FijarMargen') then
    raise exception 'Tipo de operación inválido: %', v_tipo;
  end if;

  update public.productos set
    precio_lista = case when v_tipo in ('Ambos', 'Costo') then round(precio_lista * v_mult, 2) else precio_lista end,
    precio = case
      when v_tipo in ('Ambos', 'Publico') then round(precio * v_mult, 2)
      when v_tipo = 'FijarMargen' then round(precio_lista * v_mult, 2)
      else precio
    end
  where (nullif(btrim(p_proveedor), '') is null or lower(proveedor) = lower(btrim(p_proveedor)))
    and (nullif(btrim(p_marca), '') is null or lower(marca) = lower(btrim(p_marca)));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.renombrar_proveedor(p_viejo text, p_nuevo text)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  if nullif(btrim(p_viejo), '') is null or nullif(btrim(p_nuevo), '') is null then
    raise exception 'Ambos nombres de proveedor son obligatorios.';
  end if;

  update public.productos
  set proveedor = btrim(p_nuevo)
  where lower(proveedor) = lower(btrim(p_viejo));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ventas
-- -----------------------------------------------------------------------------
create or replace function public.venta_json(p_venta_id bigint)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', v.id,
    'fechaVenta', v.fecha_venta,
    'total', v.total,
    'descuentoPorcentaje', v.descuento_porcentaje,
    'metodoPago', v.metodo_pago,
    'detalles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'ventaId', d.venta_id,
        'productoId', d.producto_id,
        'cantidad', d.cantidad,
        'precioUnitario', d.precio_unitario,
        'producto', case
          when p.id is not null then public.producto_json(p)
          else jsonb_build_object('id', null, 'sku', d.producto_sku, 'nombre', d.producto_nombre)
        end
      ) order by d.id)
      from public.venta_detalles d
      left join public.productos p on p.id = d.producto_id
      where d.venta_id = v.id
    ), '[]'::jsonb)
  )
  from public.ventas v
  where v.id = p_venta_id;
$$;

create or replace function public.listar_ventas(p_desde timestamptz default null)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(public.venta_json(v.id) order by v.fecha_venta desc, v.id desc), '[]'::jsonb)
  from public.ventas v
  where p_desde is null or v.fecha_venta >= p_desde;
$$;

-- Registra una venta de forma atómica: valida stock, lo descuenta y calcula el total.
-- p_detalles: [{ "productoId": 1, "cantidad": 2 }, ...]
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

-- Elimina una venta y devuelve el stock a los productos
create or replace function public.eliminar_venta(p_venta_id bigint)
returns boolean
language plpgsql
as $$
begin
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

-- Borra todo el historial de ventas (no modifica el stock)
-- security definer: reiniciar los IDs (restart identity) requiere ser dueño de las tablas.
-- Solo los usuarios autenticados pueden ejecutarla (ver permisos al final).
create or replace function public.limpiar_ventas()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table public.venta_detalles, public.ventas restart identity;
end;
$$;

-- -----------------------------------------------------------------------------
-- Keep-alive: lo llama el cron de GitHub Actions para que el proyecto
-- gratuito de Supabase no se pause por inactividad. No expone datos.
-- -----------------------------------------------------------------------------
create or replace function public.keepalive()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select now() from (select count(*) from public.productos) t;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.producto_json(public.productos),
  public.buscar_productos(text, text, boolean, boolean, integer, integer),
  public.listar_proveedores(),
  public.estadisticas_inventario(),
  public.generar_sku_alternativo(text),
  public.importar_productos(jsonb),
  public.aumento_masivo(numeric, text, text, text),
  public.renombrar_proveedor(text, text),
  public.venta_json(bigint),
  public.listar_ventas(timestamptz),
  public.registrar_venta(jsonb, text, numeric),
  public.eliminar_venta(bigint),
  public.limpiar_ventas()
to authenticated;

grant execute on function public.keepalive() to anon, authenticated;
