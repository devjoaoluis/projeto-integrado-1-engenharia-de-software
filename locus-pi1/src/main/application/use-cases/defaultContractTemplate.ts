export interface BuiltinContractTemplate {
  id: string;
  name: string;
  content: string;
}

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

export const COMMERCIAL_RENTAL_CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO PARA FINS NÃO RESIDENCIAIS

Pelo presente instrumento particular de locação, de um lado como LOCADOR(A) {{proprietario.nome}}, nacionalidade ____________, portador(a) do CPF/CNPJ de nº {{proprietario.cpf}}, telefone {{proprietario.telefone}}, e-mail {{proprietario.email}}, residente e domiciliado(a) na ____________, e de outro lado como LOCATÁRIO(A) {{locatario.nome}}, nacionalidade ____________, estado civil ____________, profissão ____________, residente na ____________, telefone {{locatario.telefone}}, e-mail {{locatario.email}}, com identidade de nº ____________ e CPF/CNPJ sob nº {{locatario.cpf}}, têm, entre si, justo e contratado o seguinte:

CLÁUSULA 1ª: O(A) LOCADOR(A) aluga ao(à) LOCATÁRIO(A) o imóvel de sua posse/propriedade situado à {{imovel.endereco}}, Bairro {{imovel.bairro}} ({{imovel.tipo}}).
Descrição: {{imovel.descricao}}.
As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Locação Comercial com ____________ Caução, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.

CLÁUSULA 2ª: A presente locação destina-se restritivamente ao uso do imóvel para fins comerciais, dentro da atividade comercial exercida pelo(a) LOCATÁRIO(A), estando proibido ao(à) LOCATÁRIO(A) sublocá-lo ou usá-lo de forma diferente do previsto, sob pena de rescisão contratual e cominação das penalidades previstas na cláusula 12ª.

CLÁUSULA 3ª: Ficará a cargo do(a) LOCATÁRIO(A) a obtenção de todos os pré-requisitos para a efetivação da atividade comercial a ser realizada, tais como alvará, licença e autorização perante o órgão público competente, bem como o pagamento de todos os emolumentos e despesas decorrentes da implantação, consecução e paralisação de suas atividades, enfim, todas as despesas de elaboração e execução deste instrumento.

CLÁUSULA 4ª: A presente locação terá o lapso temporal de validade de {{aluguel.prazo_meses}} meses, a iniciar-se em {{aluguel.inicio}} e findar-se em {{aluguel.fim}}, data na qual o imóvel deverá ser devolvido, efetivando-se com a entrega das chaves, independentemente de aviso ou qualquer outra medida judicial ou extrajudicial.
PARÁGRAFO ÚNICO: A parte que der causa à rescisão antecipada, excluídos os casos previstos neste contrato, estará sujeita ao pagamento de 01 (um) aluguel vigente à época da rescisão.

CLÁUSULA 5ª: O valor do aluguel mensal será de {{aluguel.valor}}, sendo este valor reajustado anualmente de acordo com o índice do IGP-M ou o que for maior no período.
PARÁGRAFO PRIMEIRO: O referido valor deverá ser pago todo dia {{aluguel.vencimento}} de cada mês, mediante boleto ou na sede do escritório, tudo devidamente acordado previamente com o(a) LOCATÁRIO(A).
PARÁGRAFO SEGUNDO: Após o vencimento será o(a) LOCATÁRIO(A) penalizado(a) com multa de 10% e juros de 1% ao mês, além das despesas com cobrança e honorários de advogado: se amigável 10% (dez por cento), se judicial 20% (vinte por cento), podendo, a depender do caso, ser penalizado(a) com o despejo por falta de pagamento.

CLÁUSULA 6ª: Em relação às benfeitorias realizadas no imóvel, fica o(a) LOCATÁRIO(A) autorizado(a) a proceder às reformas necessárias ao funcionamento do seu estabelecimento comercial, ficando todas as benfeitorias, desde já, incorporadas ao referido imóvel, sem possibilidade de indenização, retenção ou retirada.

