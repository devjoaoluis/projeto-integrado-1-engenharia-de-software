# HU08 — Módulo de Vistorias e Regra de Negócio RN03

Implementação completa da HU08: vistorias de entrada e saída com upload seguro de fotos e vídeos, e aplicação obrigatória da regra de negócio **RN03** nos dois momentos exigidos.

## 1. Módulo de Vistorias e Registro de Saída

A tabela `property_inspections` recebe registros dos tipos `ENTRY` (vistoria de entrada) e `EXIT` (vistoria de saída), vinculados ao imóvel (`property_id`) e ao contrato (`contract_id`).

A tabela `inspection_media` guarda os metadados dos anexos (fotos e vídeos). Os arquivos físicos são copiados com segurança para o diretório `media/inspections/<inspectionId>` do Electron. Os arquivos originais do usuário são preservados. Em caso de falha durante a cópia ou gravação no banco, é executado rollback completo com limpeza de eventuais cópias parciais.

### API exposta no preload (`window.api.inspections`)

```js
// 1. Registro de Vistoria de Saída (novo)
const vistoriaSaida = await window.api.inspections.recordExit({
  propertyId: imovel.id,
  contractId: contrato.id,
  inspectedAt: Date.now(),
  description: "Descrição do estado observado no término da locação",
  reportReference: "LAUDO-SAIDA-2026/01", // opcional
  sourceFilePaths: arquivos.map(arquivo => window.api.getPathForFile(arquivo)),
});

// 2. Registro de Vistoria de Entrada
const vistoriaEntrada = await window.api.inspections.recordEntry({
  propertyId: imovel.id,
  contractId: contrato.id,
  inspectedAt: Date.now(),
  description: "Descrição do estado observado na entrega das chaves",
  reportReference: "LAUDO-ENTRADA-2026/01", // opcional
  sourceFilePaths: arquivos.map(arquivo => window.api.getPathForFile(arquivo)),
});

// 3. Consulta de detalhes e mídias
const detalhe = await window.api.inspections.get(vistoria.id); // inclui media[]

// 4. Listagem com filtros
const porImovel = await window.api.inspections.list({ propertyId: imovel.id });
const porContrato = await window.api.inspections.list({ contractId: contrato.id });
```

### Validações do registro de saída e entrada

- Imóvel e contrato devem existir e pertencer um ao outro; contratos cancelados são rejeitados.
- Data da vistoria deve ser válida e não pode estar no futuro.
- A descrição das condições do imóvel não pode ser vazia.
- Formatos aceitos por extensão:
  - Fotos: JPG, JPEG, PNG, WEBP
  - Vídeos: MP4, MKV, WEBM
- Validação prévia de todos os arquivos antes de qualquer operação de cópia.

---

## 2. Aplicação da Regra de Negócio RN03

A **RN03** define que a realização da vistoria é obrigatória em dois momentos:

1. **Momento 1 — Entrada do Locatário (`ReleaseRentalKeys`)**:
   - É obrigatório haver uma vistoria de entrada (`type: "ENTRY"`) registrada para o contrato/imóvel antes que as chaves possam ser entregues (`rentals:release-keys`).
   - Se nenhuma vistoria de entrada for encontrada, a operação lança erro:
     `"RN03: A vistoria de entrada é obrigatória para a entrega das chaves."`

2. **Momento 2 — Saída do Locatário (`CancelRental`)**:
   - Se as chaves do imóvel foram entregues (`keysReleasedAt !== null`), o encerramento da locação (`rentals:cancel`) exige obrigatoriamente a existência de uma vistoria de saída (`type: "EXIT"`).
   - Se nenhuma vistoria de saída for encontrada, a operação lança erro:
     `"RN03: A vistoria de saída é obrigatória para o encerramento da locação."`
   - Caso as chaves nunca tenham sido entregues (cancelamento prévio à posse), a vistoria de saída não é exigida.

---

## 3. Interface de Usuário (Renderer)

- **Tela de Vistorias (`Vistorias.jsx`)**:
  - Disponível na rota `/vistorias` e na barra lateral de navegação.
  - Permite alternar entre "Registrar Nova Vistoria" e "Consultar Histórico e Mídias".
  - Formulário completo para vistorias de Entrada ou Saída com seletor interativo, campos de laudo/descrição e área de drag & drop / upload múltiplo de fotos e vídeos com pré-visualização.
  - Modal de consulta detalhada com visualização das imagens e vídeos anexados.
  - Suporte a parâmetros de URL (`?imovelId=...&tipo=EXIT`) para carregamento direto a partir de outras telas.

- **Integração na Visão Geral do Imóvel (`VisaoGeralImovel.jsx`)**:
  - Na aba "Vistorias & Manutenções", botões de atalho para "+ Vistoria de Entrada" e "+ Vistoria de Saída", além de botão "Ver Mídias" em cada vistoria listada.
  - No card de locatário associado, botão rápido "Vistoria de Saída (RN03)".
  - No modal de confirmação de desassociação do locatário, aviso explícito da RN03 orientando sobre a obrigatoriedade da vistoria de saída antes do encerramento caso as chaves tenham sido entregues.

---

## 4. Testes e Qualidade

- Testes de unidade e persistência em `src/main/infrastructure/repositories/__tests__/ExitInspection.test.ts`:
  - Registro de vistoria de saída com cópia e persistência de fotos e vídeos.
  - Listagem e busca de vistorias de saída.
  - Validações de imóvel, contrato, datas e tipos de arquivo.
  - Rollback e limpeza de arquivos em falhas de gravação ou cópia.
  - Validação da RN03 no momento de entrada (`ReleaseRentalKeys`).
  - Validação da RN03 no momento de saída (`CancelRental`).
  - Registro isolado do handler IPC `inspections:record-exit`.
- Todos os 97 testes do projeto passam com sucesso (`npm test`).
- Typecheck (`npm run typecheck`) e lint (`npm run lint`) sem erros.
