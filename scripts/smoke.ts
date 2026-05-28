/**
 * Smoke test del SDK contra la API real (debe estar corriendo en localhost:3000).
 *
 *   npm run smoke
 */
import { FacturacionClient, type SendInvoiceInput } from "../src/index.js";

const client = new FacturacionClient({
  baseUrl: process.env.API_URL ?? "http://localhost:3000",
});

const correlativo = `${Math.floor(Date.now() / 1000) % 100000}`;

const invoice: SendInvoiceInput = {
  tipoOperacion: "0101",
  tipoDoc: "01",
  serie: "F001",
  correlativo,
  tipoMoneda: "PEN",
  fechaEmision: new Date().toISOString().substring(0, 10),
  empresaRuc: "20553510661",
  clienteTipoDoc: "6",
  clienteNumDoc: "20000000001",
  clienteRazonSocial: "CLIENTE SDK SMOKE TEST",
  clienteDireccion: "AV. PRUEBA 123",
  montoOperGravadas: 100,
  montoOperExoneradas: 0,
  montoOperInafectas: 0,
  montoOperGratuitas: 0,
  montoIgv: 18,
  totalImpuestos: 18,
  valorVenta: 100,
  subTotal: 118,
  montoImpVenta: 118,
  detalle: [
    {
      unidad: "NIU",
      cantidad: 1,
      codProducto: "SDK-1",
      descripcion: "Producto SDK smoke test",
      montoValorUnitario: 100,
      montoBaseIgv: 100,
      porcentajeIgv: 18,
      igv: 18,
      tipAfeIgv: "10",
      totalImpuestos: 18,
      montoPrecioUnitario: 118,
      montoValorVenta: 100,
      factorIcbper: 0,
    },
  ],
  formaPago: [
    {
      tipo: "Contado",
      monto: 118,
      cuota: 0,
      fechaPago: new Date().toISOString().substring(0, 10),
    },
  ],
  leyendas: [
    {
      legendCode: "1000",
      legendValue: "SON CIENTO DIECIOCHO CON 00/100 SOLES",
    },
  ],
};

async function main(): Promise<void> {
  console.log(`Enviando factura F001-${correlativo}...`);
  const { data, error, response } = await client.sendInvoice(invoice);

  if (error || !data?.data) {
    console.error(`Falló (${response.status}):`, error);
    process.exit(1);
  }

  console.log(`  202 Accepted | id=${data.data.id} estado=${data.data.estado}`);

  console.log("Esperando estado final del worker...");
  const final = (await client.waitForDocument(data.data.id, {
    intervalMs: 1500,
    timeoutMs: 30_000,
  })) as { data: { sunat: { estado: string; codigoRespuesta: string | null; descripcionRespuesta: string | null } } };

  console.log(
    `  estado=${final.data.sunat.estado} código=${final.data.sunat.codigoRespuesta} desc="${final.data.sunat.descripcionRespuesta}"`
  );

  console.log("\nQueue stats:");
  const stats = await client.getQueueStats();
  for (const [name, counts] of Object.entries(stats.data)) {
    console.log(`  ${name.padEnd(22)} ${JSON.stringify(counts)}`);
  }

  if (final.data.sunat.estado === "ACEPTADO") {
    console.log("\nSmoke test PASS");
    process.exit(0);
  } else {
    console.log("\nSmoke test FAIL — documento no aceptado");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
