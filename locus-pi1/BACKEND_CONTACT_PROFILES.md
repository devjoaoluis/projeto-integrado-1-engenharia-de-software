# HU-02 — Fichas de clientes, proprietários e fiadores

Complemento somente de backend. O CRUD de clientes já existia; proprietários, fiadores e o vínculo cliente-fiador foram adicionados. O formulário de cadastro, edição e consulta continua pendente no frontend.

## API

`window.api.owners` e `window.api.guarantors` oferecem:

- `create({ name, cpfCnpj, phone, email? })`;
- `get(id)`;
- `list()`;
- `update({ id, name?, cpfCnpj?, phone?, email? })`;
- `delete(id)`.

As fichas de clientes e proprietários são independentes: uma mesma pessoa pode aparecer em ambas e editar uma não altera a outra. Cada tabela proíbe duplicação de CPF/CNPJ dentro do seu próprio cadastro.

`window.api.clients` mantém a API existente, com estas extensões:

- `create({ name, cpfCnpj, phone, email?, type?, guarantorId? })`;
- `update({ id, name?, cpfCnpj?, phone?, email?, type?, guarantorId? })`;
- `profile(id)` retorna `{ client, guarantor }` para exibir a ficha com o fiador completo.

`type` aceita TENANT (locatário) e INTERESTED (interessado). O padrão é INTERESTED. `guarantorId` é opcional; null remove o vínculo em uma edição. Um fiador deve estar cadastrado antes de ser vinculado. Mais de um cliente pode compartilhar um fiador. A exclusão de um fiador referenciado é bloqueada pelo banco; remova o vínculo antes de excluir.

`email: null` limpa o e-mail. Campos omitidos na edição preservam os valores existentes. `id`, `createdAt` e `updatedAt` são controlados no backend.

## Validação e banco

Nome, CPF/CNPJ e telefone são obrigatórios. Documentos devem ter 11 ou 14 dígitos e podem ser recebidos com pontuação; são armazenados apenas com dígitos. Isso evita duplicações por diferenças de formatação. A validação verifica formato e comprimento, sem verificar dígitos de controle ou consultar serviços externos.

A migração `0005_add_contact_profiles.sql` cria owners e guarantors e adiciona type e guarantor_id a clients. Os clientes existentes preservam IDs, dados e vínculos; o documento passa a usar o formato sem pontuação. Cadastros antigos recebem INTERESTED e fiador null, pois o modelo anterior não informava esses campos. A inicialização também aplica a atualização de forma idempotente.

Não foi adicionado vínculo entre proprietário e imóvel: esta HU trata das fichas independentes.

## Testes

A partir de locus-pi1:

```bash
npx tsc --noEmit
npx tsc --module commonjs --moduleResolution node --outDir /tmp/locus-tests --sourceMap false
NODE_PATH="$PWD/node_modules" node /tmp/locus-tests/src/main/infrastructure/repositories/__tests__/ContactProfiles.test.js
```

Os testes usam SQLite em memória e verificam CRUD, independência das fichas, vínculo e consulta do fiador, exclusão protegida, formato e duplicações de documentos, alterações inválidas, concorrência e preservação de cadastros existentes.

## Branch

A branch feat/hu-02-fichas-clientes-proprietarios contém a base das HU-06 e HU-05 já enviadas, para manter a sequência das migrações. Integre os PRs anteriores em develop antes desta tarefa, ou use a branch da HU-05 como base temporária para revisar apenas o complemento de contatos.