CLÁUSULA 7ª: O(A) LOCATÁRIO(A) recebe o imóvel em excelente estado e compromete-se a mantê-lo e devolvê-lo, finda a locação, em excelente estado de conservação, estipulando-se que todas as benfeitorias realizadas incorporar-se-ão ao imóvel, sem previsão de ressarcimento, levantamento ou retenção.
PARÁGRAFO PRIMEIRO: No momento da entrega do imóvel ao inquilino, será realizada uma vistoria pelo mesmo, sendo-lhe o imóvel entregue em perfeito estado de uso.
PARÁGRAFO SEGUNDO: Após a entrega do imóvel ao locatário, passa a ser de sua obrigação o reparo dos danos causados por si mesmo ou por terceiros durante a vigência do contrato de locação. Independentemente de serem intencionais ou decorrentes do mau uso, tais avarias devem ser reparadas por quem está no uso do imóvel e não pelo proprietário do imóvel.
PARÁGRAFO TERCEIRO: O inquilino é responsável por manutenções necessárias relacionadas ao uso do imóvel, uma vez que a conservação do bem é sua obrigação. Por fim, também cabe ao locatário restituir o imóvel no mesmo estado em que o recebeu, com cores e mesma estrutura inicial. Dessa maneira, qualquer interferência sem prévia autorização do proprietário deve ser revertida, bem como quaisquer depredações ou estragos precisam ser reparados, de modo que o imóvel venha a ser devolvido nas mesmas condições de uso em que foi alugado.

CLÁUSULA 8ª: O(A) LOCATÁRIO(A) assume total responsabilidade pelo uso do imóvel, obrigando-se a respeitar as normas de vizinhança e sossego público. O(A) LOCADOR(A) e/ou administrador não se responsabilizam por quaisquer desentendimentos, conflitos, confusões ou perturbações de sossego causados pelo(a) LOCATÁRIO(A) a vizinhos ou outros ocupantes do imóvel, eximindo-se de qualquer intervenção, mediação ou responsabilidade civil/criminal sobre tais atos.

CLÁUSULA 9ª: Será de responsabilidade exclusiva do(a) LOCATÁRIO(A) as despesas com a conservação do bem, como, por exemplo, reparos de pinturas, instalações elétricas, hidráulicas, sanitárias, enrolamento de motores, portas, ferragens, consertos em paredes e telhados, dentre outras necessárias ao funcionamento do estabelecimento.

CLÁUSULA 10ª: Qualquer construção ou benfeitoria, útil, necessária ou voluptuária, dependerá de consentimento POR ESCRITO do(a) LOCADOR(A), e, em qualquer hipótese, mesmo realizada sem esse consentimento, incorporar-se-á ao imóvel, sem a obrigação de ressarcimento por parte do(a) LOCADOR(A), não ficando o(a) mesmo(a) obrigado(a) a indenizá-las (vide cláusula 6ª).

CLÁUSULA 11ª: Durante a vigência deste Contrato, o IPTU (estimado em {{imovel.iptu}}), taxa de bombeiros, seguros contra incêndio, as taxas de consumo de água, luz, telefone, energia, entre outras, relativas ao imóvel locado, correrão por conta do(a) LOCATÁRIO(A). Poderá ser acrescentado mensalmente o valor equivalente ao pagamento do IPTU.
PARÁGRAFO PRIMEIRO: Os prazos e as obrigações do(a) LOCATÁRIO(A) se vencerão independentemente de interpelação, notificação ou aviso, judicial ou extrajudicial.

CLÁUSULA 12ª: Qualquer infração ao presente Contrato, com exceção da rescisão antecipada, sujeitará o(a) infrator(a) à multa contratual equivalente a 02 (dois) aluguéis vigentes na época da infração, sem prejuízo dos efeitos legais das outras cláusulas deste Contrato.

CLÁUSULA 13ª: O(A) LOCATÁRIO(A) permitirá ao(à) LOCADOR(A) realizar vistorias no imóvel em dia e hora a serem combinados, podendo este(a) último(a) averiguar o funcionamento de todas as instalações, acessórios e equipamentos de segurança. Constatando-se algum vício que possa afetar a estrutura física do imóvel, ficará compelido(a) o(a) LOCATÁRIO(A) a realizar o conserto no prazo de 30 (trinta) dias. Não ocorrendo o conserto, ao(à) LOCADOR(A) ficará facultado rescindir o contrato, culminando nas multas previstas na cláusula 12ª.

CLÁUSULA 14ª: O(A) LOCADOR(A), a qualquer tempo, poderá alienar o bem locado, resguardando o direito de preferência do(a) LOCATÁRIO(A), na forma dos arts. 27 e seguintes da Lei 8.245/1991, cabendo ao(à) LOCATÁRIO(A) manifestar-se sobre a preferência na alienação do bem em até 30 (trinta) dias após o recebimento da notificação para exercício do direito de preferência. Após esse prazo, sem resposta do(a) LOCATÁRIO(A), seu silêncio será interpretado como ausência de interesse na aquisição do imóvel locado.

