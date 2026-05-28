import createClient, { type ClientOptions, type Middleware } from "openapi-fetch";
import type { paths } from "./types.js";

export type { paths, components } from "./types.js";

/** Body de POST /api/v1/invoice/send */
export type SendInvoiceInput =
  paths["/api/v1/invoice/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/note/send */
export type SendNoteInput =
  paths["/api/v1/note/send"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/despatch/send */
export type SendDespatchInput =
  paths["/api/v1/despatch/send"]["post"]["requestBody"]["content"]["application/json"];

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
 * const fact = new FacturacionClient({ baseUrl: "http://localhost:3000" });
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

  // --- Comprobantes ---

  /** Envía factura o boleta. Encolada para procesamiento asíncrono. */
  async sendInvoice(body: SendInvoiceInput) {
    return this.api.POST("/api/v1/invoice/send", { body });
  }

  /** Envía nota de crédito (07) o débito (08). */
  async sendNote(body: SendNoteInput) {
    return this.api.POST("/api/v1/note/send", { body });
  }

  /** Envía guía de remisión (GRE REST). */
  async sendDespatch(body: SendDespatchInput) {
    return this.api.POST("/api/v1/despatch/send", { body });
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

  // --- Archivos generados ---

  /** Descarga el XML firmado. Retorna ArrayBuffer. */
  async getInvoiceXml(id: string): Promise<ArrayBuffer> {
    const response = await this.api.GET("/api/v1/invoice/{id}/xml", {
      params: { path: { id } },
      parseAs: "arrayBuffer",
    });
    if (response.error) throw new Error(`xml not found: ${id}`);
    return response.data as ArrayBuffer;
  }

  /** Descarga el CDR (constancia SUNAT). */
  async getInvoiceCdr(id: string): Promise<ArrayBuffer> {
    const response = await this.api.GET("/api/v1/invoice/{id}/cdr", {
      params: { path: { id } },
      parseAs: "arrayBuffer",
    });
    if (response.error) throw new Error(`cdr not found: ${id}`);
    return response.data as ArrayBuffer;
  }

  /** Descarga el PDF generado. */
  async getInvoicePdf(id: string): Promise<ArrayBuffer> {
    const response = await this.api.GET("/api/v1/invoice/{id}/pdf", {
      params: { path: { id } },
      parseAs: "arrayBuffer",
    });
    if (response.error) throw new Error(`pdf not found: ${id}`);
    return response.data as ArrayBuffer;
  }

  // --- Resumen / baja ---

  async sendSummary(
    body: paths["/api/v1/summary/send"]["post"]["requestBody"]["content"]["application/json"]
  ) {
    return this.api.POST("/api/v1/summary/send", { body });
  }

  async sendVoided(
    body: paths["/api/v1/voided/send"]["post"]["requestBody"]["content"]["application/json"]
  ) {
    return this.api.POST("/api/v1/voided/send", { body });
  }

  async getTicketStatus(ticket: string, ruc: string) {
    return this.api.GET("/api/v1/ticket/{ticket}/status", {
      params: { path: { ticket }, query: { ruc } },
    });
  }

  // --- Empresas ---

  async listCompanies() {
    return this.api.GET("/api/v1/companies", {});
  }

  async getCompany(id: string) {
    return this.api.GET("/api/v1/companies/{id}", {
      params: { path: { id } },
    });
  }

  async createCompany(
    body: paths["/api/v1/companies"]["post"]["requestBody"]["content"]["application/json"]
  ) {
    return this.api.POST("/api/v1/companies", { body });
  }

  /** Sube certificado .p12/.pfx (en base64). */
  async uploadCertificate(
    companyId: string,
    body: paths["/api/v1/companies/{id}/certificate"]["post"]["requestBody"]["content"]["application/json"]
  ) {
    return this.api.POST("/api/v1/companies/{id}/certificate", {
      params: { path: { id: companyId } },
      body,
    });
  }

  // --- Cola ---

  /** Estado de las colas BullMQ (jobs en cada estado). */
  async getQueueStats(): Promise<QueueStats> {
    const response = await this.api.GET("/api/v1/queues/stats", {});
    if (response.error) throw new Error("queue stats unavailable");
    return response.data as QueueStats;
  }

  // --- Helpers ---

  /**
   * Espera a que un documento llegue a estado final (ACEPTADO/RECHAZADO/COLA_FALLIDA).
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
