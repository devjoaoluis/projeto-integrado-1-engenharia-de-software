# HU08 — backend do módulo e vistoria de entrada

Implementado nesta entrega: HU08 itens 1 e 2. O aplicativo continua sendo iniciado por `npm start` em `locus-pi1`. Nenhuma tela foi criada ou alterada.

## HU08: módulo e registro de entrada

A tabela `property_inspections`, já usada pelo histórico da HU05, recebeu `contract_id` e `inspection_type`. Registros antigos continuam válidos com esses campos nulos; não são convertidos artificialmente em vistorias de entrada. Vistorias novas deste módulo têm imóvel, contrato e tipo. O banco verifica se o contrato pertence ao mesmo imóvel.

A tabela `inspection_media` guarda os metadados dos anexos. Os arquivos são copiados para `media/inspections/<inspectionId>` dentro do diretório de dados do Electron, separados das mídias de divulgação dos imóveis. Os originais são preservados. Os bytes das fotos e vídeos não são carregados integralmente em memória pelo caso de uso.

API exposta no preload:

```js
const vistoria = await window.api.inspections.recordEntry({
  propertyId: imovel.id,
  contractId: contrato.id,
  inspectedAt: Date.now(),
  description: "Descrição do estado observado no imóvel",
  reportReference: null, // opcional
  sourceFilePaths: arquivos.map(arquivo => window.api.getPathForFile(arquivo)),
});

const detalhe = await window.api.inspections.get(vistoria.id); // inclui media[]
const porImovel = await window.api.inspections.list({ propertyId: imovel.id });
const porContrato = await window.api.inspections.list({ contractId: contrato.id });
```

`contractId` é o ID de `property_contracts`, retornado em `properties.overview`. Não é o ID da associação em `rentals`. A consulta exige um filtro: imóvel ou contrato. As listagens retornam registros e metadados; `get` também retorna os anexos.

Validações do registro de entrada:

- Imóvel e contrato devem existir e pertencer um ao outro; contrato cancelado não é aceito.
- Data deve ser um timestamp válido e não pode estar no futuro; descrição não pode ser vazia.
- Formatos por extensão: JPG/JPEG, PNG, WEBP, MP4, MKV e WEBM. O arquivo deve existir, ser regular e não estar vazio. Isso não certifica conteúdo, codecs ou reprodução de todos os formatos no Electron.
- Todos os arquivos são verificados antes da cópia. Registro da vistoria e metadados são gravados em uma transação. Se uma cópia ou gravação falhar, as cópias são removidas; eventual falha de limpeza é registrada no log.
- `sourceFilePaths` é opcional e aceita uma lista vazia: esta entrega não implementa a obrigatoriedade da RN03.

O histórico da HU05 continua recebendo as novas vistorias pelo fluxo existente. A interface atual de histórico não ganhou uma galeria de anexos de vistoria; a consulta detalhada está disponível ao frontend pela API acima.

O esquema admite tipos `ENTRY` e `EXIT` para o módulo compartilhado. Apenas `recordEntry` está implementado e exposto. O parceiro fica responsável pelo registro de saída e pela RN03; as regras de associação, chaves e encerramento da locação não foram alteradas nesta entrega.


## Banco e testes

Migration: `0007_inspection_module`. O inicializador atualiza bancos antigos sem apagar as vistorias existentes. Execute `npm test`, `npm run typecheck` e `npm run lint` em `locus-pi1`.
