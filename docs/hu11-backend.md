# HU11 — Geração de Contratos (RF13)

Implementação completa da HU11 (Itens 1, 2 e 3): Cadastro de modelos, preenchimento automático com dados do imóvel, proprietário e locatário associado, e exportação em PDF para assinatura.

## 1. Cadastro de templates (modelos)

A tabela `contract_templates` guarda ID, nome, conteúdo e datas de criação/atualização.

```js
const modelo = await window.api.contractTemplates.create({
  name: nomeDoModelo,
  content: textoAprovadoPelaEquipe,
});
const modelos = await window.api.contractTemplates.list();
const detalhe = await window.api.contractTemplates.get(modelo.id);
```

## 2. Preenchimento automático (Item 2)

O caso de uso `AssembleContractData` e `FillContractTemplate` realizam a substituição automática dos marcadores no contrato com base no imóvel selecionado, no locatário associado e no proprietário cadastrado.

API exposta no Preload (`window.api.contracts`):

```js
// Monta dados do imóvel, proprietário, locatário associado e preenche o modelo
const dados = await window.api.contracts.assembleData({
  propertyId: imovel.id,
  tenantId: locatarioId, // opcional, detectado automaticamente da locação ativa se omitido
  templateId: modeloId,  // opcional, usa modelo padrão do sistema se omitido
  customTemplateContent: textoCustomizado, // opcional
});

// Preenchimento direto de template arbitrário
const resultado = await window.api.contracts.fillTemplate({
  templateContent: texto,
  property: dadosImovel,
  owner: dadosProprietario,
  tenant: dadosLocatario,
  rental: dadosLocacao,
});
```

### Marcadores suportados:
- **Imóvel:** `{{imovel.endereco}}`, `{{imovel.bairro}}`, `{{imovel.tipo}}`, `{{imovel.quartos}}`, `{{imovel.valor}}`, `{{imovel.iptu}}`, `{{imovel.descricao}}`
- **Proprietário / Locador:** `{{proprietario.nome}}`, `{{proprietario.cpf}}`, `{{proprietario.telefone}}`, `{{proprietario.email}}`
- **Locatário:** `{{locatario.nome}}`, `{{locatario.cpf}}`, `{{locatario.telefone}}`, `{{locatario.email}}`
- **Locação:** `{{aluguel.valor}}`, `{{aluguel.vencimento}}`, `{{aluguel.inicio}}`, `{{aluguel.fim}}`
- **Data e Assinaturas:** `{{data_atual}}`, `{{dia}}`, `{{mes}}`, `{{ano}}`

Suporta variações em snake_case (ex: `{{imovel_endereco}}`) e espaços internos (ex: `{{ locatario.nome }}`). Formatação automática de moeda (BRL), CPF/CNPJ, telefone e datas.

## 3. Exportação em PDF para Assinatura (Item 3)

Gera documento PDF formatado em padrão A4 com paginação automática, quebra de linha ajustada a margens e linhas de assinatura para Locador, Locatário e Testemunhas.

```js
// Abre diálogo nativo do sistema operacional (dialog.showSaveDialog) e salva o PDF
const exportResult = await window.api.contracts.exportPdf({
  content: textoContratoPreenchido,
  title: "CONTRATO DE LOCAÇÃO RESIDENCIAL",
  defaultFileName: "Contrato_Locacao.pdf",
});
// Retorna { success: true, filePath: "..." } ou { success: false, canceled: true }
```

## 4. Telas Integradas

1. **Tela de Contratos (`/contratos`):**
   - Aba **Gerar Contrato**: Seleção do imóvel, detecção e seleção do locatário associado, seleção do modelo (padrão ou cadastrados), pré-visualização em tempo real do contrato preenchido e botão para exportação em PDF.
   - Aba **Modelos de Contrato**: Listagem dos modelos salvos e cadastro de novos modelos com assistente de inserção de tags.
2. **Tela de Visão Geral do Imóvel (`/imoveis/:id`):**
   - Botão **"Gerar Contrato em PDF"** na seção de locatário associado e na aba "Contratos", permitindo geração direta a partir do imóvel.

## Testes e Validação

Execute no diretório `locus-pi1`:
- `npm test`: executa todos os 87 testes automatizados (incluindo testes de preenchimento, geração de PDF, agregação com banco e IPC).
- `npm run typecheck`: validação estrita de tipos TypeScript (0 erros).
- `npm run lint`: conformidade de código ESLint (0 erros).
