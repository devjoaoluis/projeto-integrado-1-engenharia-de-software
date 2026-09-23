import { ipcMain } from "electron";
import { AddPropertyMedia, AddPropertyMediaDTO } from "../application/use-cases/AddPropertyMedia";
import { ListPropertyMedia } from "../application/use-cases/ListPropertyMedia";
import { RemovePropertyMedia } from "../application/use-cases/RemovePropertyMedia";

import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzlePropertyMediaRepository } from "../infrastructure/repositories/DrizzlePropertyMediaRepository";
import { LocalFileStorage } from "../infrastructure/filesystem/LocalFileStorage";

export function registerPropertyMediaIpc() {
  const propertyRepo = new DrizzlePropertyRepository();
  const propertyMediaRepo = new DrizzlePropertyMediaRepository();
  const fileStorage = new LocalFileStorage();

  const addPropertyMedia = new AddPropertyMedia(propertyRepo, propertyMediaRepo, fileStorage);
  const listPropertyMedia = new ListPropertyMedia(propertyMediaRepo, propertyRepo);
  const removePropertyMedia = new RemovePropertyMedia(propertyMediaRepo, fileStorage);

  ipcMain.handle("property-media:add", async (_, data: AddPropertyMediaDTO) => {
    return await addPropertyMedia.execute(data);
  });

  ipcMain.handle("property-media:list", async (_, propertyId: string) => {
    return await listPropertyMedia.execute(propertyId);
  });

  ipcMain.handle("property-media:delete", async (_, id: string) => {
    await removePropertyMedia.execute(id);
    return { success: true };
  });
}
