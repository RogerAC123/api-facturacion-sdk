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

/** Body de POST /api/v1/companies/register (alta con certificado, autogestión) */
export type RegisterCompanyInput =
  paths["/api/v1/companies/register"]["post"]["requestBody"]["content"]["application/json"];

/** Body de PUT /api/v1/companies/{id} (datos de la empresa, autogestión) */
export type UpdateCompanyInput = NonNullable<
  paths["/api/v1/companies/{id}"]["put"]["requestBody"]
>["content"]["application/json"];

/** Body de POST /api/v1/companies/{id}/certificate (renovación, mismo RUC) */
export type UploadCertificateInput =
  paths["/api/v1/companies/{id}/certificate"]["post"]["requestBody"]["content"]["application/json"];

/** Body de POST /api/v1/companies/{id}/branches (registrar anexo, autogestión) */
export type CreateBranchInput =
  paths["/api/v1/companies/{id}/branches"]["post"]["requestBody"]["content"]["application/json"];

/** Body de PUT /api/v1/companies/{id}/branches/{branchId} (actualizar anexo) */
export type UpdateBranchInput = NonNullable<
  paths["/api/v1/companies/{id}/branches/{branchId}"]["put"]["requestBody"]
>["content"]["application/json"];

/** Respuesta 202 de cualquier /send (documento encolado) */
export type EnqueueResponse =
  paths["/api/v1/invoice/send"]["post"]["responses"]["202"]["content"]["application/json"];

