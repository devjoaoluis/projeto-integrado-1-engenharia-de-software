import { describe, it } from "node:test";
import assert from "node:assert";
import { DeleteProperty } from "../DeleteProperty";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { Rental } from "../../../domain/entities/Rental";
import { PropertyMedia, MediaType } from "../../../domain/entities/PropertyMedia";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { IPropertyMediaRepository } from "../../../domain/repositories/IPropertyMediaRepository";
import { IFileStorage } from "../../../domain/repositories/IFileStorage";

class MockPropertyRepository implements IPropertyRepository {
  public properties: Property[] = [];
  async create(p: Property): Promise<Property> { this.properties.push(p); return p; }
  async findById(id: string): Promise<Property | null> { return this.properties.find(p => p.id === id) || null; }
  async search(params: any): Promise<any> { return { items: this.properties, total: this.properties.length, limit: 20, offset: 0 }; }
  async findAll(): Promise<Property[]> { return this.properties; }
  async update(p: Property): Promise<Property> { return p; }
  async delete(id: string): Promise<void> { this.properties = this.properties.filter(p => p.id !== id); }
}

class MockPropertyMediaRepository implements IPropertyMediaRepository {
  public medias: PropertyMedia[] = [];
  async create(m: PropertyMedia): Promise<PropertyMedia> { this.medias.push(m); return m; }
  async findById(id: string): Promise<PropertyMedia | null> { return this.medias.find(m => m.id === id) || null; }
  async findByPropertyId(propertyId: string): Promise<PropertyMedia[]> { return this.medias.filter(m => m.propertyId === propertyId); }
  async delete(id: string): Promise<void> { this.medias = this.medias.filter(m => m.id !== id); }
  async deleteByPropertyId(propertyId: string): Promise<void> { this.medias = this.medias.filter(m => m.propertyId !== propertyId); }
}

class MockFileStorage implements IFileStorage {
  public deletedFiles: string[] = [];
  async save(s: string, d: string, f: string): Promise<string> { return d + "/" + f; }
  async delete(filePath: string): Promise<void> { this.deletedFiles.push(filePath); }
  async exists(filePath: string): Promise<boolean> { return true; }
  getPath(d: string, f: string): string { return d + "/" + f; }
}

describe("DeleteProperty Use Case", () => {
  it("preserves media when deletion of a rented property is rejected", async () => {
    const propRepo = new MockPropertyRepository();
    const mediaRepo = new MockPropertyMediaRepository();
    const storage = new MockFileStorage();
    await propRepo.create({ id: "rented", title: "T", address: "A", neighborhood: null, bedrooms: null, price: 100, description: null,
      status: PropertyStatus.ALUGADO, createdAt: 1, updatedAt: 1 });
    await mediaRepo.create({ id: "media", propertyId: "rented", type: MediaType.IMAGE,
      fileName: "x.jpg", filePath: "x.jpg", mimeType: "image/jpeg", size: 100, createdAt: 1 });
    await assert.rejects(
      new DeleteProperty(propRepo, mediaRepo, storage).execute("rented"),
      /Não é possível excluir um imóvel alugado/
    );
    assert.equal(propRepo.properties.length, 1);
    assert.equal(mediaRepo.medias.length, 1);
    assert.deepStrictEqual(storage.deletedFiles, []);
  });
  it("should delete a property and its related media files", async () => {
    const propRepo = new MockPropertyRepository();
    const mediaRepo = new MockPropertyMediaRepository();
    const storage = new MockFileStorage();

    const useCase = new DeleteProperty(propRepo, mediaRepo, storage);

    await propRepo.create({ id: "prop1", title: "T", address: "A", neighborhood: null, bedrooms: null, price: 100, description: null, status: PropertyStatus.CADASTRADO, createdAt: 1, updatedAt: 1 });
    await mediaRepo.create({ id: "m1", propertyId: "prop1", type: MediaType.IMAGE, fileName: "x.jpg", filePath: "path/to/x.jpg", mimeType: "image/jpeg", size: 100, createdAt: 1 });

    await useCase.execute("prop1");

    assert.strictEqual(propRepo.properties.length, 0, "Property should be deleted");
    assert.strictEqual(mediaRepo.medias.length, 0, "Media records should be deleted");
    assert.deepStrictEqual(storage.deletedFiles, ["path/to/x.jpg"], "Files should be deleted");
  });

  it("does not block deletion because of a stale rented status when no rental exists", async () => {
    const propRepo = new MockPropertyRepository();
    const mediaRepo = new MockPropertyMediaRepository();
    const storage = new MockFileStorage();
    const rentalRepo = { findByPropertyId: async (_propertyId: string): Promise<Rental[]> => [] };

    await propRepo.create({ id: "available-again", title: "T", address: "A", neighborhood: null, bedrooms: null,
      price: 100, description: null, status: PropertyStatus.ALUGADO, createdAt: 1, updatedAt: 1 });

    await new DeleteProperty(propRepo, mediaRepo, storage, undefined, rentalRepo).execute("available-again");

    assert.equal(propRepo.properties.length, 0);
  });
});
