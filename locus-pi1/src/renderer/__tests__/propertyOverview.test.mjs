import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adaptPropertyOverview, mediaFileUrl } from "../propertyOverview.mjs";
const empty = {
  property: { id: "complete-uuid", title: "Casa real", address: "Rua real", price: 1234.56, status: "ALUGADO" },
  media: [], contracts: { current: [], previous: [], scheduled: [] }, payments: [], inspections: [], maintenances: [],
};
describe("property overview presentation", () => {
  it("uses the selected property's real data without invented history", () => {
    const result = adaptPropertyOverview(empty);
    assert.equal(result.id, "complete-uuid");
    assert.equal(result.titulo, "Casa real");
    assert.equal(result.status, "Alugado");
    assert.equal(result.valor, 1234.56);
    assert.equal(result.foto, null);
    assert.deepEqual(result.contratos, []);
    assert.deepEqual(result.pagamentos, []);
    assert.deepEqual(result.vistorias, []);
  });
  it("preserves contract categories, references and tenant names", () => {
    const contract = { id: "contract", tenantId: "tenant", reference: "CTR-01", startDate: 0, endDate: null, monthlyRent: 1234.56, status: "ACTIVE" };
    const result = adaptPropertyOverview({ ...empty, contracts: { current: [contract], previous: [{ ...contract, id: "cancelled", status: "CANCELLED" }], scheduled: [{ ...contract, id: "future" }] } }, { tenant: "Ana" });
    assert.deepEqual(result.contratos.map(item => item.status), ["Vigente", "Cancelado", "Agendado"]);
    assert.equal(result.contratos[0].codigo, "CTR-01");
    assert.equal(result.contratos[0].locatario, "Ana");
    assert.equal(result.contratos[0].fim, "Sem data final");
  });
  it("uses actual paid amounts and orders inspections and maintenance together", () => {
    const result = adaptPropertyOverview({ ...empty,
      payments: [{ id: "payment", description: "Aluguel outubro", paidAt: 1000, amount: 99.5 }],
      inspections: [{ id: "same", inspectedAt: 1000, reportReference: "Laudo", description: "Entrada" }],
      maintenances: [{ id: "same", performedAt: 2000, cost: 25.5, status: "PENDING", description: "Pintura" }],
    });
    assert.equal(result.pagamentos[0].valor, 99.5);
    assert.deepEqual(result.vistorias.map(item => item.tipo), ["Manutenção", "Vistoria"]);
    assert.equal(result.vistorias[0].responsavel, "Pendente");
    assert.notEqual(result.vistorias[0].id, result.vistorias[1].id);
  });
  it("selects an image instead of using a video as a photo", () => {
    const result = adaptPropertyOverview({ ...empty, media: [{ type: "VIDEO", filePath: "/video.mp4" }, { type: "IMAGE", filePath: "/foto #1.jpg" }] });
    assert.equal(result.foto, "file:///foto%20%231.jpg");
  });
  it("handles Linux and Windows media paths and reserved characters", () => {
    assert.equal(mediaFileUrl("/tmp/casa%20 #1?.jpg"), "file:///tmp/casa%2520%20%231%3F.jpg");
    assert.equal(mediaFileUrl("C:\\Fotos\\casa 1.jpg"), "file:///C:/Fotos/casa%201.jpg");
  });
});
