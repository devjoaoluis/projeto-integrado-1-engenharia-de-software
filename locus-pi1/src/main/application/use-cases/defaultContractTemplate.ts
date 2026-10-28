export const DEFAULT_RENTAL_CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL

IDENTIFICAÇÃO DAS PARTES

LOCADOR(A) / PROPRIETÁRIO(A):
Nome: {{proprietario.nome}}
CPF/CNPJ: {{proprietario.cpf}}
Telefone: {{proprietario.telefone}}
E-mail: {{proprietario.email}}

LOCATÁRIO(A):
Nome: {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}
Telefone: {{locatario.telefone}}
E-mail: {{locatario.email}}

DO OBJETO DA LOCAÇÃO
O presente contrato tem por objeto a locação do imóvel residencial situado no seguinte endereço:
Endereço: {{imovel.endereco}}
Bairro: {{imovel.bairro}}
Tipo de Imóvel: {{imovel.tipo}}
Quartos: {{imovel.quartos}}
Descrição: {{imovel.descricao}}

DO VALOR DO ALUGUEL E CONDIÇÕES DE PAGAMENTO
O aluguel mensal é ajustado na quantia de {{aluguel.valor}}, a ser pago impreterivelmente até o dia {{aluguel.vencimento}} de cada mês subsequente ao vencido.
O imposto predial e territorial urbano (IPTU) estimado em {{imovel.iptu}} e demais taxas incidentes sobre o imóvel serão adimplidos conforme estabelecido entre as partes.

DO PRAZO DE VIGÊNCIA
O prazo de locação tem início em {{aluguel.inicio}} e término previsto em {{aluguel.fim}}.

DAS CONDIÇÕES E OBRIGAÇÕES
1. O(A) LOCATÁRIO(A) declara que vistoriou o imóvel e o recebeu em perfeito estado de conservação, limpeza e funcionamento de suas instalações, comprometendo-se a restituí-lo nas mesmas condições ao término da locação.
2. O imóvel destina-se exclusivamente a fins residenciais, sendo vedada a alteração de sua destinação sem prévio e expresso consentimento por escrito do(a) LOCADOR(A).
3. Todas as despesas com energia elétrica, água, esgoto, gás, condomínio e demais utilidades consumidas no imóvel correrão por conta exclusiva do(a) LOCATÁRIO(A).

DO FORO
Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca da situação do imóvel, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, firmam o presente instrumento em vias de igual teor e forma, na presença de duas testemunhas idôneas.

Data de emissão: {{data_atual}}


________________________________________________________
LOCADOR(A): {{proprietario.nome}}
CPF/CNPJ: {{proprietario.cpf}}


________________________________________________________
LOCATÁRIO(A): {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}


________________________________________________________
TESTEMUNHA 1:
Nome:
CPF:


________________________________________________________
TESTEMUNHA 2:
Nome:
CPF:
`;
