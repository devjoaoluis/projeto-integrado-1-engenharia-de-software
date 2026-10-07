import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { ZodError } from "zod";
import { ipcMain } from "electron";
import { CreateProperty, CreatePropertyDTO } from "../application/use-cases/CreateProperty";
import { GetProperty } from "../application/use-cases/GetProperty";
import { ListProperties } from "../application/use-cases/ListProperties";
import { SearchProperties, SearchPropertiesDTO } from "../application/use-cases/SearchProperties";
import { UpdateProperty, UpdatePropertyDTO } from "../application/use-cases/UpdateProperty";
import { DeleteProperty } from "../application/use-cases/DeleteProperty";

import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzlePropertyMediaRepository } from "../infrastructure/repositories/DrizzlePropertyMediaRepository";
import { LocalFileStorage } from "../infrastructure/filesystem/LocalFileStorage";

export function registerPropertiesIpc() {
  const propertyRepo = new DrizzlePropertyRepository();
  const propertyMediaRepo = new DrizzlePropertyMediaRepository();
  const fileStorage = new LocalFileStorage();

  const createProperty = new CreateProperty(propertyRepo);
  const getProperty = new GetProperty(propertyRepo);
  const listProperties = new ListProperties(propertyRepo);
  const searchProperties = new SearchProperties(propertyRepo);
  const updateProperty = new UpdateProperty(propertyRepo);
  const deleteProperty = new DeleteProperty(propertyRepo, propertyMediaRepo, fileStorage, new DrizzlePropertyHistoryRepository());

  ipcMain.handle("properties:create", async (_, data: CreatePropertyDTO) => {
    return await createProperty.execute(data);
  });

  ipcMain.handle("properties:get", async (_, id: string) => {
    return await getProperty.execute(id);
  });

  ipcMain.handle("properties:list", async () => {
    return await listProperties.execute();
  });

  ipcMain.handle("properties:search", async (_, data: SearchPropertiesDTO) => {
    try {
      return await searchProperties.execute(data || {});
    } catch (e: unknown) {
      if (e instanceof ZodError) {
        // Zod error
        return { error: true, message: "Validation error", details: e.issues };
      }
      return { error: true, message: e instanceof Error ? e.message : "Search failed" };
    }
  });

  ipcMain.handle("properties:update", async (_, data: UpdatePropertyDTO) => {
    return await updateProperty.execute(data);
  });

  ipcMain.handle("properties:delete", async (_, id: string) => {
    await deleteProperty.execute(id);
    return { success: true };
  });
}
