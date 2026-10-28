# HU11 — backend do cadastro de modelos

Implementado somente o item 1. Preenchimento automático e PDF ficam com o parceiro. Nenhuma tela foi alterada.

## HU11: cadastro de templates

A tabela `contract_templates` guarda ID, nome, conteúdo e datas de criação/atualização. Como a equipe ainda não forneceu os modelos, o sistema não insere nenhum texto jurídico automaticamente.

```js
const modelo = await window.api.contractTemplates.create({
  name: nomeDoModelo,
  content: textoAprovadoPelaEquipe,
});
const modelos = await window.api.contractTemplates.list();
const detalhe = await window.api.contractTemplates.get(modelo.id);
```

Nome e conteúdo não podem ser vazios. IDs e datas são gerados pelo backend. O conteúdo é preservado como recebido, incluindo quebras de linha e marcadores. Não há interpretação de marcadores nem substituição automática. A sintaxe de marcadores deverá ser definida com quem implementar o preenchimento. Modelos não ficam ligados a um imóvel ou locatário neste cadastro.

O parceiro fica responsável pelo preenchimento com dados do imóvel, proprietário e locatário e pela exportação em PDF. Nenhuma dependência de geração de PDF foi adicionada.


## Banco e testes

Migration: `0008_contract_templates`. O inicializador cria a tabela sem inserir textos jurídicos. Execute `npm test`, `npm run typecheck` e `npm run lint` em `locus-pi1`. A branch está integrada à develop com a HU08: o journal preserva as migrations 0007 e 0008, e o snapshot 0008 inclui as duas estruturas e referencia o snapshot 0007. A integração foi testada em bancos que já possuíam somente vistorias ou somente templates.
