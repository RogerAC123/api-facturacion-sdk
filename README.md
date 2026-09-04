# intifact

SDK TypeScript auto-generado para la **API de Facturación Electrónica SUNAT de Intifact** (Perú).

Sigue siempre la versión más reciente de la API: los tipos se regeneran desde el `openapi.json` que la API expone en `/docs/json`.

## Instalación

```bash
npm install intifact
```

## Uso básico

```ts
import { FacturacionClient } from "intifact";

const fact = new FacturacionClient({
  baseUrl: "https://api-facturacion.intifact.com",
  apiKey: process.env.FACTURACION_API_KEY, // tu API key fact_live_/fact_test_
});

// Enviar factura → 202 (encolada)
const { data, error } = await fact.sendInvoice({
  tipoDoc: "01",
  serie: "F001",
  correlativo: "1",
  empresaRuc: "20553510661",
  /* ...resto del payload */
});

if (error) throw error;
console.log("Encolada:", data.data.id);

// Esperar hasta que SUNAT responda
const finalDoc = await fact.waitForDocument(data.data.id);
console.log("Estado:", finalDoc.data.sunat.estado);
```

## Métodos

### Emisión
- `sendInvoice(body)` — factura (01) o boleta (03)
- `computeInvoice(body)` — calcular importes (Modelo B) sin emitir
- `sendNote(body)` — nota crédito (07) o débito (08)
- `computeNote(body)` — calcular importes de nota sin emitir
- `sendDespatch(body)` — guía remisión remitente (09)
- `sendDespatchMulti(body)` — varias guías en un request
- `sendDespatchTransportista(body)` — guía remisión transportista (31)
- `sendSummary(body)` — resumen diario
- `sendVoided(body)` — comunicación de baja

### Anulaciones
- `cancelInvoice(body)` — anular factura
- `cancelBoleta(body)` — anular boleta

### Consultas
- `listDocuments(query?)` — listado paginado con filtros
- `getDocument(id)` — detalle completo
- `getNextCorrelativo(query)` — siguiente correlativo de una serie
- `getTicketStatus(ticket, ruc)` — estado de ticket asíncrono

### Archivos (ArrayBuffer)
- `getInvoiceXml(id)` / `getInvoiceCdr(id)` / `getInvoicePdf(id)`
- `getNoteXml(id)` / `getNotePdf(id)`
- `getDespatchXml(id)` / `getDespatchPdf(id, format?)` — `format`: a4 | ticket80 | ticket58

### Webhooks
- `createWebhook(body)` / `listWebhooks()` / `getWebhook(id)`
- `updateWebhook(id, body)` / `deleteWebhook(id)`
- `listWebhookDeliveries(id)` / `redeliverWebhook(id, deliveryId)`
- `testWebhook(id)` / `rotateWebhookSecret(id)`

### Catálogos SUNAT
- `getCatalogs()` / `getCatalog(key)`

### Consulta pública (sin auth — clientes finales)
- `consultarComprobante(ruc, tipoDoc, serie, numero, filtro)`
- `consultarComprobantePdf(...)` / `consultarComprobanteXml(...)` → ArrayBuffer
- `filtro` es **obligatorio** (al menos uno de `total`, `fecha`, `receptor`) —
  anti-scraping: sin esto la API responde 404 aunque el comprobante exista.

### Cola
- `retryDocument(id)` — re-encolar documento fallido
- `getQueueStats()` — estado de BullMQ
- `waitForDocument(id, opts?)` — polling hasta estado final

### Empresas (solo lectura)
- `listCompanies()` / `getCompany(id)` / `getCompanyLogo(id)`

> Crear empresas, subir certificado/logo, gestionar API keys, tenants, audit y
> planes son operaciones administrativas (requieren `MASTER_API_KEY`) y no se
> exponen en el SDK — las gestiona el backend (ERP).

## Regenerar tipos

Cada vez que la API agrega o cambia endpoints:

```bash
npm run gen                 # contra http://localhost:3000
npm run gen -- --url=...    # contra producción
```

Esto descarga `openapi.json` y regenera `src/types.ts` con `openapi-typescript`.

## Stack

- `openapi-typescript` — genera tipos TS desde la spec
- `openapi-fetch` — runtime client liviano (<6kB) con tipado completo