CLÁUSULA 15ª: A não cobrança de multa, encargos ou qualquer quantia estipulada no presente Contrato não pode ser interpretada como modificação deste ou renúncia do(a) LOCADOR(A) ao que tem direito.

CLÁUSULA 16ª: Caso seja o(a) LOCADOR(A) acionado(a) judicialmente em razão de eventos ocorridos com usuários dos serviços oferecidos pelo(a) LOCATÁRIO(A) ou quaisquer tipos de encargos, fica o(a) LOCATÁRIO(A) compelido(a) a, tão logo recebida a citação pelo(a) LOCADOR(A) e comunicado(a) o(a) LOCATÁRIO(A) da existência da ação judicial, ingressar nos autos do processo judicial, assumindo a inteira responsabilidade pelo evento, eximindo o(a) LOCADOR(A) de qualquer responsabilidade.

CLÁUSULA 17ª: O recebimento das chaves pelo(a) LOCADOR(A) não induz presunção de que o(a) LOCATÁRIO(A) cumpriu suas obrigações, inclusive no que diz respeito à conservação, para efeito de cobrança da multa estabelecida na cláusula 12ª, que será feita com base em recibos relativos a serviços de reparação prestados no imóvel, assinados, inclusive, por trabalhadores avulsos e autônomos, prevalecendo, quanto à quantia, a importância da multa, por se considerar no prejuízo do(a) LOCADOR(A) os dias sem utilização do imóvel e as despesas de contratação dos serviços.

CLÁUSULA 18ª: O(A) LOCATÁRIO(A) obriga-se a tomar as providências cabíveis junto aos órgãos de serviços dentro de 03 (três) dias úteis contados da assinatura do presente contrato, a fim de transferir para o seu nome as contas de consumo de água, luz, esgoto, gás e o que mais for necessário, sob pena de incorrer em infração contratual, respondendo, ademais, por estas contas durante a locação, ainda que lançadas em nome de terceiros, bem como por eventuais indenizações por dano moral ou material a que der causa.
PARÁGRAFO PRIMEIRO: Se não houver lançamento no recibo relativo a encargos da locação como, exemplificadamente, condomínio, SAAE, seguro de incêndio e outros, o inquilino fica obrigado a apresentar mensalmente as quitações. Quanto à ENEL, o inquilino providenciará ali o registro de seu nome como responsável direto no prazo também de 03 (três) dias úteis e apresentará quitação no fim da locação, inclusive certidão negativa junto ao SAAE.
PARÁGRAFO SEGUNDO: A quitação do contrato de locação concedida pelo(a) LOCADOR(A) será dada por escrito, inclusive no que diz respeito à conservação do imóvel locado.

CLÁUSULA 19ª: Na hipótese de o(a) LOCATÁRIO(A) abandonar o imóvel, fica o(a) LOCADOR(A) autorizado(a) a imitir-se na sua posse, a fim de evitar a depreciação ou invasão do bem. Neste caso, o termo de entrega será substituído por uma Declaração de Imissão de Posse, firmada pelo(a) LOCADOR(A) e duas testemunhas idôneas.

CLÁUSULA 20ª: O(A) LOCATÁRIO(A) teve conhecimento prévio e compreensão plena do conteúdo deste Contrato, oportunidade em que lhe foi facultada a discussão de seus aspectos materiais e formais.

CLÁUSULA 21ª: As citações, intimações e notificações, sem prejuízo de outras formas estabelecidas no Direito, poderão seguir as modalidades do item IV do art. 58 da Lei nº 8.245/1991.

CLÁUSULA 22ª: Para dirimir quaisquer controvérsias oriundas do contrato, as partes elegem o foro da Comarca de ____________, prevalecendo sobre qualquer outro, por mais privilegiado que seja.

CLÁUSULA 23ª: Por estarem assim justos e contratados, firmam o presente instrumento, em três vias de igual teor, juntamente com 02 (duas) testemunhas, que tudo assistiram, ficando o(a) LOCATÁRIO(A) com uma das vias.

Local e data: ____________, {{data_atual}}.


________________________________________________________
LOCADOR(A): {{proprietario.nome}}
CPF/CNPJ: {{proprietario.cpf}}


________________________________________________________
LOCATÁRIO(A): {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}


Testemunhas:
1) Nome: _________________________________________________
   CPF: __________________________________________________

2) Nome: _________________________________________________
   CPF: __________________________________________________
