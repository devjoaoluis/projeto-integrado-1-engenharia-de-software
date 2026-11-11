import { describe, it } from "node:test";
import assert from "node:assert";
import { CreateVisit } from "../CreateVisit";
import { ListVisits } from "../ListVisits";
import { GetVisit } from "../GetVisit";
import { UpdateVisit } from "../UpdateVisit";
import { DeleteVisit } from "../DeleteVisit";
import { ListUpcomingVisits } from "../ListUpcomingVisits";
import { Visit, VisitWithDetails } from "../../../domain/entities/Visit";
import { IVisitRepository, VisitFilter } from "../../../domain/repositories/IVisitRepository";
import { IPropertyRepository } from "../../../domain/repositories/IPropertyRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";
import { Property, PropertyStatus } from "../../../domain/entities/Property";
import { Client } from "../../../domain/entities/Client";

class MockVisitRepository implements IVisitRepository {
  visits: Visit[] = [];

  propertyMap = new Map<string, { title: string; address: string }>();
  clientMap = new Map<string, { name: string; phone: string | null; email: string | null }>();

  async create(visit: Visit): Promise<Visit> {
    this.visits.push(visit);
    return visit;
  }

  async findById(id: string): Promise<Visit | null> {
    return this.visits.find((v) => v.id === id) ?? null;
  }

  async findWithDetailsById(id: string): Promise<VisitWithDetails | null> {
    const v = await this.findById(id);
    if (!v) return null;
    const prop = this.propertyMap.get(v.propertyId) ?? { title: "Imóvel", address: "Endereço" };
    const client = this.clientMap.get(v.clientId) ?? { name: "Cliente", phone: null, email: null };
    return {
      ...v,
      propertyTitle: prop.title,
      propertyAddress: prop.address,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
    };
  }

  async findAll(filter?: VisitFilter): Promise<VisitWithDetails[]> {
    let result = [...this.visits];
    if (filter?.propertyId) {
      result = result.filter((v) => v.propertyId === filter.propertyId);
    }
    if (filter?.clientId) {
      result = result.filter((v) => v.clientId === filter.clientId);
    }
    if (filter?.status) {
      result = result.filter((v) => v.status === filter.status);
    }
    if (filter?.fromTimestamp !== undefined) {
      result = result.filter((v) => v.scheduledAt >= filter.fromTimestamp!);
    }
    if (filter?.toTimestamp !== undefined) {
      result = result.filter((v) => v.scheduledAt <= filter.toTimestamp!);
    }

    result.sort((a, b) => a.scheduledAt - b.scheduledAt);

    return result.map((v) => {
      const prop = this.propertyMap.get(v.propertyId) ?? { title: "Imóvel", address: "Endereço" };
      const client = this.clientMap.get(v.clientId) ?? { name: "Cliente", phone: null, email: null };
      return {
        ...v,
        propertyTitle: prop.title,
        propertyAddress: prop.address,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
      };
    });
  }

  async findByPropertyId(propertyId: string): Promise<VisitWithDetails[]> {
    return this.findAll({ propertyId });
  }

  async findByClientId(clientId: string): Promise<VisitWithDetails[]> {
    return this.findAll({ clientId });
  }

  async findUpcoming(limit = 10, nowTimestamp = Date.now()): Promise<VisitWithDetails[]> {
    const filtered = this.visits
      .filter((v) => v.status === "AGENDADA" && v.scheduledAt >= nowTimestamp)
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
      .slice(0, limit);

    return filtered.map((v) => {
      const prop = this.propertyMap.get(v.propertyId) ?? { title: "Imóvel", address: "Endereço" };
      const client = this.clientMap.get(v.clientId) ?? { name: "Cliente", phone: null, email: null };
      return {
        ...v,
        propertyTitle: prop.title,
        propertyAddress: prop.address,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
      };
    });
  }

  async update(visit: Visit): Promise<Visit> {
    const index = this.visits.findIndex((v) => v.id === visit.id);
    if (index === -1) throw new Error("Visita não encontrada");
    this.visits[index] = visit;
    return visit;
  }

  async delete(id: string): Promise<void> {
    const index = this.visits.findIndex((v) => v.id === id);
    if (index === -1) throw new Error("Visita não encontrada");
    this.visits.splice(index, 1);
  }
}

