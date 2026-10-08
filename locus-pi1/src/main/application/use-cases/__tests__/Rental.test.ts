import { describe, it } from "node:test";
import assert from "node:assert";
import { CreateRental, CreateRentalDTO } from "../CreateRental";
import { ReleaseRentalKeys } from "../ReleaseRentalKeys";
import { UpdateRentalPrerequisites } from "../UpdateRentalPrerequisites";
import { Rental } from "../../../domain/entities/Rental";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { IRentalRepository } from "../../../domain/repositories/IRentalRepository";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";

class MockRentalRepository implements IRentalRepository {
  rentals: Rental[] = [];
  async create(rental: Rental) { this.rentals.push(rental); return rental; }
  async findById(id: string) { return this.rentals.find(rental => rental.id === id) ?? null; }
  async findByPropertyId(propertyId: string) { return this.rentals.filter(rental => rental.propertyId === propertyId); }
  async findAll() { return this.rentals; }
  async updatePrerequisites(id: string, data: Pick<Rental, "contractSigned" | "signaturesNotarized" | "initialPaymentsPaid">) {
    const rental = await this.findById(id);
    if (!rental) throw new Error("Rental not found");
    Object.assign(rental, data);
    return rental;
  }
  async releaseKeys(id: string, date: number) {
    const rental = await this.findById(id);
    if (!rental) throw new Error("Rental not found");
    rental.keysReleasedAt = date;
    return rental;
  }
}

function fixture(status = PropertyStatus.DISPONIVEL) {
  const repo = new MockRentalRepository();
  const property: Property = { id: "property", title: "Casa", address: "Rua", neighborhood: null, bedrooms: null, price: 1000,
    description: null, status, createdAt: 1, updatedAt: 1 };
  const properties = { findById: async (id: string) => id === property.id ? property : null } as IPropertyRepository;
  const clients = { findById: async (id: string) => id === "tenant" || id === "subtenant" ? { id } : null } as IClientRepository;
  const dto: CreateRentalDTO = { propertyId: "property", tenantId: "tenant", monthlyRent: 1000, startDate: Date.now(), dueDay: 10 };
  return { repo, property, dto, create: new CreateRental(repo, properties, clients) };
}

describe("Rental use cases", () => {
  it("associates a registered tenant and records rent control without releasing keys", async () => {
    const { create, dto, repo } = fixture();
    const rental = await create.execute(dto);
    assert.equal(rental.monthlyRent, 1000);
    assert.equal(rental.dueDay, 10);
    assert.equal(rental.startDate, dto.startDate);
    assert.equal(rental.keysReleasedAt, null);
    assert.equal(repo.rentals.length, 1);
  });
  it("rejects missing properties and tenants", async () => {
    const { create, dto, repo } = fixture();
    await assert.rejects(create.execute({ ...dto, propertyId: "missing" }), /Property.*not found/);
    await assert.rejects(create.execute({ ...dto, tenantId: "missing" }), /Client.*not found/);
    assert.equal(repo.rentals.length, 0);
  });
  for (const status of [PropertyStatus.ALUGADO, PropertyStatus.VENDIDO, PropertyStatus.INATIVO]) {
    it(`rejects a primary rental for ${status}`, async () => {
      const { create, dto } = fixture(status);
      await assert.rejects(create.execute(dto), /not available/);
    });
  }
  it("validates financial data and runtime boolean inputs", async () => {
    const { create, dto } = fixture();
    for (const monthlyRent of [NaN, Infinity, -1, 0]) {
      await assert.rejects(create.execute({ ...dto, monthlyRent }), /Monthly rent/);
    }
    for (const dueDay of [0, 32, 1.5]) await assert.rejects(create.execute({ ...dto, dueDay }), /Due day/);
    await assert.rejects(create.execute({ ...dto, startDate: NaN }), /Start date/);
    await assert.rejects(create.execute({ ...dto, contractSigned: "true" as unknown as boolean }), /boolean/);
  });
  it("RN01 blocks keys when any prerequisite is missing", async () => {
    for (const missing of ["contractSigned", "signaturesNotarized", "initialPaymentsPaid"] as const) {
      const { create, dto, repo } = fixture();
      const rental = await create.execute({ ...dto, contractSigned: true, signaturesNotarized: true, initialPaymentsPaid: true, [missing]: false });
      await assert.rejects(new ReleaseRentalKeys(repo).execute(rental.id), /RN01/);
      assert.equal(rental.keysReleasedAt, null);
    }
  });
  it("records prerequisites, releases keys once and prevents subsequent edits", async () => {
    const { create, dto, repo } = fixture();
    const rental = await create.execute(dto);
    const update = new UpdateRentalPrerequisites(repo);
    await update.execute({ id: rental.id, contractSigned: true, signaturesNotarized: true, initialPaymentsPaid: true });
    const release = new ReleaseRentalKeys(repo);
    const released = await release.execute(rental.id);
    const timestamp = released.keysReleasedAt;
    assert.ok(timestamp);
    assert.equal((await release.execute(rental.id)).keysReleasedAt, timestamp);
    await assert.rejects(update.execute({ id: rental.id, contractSigned: false, signaturesNotarized: true, initialPaymentsPaid: true }), /cannot be changed/);
  });
  it("RN02 rejects subletting without documented consent", async () => {
    const { create, dto, repo, property } = fixture();
    const parent = await create.execute(dto);
    property.status = PropertyStatus.ALUGADO;
    await assert.rejects(create.execute({ ...dto, tenantId: "subtenant", parentRentalId: parent.id }), /RN02/);
    await assert.rejects(create.execute({ ...dto, tenantId: "subtenant", parentRentalId: parent.id, formalConsent: "  " }), /RN02/);
    assert.equal(repo.rentals.length, 1);
    const child = await create.execute({ ...dto, tenantId: "subtenant", parentRentalId: parent.id, formalConsent: "consentimento.pdf" });
    assert.equal(child.parentRentalId, parent.id);
    assert.equal(child.formalConsent, "consentimento.pdf");
  });
  it("rejects subletting from a nonexistent rental or the same tenant", async () => {
    const { create, dto, property } = fixture();
    const parent = await create.execute(dto);
    property.status = PropertyStatus.ALUGADO;
    await assert.rejects(create.execute({ ...dto, tenantId: "subtenant", parentRentalId: "missing", formalConsent: "doc" }), /Invalid parent/);
    await assert.rejects(create.execute({ ...dto, parentRentalId: parent.id, formalConsent: "doc" }), /Invalid parent/);
  });
});
