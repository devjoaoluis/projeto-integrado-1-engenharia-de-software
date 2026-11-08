// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("api", {
  contractTemplates: {
    create: (data: import("../main/application/use-cases/CreateContractTemplate").CreateContractTemplateDTO) =>
      ipcRenderer.invoke("contract-templates:create", data),
    get: (id: string) => ipcRenderer.invoke("contract-templates:get", id),
    list: () => ipcRenderer.invoke("contract-templates:list"),
  },

  contracts: {
    assembleData: (params: import("../main/application/use-cases/AssembleContractData").AssembleContractDataInput) =>
      ipcRenderer.invoke("contracts:assemble-data", params),
    fillTemplate: (data: import("../main/application/use-cases/FillContractTemplate").FillContractTemplateInput) =>
      ipcRenderer.invoke("contracts:fill-template", data),
    generatePdf: (params: import("../main/application/use-cases/GenerateContractPdf").GenerateContractPdfInput) =>
      ipcRenderer.invoke("contracts:generate-pdf", params),
    exportPdf: (params: import("../main/ipc/contracts.ipc").ExportContractPdfParams) =>
      ipcRenderer.invoke("contracts:export-pdf", params),
    getDefaultTemplate: () =>
      ipcRenderer.invoke("contracts:get-default-template"),
  },

  inspections: {
    recordEntry: (data: import("../main/application/use-cases/RecordEntryInspection").RecordEntryInspectionDTO) =>
      ipcRenderer.invoke("inspections:record-entry", data),
    recordExit: (data: import("../main/application/use-cases/RecordExitInspection").RecordExitInspectionDTO) =>
      ipcRenderer.invoke("inspections:record-exit", data),
    get: (id: string) => ipcRenderer.invoke("inspections:get", id),
    list: (data: import("../main/application/use-cases/ListInspections").ListInspectionsDTO) =>
      ipcRenderer.invoke("inspections:list", data),
  },

  documentos: {
    upload: (
      data: import("../main/application/use-cases/tenant-documents/UploadTenantDocument").UploadTenantDocumentDTO
    ) => ipcRenderer.invoke("documentos:upload", data),
    listar: (data: { locatarioId: string }) =>
      ipcRenderer.invoke("documentos:listar", data),
    obter: (data: { id: string }) =>
      ipcRenderer.invoke("documentos:obter", data),
    baixar: (data: { id: string }) =>
      ipcRenderer.invoke("documentos:baixar", data),
    atualizarCategoria: (data: {
      id: string;
      categoria: import("../main/domain/entities/TenantDocument").DocumentCategory;
    }) => ipcRenderer.invoke("documentos:atualizar-categoria", data),
  },


  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  auth: {
    register: (data: any) =>
      ipcRenderer.invoke("auth:register", data),

    login: (data: any) =>
      ipcRenderer.invoke("auth:login", data),

    logout: () =>
      ipcRenderer.invoke("auth:logout"),

    getCurrentUser: () =>
      ipcRenderer.invoke("auth:current-user"),

    hasUsers: () =>
      ipcRenderer.invoke("auth:has-users"),

    getSecurityQuestion: (email: string) =>
      ipcRenderer.invoke("auth:get-security-question", email),

    resetPassword: (data: any) =>
      ipcRenderer.invoke("auth:reset-password", data),
  },

  properties: {
    create: (data: any) => ipcRenderer.invoke("properties:create", data),
    get: (id: string) => ipcRenderer.invoke("properties:get", id),
    overview: (id: string) => ipcRenderer.invoke("properties:overview", id),
    list: () => ipcRenderer.invoke("properties:list"),
    search: (data: any) => ipcRenderer.invoke("properties:search", data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke("properties:update", {
        id,
        ...data,
      }),

    delete: (id: string) =>
      ipcRenderer.invoke("properties:delete", id),
  },

  propertyMedia: {
    add: (data: any) =>
      ipcRenderer.invoke("property-media:add", data),

    list: (propertyId: string) =>
      ipcRenderer.invoke("property-media:list", propertyId),

    delete: (id: string) =>
      ipcRenderer.invoke("property-media:delete", id),
  },

  propertyHistory: {
    record: (
      data: import("../main/application/use-cases/RecordPropertyHistory")
        .RecordPropertyHistoryDTO
    ) =>
      ipcRenderer.invoke("property-history:record", data),
  },

  rentals: {
    create: (
      data: import("../main/application/use-cases/CreateRental")
        .CreateRentalDTO
    ) =>
      ipcRenderer.invoke("rentals:create", data),

    get: (id: string) =>
      ipcRenderer.invoke("rentals:get", id),

    list: () =>
      ipcRenderer.invoke("rentals:list"),

    updatePrerequisites: (
      data: import("../main/application/use-cases/UpdateRentalPrerequisites")
        .UpdateRentalPrerequisitesDTO
    ) =>
      ipcRenderer.invoke(
        "rentals:update-prerequisites",
        data
      ),

    releaseKeys: (id: string) =>
      ipcRenderer.invoke("rentals:release-keys", id),
    getTerminationSummary: (id: string) =>
      ipcRenderer.invoke("rentals:get-termination-summary", id),
    cancel: (
      id: string,
      options?: import("../main/application/use-cases/CancelRental").CancelRentalOptions
    ) =>
      ipcRenderer.invoke("rentals:cancel", id, options),
  },

  owners: {
    create: (
      data: import("../main/application/use-cases/CreateContact")
        .CreateContactDTO
    ) =>
      ipcRenderer.invoke("owners:create", data),

    update: (
      data: import("../main/application/use-cases/UpdateContact")
        .UpdateContactDTO
    ) =>
      ipcRenderer.invoke("owners:update", data),

    get: (id: string) =>
      ipcRenderer.invoke("owners:get", id),

    list: () =>
      ipcRenderer.invoke("owners:list"),

    delete: (id: string) =>
      ipcRenderer.invoke("owners:delete", id),
  },

  guarantors: {
    create: (
      data: import("../main/application/use-cases/CreateContact")
        .CreateContactDTO
    ) =>
      ipcRenderer.invoke("guarantors:create", data),

    update: (
      data: import("../main/application/use-cases/UpdateContact")
        .UpdateContactDTO
    ) =>
      ipcRenderer.invoke("guarantors:update", data),

    get: (id: string) =>
      ipcRenderer.invoke("guarantors:get", id),

    list: () =>
      ipcRenderer.invoke("guarantors:list"),

    delete: (id: string) =>
      ipcRenderer.invoke("guarantors:delete", id),
  },

  clients: {
    create: (
      data: import("../main/application/use-cases/CreateClient")
        .CreateClientDTO
    ) =>
      ipcRenderer.invoke("clients:create", data),

    get: (id: string) =>
      ipcRenderer.invoke("clients:get", id),

    profile: (id: string) =>
      ipcRenderer.invoke("clients:profile", id),

    list: () =>
      ipcRenderer.invoke("clients:list"),

    update: (
      data: import("../main/application/use-cases/UpdateClient")
        .UpdateClientDTO
    ) =>
      ipcRenderer.invoke("clients:update", data),

    delete: (id: string) =>
      ipcRenderer.invoke("clients:delete", id),
  },

  visits: {
    create: (
      data: import("../main/application/use-cases/CreateVisit")
        .CreateVisitDTO
    ) =>
      ipcRenderer.invoke("visits:create", data),

    list: (
      filter?: import("../main/domain/repositories/IVisitRepository")
        .VisitFilter
    ) =>
      ipcRenderer.invoke("visits:list", filter),

    get: (id: string) =>
      ipcRenderer.invoke("visits:get", id),

    update: (
      data: import("../main/application/use-cases/UpdateVisit")
        .UpdateVisitDTO
    ) =>
      ipcRenderer.invoke("visits:update", data),

    delete: (id: string) =>
      ipcRenderer.invoke("visits:delete", id),

    upcoming: (limit?: number) =>
      ipcRenderer.invoke("visits:upcoming", limit),

    getAlerts: (
      options?: import("../main/application/use-cases/GetVisitAlerts")
        .GetVisitAlertsOptions
    ) =>
      ipcRenderer.invoke("visits:get-alerts", options),

    checkReminders: () =>
      ipcRenderer.invoke("visits:check-reminders"),

    dismissReminder: (data: {
      visitId: string;
      stage: import("../main/domain/entities/VisitReminder").VisitReminderStage;
    }) =>
      ipcRenderer.invoke("visits:dismiss-reminder", data),

    onReminderNotification: (
      callback: (
        alert: import("../main/domain/entities/VisitReminder").VisitAlert
      ) => void
    ) => {
      const subscription = (_event: any, alert: any) => callback(alert);
      ipcRenderer.on("visits:reminder-notification", subscription);
      return () => {
        ipcRenderer.removeListener("visits:reminder-notification", subscription);
      };
    },
  },

  overdue: {
    check: (options?: import("../main/application/use-cases/CheckOverdueRents").CheckOverdueRentsOptions) =>
      ipcRenderer.invoke("overdue:check", options),
    triggerAlerts: (options?: import("../main/application/use-cases/TriggerOverdueAlerts").TriggerOverdueAlertsInput) =>
      ipcRenderer.invoke("overdue:trigger-alerts", options),
    settleDebt: (input: import("../main/application/use-cases/SettleOverdueDebt").SettleOverdueDebtInput) =>
      ipcRenderer.invoke("overdue:settle-debt", input),
    listNotifications: (filter?: import("../main/domain/repositories/IOverdueNotificationRepository").OverdueNotificationFilter) =>
      ipcRenderer.invoke("overdue:list-notifications", filter),
  },
});