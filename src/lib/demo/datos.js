// Datos de ejemplo de la demo pública. Se regeneran en cada reinicio con fechas
// relativas a "hoy", así el panel y el historial siempre se ven actuales.

// [sku, nombre, marca, modelo, proveedor, costo, stock, stockMinimo]
const CATALOGO = [
  ["FIL-ACE-CG150", "Filtro de aceite", "Honda", "CG 150 Titan", "Repuestos Sur", 3200, 24, 6],
  ["FIL-AIR-CG150", "Filtro de aire", "Honda", "CG 150 Titan", "Repuestos Sur", 4800, 9, 4],
  ["FIL-ACE-YBR", "Filtro de aceite", "Yamaha", "YBR 125", "MotoDist", 3500, 3, 5],
  ["FIL-AIR-ROU", "Filtro de aire", "Bajaj", "Rouser 200 NS", "Bajaj Repuestos", 7900, 6, 3],
  ["PAS-DEL-CG150", "Pastillas de freno delanteras", "Fras-le", "CG 150 Titan", "MotoDist", 6200, 14, 5],
  ["PAS-DEL-YBR", "Pastillas de freno delanteras", "Fras-le", "YBR 125", "MotoDist", 6400, 2, 4],
  ["PAS-DEL-ROU", "Pastillas de freno delanteras", "Bajaj", "Rouser 200 NS", "Bajaj Repuestos", 9800, 7, 3],
  ["ZAP-TRA-110", "Zapatas de freno traseras", "Genérico", "Motomel Blitz 110", "Accesorios Norte", 3900, 18, 5],
  ["KIT-428H-CG", "Kit de transmisión 428H", "Riffel", "CG 150 Titan", "Repuestos Sur", 28500, 5, 2],
  ["KIT-428-YBR", "Kit de transmisión 428", "Riffel", "YBR 125", "Repuestos Sur", 26900, 0, 2],
  ["KIT-520-ROU", "Kit de transmisión 520", "Bajaj", "Rouser 200 NS", "Bajaj Repuestos", 61000, 3, 1],
  ["BUJ-CR7HSA", "Bujía NGK CR7HSA", "NGK", "Universal 110/125", "NGK Argentina", 3100, 60, 15],
  ["BUJ-DPR8EA", "Bujía NGK DPR8EA-9", "NGK", "CG 150 / YBR 125", "NGK Argentina", 3600, 42, 12],
  ["BUJ-CR8E", "Bujía NGK CR8E", "NGK", "Rouser 200 NS", "NGK Argentina", 5400, 11, 6],
  ["ACE-MOT-20W50", "Aceite Motul 3000 20W50 1L", "Motul", "4 tiempos", "Lubricantes del Oeste", 8900, 36, 12],
  ["ACE-MOT-10W40", "Aceite Motul 5100 10W40 1L", "Motul", "4 tiempos", "Lubricantes del Oeste", 13500, 15, 6],
  ["ACE-YPF-20W50", "Aceite YPF Elaion Moto 20W50 1L", "YPF", "4 tiempos", "Lubricantes del Oeste", 7200, 4, 10],
  ["CUB-275-18", "Cubierta 2.75-18 trasera", "Pirelli", "CG 150 / YBR 125", "Neumáticos SA", 42000, 6, 2],
  ["CUB-250-17", "Cubierta 2.50-17 delantera", "Pirelli", "110 cc", "Neumáticos SA", 33500, 4, 2],
  ["CAM-275-18", "Cámara 2.75-18", "Kenda", "Rodado 18", "Neumáticos SA", 6900, 20, 6],
  ["CAM-250-17", "Cámara 2.50-17", "Kenda", "Rodado 17", "Neumáticos SA", 6200, 1, 6],
  ["BAT-YTX7L", "Batería YTX7L-BS", "Yuasa", "Rouser 200 / YBR", "Electro Motos", 52000, 3, 2],
  ["BAT-12N5", "Batería 12N5-3B", "Moura", "Motomel Blitz 110", "Electro Motos", 31000, 5, 2],
  ["LAM-H4-3535", "Lámpara H4 35/35W", "Philips", "Universal", "Electro Motos", 2900, 30, 8],
  ["LAM-GIR-12V", "Lámpara de giro 12V 10W", "Osram", "Universal", "Electro Motos", 900, 80, 20],
  ["ESP-RET-UNI", "Espejo retrovisor rebatible (par)", "Genérico", "Universal 10 mm", "Accesorios Norte", 9500, 12, 4],
  ["CAB-ACE-CG", "Cable de acelerador", "Genérico", "CG 150 Titan", "Accesorios Norte", 4200, 8, 3],
  ["CAB-EMB-CG", "Cable de embrague", "Genérico", "CG 150 Titan", "Accesorios Norte", 3900, 2, 3],
  ["CAB-EMB-ROU", "Cable de embrague", "Bajaj", "Rouser 200 NS", "Bajaj Repuestos", 7600, 5, 2],
  ["PIS-CG150-STD", "Kit de pistón 150 cc STD", "Vini", "CG 150 Titan", "Repuestos Sur", 24500, 4, 2],
  ["PIS-YBR-050", "Kit de pistón 125 cc 0.50", "Vini", "YBR 125", "Repuestos Sur", 23800, 0, 1],
  ["JUN-CG150", "Juego de juntas de motor", "Genérico", "CG 150 Titan", "Repuestos Sur", 8700, 7, 3],
  ["EMB-DIS-CG", "Discos de embrague (juego)", "Vini", "CG 150 Titan", "MotoDist", 15800, 6, 2],
  ["AMO-TRA-110", "Amortiguadores traseros (par)", "Genérico", "Motomel Blitz 110", "MotoDist", 27500, 3, 2],
  ["MAN-PUN-UNI", "Puños de manubrio (par)", "Genérico", "Universal 22 mm", "Accesorios Norte", 4600, 15, 4],
  ["CAS-INT-NEG", "Casco integral negro mate talle L", "Vertigo", "Talle L", "Accesorios Norte", 74000, 4, 2],
  ["CAS-ABI-BLA", "Casco abierto blanco talle M", "Hawk", "Talle M", "Accesorios Norte", 38000, 1, 2],
  ["GUA-CUE-M", "Guantes de cuero talle M", "Genérico", "Talle M", "Accesorios Norte", 12500, 10, 3],
  ["CAN-TRA-UNI", "Candado de disco con alarma", "Genérico", "Universal", "Accesorios Norte", 18900, 6, 2],
  ["LIQ-FRE-DOT4", "Líquido de frenos DOT 4 200 ml", "Motul", "Universal", "Lubricantes del Oeste", 4500, 22, 6],
];

