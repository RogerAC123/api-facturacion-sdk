# @facturacion/sdk

Cliente TypeScript auto-generado para la **API de Facturación Electrónica SUNAT** (Perú).

Sigue siempre la versión más reciente de la API: los tipos se regeneran desde el `openapi.json` que la API expone en `/docs/json`.

## Instalación

```bash
npm install @facturacion/sdk
```

## Uso básico

```ts
import { FacturacionClient } from "@facturacion/sdk";

const fact = new FacturacionClient({
  baseUrl: "https://tu-api.com",
  apiKey: process.env.FACTURACION_API_KEY, // opcional
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
- `sendNote(body)` — nota crédito (07) o débito (08)
- `sendDespatch(body)` — guía remisión (09 - GRE REST)
- `sendSummary(body)` — resumen diario boletas
- `sendVoided(body)` — comunicación de baja

### Consultas
- `listDocuments(query?)` — listado paginado con filtros
- `getDocument(id)` — detalle completo
- `getTicketStatus(ticket, ruc)` — estado de ticket asíncrono

### Archivos
- `getInvoiceXml(id)` → ArrayBuffer
- `getInvoiceCdr(id)` → ArrayBuffer (constancia SUNAT)
- `getInvoicePdf(id)` → ArrayBuffer

### Cola
- `retryDocument(id)` — re-encolar documento fallido
- `getQueueStats()` — estado de BullMQ
- `waitForDocument(id, opts?)` — polling hasta estado final

### Empresas
- `listCompanies()`
- `getCompany(id)`
- `createCompany(body)`
- `uploadCertificate(companyId, body)` — sube .p12 en base64

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
