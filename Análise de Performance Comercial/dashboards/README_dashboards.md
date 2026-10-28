# Arquitetura dos Dashboards Comerciais

## Confidencialidade

Os arquivos `.pbix` com dados reais não foram incluídos no repositório para preservar a confidencialidade das informações comerciais. Este documento descreve a estrutura dos dashboards, os indicadores utilizados e as regras de negócio consideradas na implementação em Power BI.

## 1. Visão Executiva — Diretoria

### Faturamento ajustado e metas

O acompanhamento do faturamento considera o valor realizado em relação à meta e o índice de sazonalidade, permitindo analisar os resultados levando em conta as variações sazonais do negócio.

### Matriz de desempenho comercial

Gráfico de dispersão que relaciona o percentual de atingimento da meta de faturamento, no eixo X, ao percentual de atingimento da meta de positivação de clientes, no eixo Y.

A distribuição dos consultores é utilizada para identificar diferentes situações de desempenho e apoiar a definição de ações gerenciais. A análise é organizada em quatro quadrantes, conforme a combinação dos indicadores, contemplando situações de aceleração, retenção e risco, entre outras classificações previstas no modelo.

## 2. Diagnóstico Individual — Supervisão e Consultor

O painel foi planejado com abordagem *mobile-first*, priorizando a leitura dos indicadores em dispositivos móveis. A interface utiliza tipografias como Glancyr Neue e Lato, além de uma paleta baseada em tons de azul alinhada à identidade visual corporativa.

### Curva de desempenho versus benchmark

Gráfico de linhas que compara a trajetória individual do consultor, de M1 a M12, com três referências estatísticas da respectiva coorte de maturidade: percentil 25 (P25), mediana e percentil 75 (P75).

O objetivo é contextualizar o desempenho individual em relação ao histórico de consultores em estágios equivalentes de maturação comercial.

### Acompanhamento da Curva de Desafio 6M

Indicador visual de progresso para acompanhar o avanço do consultor em relação às metas previstas na Curva de Desafio dos primeiros seis meses.

### Decomposição do faturamento

O faturamento é analisado a partir de três componentes comerciais:

- **Positivação:** quantidade de clientes positivados.
- **Pedidos por positivação:** quantidade de pedidos em relação aos clientes positivados.
- **Ticket médio por pedido-marca:** valor médio dos pedidos por marca.

Essa decomposição permite examinar os componentes associados ao resultado comercial, distinguindo a cobertura de clientes, a frequência de pedidos e o valor médio por pedido-marca.