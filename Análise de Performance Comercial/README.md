# Análise de Performance e Reestruturação de Metas Comerciais B2B

## Confidencialidade dos dados

Os dados financeiros, nomes de colaboradores, marcas e demais informações sensíveis da empresa e de seus clientes foram anonimizados para publicação neste repositório. Os valores financeiros são apresentados por meio de índices com base 100, e os nomes reais foram substituídos por identificadores genéricos.

A estrutura relativa dos dados e a lógica das análises foram preservadas para documentar os procedimentos adotados. A anonimização descrita não garante, por si só, a impossibilidade de reidentificação dos envolvidos.

## Contexto e problema de negócio

A equipe comercial B2B, com atuação nos canais de Beleza Profissional e Varejo, apresentava alta rotatividade, com mediana de permanência de sete meses, e resultados abaixo das metas comerciais estabelecidas.

A análise dos dados indicou que a diferença entre os resultados realizados e as metas não estava necessariamente relacionada apenas à execução comercial. O modelo vigente utilizava critérios uniformes para consultores em diferentes estágios de maturação, sem considerar adequadamente o tempo de desenvolvimento da carteira, as particularidades de cada canal e a concentração do faturamento.

## Objetivos do projeto

1. Estimar a curva de maturação comercial dos consultores nos primeiros 12 meses de atividade (M1 a M12).
2. Avaliar os fatores associados ao faturamento, com foco em ticket médio e positivação de clientes.
3. Propor um modelo de gestão com metas progressivas para os primeiros seis meses de atividade, utilizando referências estatísticas do histórico comercial, como percentis 25 e 75 e mediana.

## Estrutura do repositório

- `data_prep_and_etl/`: scripts de preparação e tratamento dos dados, higienização da base e aplicação das regras de negócio.
- `eda_and_analysis/`: notebooks e códigos Python utilizados na análise exploratória, nos testes de hipóteses, no cálculo de benchmarks estatísticos e na avaliação de relações entre indicadores.
- `dashboards/`: estrutura e wireframes do painel gerencial para acompanhamento dos indicadores de desempenho.


## Tecnologias e ferramentas

- **Python (Pandas e NumPy):** tratamento e estruturação dos dados, cálculos estatísticos e análise de percentis.
- **Power Query e DAX:** preparação dos dados e implementação das métricas utilizadas no dashboard.
- **Visualização e comunicação de dados:** organização dos resultados e apresentação das conclusões em formato executivo.

## Principais análises e resultados

### Definição do período de maturação comercial

O indicador `M1` foi definido como o primeiro mês com venda positiva, em vez de utilizar a data de admissão registrada pelo RH como referência inicial.

Esse critério permite analisar os consultores a partir do início efetivo das vendas, reduzindo distorções decorrentes de períodos sem atividade comercial e permitindo comparar os resultados por estágio de maturação.

### Avaliação das metas comerciais

A comparação entre o histórico de desempenho e as metas atribuídas indicou um possível desalinhamento entre a capacidade observada da equipe e os níveis de cobrança estabelecidos.

Segundo os resultados da análise, a maioria dos consultores alcançava o percentil 75 do histórico de desempenho da empresa, enquanto algumas metas correspondiam a até duas vezes a capacidade estrutural estimada.

O diagnóstico fundamentou a proposta de revisar os critérios de definição das metas, considerando o estágio de maturação dos consultores e as diferenças entre os canais comerciais.

### Relação entre faturamento e positivação de clientes

A análise identificou a positivação de clientes por marca e a cobertura das rotas como fatores relevantes para o desempenho comercial, em comparação com uma avaliação baseada exclusivamente no ticket médio.

A partir desse diagnóstico, foi proposta a avaliação de uma estrutura comercial com núcleos especializados por marca, como alternativa ao modelo generalista. A proposta busca alinhar a organização da equipe aos fatores identificados na análise de desempenho.

### Proposta de reestruturação das metas

O projeto contempla a construção de curvas de desafio para os primeiros seis meses de atividade, com metas progressivas fundamentadas na distribuição histórica dos resultados.

A utilização de percentis e da mediana permite estabelecer referências de desempenho observadas na base analisada, em substituição a critérios uniformes que desconsiderem o estágio de maturação comercial.

## Observações metodológicas

Os resultados apresentados neste README refletem as análises realizadas no projeto e dependem dos critérios de tratamento, das definições dos indicadores e da base utilizada.

As conclusões sobre capacidade comercial, metas e fatores associados ao faturamento devem ser interpretadas dentro desse contexto. A identificação de relações entre indicadores não demonstra, isoladamente, causalidade.

Os valores e identificadores foram adaptados para publicação. A preservação das relações entre os dados tem como objetivo demonstrar a metodologia, sem expor diretamente os valores financeiros e as identidades originais.

### Síntese Executiva e Plano de Ação

> **Nota sobre a apresentação executiva:** Por conter diretrizes estratégicas, planos de ação internos e metodologias de gestão comercial da companhia, a apresentação final entregue à diretoria foi omitida deste repositório público por questões de confidencialidade. Abaixo, destacam-se os principais desdobramentos táticos aprovados a partir do estudo:

* **Piloto de Normalização:** Proposição de um período de testes de três ciclos comerciais para validar, na prática, o modelo "Desafio 6M". O objetivo é acompanhar uma equipe reduzida sob as novas métricas antes da expansão do modelo para toda a força de vendas.
* **Mitigação do Risco de Concentração:** O estudo evidenciou a alta dependência do faturamento da empresa em clientes-chave e em vendas realizadas diretamente pela liderança comercial. O novo modelo ataca esse gargalo focando na descentralização da receita por meio da cobrança de maior cobertura de carteira (positivação) dos consultores.
* **Gestão Focada em Processo:** Os dados demonstraram uma forte concentração do volume de vendas nos últimos cinco dias do ciclo. O plano de ação instituiu reuniões semanais focadas em "indicadores de meio" (registro de visitas, roteirização, positivação de marcas complementares) para gerar previsibilidade e evitar a dependência exclusiva do fechamento do mês.
* **Otimização da Cesta de Marcas:** Transição do modelo em que o consultor possuía metas pulverizadas para mais de 10 marcas (com baixa execução real) para um modelo híbrido. A nova estrutura foca em uma marca principal dedicada e uma cesta prioritária reduzida, viabilizando o *cross-sell* e melhorando a qualidade do acompanhamento pela supervisão.