`;

export const COMMERCIAL_INSPECTION_REPORT_TEMPLATE = `LAUDO DE VISTORIA DE IMÓVEL COMERCIAL

O objeto do presente termo é a vistoria de um imóvel comercial localizado à {{imovel.endereco}}, Bairro {{imovel.bairro}}.
Locador(a): {{proprietario.nome}} (CPF/CNPJ: {{proprietario.cpf}})
Locatário(a): {{locatario.nome}}, nacionalidade ____________, estado civil ____________, profissão ____________, residente na ____________, com identidade de nº ____________ e CPF/CNPJ sob nº {{locatario.cpf}}.

O presente laudo é parte integrante do contrato de locação comercial celebrado entre o(a) locador(a) e o(a) locatário(a). Qualquer restrição ao presente laudo deverá ser comunicada ao(à) LOCADOR(A) por escrito, dentro de 05 (cinco) dias a contar da data da assinatura deste.
Vistoriado o imóvel acima descrito, foi constatado que o mesmo se encontra em perfeito estado de conservação, com todos os seus pertences, utensílios e acessórios em perfeito estado de funcionamento e conservação, sendo que dessa forma o(a) LOCATÁRIO(A) se compromete a devolvê-lo, findo o prazo contratual, independente de vistoria final.

1) PAREDES: Estão em perfeito estado de conservação.
2) PINTURA: Todas as paredes internas e externas do imóvel se encontram com a pintura nova. As portas e vitrô se encontram igualmente com a pintura intacta.
3) PORTA de entrada e PORTA BANHEIRO: Novas e em funcionamento, com pintura intacta.
4) FECHADURAS: Estão em perfeito estado de conservação e funcionamento.
5) PARTE HIDRÁULICA: Está em excelente estado de conservação e funcionamento, sem entupimentos ou vazamentos.
6) VASOS SANITÁRIOS E PIAS: As louças e vasos sanitários estão em perfeitas condições de uso.
7) PISOS E REVESTIMENTO: Os pisos e revestimentos estão conservados, bem como toda a estrutura do imóvel.
8) PARTE ELÉTRICA: A rede elétrica, incluindo tomadas (total de _____) e interruptores (total de _____), todos instalados, conservados e funcionando normalmente.
9) TELHADO: O teto do imóvel se encontra em boas condições, sem vazamentos ou goteiras.

Eu, {{locatario.nome}}, tenho conhecimento de que o(a) locador(a) não tem responsabilidade alguma por danos causados no telhado ou qualquer outro proveniente de serviços, seja instalação de central de ar, internet, etc., por mim contratados.

Local e data: ____________, {{data_atual}}.


________________________________________________________
LOCADOR(A): {{proprietario.nome}}
CPF/CNPJ: {{proprietario.cpf}}


________________________________________________________
LOCATÁRIO(A): {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}
`;

export const UTILITY_POWER_OF_ATTORNEY_TEMPLATE = `PROCURAÇÃO

OUTORGANTE(S): {{locatario.nome}}, nacionalidade ____________, estado civil ____________, profissão ____________, residente na ____________, telefone {{locatario.telefone}}, e-mail {{locatario.email}}, com identidade de nº ____________ e CPF/CNPJ sob nº {{locatario.cpf}}, nascido(a) no dia ____________, filho(a) de ____________.

OUTORGADO(S): ____________, nacionalidade ____________, estado civil ____________, profissão ____________, com endereço na ____________, com identidade de nº ____________ e CPF de nº ____________.

PODERES: Pelo presente instrumento de procuração o(s) acima qualificado(s) nomeia(m) e constitui(em) seu(sua) bastante procurador(a) o(s) OUTORGADO(S), também qualificado(s) acima, a quem confere(m) os poderes da cláusula "ad negocium" especialmente, para representá-lo(a) junto à ENEL e SAAE (ou concessionárias de energia e água/esgoto) em relação ao imóvel situado à {{imovel.endereco}}, Bairro {{imovel.bairro}}, podendo requerer interrupção, religação ou mudança de titularidade, firmar compromissos ou acordos e assinando o que se fizer necessário.

Local e data: ____________, {{data_atual}}.


________________________________________________________
OUTORGANTE: {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}
`;

export const TENANT_OBLIGATIONS_NOTICE_TEMPLATE = `TERMO DE CIÊNCIA E OBRIGAÇÕES DO LOCATÁRIO

