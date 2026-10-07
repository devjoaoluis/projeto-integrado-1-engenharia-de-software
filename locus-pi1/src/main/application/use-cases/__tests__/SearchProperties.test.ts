import { describe, it } from "node:test";
import assert from "node:assert";
import { SearchProperties } from "../SearchProperties";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";

class MockPropertyRepository implements IPropertyRepository {
  public properties: Property[] = [];
  async create(p: Property): Promise<Property> { return p; }
  async findById(id: string): Promise<Property | null> { return null; }
  async findAll(): Promise<Property[]> { return []; }
  async update(p: Property): Promise<Property> { return p; }
  async delete(id: string): Promise<void> { }
  
  async search(params: any): Promise<any> {
    // Basic mock implementation for testing
    let items = [...this.properties];
    if (params.q) items = items.filter(p => p.title.includes(params.q));
    if (params.neighborhood) items = items.filter(p => p.neighborhood === params.neighborhood);
    if (params.bedrooms !== undefined) items = items.filter(p => (p.bedrooms || 0) >= params.bedrooms);
    
    return {
      items,
      total: items.length,
      limit: params.limit || 20,
      offset: ((params.page || 1) - 1) * (params.limit || 20)
    };
  }
}

describe("SearchProperties Use Case", () => {
  it("should validate page and limit as integers", async () => {
    const repo = new MockPropertyRepository();
    const useCase = new SearchProperties(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({ page: 1.5, limit: 20 });
      },
      /Expected integer/
    );
  });

  it("should validate bedrooms as non-negative integer", async () => {
    const repo = new MockPropertyRepository();
    const useCase = new SearchProperties(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({ bedrooms: -1 });
      },
      /greater than or equal to 0/
    );
  });

  it("should return valid search results", async () => {
    const repo = new MockPropertyRepository();
    repo.properties = [
      { id: "1", title: "Casa Centro", address: "Rua A", neighborhood: "Centro", bedrooms: 3, price: 200000, description: null, status: PropertyStatus.CADASTRADO, createdAt: 1, updatedAt: 1 },
      { id: "2", title: "Apto Norte", address: "Rua B", neighborhood: "Norte", bedrooms: 2, price: 150000, description: null, status: PropertyStatus.CADASTRADO, createdAt: 1, updatedAt: 1 }
    ];
    
    const useCase = new SearchProperties(repo);
    const result = await useCase.execute({ neighborhood: "Centro", bedrooms: 2 });
    
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.items[0].title, "Casa Centro");
  });
});
