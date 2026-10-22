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
- `getSummary(id)` — estado de un envío RC/RA (el `id` que devuelven `sendSummary`, `sendVoided`, `cancelInvoice` y `cancelBoleta`)
- `getTicketStatus(ticket, ruc)` — estado de ticket asíncrono

### Archivos (ArrayBuffer)
- `getInvoiceXml(id)` / `getInvoiceCdr(id)` / `getInvoicePdf(id)`
- `getNoteXml(id)` / `getNotePdf(id)`
- `getDespatchXml(id)` / `getDespatchPdf(id, format?)` — `format`: a4 | ticket80 | ticket58

### Catálogos SUNAT
- `getCatalogs()` / `getCatalog(key)`

### Código de Producto SUNAT (Catálogo 25 / UNSPSC)
El código que va en `detalle[].codProdSunat`. SUNAT lo exige desde el
**2027-01-01**: si falta o es inválido rechaza con error `3496`. Son 8 dígitos.
- `buscarProductoSunat(q, { nivel?, limit? })` — texto libre (ignora tildes,
  exige todos los términos) o prefijo de código si `q` son dígitos. Devuelve
  primero las `CLASE`: SUNAT pide llegar como mínimo a ese nivel.
- `getProductoSunat(codigo)` — un código puntual (404 si no existe).
- `exportarProductosSunat()` — el catálogo completo (52.840 códigos) si
  prefieres tu propia copia local. Limitado a **5 req/min**: bájalo una vez.

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

### Establecimientos (solo lectura)
El `codigo` (4 dígitos) va al XML como `cbc:AddressTypeCode` y decide qué
dirección sale impresa en el comprobante.
- `listBranches(companyId)` — para saber qué `establecimientoCodigo` mandar

> Alcance: una key con `tenantId` solo ve las empresas de su cuenta; con
> `companyId`, solo esa. Una empresa ajena responde **404**, no 403.

> La administración de la cuenta —crear o editar empresas, credenciales SOL/GRE,
> certificado, logo, registrar establecimientos y **webhooks**— se hace desde el
> panel de Intifact, no con la API key (la API responde `403`). Así una key
> filtrada solo puede emitir y consultar.

## Migrar de 1.x a 2.0

La 2.0 quita los métodos que la API ya no acepta con una API key:

- Webhooks: `createWebhook`, `listWebhooks`, `getWebhook`, `updateWebhook`,
  `deleteWebhook`, `listWebhookDeliveries`, `redeliverWebhook`, `testWebhook`,
  `rotateWebhookSecret` y los tipos `CreateWebhookInput` / `UpdateWebhookInput`.
- Establecimientos: `createBranch`, `updateBranch`, `deactivateBranch` y los
  tipos `CreateBranchInput` / `UpdateBranchInput` (`listBranches` se queda).

Todo eso se hace ahora desde el portal de Intifact. Del lado de tu código, los
webhooks solo se reciben y se verifica su firma con el secret que da el portal.

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