/** Respuesta de GET /api/v1/queues/stats */
export type QueueStats =
  paths["/api/v1/queues/stats"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * Filtro anti-scraping OBLIGATORIO (al menos uno) para la consulta pública de
 * comprobantes. Sin esto, RUC+tipoDoc+serie+numero (secuenciales y
 * adivinables) bastarían para extraer datos de cualquier comprobante de la
 * empresa. Si no mandas ninguno, la API responde 404 aunque el comprobante
 * exista.
 *
 * NOTA: tipado a mano en vez de derivado de `paths[...]` porque el spec de
 * producción aún no tiene este filtro en las rutas /pdf y /xml (se agregó
 * del lado de la API pero todavía no se desplegó). Tras el deploy, correr
 * `npm run gen` y este tipo puede volver a derivarse de `paths[...]`.
 */
export type ConsultaFiltro =
  | { total: number; fecha?: string; receptor?: string }
  | { total?: number; fecha: string; receptor?: string }
  | { total?: number; fecha?: string; receptor: string };

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

  /**
   * Estado de un envío RC/RA: el `id` que devuelven sendSummary, sendVoided,
   * cancelInvoice y cancelBoleta (es del envío, no de un documento). Trae el
   * ticket, el código/motivo de SUNAT y el estado de cada comprobante incluido.
   */
  async getSummary(id: string) {
    return this.api.GET("/api/v1/summaries/{id}", {
      params: { path: { id } },
    });
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

  // --- Empresas ---
  //
  // Leer: cualquier key. Gestionar (alta, datos, certificado, logo, anexos):
  // una key LIVE de cuenta en un plan pago (autogestión). En el plan gratis, con
  // una key de prueba o con una key de empresa, la API responde 403
  // `AUTOGESTION_NO_DISPONIBLE`. Las credenciales SOL/GRE/SIRE de una empresa ya
  // creada, los webhooks y el reclamo de un RUC siguen en el panel de Intifact.

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

  /**
   * Da de alta una empresa con su certificado digital (autogestión).
   *
   * El certificado (`.p12`/`.pfx` en base64) tiene que declarar el MISMO RUC: si
   * no abre, está vencido o es de otro RUC, responde 400 y no se guarda nada.
   * Idempotente: el mismo RUC ya registrado en tu cuenta devuelve 200 con
   * `creada: false`.
   */
  async registerCompany(body: RegisterCompanyInput) {
    return this.api.POST("/api/v1/companies/register", { body });
  }

  /** Actualiza los datos de la empresa (no sus credenciales SOL/GRE/SIRE). */
  async updateCompany(id: string, body: UpdateCompanyInput) {
    return this.api.PUT("/api/v1/companies/{id}", { params: { path: { id } }, body });
  }

  /** Renueva el certificado digital (base64). Tiene que declarar el RUC de la empresa. */
  async uploadCompanyCertificate(id: string, body: UploadCertificateInput) {
    return this.api.POST("/api/v1/companies/{id}/certificate", {
      params: { path: { id } },
      body,
    });
  }

  /**
   * Sube el logo de la empresa: PNG o JPG, hasta 200 KB, 2500 px por lado y
   * 4 millones de píxeles.
   */
  async uploadCompanyLogo(id: string, logo: Blob, nombreArchivo = "logo") {
    const form = new FormData();
    form.append("file", logo, nombreArchivo);
    return this.api.POST("/api/v1/companies/{id}/logo", {
      params: { path: { id } },
      // El endpoint es multipart: el FormData va tal cual (fetch pone el boundary).
      body: form as never,
      bodySerializer: (b: unknown) => b as FormData,
    });
  }

  /** Quita el logo de la empresa. */
  async deleteCompanyLogo(id: string) {
    return this.api.DELETE("/api/v1/companies/{id}/logo", { params: { path: { id } } });
  }

  // --- Establecimientos (sucursales) ---
  //
  // Tu código los necesita para saber qué `establecimientoCodigo` mandar al
  // emitir (va al XML como `cbc:AddressTypeCode` y decide qué dirección sale
  // impresa). Registrarlos, editarlos y desactivarlos: panel o autogestión
  // (key live de cuenta en plan pago).
  //
  // Alcance: una key con `tenantId` solo ve las empresas de SU cuenta; con
  // `companyId`, solo esa. Si el id es de otra cuenta, responde 404.

  /** Lista los establecimientos de una empresa (incluye los desactivados). */
  async listBranches(companyId: string) {
    return this.api.GET("/api/v1/companies/{id}/branches", {
      params: { path: { id: companyId } },
    });
  }

  /** Registra un anexo. El `codigo` es el que SUNAT le asignó (4 dígitos). */
  async createBranch(companyId: string, body: CreateBranchInput) {
    return this.api.POST("/api/v1/companies/{id}/branches", {
      params: { path: { id: companyId } },
      body,
    });
  }

  /** Actualiza un anexo (el `codigo` no cambia). */
  async updateBranch(companyId: string, branchId: string, body: UpdateBranchInput) {
    return this.api.PUT("/api/v1/companies/{id}/branches/{branchId}", {
      params: { path: { id: companyId, branchId } },
      body,
    });
  }

  /** Desactiva un anexo (no se borra; el matriz 0000 no se puede desactivar). */
  async deactivateBranch(companyId: string, branchId: string) {
    return this.api.DELETE("/api/v1/companies/{id}/branches/{branchId}", {
      params: { path: { id: companyId, branchId } },
    });
  }

  // Los webhooks y las credenciales SOL/GRE/SIRE de una empresa ya creada se
  // administran desde el panel de Intifact: con una key filtrada no se pueden
  // desviar ni cambiar.

  // --- Consumo del plan ---

  /** Comprobantes emitidos en el periodo actual y el límite de tu plan. */
  async getUsage() {
    return this.api.GET("/api/v1/usage", {});
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

  // --- Código de Producto SUNAT (Catálogo 25 / UNSPSC) ---
  //
  // Es el código que va en `detalle[].codProdSunat`. SUNAT lo exige desde el
  // 2027-01-01 y rechaza con error 3496 si falta o no es válido.

  /**
   * Busca un Código de Producto SUNAT por texto libre o por prefijo de código.
   *
   * Ignora tildes y mayúsculas, y exige que aparezcan todos los términos.
   * Devuelve primero las CLASE: SUNAT pide llegar como mínimo a ese nivel y es
   * la respuesta correcta en la mayoría de casos.
   *
   * ```ts
   * const { data } = await sdk.buscarProductoSunat("aceite motor");
   * data?.data.items[0].codigo; // "15121501"
   * ```
   */
  async buscarProductoSunat(
    q: string,
    opciones?: { nivel?: "CLASE" | "PRODUCTO"; limit?: number }
  ) {
    return this.api.GET("/api/v1/catalogs/producto/search", {
      params: { query: { q, ...opciones } },
    });
  }

  /** Obtiene un Código de Producto SUNAT puntual (404 si no existe). */
  async getProductoSunat(codigo: string) {
    return this.api.GET("/api/v1/catalogs/producto/{codigo}", {
      params: { path: { codigo } },
    });
  }

  /**
   * Descarga el Catálogo 25 COMPLETO (52.840 códigos, ~700 KB comprimidos).
   *
   * Para quien prefiere su propia copia local en vez de consultar la API en
   * cada búsqueda. La data está congelada desde 2008: bájala una vez y guárdala.
   * Está limitado a 5 peticiones por minuto — no lo llames en cada arranque.
   */
  async exportarProductosSunat() {
    return this.api.GET("/api/v1/catalogs/producto/export", {});
  }

  // --- Consulta pública (sin auth — para clientes finales del emisor) ---

  /** Consulta pública de un comprobante por RUC/tipo/serie/número (JSON). */
  async consultarComprobante(
    ruc: string,
    tipoDoc: string,
    serie: string,
    numero: string,
    filtro: ConsultaFiltro
  ) {
    return this.api.GET(
      "/api/v1/public/consultar/{ruc}/{tipoDoc}/{serie}/{numero}",
      { params: { path: { ruc, tipoDoc, serie, numero }, query: filtro } }
    );
  }

  /** PDF público de un comprobante. */
  async consultarComprobantePdf(
    ruc: string,
    tipoDoc: string,
    serie: string,
    numero: string,
    filtro: ConsultaFiltro
  ): Promise<ArrayBuffer> {
    const response = await this.api.GET(
      "/api/v1/public/consultar/{ruc}/{tipoDoc}/{serie}/{numero}/pdf",
      {
        params: {
          path: { ruc, tipoDoc, serie, numero },
          query: filtro as never,
        },
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
    numero: string,
    filtro: ConsultaFiltro
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
