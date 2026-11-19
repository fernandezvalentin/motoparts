BEGIN TRANSACTION;
CREATE TABLE "Facturas" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Facturas" PRIMARY KEY AUTOINCREMENT,
    "NumeroComprobante" TEXT NULL,
    "ProveedorEmisor" TEXT NULL,
    "FechaEmision" TEXT NULL,
    "FechaVencimiento" TEXT NULL,
    "Total" TEXT NOT NULL,
    "Estado" TEXT NOT NULL,
    "RutaArchivo" TEXT NULL,
    "FechaCreacion" TEXT NOT NULL
);

CREATE TABLE "ef_temp_Ventas" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Ventas" PRIMARY KEY AUTOINCREMENT,
    "DescuentoPorcentaje" TEXT NOT NULL,
    "FechaVenta" TEXT NOT NULL,
    "MetodoPago" TEXT NOT NULL,
    "Total" TEXT NOT NULL
);

INSERT INTO "ef_temp_Ventas" ("Id", "DescuentoPorcentaje", "FechaVenta", "MetodoPago", "Total")
SELECT "Id", "DescuentoPorcentaje", "FechaVenta", "MetodoPago", "Total"
FROM "Ventas";

CREATE TABLE "ef_temp_VentaDetalles" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_VentaDetalles" PRIMARY KEY AUTOINCREMENT,
    "Cantidad" INTEGER NOT NULL,
    "PrecioUnitario" TEXT NOT NULL,
    "ProductoId" INTEGER NOT NULL,
    "VentaId" INTEGER NOT NULL,
    CONSTRAINT "FK_VentaDetalles_Productos_ProductoId" FOREIGN KEY ("ProductoId") REFERENCES "Productos" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_VentaDetalles_Ventas_VentaId" FOREIGN KEY ("VentaId") REFERENCES "Ventas" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_VentaDetalles" ("Id", "Cantidad", "PrecioUnitario", "ProductoId", "VentaId")
SELECT "Id", "Cantidad", "PrecioUnitario", "ProductoId", "VentaId"
FROM "VentaDetalles";

CREATE TABLE "ef_temp_Usuarios" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Usuarios" PRIMARY KEY AUTOINCREMENT,
    "FechaCreacion" TEXT NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "Username" TEXT NOT NULL
);

INSERT INTO "ef_temp_Usuarios" ("Id", "FechaCreacion", "PasswordHash", "Username")
SELECT "Id", "FechaCreacion", "PasswordHash", "Username"
FROM "Usuarios";

CREATE TABLE "ef_temp_Productos" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Productos" PRIMARY KEY AUTOINCREMENT,
    "Categoria" TEXT NOT NULL,
    "Descripcion" TEXT NOT NULL,
    "FechaActualizacion" TEXT NOT NULL,
    "FechaCreacion" TEXT NOT NULL,
    "Marca" TEXT NOT NULL,
    "Modelo" TEXT NOT NULL,
    "Nombre" TEXT NOT NULL,
    "Precio" decimal(18,2) NOT NULL,
    "PrecioLista" decimal(18,2) NOT NULL,
    "Proveedor" TEXT NOT NULL,
    "Sku" TEXT NOT NULL,
    "StockActual" INTEGER NOT NULL,
    "StockMinimo" INTEGER NOT NULL
);

INSERT INTO "ef_temp_Productos" ("Id", "Categoria", "Descripcion", "FechaActualizacion", "FechaCreacion", "Marca", "Modelo", "Nombre", "Precio", "PrecioLista", "Proveedor", "Sku", "StockActual", "StockMinimo")
SELECT "Id", "Categoria", "Descripcion", "FechaActualizacion", "FechaCreacion", "Marca", "Modelo", "Nombre", "Precio", "PrecioLista", "Proveedor", "Sku", "StockActual", "StockMinimo"
FROM "Productos";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Ventas";

ALTER TABLE "ef_temp_Ventas" RENAME TO "Ventas";

DROP TABLE "VentaDetalles";

ALTER TABLE "ef_temp_VentaDetalles" RENAME TO "VentaDetalles";

DROP TABLE "Usuarios";

ALTER TABLE "ef_temp_Usuarios" RENAME TO "Usuarios";

DROP TABLE "Productos";

ALTER TABLE "ef_temp_Productos" RENAME TO "Productos";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_VentaDetalles_ProductoId" ON "VentaDetalles" ("ProductoId");

CREATE INDEX "IX_VentaDetalles_VentaId" ON "VentaDetalles" ("VentaId");

CREATE UNIQUE INDEX "IX_Productos_Sku" ON "Productos" ("Sku");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260827152557_AddFacturacion', '10.0.8');

