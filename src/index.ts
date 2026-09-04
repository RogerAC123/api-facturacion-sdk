import createClient, { type ClientOptions, type Middleware } from "openapi-fetch";
import type { paths } from "./types.js";

export type { paths, components } from "./types.js";

// --- Tipos de entrada (bodies) re-exportados para conveniencia del consumidor ---

/** Body de POST /api/v1/invoice/send */
export type SendInvoiceInput =
  paths["/api/v1/invoice/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/invoice/compute */
export type ComputeInvoiceInput =
  paths["/api/v1/invoice/compute"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/note/send */
export type SendNoteInput =
  paths["/api/v1/note/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/note/compute */
export type ComputeNoteInput =
  paths["/api/v1/note/compute"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/despatch/send (Guía Remitente 09) */
export type SendDespatchInput =
  paths["/api/v1/despatch/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/despatch/send-multi */
export type SendDespatchMultiInput =
  paths["/api/v1/despatch/send-multi"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/despatch-transportista/send (Guía Transportista 31) */
export type SendDespatchTransportistaInput =
  paths["/api/v1/despatch-transportista/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/summary/send (Resumen Diario) */
export type SendSummaryInput =
  paths["/api/v1/summary/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/voided/send (Comunicación de Baja) */
export type SendVoidedInput =
  paths["/api/v1/voided/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/invoice/cancel (anular factura) */
export type CancelInvoiceInput =
  paths["/api/v1/invoice/cancel"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/boleta/cancel (anular boleta) */
export type CancelBoletaInput =
  paths["/api/v1/boleta/cancel"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/webhooks */
export type CreateWebhookInput =
  paths["/api/v1/webhooks"]["post"]["requestBody"]["content"]["application/json"];

/** Body de PUT /api/v1/webhooks/{id} */
export type UpdateWebhookInput =
  paths["/api/v1/webhooks/{id}"]["put"]["requestBody"]["content"]["application/json"];

/** Respuesta 202 de cualquier /send (documento encolado) */
export type EnqueueResponse =
  paths["/api/v1/invoice/send"]["post"]["responses"]["202"]["content"]["application/json"];

/** Respuesta de GET /api/v1/queues/stats */
export type QueueStats =
  paths["/api/v1/queues/stats"]["get"]["responses"]["200"]["content"]["application/json"];

export interface FacturacionClientOptions extends ClientOptions {
  /** Base URL de la API (ej: http://localhost:3000) */
  baseUrl: string;
  /** Token de autenticación (Bearer) — opcional por ahora */
  apiKey?: string;
}

/**
 * Cliente para la API de Facturación Electrónica SUNAT.
 *
 * @example
 * ```ts
 * const fact = new FacturacionClient({ baseUrl: "http://localhost:3000", apiKey: "fact_test_..." });
 * const { data, error } = await fact.sendInvoice({ ...payload });
 * if (data) console.log("encolado:", data.data.id);
 * ```
 */
export class FacturacionClient {
  private readonly api: ReturnType<typeof createClient<paths>>;

  constructor(opts: FacturacionClientOptions) {
    const { apiKey, ...clientOpts } = opts;
    this.api = createClient<paths>(clientOpts);

    if (apiKey) {
      const authMiddleware: Middleware = {
        async onRequest({ request }) {
          request.headers.set("Authorization", `Bearer ${apiKey}`);
          return request;
        },
      };
      this.api.use(authMiddleware);
    }
  }

  // --- Comprobantes: emisión ---

  /** Envía factura (01) o boleta (03). Encolada para procesamiento asíncrono → 202. */
  async sendInvoice(body: SendInvoiceInput) {
    return this.api.POST("/api/v1/invoice/send", { body });
  }

  /** Calcula importes (Modelo B) de una factura/boleta SIN emitir. */
  async computeInvoice(body: ComputeInvoiceInput) {
    return this.api.POST("/api/v1/invoice/compute", { body });
  }

  /** Envía nota de crédito (07) o débito (08). */
  async sendNote(body: SendNoteInput) {
    return this.api.POST("/api/v1/note/send", { body });
  }

  /** Calcula importes (Modelo B) de una nota SIN emitir. */
  async computeNote(body: ComputeNoteInput) {
    return this.api.POST("/api/v1/note/compute", { body });
  }

  /** Envía guía de remisión remitente (09). */
  async sendDespatch(body: SendDespatchInput) {
    return this.api.POST("/api/v1/despatch/send", { body });
  }

  /** Envía varias guías de remisión en un solo request. */
  async sendDespatchMulti(body: SendDespatchMultiInput) {
    return this.api.POST("/api/v1/despatch/send-multi", { body });
  }

  /** Envía guía de remisión transportista (31). */
  async sendDespatchTransportista(body: SendDespatchTransportistaInput) {
    return this.api.POST("/api/v1/despatch-transportista/send", { body });
  }

  // --- Anulaciones ---

  /** Anula una factura (comunicación de baja). */
  async cancelInvoice(body: CancelInvoiceInput) {
    return this.api.POST("/api/v1/invoice/cancel", { body });
  }

  /** Anula una boleta (resumen diario de baja). */
  async cancelBoleta(body: CancelBoletaInput) {
    return this.api.POST("/api/v1/boleta/cancel", { body });
  }

  // --- Resumen / baja (sobres) ---

  /** Envía un Resumen Diario (RC). */
  async sendSummary(body: SendSummaryInput) {
    return this.api.POST("/api/v1/summary/send", { body });
  }

  /** Envía una Comunicación de Baja (RA). */
  async sendVoided(body: SendVoidedInput) {
    return this.api.POST("/api/v1/voided/send", { body });
  }

  /** Consulta el estado de un ticket asíncrono (sendSummary). */
  async getTicketStatus(ticket: string, ruc: string) {
    return this.api.GET("/api/v1/ticket/{ticket}/status", {
      params: { path: { ticket }, query: { ruc } },
    });
  }

  // --- Documentos ---

  /** Lista documentos con filtros y paginación. */
  async listDocuments(query?: paths["/api/v1/documents"]["get"]["parameters"]["query"]) {
    return this.api.GET("/api/v1/documents", { params: { query } });
  }

  /** Detalle de un documento por ID. */
  async getDocument(id: string) {
    return this.api.GET("/api/v1/documents/{id}", { params: { path: { id } } });
  }

  /** Re-encola un documento fallido (COLA_FALLIDA). */
  async retryDocument(id: string) {
    return this.api.POST("/api/v1/documents/{id}/retry", {
      params: { path: { id } },
    });
  }

  /** Siguiente correlativo disponible para una serie (por ambiente). */
  async getNextCorrelativo(
    query: paths["/api/v1/documents/next-correlativo"]["get"]["parameters"]["query"]
  ) {
    return this.api.GET("/api/v1/documents/next-correlativo", {
      params: { query },
    });
  }

  // --- Archivos generados (XML firmado / CDR / PDF) ---

  /** XML firmado de una factura/boleta. */
  async getInvoiceXml(id: string): Promise<ArrayBuffer> {
    return this.fetchBinary("/api/v1/invoice/{id}/xml", id, "xml");
  }

  /** CDR (constancia SUNAT) de una factura/boleta. */
  async getInvoiceCdr(id: string): Promise<ArrayBuffer> {
    return this.fetchBinary("/api/v1/invoice/{id}/cdr", id, "cdr");
  }

  /** PDF de una factura/boleta. */
  async getInvoicePdf(id: string): Promise<ArrayBuffer> {
    return this.fetchBinary("/api/v1/invoice/{id}/pdf", id, "pdf");
  }

  /** XML firmado de una nota (07/08). */
  async getNoteXml(id: string): Promise<ArrayBuffer> {
    return this.fetchBinary("/api/v1/note/{id}/xml", id, "xml");
  }

  /** PDF de una nota (07/08). */
  async getNotePdf(id: string): Promise<ArrayBuffer> {
    return this.fetchBinary("/api/v1/note/{id}/pdf", id, "pdf");
  }

  /** XML firmado de una guía de remisión (09/31). */
  async getDespatchXml(id: string): Promise<ArrayBuffer> {
    return this.fetchBinary("/api/v1/despatch/{id}/xml", id, "xml");
  }

  /** PDF de una guía de remisión (09/31). `format`: a4 | ticket80 | ticket58. */
  async getDespatchPdf(
    id: string,
    format?: NonNullable<
      paths["/api/v1/despatch/{id}/pdf"]["get"]["parameters"]["query"]
    >["format"]
  ): Promise<ArrayBuffer> {
    const response = await this.api.GET("/api/v1/despatch/{id}/pdf", {
      params: { path: { id }, query: format ? { format } : undefined },
      parseAs: "arrayBuffer",
    });
    if (response.error) throw new Error(`despatch pdf not found: ${id}`);
    return response.data as ArrayBuffer;
  }

  // --- Empresas (solo lectura) ---

  /** Lista las empresas accesibles por la key. */
  async listCompanies() {
    return this.api.GET("/api/v1/companies", {});
  }

  /** Detalle de una empresa por ID. */
  async getCompany(id: string) {
    return this.api.GET("/api/v1/companies/{id}", { params: { path: { id } } });
  }

  /** Logo de la empresa (imagen). */
  async getCompanyLogo(id: string): Promise<ArrayBuffer> {
    const response = await this.api.GET("/api/v1/companies/{id}/logo", {
      params: { path: { id } },
      parseAs: "arrayBuffer",
    });
    if (response.error) throw new Error(`logo not found: ${id}`);
    return response.data as ArrayBuffer;
  }

  // Nota: crear empresas, subir certificado/logo, gestionar API keys, tenants,
  // audit y planes son operaciones administrativas (solo MASTER_API_KEY) y NO se
  // exponen en el SDK — el backend (ERP) las llama directo. Ver lib/openapi-docs.ts
  // en la API (endpoints ocultos del spec por ADMIN_ONLY_TAGS).

  // --- Webhooks ---

  /** Crea una suscripción a webhooks. El secret se devuelve UNA sola vez. */
  async createWebhook(body: CreateWebhookInput) {
    return this.api.POST("/api/v1/webhooks", { body });
  }

  /** Lista las suscripciones de webhooks. */
  async listWebhooks() {
    return this.api.GET("/api/v1/webhooks", {});
  }

  /** Detalle de una suscripción de webhook. */
  async getWebhook(id: string) {
    return this.api.GET("/api/v1/webhooks/{id}", { params: { path: { id } } });
  }

  /** Actualiza una suscripción de webhook (url, eventos, isActive). */
  async updateWebhook(id: string, body: UpdateWebhookInput) {
    return this.api.PUT("/api/v1/webhooks/{id}", {
      params: { path: { id } },
      body,
    });
  }

  /** Elimina una suscripción de webhook. */
  async deleteWebhook(id: string) {
    return this.api.DELETE("/api/v1/webhooks/{id}", {
      params: { path: { id } },
    });
  }

  /** Lista los intentos de entrega de un webhook. */
  async listWebhookDeliveries(id: string) {
    return this.api.GET("/api/v1/webhooks/{id}/deliveries", {
      params: { path: { id } },
    });
  }

  /** Reintenta manualmente una entrega de webhook. */
  async redeliverWebhook(id: string, deliveryId: string) {
    return this.api.POST(
      "/api/v1/webhooks/{id}/deliveries/{deliveryId}/redeliver",
      { params: { path: { id, deliveryId } } }
    );
  }

  /** Dispara un evento de prueba (webhook.test) para verificar conectividad. */
  async testWebhook(id: string) {
    return this.api.POST("/api/v1/webhooks/{id}/test", {
      params: { path: { id } },
    });
  }

  /** Rota el secret HMAC de un webhook. El nuevo secret se devuelve una sola vez. */
  async rotateWebhookSecret(id: string) {
    return this.api.POST("/api/v1/webhooks/{id}/rotate-secret", {
      params: { path: { id } },
    });
  }

  // --- Catálogos SUNAT (referencia) ---

  /** Lista los catálogos SUNAT disponibles. */
  async getCatalogs() {
    return this.api.GET("/api/v1/catalogs", {});
  }

  /** Obtiene un catálogo SUNAT por clave (ej: "07", "61"). */
  async getCatalog(key: string) {
    return this.api.GET("/api/v1/catalogs/{key}", {
      params: { path: { key } },
    });
  }

  // --- Consulta pública (sin auth — para clientes finales del emisor) ---

  /** Consulta pública de un comprobante por RUC/tipo/serie/número (JSON). */
  async consultarComprobante(
    ruc: string,
    tipoDoc: string,
    serie: string,
    numero: string
  ) {
    return this.api.GET(
      "/api/v1/public/consultar/{ruc}/{tipoDoc}/{serie}/{numero}",
      { params: { path: { ruc, tipoDoc, serie, numero } } }
    );
  }

  /** PDF público de un comprobante. */
  async consultarComprobantePdf(
    ruc: string,
    tipoDoc: string,
    serie: string,
    numero: string
  ): Promise<ArrayBuffer> {
    const response = await this.api.GET(
      "/api/v1/public/consultar/{ruc}/{tipoDoc}/{serie}/{numero}/pdf",
      {
        params: { path: { ruc, tipoDoc, serie, numero } },
        parseAs: "arrayBuffer",
      }
    );
    if (response.error) throw new Error("comprobante público no encontrado");
    return response.data as ArrayBuffer;
  }

  /** XML público de un comprobante. */
  async consultarComprobanteXml(
    ruc: string,
    tipoDoc: string,
    serie: string,
    numero: string
  ): Promise<ArrayBuffer> {
    const response = await this.api.GET(
      "/api/v1/public/consultar/{ruc}/{tipoDoc}/{serie}/{numero}/xml",
      {
        params: { path: { ruc, tipoDoc, serie, numero } },
        parseAs: "arrayBuffer",
      }
    );
    if (response.error) throw new Error("comprobante público no encontrado");
    return response.data as ArrayBuffer;
  }

  // --- Cola ---

  /** Estado de las colas BullMQ (jobs en cada estado). */
  async getQueueStats(): Promise<QueueStats> {
    const response = await this.api.GET("/api/v1/queues/stats", {});
    if (response.error) throw new Error("queue stats unavailable");
    return response.data as QueueStats;
  }

  // --- Helpers ---

  /** Descarga binaria genérica para endpoints de archivo `{id}`. */
  private async fetchBinary(
    path:
      | "/api/v1/invoice/{id}/xml"
      | "/api/v1/invoice/{id}/cdr"
      | "/api/v1/invoice/{id}/pdf"
      | "/api/v1/note/{id}/xml"
      | "/api/v1/note/{id}/pdf"
      | "/api/v1/despatch/{id}/xml",
    id: string,
    kind: string
  ): Promise<ArrayBuffer> {
    const response = await this.api.GET(path, {
      params: { path: { id } },
      parseAs: "arrayBuffer",
    });
    if (response.error) throw new Error(`${kind} not found: ${id}`);
    return response.data as ArrayBuffer;
  }

  /**
   * Espera a que un documento llegue a estado final (ACEPTADO/RECHAZADO/COLA_FALLIDA/ANULADO).
   * Hace polling cada `intervalMs`. Timeout en `timeoutMs`.
   */
  async waitForDocument(
    id: string,
    options: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<unknown> {
    const intervalMs = options.intervalMs ?? 2000;
    const timeoutMs = options.timeoutMs ?? 60_000;
    const deadline = Date.now() + timeoutMs;
    const finalStates = new Set([
      "ACEPTADO",
      "RECHAZADO",
      "COLA_FALLIDA",
      "ANULADO",
    ]);

    while (Date.now() < deadline) {
      const { data, error } = await this.getDocument(id);
      if (error) throw new Error(`document ${id} not found`);
      const estado = (data as { data?: { sunat?: { estado?: string } } } | undefined)
        ?.data?.sunat?.estado;
      if (estado && finalStates.has(estado)) return data;
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(`timeout waiting for document ${id}`);
  }
}
