import { describe, it } from "node:test";
import assert from "node:assert";
import { CreateClient } from "../CreateClient";
import { GetClient } from "../GetClient";
import { UpdateClient } from "../UpdateClient";
import { DeleteClient } from "../DeleteClient";
import { ListClients } from "../ListClients";
import { Client } from "../../../domain/entities/Client";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";

class MockClientRepository implements IClientRepository {
  public clients: Client[] = [];

  async create(client: Client): Promise<Client> {
    this.clients.push(client);
    return client;
  }

  async findById(id: string): Promise<Client | null> {
    return this.clients.find((c) => c.id === id) || null;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Client | null> {
    return this.clients.find((c) => c.cpfCnpj === cpfCnpj) || null;
  }

  async findAll(): Promise<Client[]> {
    return this.clients;
  }

  async update(client: Client): Promise<Client> {
    const index = this.clients.findIndex((c) => c.id === client.id);
    if (index !== -1) {
      this.clients[index] = client;
    }
    return client;
  }

  async delete(id: string): Promise<void> {
    this.clients = this.clients.filter((c) => c.id !== id);
  }
}

describe("Client Use Cases", () => {
  it("should create a valid client", async () => {
    const repo = new MockClientRepository();
    const useCase = new CreateClient(repo);

    const client = await useCase.execute({
      name: "João Silva",
      cpfCnpj: "123.456.789-00",
      phone: "(85) 99999-9999",
      email: "joao@email.com",
    });

    assert.strictEqual(client.name, "João Silva");
    assert.strictEqual(client.cpfCnpj, "123.456.789-00");
    assert.strictEqual(client.phone, "(85) 99999-9999");
    assert.strictEqual(client.email, "joao@email.com");
    assert.ok(client.id);
    assert.ok(repo.clients.find((c) => c.id === client.id));
  });

  it("should throw if name is empty", async () => {
    const repo = new MockClientRepository();
    const useCase = new CreateClient(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          name: "",
          cpfCnpj: "123.456.789-00",
          phone: "99999-9999",
        });
      },
      (err: Error) => err.message === "Name is required"
    );
  });

  it("should throw if cpfCnpj is empty", async () => {
    const repo = new MockClientRepository();
    const useCase = new CreateClient(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          name: "João Silva",
          cpfCnpj: "",
          phone: "99999-9999",
        });
      },
      (err: Error) => err.message === "CPF/CNPJ is required"
    );
  });

  it("should prevent duplicate CPF/CNPJ", async () => {
    const repo = new MockClientRepository();
    const useCase = new CreateClient(repo);

    await useCase.execute({
      name: "Cliente 1",
      cpfCnpj: "111.222.333-44",
      phone: "1111-1111",
    });

    await assert.rejects(
      async () => {
        await useCase.execute({
          name: "Cliente 2",
          cpfCnpj: "111.222.333-44",
          phone: "2222-2222",
        });
      },
      (err: Error) => err.message === "A client with this CPF/CNPJ already exists"
    );
  });

  it("should get client by id", async () => {
    const repo = new MockClientRepository();
    const createUseCase = new CreateClient(repo);
    const getUseCase = new GetClient(repo);

    const created = await createUseCase.execute({
      name: "Maria Souza",
      cpfCnpj: "222.333.444-55",
      phone: "8888-8888",
    });

    const found = await getUseCase.execute(created.id);
    assert.strictEqual(found.id, created.id);
    assert.strictEqual(found.name, "Maria Souza");
  });

  it("should update client successfully", async () => {
    const repo = new MockClientRepository();
    const createUseCase = new CreateClient(repo);
    const updateUseCase = new UpdateClient(repo);

    const created = await createUseCase.execute({
      name: "Carlos",
      cpfCnpj: "333.444.555-66",
      phone: "7777-7777",
    });

    const updated = await updateUseCase.execute({
      id: created.id,
      name: "Carlos Silva",
      phone: "7777-0000",
    });

    assert.strictEqual(updated.name, "Carlos Silva");
    assert.strictEqual(updated.phone, "7777-0000");
  });

  it("should delete client successfully", async () => {
    const repo = new MockClientRepository();
    const createUseCase = new CreateClient(repo);
    const deleteUseCase = new DeleteClient(repo);

    const created = await createUseCase.execute({
      name: "Ana",
      cpfCnpj: "444.555.666-77",
      phone: "6666-6666",
    });

    await deleteUseCase.execute(created.id);
    assert.strictEqual(repo.clients.length, 0);
  });
});