const METODOS = ["Efectivo", "Efectivo", "Efectivo", "Débito", "Débito", "Transferencia", "Transferencia", "Crédito"];

// Generador pseudoaleatorio con semilla: la demo se ve igual en cada reinicio del mismo día
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const redondear = (n, multiplo = 50) => Math.round(n / multiplo) * multiplo;
const fechaISO = (d) => d.toISOString().slice(0, 10);
const sumarDias = (fecha, dias) => new Date(fecha.getTime() + dias * 86400000);

export function generarDatosDemo(hoy = new Date()) {
  const rnd = aleatorio(20261119);
  const entero = (min, max) => min + Math.floor(rnd() * (max - min + 1));

  const productos = CATALOGO.map(([sku, nombre, marca, modelo, proveedor, costo, stock, minimo], i) => {
    const margen = [35, 40, 45, 50][i % 4];
    return {
      sku,
      nombre,
      marca,
      modelo,
      proveedor,
      descripcion: "",
      precioLista: costo,
      precio: redondear(costo * (1 + margen / 100)),
      stockActual: stock,
      stockMinimo: minimo,
    };
  });

  // Los más vendidos: consumibles de alta rotación
  const populares = ["BUJ-CR7HSA", "ACE-MOT-20W50", "FIL-ACE-CG150", "PAS-DEL-CG150", "LAM-GIR-12V", "CAM-275-18", "BUJ-DPR8EA", "LIQ-FRE-DOT4"];
  const porSku = new Map(productos.map((p) => [p.sku, p]));

  const ventas = [];
  for (let dia = 29; dia >= 0; dia--) {
    const cantidadVentas = dia === 0 ? 5 : entero(2, 6);
    for (let v = 0; v < cantidadVentas; v++) {
      const fecha = sumarDias(hoy, -dia);
      // Horario de comercio: 9 a 13 y 16 a 20 (hora de Argentina, UTC-3)
      const hora = rnd() < 0.5 ? entero(9, 12) : entero(16, 19);
      fecha.setUTCHours(hora + 3, entero(0, 59), entero(0, 59), 0);
      if (fecha > hoy) fecha.setTime(hoy.getTime() - entero(5, 240) * 60000);

      const items = new Map();
      const cantidadItems = entero(1, 3);
      for (let k = 0; k < cantidadItems; k++) {
        const sku = rnd() < 0.65 ? populares[entero(0, populares.length - 1)] : productos[entero(0, productos.length - 1)].sku;
        items.set(sku, (items.get(sku) ?? 0) + entero(1, sku.startsWith("BUJ") || sku.startsWith("LAM") ? 4 : 2));
      }
      const detalles = [...items].map(([sku, cantidad]) => ({ sku, cantidad, precioUnitario: porSku.get(sku).precio }));
      const descuento = rnd() < 0.15 ? [5, 10][entero(0, 1)] : 0;
      const subtotal = detalles.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
      ventas.push({
        fechaVenta: fecha.toISOString(),
        metodoPago: METODOS[entero(0, METODOS.length - 1)],
        descuentoPorcentaje: descuento,
        total: Math.round(subtotal * (1 - descuento / 100) * 100) / 100,
        detalles,
      });
    }
  }
  ventas.sort((a, b) => a.fechaVenta.localeCompare(b.fechaVenta));

  const facturas = [
    { proveedorEmisor: "Repuestos Sur", numeroComprobante: "0003-00018452", emision: -20, vencimiento: 10, total: 486500, estado: "Pendiente" },
    { proveedorEmisor: "NGK Argentina", numeroComprobante: "0001-00007731", emision: -12, vencimiento: 3, total: 214800, estado: "Pendiente" },
    { proveedorEmisor: "MotoDist", numeroComprobante: "0005-00042210", emision: -40, vencimiento: -6, total: 158900, estado: "Vencido" },
    { proveedorEmisor: "Lubricantes del Oeste", numeroComprobante: "0002-00011893", emision: -35, vencimiento: -5, total: 327400, estado: "Pagado" },
    { proveedorEmisor: "Neumáticos SA", numeroComprobante: "0004-00003317", emision: -8, vencimiento: 22, total: 562000, estado: "Pendiente" },
    { proveedorEmisor: "Bajaj Repuestos", numeroComprobante: "0001-00025604", emision: -50, vencimiento: -20, total: 391200, estado: "Pagado" },
  ].map(({ emision, vencimiento, ...f }) => ({
    ...f,
    fechaEmision: fechaISO(sumarDias(hoy, emision)),
    fechaVencimiento: fechaISO(sumarDias(hoy, vencimiento)),
  }));

  return { productos, ventas, facturas };
}