Ilustríssimo(a) Locatário(a), {{locatario.nome}}, nacionalidade ____________, estado civil ____________, profissão ____________, residente na ____________, com identidade de nº ____________ e CPF/CNPJ sob nº {{locatario.cpf}}, referente ao imóvel localizado à {{imovel.endereco}}, Bairro {{imovel.bairro}}, de propriedade de {{proprietario.nome}} (CPF/CNPJ: {{proprietario.cpf}}).

Uma das obrigações do locador é a de entregar o imóvel em um estado que sirva ao uso a que se destina, bem como de responder pelos defeitos ou vícios anteriores à locação. Nesse contexto, se o inquilino encontra vazamentos, tomadas estragadas ou telhas quebradas ao entrar no imóvel, por exemplo, o dono deve ser acionado, tendo o dever de providenciar tais reparos.

O segundo detalhe a que nos referimos é que o locatário tem o dever de entrar em contato com o locador para que o reparo seja feito o quanto antes. Essa obrigação é prevista em lei e tem como objetivo evitar o risco de agravamento do defeito. Caso isso aconteça, o locatário pode perder o direito de ter o conserto arcado pelo locador, passando a responder até pelos reparos decorrentes da deterioração.

De acordo com a Lei do Inquilinato, A PARTIR DA ENTREGA DO IMÓVEL AO INQUILINO, é obrigação do locatário o reparo dos danos causados por si mesmo ou por terceiros durante a vigência do contrato de locação. Independente de serem intencionais ou decorrentes do mau uso, tais avarias devem ser reparadas por quem está no uso do imóvel e não pelo proprietário do imóvel. No dia a dia, os casos mais comuns são: Conserto ou troca de torneiras; Conserto ou troca de cano das louças sanitárias e pias da cozinha e tanque; Conserto ou troca da descarga e/ou do vaso sanitário, das borrachas de vedação, do registro de água com instalação externa (que não precise quebrar parede) e dos assentos que quebrar; Esgotamento de fossa; Troca de disjuntores estragados e manutenção do relógio de luz e fiação; Conserto ou troca de tomadas de energia elétrica quando necessário; Troca de vidros quebrados ou rachados; Troca ou conserto de fechaduras e portas; Troca de cerâmicas ou azulejos que quebrar; Conserto ou troca do interfone do imóvel e campainha; Conserto da fiação elétrica quando o problema for causado por si mesmo (por exemplo: uso de equipamentos com potência superior à rede elétrica do imóvel); Limpeza e desentupimento de calhas, bicas, vasos sanitários, pias, caixa de gordura e esgoto, ralos e canos; Manutenção, conserto e troca de janelas do imóvel. Vale ressaltar: a substituição de peças e objetos deve ser feita, preferencialmente, por outros da mesma marca e padrão.

Além disso, o inquilino é responsável por manutenções necessárias relacionadas ao uso do imóvel, uma vez que a conservação do bem é sua obrigação. Por fim, também cabe ao locatário restituir o imóvel no mesmo estado em que o recebeu, com cores e mesma estrutura inicial. Dessa maneira, qualquer interferência sem prévia autorização do proprietário deve ser revertida, bem como quaisquer depredações ou estragos precisam ser reparados, de modo que o imóvel venha a ser devolvido como estava quando foi alugado.

Local e data: ____________, {{data_atual}}.


________________________________________________________
LOCATÁRIO(A): {{locatario.nome}}
CPF/CNPJ: {{locatario.cpf}}
`;

export const BUILTIN_CONTRACT_TEMPLATES: BuiltinContractTemplate[] = [
  {
    id: "builtin-contrato-residencial",
    name: "Contrato de Locação Residencial Padrão",
    content: DEFAULT_RENTAL_CONTRACT_TEMPLATE,
  },
  {
    id: "builtin-contrato-comercial",
    name: "Contrato de Locação Comercial (Fins Não Residenciais)",
    content: COMMERCIAL_RENTAL_CONTRACT_TEMPLATE,
  },
  {
    id: "builtin-laudo-vistoria-comercial",
    name: "Laudo de Vistoria de Imóvel Comercial",
    content: COMMERCIAL_INSPECTION_REPORT_TEMPLATE,
  },
  {
    id: "builtin-procuracao-enel-saae",
    name: "Procuração (ENEL e SAAE)",
    content: UTILITY_POWER_OF_ATTORNEY_TEMPLATE,
  },
  {
    id: "builtin-termo-obrigacoes-locatario",
    name: "Termo de Ciência e Obrigações do Locatário",
    content: TENANT_OBLIGATIONS_NOTICE_TEMPLATE,
  },
];
