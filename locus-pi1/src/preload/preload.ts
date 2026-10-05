// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  properties: {
    create: (data: any) => ipcRenderer.invoke("properties:create", data),
    get: (id: string) => ipcRenderer.invoke("properties:get", id),
    list: () => ipcRenderer.invoke("properties:list"),
    update: (data: any) => ipcRenderer.invoke("properties:update", data),
    delete: (id: string) => ipcRenderer.invoke("properties:delete", id),
  },
  propertyMedia: {
    add: (data: any) => ipcRenderer.invoke("property-media:add", data),
    list: (propertyId: string) => ipcRenderer.invoke("property-media:list", propertyId),
    delete: (id: string) => ipcRenderer.invoke("property-media:delete", id),
  },
  rentals: {
    create: (data: import("../main/application/use-cases/CreateRental").CreateRentalDTO) => ipcRenderer.invoke("rentals:create", data),
    get: (id: string) => ipcRenderer.invoke("rentals:get", id),
    list: () => ipcRenderer.invoke("rentals:list"),
    updatePrerequisites: (data: import("../main/application/use-cases/UpdateRentalPrerequisites").UpdateRentalPrerequisitesDTO) => ipcRenderer.invoke("rentals:update-prerequisites", data),
    releaseKeys: (id: string) => ipcRenderer.invoke("rentals:release-keys", id),
  },
  clients: {
    create: (data: any) => ipcRenderer.invoke("clients:create", data),
    get: (id: string) => ipcRenderer.invoke("clients:get", id),
    list: () => ipcRenderer.invoke("clients:list"),
    update: (data: any) => ipcRenderer.invoke("clients:update", data),
    delete: (id: string) => ipcRenderer.invoke("clients:delete", id),
  },
});
