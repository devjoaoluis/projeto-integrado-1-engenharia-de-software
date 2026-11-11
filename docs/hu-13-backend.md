# HU-13: Dossiê de Documentos do Locatário

> Contexto para o agente. Leia tudo antes de escrever código e siga os padrões já existentes no repositório.

## Stack

Electron (main + preload + renderer), SQLite (better-sqlite3), Drizzle ORM, TypeScript.

## História de usuário

Como corretor, quero fazer o upload, visualizar e baixar documentos específicos de um locatário cadastrado (RG, CPF, comprovantes de renda, antecedentes e contratos), para ter um dossiê digital completo e centralizado na ficha da pessoa.

- **Prioridade:** alta

## Checklist da HU

- [x] Criar tabela/modelo no banco de dados para anexos vinculados ao ID do locatário. **(já feito: inspecione o schema atual e reutilize, ajustando só o necessário via migration)**
- [ ] Criar área de upload na tela de perfil do locatário (aceitando PDF, JPG e PNG).
- [ ] Fazer uma lista/tabela onde seja possível ver o nome do arquivo, a data de envio e um botão para baixar.
- [ ] (Opcional) Permitir categorizar o documento (ex.: "Identificação", "Comprovante de Renda", "Contrato").

## Escopo desta tarefa: SOMENTE BACKEND

**Dentro do escopo:** schema/migration, armazenamento de arquivos, serviço, validação, handlers IPC, exposição no preload (se for o padrão do projeto), tipos compartilhados e testes.

**Fora do escopo:** componentes, páginas, hooks e estilos do renderer. Não altere o frontend. O backend deve entregar um contrato IPC claro e documentado para a UI consumir depois.

## Requisitos funcionais

1. **Upload:** receber o arquivo de um locatário existente e salvá-lo. Aceitar apenas **PDF, JPG/JPEG e PNG**.
2. **Listagem:** retornar os documentos de um locatário com `id`, nome original, categoria, tamanho, tipo e data de envio. Ordenar por data de envio decrescente (desempate por `id`).
3. **Visualizar:** permitir que o renderer obtenha o conteúdo de um documento (bytes + `mimeType`) a partir do `id`, para pré-visualização de imagem/PDF.
4. **Baixar:** a partir do `id`, abrir o diálogo nativo de salvar (`dialog.showSaveDialog`) sugerindo o nome original e copiar o arquivo para o destino escolhido. Tratar o cancelamento sem erro.
5. **Categoria (opcional):** enum `identificacao | comprovante_renda | antecedentes | contrato | outros`, com `outros` como padrão. Pode ser informada no upload e alterada depois.

## Armazenamento

- Os **arquivos ficam no disco**, em `app.getPath('userData')/documentos/<locatarioId>/<uuid>.<ext>`. O **banco guarda apenas os metadados** (nunca o binário em BLOB).
- Guardar o nome original só para exibição. O nome no disco é sempre gerado pelo sistema (UUID + extensão validada).
- O diretório é criado sob demanda.

## Modelo de dados (Drizzle)

Reaproveite a tabela já criada. Ela deve conter, no mínimo:

| Coluna | Observação |
| --- | --- |
| `id` | PK |
| `locatarioId` | FK para locatário, `onDelete: cascade`, com índice |
| `nomeOriginal` | nome exibido na UI |
| `caminhoArquivo` | caminho relativo a `documentos/` (não absoluto) |
| `mimeType` | `application/pdf`, `image/jpeg`, `image/png` |
| `tamanhoBytes` | inteiro |
| `categoria` | enum, padrão `outros` |
| `criadoEm` | timestamp de envio |

Se faltar alguma coluna, crie a migration Drizzle correspondente. Se a tabela atual já tiver nomes diferentes, **mantenha os existentes** e liste a diferença no resumo final.

## Validação e segurança

- Validar o tipo por **três camadas**: extensão, `mimeType` e **magic bytes** do conteúdo (`%PDF`, `FF D8 FF`, `89 50 4E 47`). Rejeitar se qualquer uma divergir.
- Limite de tamanho: **10 MB** por arquivo (constante configurável). Rejeitar arquivo vazio.
- Sanitizar `nomeOriginal` (remover separadores de caminho e caracteres de controle) e limitar o comprimento.
- O renderer **nunca envia caminhos de disco**: leitura e download usam apenas o `id` do documento. Resolver o caminho no main e garantir que ele permaneça dentro da pasta `documentos/` (proteção contra path traversal).
- Confirmar que o `locatarioId` existe antes de gravar.
- Validar as entradas dos handlers com Zod (ou a lib já usada). Erros devem retornar um resultado tipado e com mensagem clara em português, sem expor caminhos internos.

## Consistência

- Gravar o arquivo e inserir o registro de forma que **não fique lixo**: se o insert falhar, remover o arquivo gravado; se a gravação falhar, não inserir nada.
- Se o arquivo de um registro não existir mais no disco, listagem continua funcionando e `obter/baixar` retornam erro claro (`ARQUIVO_NAO_ENCONTRADO`).

## Contrato IPC (siga o padrão de nomes dos canais existentes)

| Canal | Entrada | Saída |
| --- | --- | --- |
| `documentos:upload` | `{ locatarioId, nomeArquivo, conteudo: Uint8Array, categoria? }` | documento criado (metadados) |
| `documentos:listar` | `{ locatarioId }` | lista de documentos (metadados) |
| `documentos:obter` | `{ id }` | `{ mimeType, nomeOriginal, conteudo: Uint8Array }` |
| `documentos:baixar` | `{ id }` | `{ salvo: boolean, destino?: string }` |
| `documentos:atualizar-categoria` | `{ id, categoria }` | documento atualizado (só se implementar o item opcional) |

Exporte os tipos de entrada e saída em local compartilhável para o renderer usar depois.

## Testes

Com o framework já usado no projeto (ou Vitest), SQLite em memória e diretório temporário para os arquivos:

- upload válido de PDF, JPG e PNG
- rejeição de extensão inválida, magic bytes divergentes, arquivo vazio e arquivo acima do limite
- rejeição de `locatarioId` inexistente
- listagem ordenada e isolada por locatário
- `obter` e `baixar` por `id`, incluindo `id` inexistente e arquivo ausente no disco
- limpeza do arquivo quando o insert falha
- tentativa de path traversal no nome do arquivo
- exclusão em cascata do locatário (comportamento definido e testado)

## Restrições gerais

- Código **conciso e minimalista**: sem abstrações desnecessárias, sem comentários óbvios, sem dependências novas (justifique se for indispensável).
- Não quebre funcionalidades existentes. Rode testes, typecheck e lint antes de finalizar.
- Não implemente exclusão de documentos, pois não faz parte desta HU.
- Se algo estiver ambíguo (nomes de colunas, entidade de locatário, padrão dos canais), inspecione o código e assuma o mais coerente com o existente, **listando as suposições no resumo**, em vez de parar para perguntar.

## Entrega esperada

Ao finalizar, apresente um resumo curto com:

1. arquivos criados e alterados
2. migrations geradas
3. contrato IPC final com exemplo de entrada e saída
4. suposições feitas
5. resultado dos testes
