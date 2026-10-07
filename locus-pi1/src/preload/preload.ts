// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("api", {
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
});