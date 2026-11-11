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

export const RESIDENTIAL_GUARANTOR_CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL COM GARANTIA FIDEJUSSÓRIA (FIADOR)

IDENTIFICAÇÃO DAS PARTES CONTRATANTES

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

FIADOR(A) E PRINCIPAL PAGADOR(A):
Nome: {{fiador.nome}}
CPF/CNPJ: {{fiador.cpf}}
Telefone: {{fiador.telefone}}
E-mail: {{fiador.email}}

DO OBJETO DA LOCAÇÃO
O presente contrato tem por objeto a locação residencial do imóvel situado em:
Endereço: {{imovel.endereco}}
Bairro: {{imovel.bairro}}
Tipo de Imóvel: {{imovel.tipo}}
Quartos: {{imovel.quartos}}
Descrição: {{imovel.descricao}}

DO VALOR DO ALUGUEL, ENCARGOS E PAGAMENTO
1. O valor do aluguel mensal convencionado é de {{aluguel.valor}}, com vencimento todo dia {{aluguel.vencimento}} de cada mês subsequente ao vencido.
2. O imposto predial e territorial urbano (IPTU) no valor estimado de {{imovel.iptu}} e as taxas condominiais constituem encargos da locação devidos pelo(a) LOCATÁRIO(A).

DO PRAZO DE VIGÊNCIA
A locação tem início em {{aluguel.inicio}} e término previsto em {{aluguel.fim}}, vigorando pelo prazo estipulado entre as partes nos termos da Lei nº 8.245/1991.

DA GARANTIA FIDEJUSSÓRIA (FIANÇA)
1. O(A) FIADOR(A) comparece ao presente instrumento e declara-se solidariamente responsável com o(a) LOCATÁRIO(A) por todas as obrigações financeiras e contratuais aqui pactuadas, abrangendo aluguel, encargos, impostos, tarifas de serviços públicos, eventuais multas e indenizações por avarias.
2. O(A) FIADOR(A) renuncia de forma expressa ao benefício de ordem previsto no artigo 827 do Código Civil Brasileiro, respondendo como principal pagador(a) em conjunto ou separadamente com o(a) LOCATÁRIO(A).
3. A responsabilidade fidejussória do(a) FIADOR(A) subsistirá integralmente até a efetiva e formal restituição das chaves do imóvel e quitação total de quaisquer pendências após a realização da vistoria de saída.

DAS OBRIGAÇÕES E DA RESTITUIÇÃO DO IMÓVEL
1. O imóvel destina-se exclusivamente a uso residencial familiar do(a) LOCATÁRIO(A), sendo proibida a sublocação sem consentimento prévio documentado.
2. O(A) LOCATÁRIO(A) obriga-se a manter o imóvel em perfeitas condições de habitabilidade, conservação e limpeza, restituindo-o nas mesmas condições registradas no laudo de vistoria de entrada.

DO FORO
As partes elegem o foro da comarca de localização do imóvel para dirimir dúvidas ou controvérsias decorrentes deste contrato, renunciando a qualquer outro por mais privilegiado que seja.

E, por estarem plenamente ajustados e acordados, firmam o presente contrato na presença de duas testemunhas.

Data de emissão: {{data_atual}}


________________________________________________________
LOCADOR(A): {{proprietario.nome}}
CPF/CNPJ: {{proprietario.cpf}}


________________________________________________________
LOCATÁRIO(A): {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}


________________________________________________________
FIADOR(A): {{fiador.nome}}
CPF/CNPJ: {{fiador.cpf}}


________________________________________________________
TESTEMUNHA 1:
Nome:
CPF:


