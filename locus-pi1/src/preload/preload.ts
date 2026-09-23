// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  auth: {
    login: (data: any) => ipcRenderer.invoke("auth:login", data),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getCurrentUser: () => ipcRenderer.invoke("auth:current-user"),
  },
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
});
