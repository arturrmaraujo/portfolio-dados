# Regras de Negócio e Limpeza de Dados (ETL)

Este documento descreve as regras aplicadas ao pré-processamento dos dados de faturamento e cadastro utilizados na análise comercial, incluindo exclusões, critérios de referência temporal e definição da positivação por cliente e marca.

## 1. Escopo de marcas e exclusões

Para analisar o faturamento associado à atividade comercial dos consultores, determinadas categorias de movimentação foram excluídas da base por meio de scripts de tratamento.

- **Marcas internas e itens de apoio:** produtos destinados ao uso interno, materiais de marketing e serviços logísticos.
- **Movimentações técnicas:** registros relacionados a avarias e garantias, excluídos para evitar distorções nos indicadores de ticket médio e frequência de compra.

## 2. Normalização temporal: definição de M1

### Problema identificado

A utilização da data de admissão registrada no sistema de RH como referência para o início da performance comercial não distinguia o período de integração e treinamento (*onboarding*) do período de atuação efetiva em campo. Essa diferença poderia distorcer a análise da curva de maturação dos consultores.

### Regra aplicada

O mês 1 (`M1`) foi definido dinamicamente no pipeline de dados como o mês-calendário em que ocorreu a primeira venda com faturamento positivo (`faturamento > 0`).

Esse critério utiliza o início efetivo das vendas como referência para a análise da evolução comercial, independentemente da data de admissão.

### Tratamento de meses parciais

O mês corrente, ainda em andamento, foi separado das análises históricas de produtividade para evitar que um período incompleto reduzisse as médias calculadas.

## 3. Positivação por cliente e marca

A positivação foi definida considerando a combinação dos identificadores `ID_Cliente` e `ID_Marca`, em vez de contabilizar apenas clientes distintos no período.

Dessa forma, quando um mesmo salão compra de duas marcas diferentes durante o mesmo mês, cada combinação cliente-marca é contabilizada como uma positivação.

**Exemplo:** se um salão compra da Marca Premium A e da Marca Premium B no mesmo mês, são contabilizadas duas positivações para o consultor responsável.

Esse critério permite mensurar a cobertura comercial por marca e considerar a introdução de novas marcas na carteira dos clientes.