function makeFixture() {
  const visitRepo = new MockVisitRepository();

  const property: Property = {
    id: "prop-1",
    title: "Apartamento Centro",
    address: "Av. Principal, 500",
    neighborhood: "Centro",
    bedrooms: 2,
    price: 250000,
    description: "Excelente apartamento",
    status: PropertyStatus.DISPONIVEL,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const client: Client = {
    id: "client-1",
    name: "Mariana Silva",
    type: "TENANT",
    guarantorId: null,
    cpfCnpj: "123.456.789-00",
    phone: "(11) 98888-7777",
    email: "mariana@email.com",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  visitRepo.propertyMap.set(property.id, { title: property.title, address: property.address });
  visitRepo.clientMap.set(client.id, { name: client.name, phone: client.phone ?? null, email: client.email ?? null });

  const propertyRepo = {
    findById: async (id: string) => (id === property.id ? property : null),
  } as unknown as IPropertyRepository;

  const clientRepo = {
    findById: async (id: string) => (id === client.id ? client : null),
  } as unknown as IClientRepository;

  return { visitRepo, propertyRepo, clientRepo, property, client };
}

describe("HU-07: Agendamento de Visitas e Lembretes (RF04 / RF06)", () => {
  it("deve agendar uma visita com sucesso associando cliente interessado e imóvel", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);

    const scheduledTime = Date.now() + 86400000; // amanhã
    const visit = await createVisit.execute({
      propertyId: "prop-1",
      clientId: "client-1",
      scheduledAt: scheduledTime,
      notes: "Cliente tem interesse para compra à vista.",
    });

    assert.ok(visit.id);
    assert.equal(visit.propertyId, "prop-1");
    assert.equal(visit.clientId, "client-1");
    assert.equal(visit.scheduledAt, scheduledTime);
    assert.equal(visit.status, "AGENDADA");
    assert.equal(visit.notes, "Cliente tem interesse para compra à vista.");
    assert.equal(visitRepo.visits.length, 1);
  });

  it("deve agendar uma visita fornecendo strings de data e hora", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);

    const visit = await createVisit.execute({
      propertyId: "prop-1",
      clientId: "client-1",
      date: "2026-11-20",
      time: "14:30",
    });

    assert.ok(visit.id);
    assert.equal(visit.status, "AGENDADA");
    const parsed = new Date("2026-11-20T14:30:00").getTime();
    assert.equal(visit.scheduledAt, parsed);
  });

  it("deve rejeitar agendamento com imóvel inexistente", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);

    await assert.rejects(
      createVisit.execute({
        propertyId: "prop-inexistente",
        clientId: "client-1",
        scheduledAt: Date.now() + 10000,
      }),
      /Imóvel com id prop-inexistente não encontrado/
    );
  });

  it("deve rejeitar agendamento com cliente interessado inexistente", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);

    await assert.rejects(
      createVisit.execute({
        propertyId: "prop-1",
        clientId: "client-inexistente",
        scheduledAt: Date.now() + 10000,
      }),
      /Cliente com id client-inexistente não encontrado/
    );
  });

  it("deve listar visitas com detalhes do cliente e do imóvel e aplicar filtros", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);
    const listVisits = new ListVisits(visitRepo);

    const t1 = Date.now() + 10000;
    const t2 = Date.now() + 20000;

    await createVisit.execute({ propertyId: "prop-1", clientId: "client-1", scheduledAt: t1 });
    await createVisit.execute({ propertyId: "prop-1", clientId: "client-1", scheduledAt: t2, status: "REALIZADA" });

    const all = await listVisits.execute();
    assert.equal(all.length, 2);
    assert.equal(all[0].propertyTitle, "Apartamento Centro");
    assert.equal(all[0].clientName, "Mariana Silva");

    const onlyAgendadas = await listVisits.execute({ status: "AGENDADA" });
    assert.equal(onlyAgendadas.length, 1);
    assert.equal(onlyAgendadas[0].status, "AGENDADA");
  });

  it("deve buscar uma visita específica com detalhes via GetVisit", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);
    const getVisit = new GetVisit(visitRepo);

    const created = await createVisit.execute({
      propertyId: "prop-1",
      clientId: "client-1",
      scheduledAt: Date.now() + 50000,
    });

    const found = await getVisit.execute(created.id);
    assert.equal(found.id, created.id);
    assert.equal(found.propertyTitle, "Apartamento Centro");
    assert.equal(found.clientName, "Mariana Silva");
    assert.equal(found.clientPhone, "(11) 98888-7777");
  });

  it("deve atualizar/remarcar visita e alterar status via UpdateVisit", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);
    const updateVisit = new UpdateVisit(visitRepo, propertyRepo, clientRepo);

    const created = await createVisit.execute({
      propertyId: "prop-1",
      clientId: "client-1",
      scheduledAt: Date.now() + 10000,
    });

    const newTime = Date.now() + 999999;
    const updated = await updateVisit.execute({
      id: created.id,
      scheduledAt: newTime,
      status: "REALIZADA",
      notes: "Visita concluída com sucesso. Cliente pediu minuta do contrato.",
    });

    assert.equal(updated.scheduledAt, newTime);
    assert.equal(updated.status, "REALIZADA");
    assert.equal(updated.notes, "Visita concluída com sucesso. Cliente pediu minuta do contrato.");
  });

  it("RF06: deve listar lembretes de visitas futuras em ordem cronológica", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);
    const listUpcoming = new ListUpcomingVisits(visitRepo);

    const now = 1750000000000;
    // Visita no passado (não deve vir no lembrete)
    await createVisit.execute({ propertyId: "prop-1", clientId: "client-1", scheduledAt: now - 3600000 });
    // Visitas no futuro
    await createVisit.execute({ propertyId: "prop-1", clientId: "client-1", scheduledAt: now + 7200000 }); // +2 horas
    await createVisit.execute({ propertyId: "prop-1", clientId: "client-1", scheduledAt: now + 3600000 }); // +1 hora

    const upcoming = await listUpcoming.execute(10, now);

    assert.equal(upcoming.length, 2);
    // Ordenada por ordem cronológica (mais próxima primeiro)
    assert.equal(upcoming[0].scheduledAt, now + 3600000);
    assert.equal(upcoming[1].scheduledAt, now + 7200000);
    assert.equal(upcoming[0].clientName, "Mariana Silva");
    assert.equal(upcoming[0].propertyTitle, "Apartamento Centro");
  });

  it("deve excluir uma visita com sucesso via DeleteVisit", async () => {
    const { visitRepo, propertyRepo, clientRepo } = makeFixture();
    const createVisit = new CreateVisit(visitRepo, propertyRepo, clientRepo);
    const deleteVisit = new DeleteVisit(visitRepo);

    const created = await createVisit.execute({
      propertyId: "prop-1",
      clientId: "client-1",
      scheduledAt: Date.now() + 10000,
    });

    assert.equal(visitRepo.visits.length, 1);
    await deleteVisit.execute(created.id);
    assert.equal(visitRepo.visits.length, 0);

    await assert.rejects(deleteVisit.execute("inexistente"), /não encontrada/);
  });
});
