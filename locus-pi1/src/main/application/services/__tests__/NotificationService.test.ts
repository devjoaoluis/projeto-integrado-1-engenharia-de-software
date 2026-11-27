import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppNotification } from "../../../domain/entities/AppNotification";
import { INotificationRepository } from "../../../domain/repositories/INotificationRepository";
import {
  INativeNotificationPublisher,
  INotificationHost,
  NotificationService,
} from "../NotificationService";

class MemoryNotificationRepository implements INotificationRepository {
  records: AppNotification[] = [];

  async createIfAbsent(notification: AppNotification) {
    const existing = this.records.find((record) => record.id === notification.id);
    if (existing) return { created: false, notification: existing };
    this.records.push(notification);
    return { created: true, notification };
  }

  async findById(id: string) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async list(limit = 100) {
    return [...this.records]
      .filter((record) => record.deletedAt == null)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit);
  }

  async markRead(id: string, readAt: number) {
    const record = this.records.find((item) => item.id === id);
    if (!record) return false;
    record.readAt = readAt;
    return true;
  }

  async markAllRead(readAt: number) {
    this.records.forEach((record) => { record.readAt = readAt; });
  }

  async delete(id: string, deletedAt: number) {
    const record = this.records.find((item) => item.id === id);
    if (record) record.deletedAt = deletedAt;
  }

  async clear(deletedAt: number) {
    this.records.forEach((record) => { record.deletedAt = deletedAt; });
  }
}

class FakeNativePublisher implements INativeNotificationPublisher {
  available = true;
  shown: AppNotification[] = [];
  clickHandlers: Array<() => void> = [];
  failureHandlers: Array<(reason: string) => void> = [];

  show(
    notification: AppNotification,
    onClick: () => void,
    onFailure: (reason: string) => void
  ) {
    if (!this.available) return false;
    this.shown.push(notification);
    this.clickHandlers.push(onClick);
    this.failureHandlers.push(onFailure);
    return true;
  }
}

class FakeNotificationHost implements INotificationHost {
  focused = true;
  changeCount = 0;
  unavailableCount = 0;
  navigatedTargets: string[] = [];

  isAppFocused() {
    return this.focused;
  }
  broadcastChanged() {
    this.changeCount += 1;
  }
  broadcastNativeUnavailable() {
    this.unavailableCount += 1;
  }
  navigateTo(target: string) {
    this.navigatedTargets.push(target);
  }
}

function notification(id: string): AppNotification {
  return {
    id,
    category: "VISIT",
    title: "Lembrete de visita",
    message: "Visita agendada",
    target: "/visitas?visitId=visit-1",
    entityId: "visit-1",
    data: { visitId: "visit-1" },
    createdAt: 1000,
    readAt: null,
    deletedAt: null,
  };
}

describe("NotificationService", () => {
  let service: NotificationService | null = null;

  afterEach(async () => {
    if (service) await service.clear();
    service = null;
  });

  it("persiste uma única entrada para o mesmo id estável", async () => {
    const repository = new MemoryNotificationRepository();
    const publisher = new FakeNativePublisher();
    const host = new FakeNotificationHost();
    service = new NotificationService(repository, publisher, host, 60_000, () => 1000);

    const first = await service.publish(notification("visit:visit-1:reminder"));
    const repeated = await service.publish(notification("visit:visit-1:reminder"));

    assert.equal(first.created, true);
    assert.equal(repeated.created, false);
    assert.equal((await service.list()).length, 1);
    assert.equal(publisher.shown.length, 0);
    assert.equal(host.changeCount, 1);
  });

  it("exibe nativa somente quando o app não está em foco e abre o destino ao clicar", async () => {
    const repository = new MemoryNotificationRepository();
    const publisher = new FakeNativePublisher();
    const host = new FakeNotificationHost();
    host.focused = false;
    service = new NotificationService(repository, publisher, host, 60_000, () => 2000);

    await service.publish(notification("visit:visit-2:reminder"));
    assert.equal(publisher.shown.length, 1);
    publisher.clickHandlers[0]();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    assert.equal((await service.list())[0].readAt, 2000);
    assert.deepEqual(host.navigatedTargets, ["/visitas?visitId=visit-1"]);
  });

  it("mantém o item no histórico e avisa uma única vez quando nativa está indisponível", async () => {
    const repository = new MemoryNotificationRepository();
    const publisher = new FakeNativePublisher();
    publisher.available = false;
    const host = new FakeNotificationHost();
    host.focused = false;
    service = new NotificationService(repository, publisher, host, 60_000, () => 3000);

    await service.publish(notification("overdue:rent-1:08-2026"));
    await service.publish(notification("overdue:rent-2:08-2026"));

    assert.equal((await service.list()).length, 2);
    assert.equal(host.unavailableCount, 1);
  });

  it("mantém o item no sino quando o Windows rejeita a notificação", async () => {
    const repository = new MemoryNotificationRepository();
    const publisher = new FakeNativePublisher();
    const host = new FakeNotificationHost();
    host.focused = false;
    service = new NotificationService(repository, publisher, host);

    await service.publish(notification("denied-native"));
    publisher.failureHandlers[0]("Permissão de notificação negada");

    assert.equal((await service.list()).length, 1);
    assert.equal(host.unavailableCount, 1);
  });

  it("mantém corretamente a contagem de não lidas ao marcar, excluir e limpar", async () => {
    const repository = new MemoryNotificationRepository();
    const host = new FakeNotificationHost();
    service = new NotificationService(repository, new FakeNativePublisher(), host);

    await service.publish(notification("n-1"));
    await service.publish(notification("n-2"));
    assert.equal((await service.list()).filter((item) => item.readAt == null).length, 2);

    await service.markRead("n-1");
    assert.equal((await service.list()).filter((item) => item.readAt == null).length, 1);
    await service.markAllRead();
    assert.equal((await service.list()).filter((item) => item.readAt == null).length, 0);

    await service.delete("n-2");
    assert.equal((await service.list()).length, 1);
    assert.equal((await service.list()).filter((item) => item.readAt == null).length, 0);
    await service.clear();
    assert.equal((await service.list()).length, 0);
  });

  it("não recria nem reexibe um item removido quando o mesmo evento é repetido", async () => {
    const repository = new MemoryNotificationRepository();
    const publisher = new FakeNativePublisher();
    const host = new FakeNotificationHost();
    service = new NotificationService(repository, publisher, host);

    await service.publish(notification("stable-event"));
    await service.delete("stable-event");
    const duplicate = await service.publish(notification("stable-event"));

    assert.equal(duplicate.created, false);
    assert.equal((await service.list()).length, 0);
    assert.equal(publisher.shown.length, 0);
  });
});
