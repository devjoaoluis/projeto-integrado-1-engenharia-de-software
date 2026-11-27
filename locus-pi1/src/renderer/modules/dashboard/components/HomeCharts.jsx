import React, { useMemo } from "react";
import { ChartNoAxesColumn, ChartPie, Home as HomeIcon } from "lucide-react";

function getDate(value) {
  if (!value) return null;
  const date = new Date(typeof value === "number" && value < 1_000_000_000_000 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function HomeCharts({ properties, contracts }) {
  const chartData = useMemo(() => {
    const available = properties.filter(
      (item) => String(item.status).toUpperCase() === "DISPONIVEL"
    ).length;
    const rented = properties.filter(
      (item) => String(item.status).toUpperCase() === "ALUGADO"
    ).length;
    const active = contracts.filter(
      (item) => String(item.status).toUpperCase() === "ACTIVE"
    ).length;
    const ended = contracts.filter(
      (item) => String(item.status).toUpperCase() === "ENDED"
    ).length;
    const cancelled = contracts.filter(
      (item) => String(item.status).toUpperCase() === "CANCELLED"
    ).length;
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        count: 0,
      };
    });

    contracts.forEach((contract) => {
      const date = getDate(contract.createdAt);
      if (!date) return;
      const month = months.find(
        (item) => item.key === `${date.getFullYear()}-${date.getMonth()}`
      );
      if (month) month.count += 1;
    });

    const propertyTotal = available + rented;
    const contractTotal = active + ended + cancelled;

    return {
      available,
      rented,
      propertyTotal,
      active,
      ended,
      cancelled,
      contractTotal,
      months,
      maxMonthlyCount: Math.max(...months.map((month) => month.count), 1),
      availablePercent: propertyTotal ? (available / propertyTotal) * 100 : 0,
      activePercent: contractTotal ? (active / contractTotal) * 100 : 0,
      endedPercent: contractTotal ? (ended / contractTotal) * 100 : 0,
      cancelledPercent: contractTotal ? (cancelled / contractTotal) * 100 : 0,
    };
  }, [properties, contracts]);

  return (
    <>
      <style>{`
        .home-graficos { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: var(--space-4); }
        .home-grafico { min-width: 0; padding: var(--space-4); background: var(--color-surface); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-md); }
        .home-grafico-largo { grid-column: 1 / -1; }
        .home-grafico-cabecalho { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); margin-bottom: 20px; }
        .home-grafico-cabecalho h3 { margin: 0; font-size: var(--font-body-md); color: var(--color-on-surface); }
        .home-grafico-cabecalho span { color: var(--color-on-surface-variant); font-size: var(--font-body-sm); }
        .home-donut-area { display: flex; align-items: center; justify-content: center; gap: var(--space-5); min-height: 190px; flex-wrap: wrap; }
        .home-donut { width: 150px; height: 150px; position: relative; flex-shrink: 0; border-radius: var(--radius-full); }
        .home-donut-centro { position: absolute; inset: 27px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-full); background: var(--color-surface); }
        .home-donut-centro strong { color: var(--color-on-surface); font-size: var(--font-headline-sm); }
        .home-donut-centro span { color: var(--color-on-surface-variant); font-size: var(--font-body-sm); }
        .home-legenda { display: flex; flex-direction: column; gap: var(--space-3); min-width: 140px; }
        .home-legenda-item { display: flex; align-items: center; gap: var(--space-2); color: var(--color-on-surface-variant); font-size: var(--font-body-md); }
        .home-legenda-cor { width: 11px; height: 11px; flex-shrink: 0; border-radius: var(--radius-xs); }
        .home-legenda-item strong { margin-left: auto; padding-left: 12px; color: var(--color-on-surface); }
        .home-barras { display: flex; flex-direction: column; gap: var(--space-4); }
        .home-barra-item { display: flex; flex-direction: column; gap: var(--space-2); }
        .home-barra-topo { display: flex; justify-content: space-between; color: var(--color-on-surface-variant); font-size: var(--font-body-md); }
        .home-barra-trilho { width: 100%; height: 10px; overflow: hidden; border-radius: var(--radius-md); background: var(--color-primary-container); }
        .home-barra-preenchimento { height: 100%; border-radius: var(--radius-md); transition: width .3s ease; }
        .home-grafico-colunas { display: flex; align-items: flex-end; justify-content: space-around; gap: var(--space-3); height: 205px; padding-top: 10px; border-bottom: 1px solid var(--color-outline-variant); }
        .home-coluna-item { display: flex; flex: 1; height: 100%; max-width: 85px; flex-direction: column; justify-content: flex-end; align-items: center; gap: var(--space-2); }
        .home-coluna-valor { color: var(--color-on-surface); font-size: var(--font-body-sm); font-weight: 600; }
        .home-coluna { width: 100%; max-width: var(--space-8); min-height: var(--space-1); border-radius: var(--radius-xs) var(--radius-xs) 0 0; background: var(--color-primary); }
        .home-coluna-mes { padding-bottom: 10px; color: var(--color-on-surface-variant); font-size: var(--font-body-sm); text-transform: capitalize; }
        .home-vazio { width: 100%; padding: var(--space-6) var(--space-2); color: var(--color-on-surface-variant); font-size: var(--font-body-md); text-align: center; }
        @media (max-width: 680px) { .home-grafico-largo { grid-column: auto; } }
      `}</style>

      <section className="home-graficos" aria-label="Análises da carteira">
        <article className="home-grafico">
          <div className="home-grafico-cabecalho">
            <h3><HomeIcon size={17} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 7 }} />Situação dos imóveis</h3>
            <span>{properties.length} imóveis</span>
          </div>
          {chartData.propertyTotal === 0 ? (
            <div className="home-vazio">Cadastre imóveis para acompanhar a ocupação.</div>
          ) : (
            <div className="home-donut-area">
              <div
                className="home-donut"
                role="img"
                aria-label={`${chartData.available} imóveis disponíveis e ${chartData.rented} alugados`}
                style={{
                  background: `conic-gradient(var(--color-primary) 0% ${chartData.availablePercent}%, var(--color-success) ${chartData.availablePercent}% 100%)`,
                }}
              >
                <div className="home-donut-centro">
                  <strong>{chartData.propertyTotal}</strong>
                  <span>Imóveis</span>
                </div>
              </div>
              <div className="home-legenda">
                <div className="home-legenda-item">
                  <span className="home-legenda-cor" style={{ background: "var(--color-primary)" }} />Disponíveis
                  <strong>{chartData.available}</strong>
                </div>
                <div className="home-legenda-item">
                  <span className="home-legenda-cor" style={{ background: "var(--color-success)" }} />Alugados
                  <strong>{chartData.rented}</strong>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="home-grafico">
          <div className="home-grafico-cabecalho">
            <h3><ChartPie size={17} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 7 }} />Situação dos contratos</h3>
            <span>{chartData.contractTotal} contratos</span>
          </div>
          {chartData.contractTotal === 0 ? (
            <div className="home-vazio">Os contratos registrados aparecerão nesta análise.</div>
          ) : (
            <div className="home-barras">
              {[
                ["Ativos", chartData.active, chartData.activePercent, "var(--color-primary)"],
                ["Encerrados", chartData.ended, chartData.endedPercent, "var(--color-success)"],
                ["Cancelados", chartData.cancelled, chartData.cancelledPercent, "var(--color-warning)"],
              ].map(([label, count, percent, color]) => (
                <div className="home-barra-item" key={label}>
                  <div className="home-barra-topo"><span>{label}</span><strong>{count}</strong></div>
                  <div className="home-barra-trilho">
                    <div className="home-barra-preenchimento" style={{ width: `${percent}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="home-grafico home-grafico-largo">
          <div className="home-grafico-cabecalho">
            <h3><ChartNoAxesColumn size={17} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 7 }} />Contratos criados por mês</h3>
            <span>Últimos 6 meses</span>
          </div>
          {chartData.months.every((month) => month.count === 0) ? (
            <div className="home-vazio">Nenhum contrato foi criado nos últimos seis meses.</div>
          ) : (
            <div className="home-grafico-colunas">
              {chartData.months.map((month) => (
                <div className="home-coluna-item" key={month.key}>
                  <span className="home-coluna-valor">{month.count}</span>
                  <div
                    className="home-coluna"
                    style={{ height: `${(month.count / chartData.maxMonthlyCount) * 140}px` }}
                    title={`${month.count} contratos`}
                  />
                  <span className="home-coluna-mes">{month.name}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default HomeCharts;
