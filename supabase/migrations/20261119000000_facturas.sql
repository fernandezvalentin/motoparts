-- =============================================================================
-- Moto Parts — Facturación de proveedores
-- Facturas en PDF que se suben, se leen automáticamente (total, fechas,
-- número) y se registran con su estado de pago.
-- =============================================================================

create table public.facturas (
  id                  bigint generated always as identity primary key,
  numero_comprobante  text          not null default '',
  proveedor_emisor    text          not null default '',
  fecha_emision       date,
  fecha_vencimiento   date,
  total               numeric(18,2) not null default 0 check (total >= 0),
  estado              text          not null default 'Pendiente'
                      check (estado in ('Pendiente', 'Pagado', 'Vencido')),
  -- Ruta del PDF dentro del bucket "facturas" de Supabase Storage
  ruta_archivo        text,
  fecha_creacion      timestamptz   not null default now()
);

create index facturas_fecha_creacion_idx on public.facturas (fecha_creacion desc);
create index facturas_estado_vencimiento_idx on public.facturas (estado, fecha_vencimiento);

alter table public.facturas enable row level security;

create policy "autenticados_todo" on public.facturas
  for all to authenticated using (true) with check (true);

revoke all on public.facturas from anon;
grant select, insert, update, delete on public.facturas to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado para los PDFs (solo usuarios autenticados).
-- Se omite si no existe el esquema "storage" (por ejemplo, en el CI con un
-- Postgres común); en Supabase siempre existe.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('facturas', 'facturas', false, 10485760, array['application/pdf'])
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

    execute $p$
      create policy "facturas_select_autenticados" on storage.objects
        for select to authenticated using (bucket_id = 'facturas')
    $p$;
    execute $p$
      create policy "facturas_insert_autenticados" on storage.objects
        for insert to authenticated with check (bucket_id = 'facturas')
    $p$;
    execute $p$
      create policy "facturas_delete_autenticados" on storage.objects
        for delete to authenticated using (bucket_id = 'facturas')
    $p$;
  end if;
end;
$$;