________________________________________________________
TESTEMUNHA 2:
Nome:
CPF:
`;

export const COMMERCIAL_CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO DE IMÓVEL NÃO RESIDENCIAL (COMERCIAL)

IDENTIFICAÇÃO DAS PARTES CONTRATANTES

LOCADOR(A):
Nome / Razão Social: {{proprietario.nome}}
CPF / CNPJ: {{proprietario.cpf}}
Telefone: {{proprietario.telefone}}
E-mail: {{proprietario.email}}

LOCATÁRIO(A):
Nome / Razão Social: {{locatario.nome}}
CPF / CNPJ: {{locatario.cpf}}
Telefone: {{locatario.telefone}}
E-mail: {{locatario.email}}

DO OBJETO E DESTINAÇÃO COMERCIAL
1. O presente instrumento tem por objeto a locação para fins exclusivamente comerciais do imóvel situado em:
Endereço: {{imovel.endereco}}
Bairro: {{imovel.bairro}}
Tipo de Imóvel: {{imovel.tipo}}
Descrição: {{imovel.descricao}}
2. O imóvel destina-se exclusivamente ao exercício de atividades econômicas, industriais ou comerciais lícitas do(a) LOCATÁRIO(A), sendo vedada a mudança de destinação sem expressa anuência por escrito do(a) LOCADOR(A).
3. O(A) LOCATÁRIO(A) responsabiliza-se com exclusividade pela obtenção e regularização de todos os alvarás de funcionamento, licenças sanitárias, ambientais e vistorias do Corpo de Bombeiros pertinentes à sua atividade profissional.

DO VALOR DO ALUGUEL, REAJUSTE E TRIBUTOS
1. O aluguel mensal é ajustado na quantia de {{aluguel.valor}}, a ser quitado impreterivelmente até o dia {{aluguel.vencimento}} de cada mês subsequente ao vencido.
2. O IPTU estimado em {{imovel.iptu}}, tarifas de consumo (energia elétrica, água, esgoto, telecomunicações) e eventuais rateios condominiais correrão sob total encargo do(a) LOCATÁRIO(A).
3. O valor do aluguel será reajustado anualmente com base na variação acumulada do índice oficial de inflação (IPCA ou IGP-M), ou na menor periodicidade permitida em lei.

DO PRAZO CONTRATUAL E RENOVAÇÃO
A presente locação não residencial terá início em {{aluguel.inicio}} e término previsto em {{aluguel.fim}}, regendo-se pelos preceitos da Lei nº 8.245/1991 (artigos 51 a 57).

DAS BENFEITORIAS E CONSERVAÇÃO
Quaisquer reformas, benfeitorias ou modificações na estrutura física do imóvel dependem de autorização prévia por escrito do(a) LOCADOR(A). Benfeitorias úteis ou necessárias não gerarão direito a retenção ou indenização, salvo estipulação em contrário.

DO FORO
Para dirimir qualquer questão oriunda deste contrato, as partes elegem expressamente o foro da comarca da localização do imóvel, com renúncia irrevogável a qualquer outro foro.

E, por estarem de pleno acordo com todas as cláusulas e condições, assinam este contrato na presença de duas testemunhas.

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

export const SEASONAL_CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO DE IMÓVEL POR TEMPORADA
(Artigos 48 a 50 da Lei Federal nº 8.245/1991)

IDENTIFICAÇÃO DAS PARTES CONTRATANTES

LOCADOR(A):
Nome: {{proprietario.nome}}
CPF/CNPJ: {{proprietario.cpf}}
Telefone: {{proprietario.telefone}}
E-mail: {{proprietario.email}}

LOCATÁRIO(A):
Nome: {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}
Telefone: {{locatario.telefone}}
E-mail: {{locatario.email}}

DO OBJETO E DESCRIÇÃO DO IMÓVEL
1. O presente contrato tem por objeto a locação para temporada do imóvel residencial situado em:
Endereço: {{imovel.endereco}}
Bairro: {{imovel.bairro}}
Tipo de Imóvel: {{imovel.tipo}}
Quartos: {{imovel.quartos}}
Descrição e Bens: {{imovel.descricao}}
2. A locação destina-se estritamente para residência temporária, repouso, lazer ou realização de cursos, vedada qualquer outra finalidade.
3. O imóvel é entregue guarnecido de móveis, eletrodomésticos e utensílios conforme laudo e inventário de vistoria anexo, devendo ser integralmente restituído nas mesmas condições de funcionamento e limpeza.

DO PRAZO DETERMINADO
A locação por temporada é pactuada por prazo certo e improrrogável, com data de início em {{aluguel.inicio}} e término impreterível em {{aluguel.fim}}, não excedendo o limite legal de 90 (noventa) dias estabelecido pelo art. 48 da Lei nº 8.245/91.

DO VALOR DA LOCAÇÃO E FORMA DE PAGAMENTO
1. O valor total ajustado para o período de temporada é de {{aluguel.valor}}, a ser pago conforme acordado entre as partes até o dia {{aluguel.vencimento}}.
2. Conforme faculta o artigo 49 da Lei nº 8.245/91, na locação para temporada é permitida a cobrança antecipada do valor integral ou parcelado dos aluguéis e encargos.
3. Os valores de IPTU (estimado em {{imovel.iptu}}), condomínio e taxas de consumo encontram-se incluídos no montante ajustado, salvo estipulação complementar.

DA RESTITUIÇÃO DAS CHAVES E PENALIDADES
O(A) LOCATÁRIO(A) compromete-se a desocupar o imóvel na data final prevista neste contrato, sob pena de pagamento de diária suplementar acrescida de multa por infração contratual, sem prejuízo da imediata retomada do imóvel conforme prevê a legislação.

DO FORO
As partes elegem o foro da comarca da situação do imóvel para quaisquer ações oriundas deste contrato.

E, por estarem em perfeito acordo com todas as cláusulas, firmam o presente instrumento na presença de duas testemunhas.

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

export interface BuiltinContractTemplate {
  id: string;
  name: string;
  category: "RESIDENCIAL" | "RESIDENCIAL_FIADOR" | "COMERCIAL" | "TEMPORADA";
  description: string;
  content: string;
}

export const BUILTIN_CONTRACT_TEMPLATES: BuiltinContractTemplate[] = [
  {
    id: "builtin-residencial-padrao",
    name: "Contrato de Locação Residencial (Padrão)",
    category: "RESIDENCIAL",
    description: "Modelo padrão de locação residencial urbana sem garantia de fiador.",
    content: DEFAULT_RENTAL_CONTRACT_TEMPLATE,
  },
  {
    id: "builtin-residencial-fiador",
    name: "Contrato de Locação Residencial com Fiador",
    category: "RESIDENCIAL_FIADOR",
    description: "Locação residencial com garantia fidejussória e renúncia ao benefício de ordem.",
    content: RESIDENTIAL_GUARANTOR_CONTRACT_TEMPLATE,
  },
  {
    id: "builtin-comercial",
    name: "Contrato de Locação Comercial",
    category: "COMERCIAL",
    description: "Locação não residencial voltada a comércio, escritórios e atividades empresariais.",
    content: COMMERCIAL_CONTRACT_TEMPLATE,
  },
  {
    id: "builtin-temporada",
    name: "Contrato de Locação por Temporada",
    category: "TEMPORADA",
    description: "Locação para temporada e lazer por prazo determinado de até 90 dias.",
    content: SEASONAL_CONTRACT_TEMPLATE,
  },
];
