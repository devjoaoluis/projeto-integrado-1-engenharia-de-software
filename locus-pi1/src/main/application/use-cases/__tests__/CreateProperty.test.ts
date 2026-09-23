import { describe, it } from "node:test";
import assert from "node:assert";
import { CreateProperty } from "../CreateProperty";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";

class MockPropertyRepository implements IPropertyRepository {
  public properties: Property[] = [];

  async create(property: Property): Promise<Property> {
    this.properties.push(property);
    return property;
  }
  async findById(id: string): Promise<Property | null> {
    return this.properties.find(p => p.id === id) || null;
  }
  async findAll(): Promise<Property[]> {
    return this.properties;
  }
  async update(property: Property): Promise<Property> {
    return property;
  }
  async delete(id: string): Promise<void> {
    this.properties = this.properties.filter(p => p.id !== id);
  }
}

describe("CreateProperty Use Case", () => {
  it("should create a valid property", async () => {
    const repo = new MockPropertyRepository();
    const useCase = new CreateProperty(repo);

    const result = await useCase.execute({
      title: "Casa de Teste",
      address: "Rua X",
      price: 100000,
    });

    assert.strictEqual(result.title, "Casa de Teste");
    assert.strictEqual(result.address, "Rua X");
    assert.strictEqual(result.price, 100000);
    assert.strictEqual(result.status, PropertyStatus.CADASTRADO);
    assert.ok(repo.properties.find(p => p.id === result.id));
  });

  it("should throw if title is empty", async () => {
    const repo = new MockPropertyRepository();
    const useCase = new CreateProperty(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({ title: "", address: "Rua X", price: 100000 });
      },
      (err: Error) => err.message === "Title is required"
    );
  });
});
