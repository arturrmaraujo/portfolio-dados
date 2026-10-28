# Pipeline de Dados e Aplicação Web para Acompanhamento de Sell-Out

## 1. Visão geral

Este repositório reúne os componentes de uma solução de acompanhamento de vendas por marca e filial, desenvolvida para uma operação de distribuição de cosméticos com 11 filiais de varejo e um portfólio de 15 marcas.

O fluxo começa com relatórios exportados do ERP e inclui a preparação dos dados no Excel com Power Query, o cálculo de metas por filial, o armazenamento dos resultados no Google Sheets e uma aplicação web desenvolvida em Google Apps Script.

### Objetivos

- Consolidar relatórios de vendas exportados separadamente por marca.
- Padronizar campos, valores numéricos e identificadores de lojas.
- Distribuir a meta de cada marca entre as filiais com base na participação histórica das vendas.
- Acompanhar o realizado, o atingimento de metas e a projeção de fechamento mensal.
- Manter o histórico de competências encerradas e registrar operações de fechamento e reabertura.
- Disponibilizar visões operacionais, gerenciais e administrativas com permissões definidas por perfil.

A solução utiliza Excel, Power Query (linguagem M), Google Sheets, Google Apps Script, HTML, JavaScript, Bootstrap 5 e Chart.js. O processamento de dados de origem ocorre localmente; o armazenamento compartilhado e a aplicação web utilizam os serviços do Google.

## 2. Arquitetura e fluxo de dados

```text
Relatórios do ERP (.xlsx), separados por marca
                    |
                    v
Excel + Power Query
- Leitura dos arquivos de uma pasta
- Limpeza e padronização dos dados
- Ajuste de valores numéricos
- Associação com o cadastro de lojas
                    |
                    v
Tabela BASE_VENDAS
                    |
                    v
Google Sheets
- Dados de vendas
- Metas e pesos por marca e filial
- Resultados da competência ativa
- Histórico de competências encerradas
- Cadastro de lojas e parâmetros
- Log de fechamentos e reaberturas
                    |
                    v
Google Apps Script + HTML/JavaScript
- Painel operacional
- Visão gerencial
- Administração de acessos
```

O Power Query processa os arquivos na máquina local. Após a atualização, os dados padronizados são transferidos para a planilha do Google Sheets, utilizada pela aplicação como fonte de dados. Os serviços do Apps Script consultam e atualizam as abas conforme a operação solicitada e as permissões do usuário.

## 3. Estrutura do repositório

```text
├── README.md
├── 01-etl-power-query/
│   └── extracao_vendas_varejo.pq
├── 02-modelagem-excel-local/
│   └── modelo_metas_vendas_portfolio.xlsx
├── 03-banco-dados-google-sheets/
│   └── base_google_sheets_painel_portfolio.xlsx
└── 04-webapp-apps-script/
    ├── AppConfig.js
    ├── AuthService.js
    ├── Code.js
    ├── ConfigService.js
    ├── DataService.js
    ├── FechamentoService.js
    ├── GerencialService.js
    ├── PainelService.js
    ├── PlanejamentoService.js
    ├── ResultadosService.js
    ├── UtilsService.js
    ├── vendas_varejo.html
    ├── gerencial.html
    └── config_acesso.html
```

### Arquivos e responsabilidades

| Arquivo ou diretório | Responsabilidade |
|---|---|
| `01-etl-power-query/extracao_vendas_varejo.pq` | Consulta M para importar e padronizar os relatórios exportados do ERP. |
| `02-modelagem-excel-local/modelo_metas_vendas_portfolio.xlsx` | Planilha local de preparação dos dados, cálculo de metas e acompanhamento tático. |
| `03-banco-dados-google-sheets/base_google_sheets_painel_portfolio.xlsx` | Estrutura das abas utilizadas como fonte de dados da aplicação. |
| `AppConfig.js` | Constantes, nomes das abas e configurações compartilhadas. |
| `AuthService.js` | Verificação de identidade, sessão e permissões por perfil. |
| `Code.js` | Ponto de entrada HTTP do Web App e seleção da interface retornada. |
| `ConfigService.js` | Leitura e atualização de parâmetros e dados de cadastro. |
| `DataService.js` | Operações de leitura e escrita no Google Sheets. |
| `FechamentoService.js` | Rotinas de fechamento e reabertura de competência. |
| `GerencialService.js` | Cálculo dos indicadores e agregações da visão gerencial. |
| `PainelService.js` | Agregações utilizadas no painel operacional. |
| `PlanejamentoService.js` | Tratamento dos pesos, validação de percentuais e publicação de metas. |
| `ResultadosService.js` | Consolidação das metas planejadas com os dados de vendas. |
| `UtilsService.js` | Funções auxiliares para números, datas, chaves e arredondamento. |
| `vendas_varejo.html` | Interface operacional para acompanhamento, planejamento e fechamento. |
| `gerencial.html` | Interface gerencial com indicadores, gráficos e matriz marca × filial. |
| `config_acesso.html` | Interface administrativa para gerenciamento de acessos. |

## 4. Componentes da solução

### 4.1. Preparação dos dados com Power Query

Arquivo: `01-etl-power-query/extracao_vendas_varejo.pq`

A consulta lê os arquivos `.xlsx` de um diretório local e combina os dados em uma tabela padronizada. O processo contempla as seguintes etapas:

1. **Leitura dos arquivos:** utiliza `Folder.Files` para enumerar os arquivos disponíveis na pasta. O nome do arquivo é usado para obter a identificação da marca por meio de `Text.BeforeDelimiter([Name], ".")`.
2. **Tratamento do cabeçalho:** descarta as duas primeiras linhas dos relatórios e utiliza a terceira linha como cabeçalho, por meio de `Table.Skip` e `Table.PromoteHeaders`.
3. **Remoção de linhas sem dados úteis:** elimina linhas em branco, cabeçalhos repetidos durante a paginação e linhas de totalização.
4. **Correção de valores numéricos:** trata a inconsistência observada na interpretação do separador de milhar. Nos arquivos utilizados, alguns valores como `1.250,00` eram interpretados como `1,25`. A consulta aplica a regra condicional `if [TOTAL PRECO] < 10 then [TOTAL PRECO] * 1000 else [TOTAL PRECO]` antes da conversão para `Currency.Type`.
5. **Padronização das lojas:** realiza uma junção `JoinKind.LeftOuter` com a tabela `Tab_Lojas`, associando os registros ao cadastro padronizado das 11 filiais.

A saída do processo é a tabela `BASE_VENDAS`, com os campos `MARCA`, `CÓDIGO`, `LOJA`, `QUANTIDADE` e `TOTAL PRECO`.

A regra de correção numérica depende do padrão dos arquivos de origem. Caso o formato de exportação do ERP seja alterado, essa condição deve ser revisada para evitar multiplicação indevida de valores válidos.

### 4.2. Modelagem de metas e projeção mensal

Arquivo: `02-modelagem-excel-local/modelo_metas_vendas_portfolio.xlsx`

A planilha recebe os dados tratados e calcula a distribuição da meta por filial, o atingimento e uma projeção linear do resultado mensal.

#### Participação histórica da filial

Para cada marca, o peso da filial é calculado pela proporção de suas vendas históricas em relação ao total das filiais consideradas:

\[
W_{i,j} =
\frac{\text{Realizado Histórico}_{i,j}}
{\sum_{k=1}^{11}\text{Realizado Histórico}_{k,j}}
\]

Em que \(i\) representa a filial e \(j\) representa a marca.

#### Meta por filial

A meta global da marca é distribuída conforme o peso histórico calculado:

\[
\text{Meta}_{i,j} =
\text{Meta Global}_{j} \times W_{i,j}
\]

#### Projeção de fechamento

A projeção linear estima o resultado ao final do mês mantendo o ritmo médio diário observado:

\[
\text{Projeção}_{i,j} =
\frac{\text{Realizado Acumulado}_{i,j}}
{d_{\text{decorridos}}}
\times D_{\text{mês}}
\]

Nessa expressão, \(d_{\text{decorridos}}\) corresponde aos dias considerados no acumulado e \(D_{\text{mês}}\) ao número de dias do mês. A interpretação da projeção depende da consistência desses parâmetros e não considera, por si só, variações de demanda ao longo do mês.

#### Classificação do resultado

- **Meta batida:** atingimento atual igual ou superior a 100%.
- **No ritmo:** atingimento atual abaixo de 100%, mas projeção de fechamento igual ou superior a 100%.
- **Atenção:** projeção de fechamento abaixo de 100%.

### 4.3. Estrutura de dados no Google Sheets

Arquivo de referência: `03-banco-dados-google-sheets/base_google_sheets_painel_portfolio.xlsx`

A planilha contém sete abas utilizadas pela aplicação:

| Aba | Finalidade |
|---|---|
| `LOG_FECHAMENTOS` | Registra eventos de fechamento e reabertura, incluindo competência, ação, status, quantidade de linhas, totais, data, usuário e observação. |
| `BASE_VENDAS` | Recebe os dados de vendas padronizados pelo processo local. Campos: `MARCA`, `CÓDIGO`, `LOJA`, `QUANTIDADE` e `TOTAL PRECO`. |
| `RESULTADOSS` | Armazena os resultados calculados para a competência ativa. A versão documentada utiliza `2026-10`. |
| `HISTORICO_RESULTADOS` | Mantém os resultados das competências encerradas. A série descrita abrange `2026-01` a `2026-09`. |
| `PLANEJAMENTO_METAS_PESOS` | Armazena as metas globais por marca e os pesos atribuídos às filiais. A publicação valida a soma dos pesos conforme a tolerância configurada. |
| `CADASTRO_LOJAS` | Mantém os códigos, nomes de exibição e situação de atividade das filiais. |
| `CONFIGURAÇÕES` | Armazena parâmetros como competência atual, dias decorridos, dias do mês e tolerância para validação dos pesos. |

O arquivo `.xlsx` presente no repositório representa a estrutura de dados utilizada no Google Sheets; ele não é, por si só, a planilha on-line conectada à aplicação.

### 4.4. Aplicação web em Google Apps Script

Diretório: `04-webapp-apps-script/`

O backend está dividido em serviços por responsabilidade. As interfaces HTML utilizam JavaScript no navegador e acessam as funções disponibilizadas pelo Apps Script.

#### Consolidação de resultados — `ResultadosService.js`

Combina o planejamento publicado em `PLANEJAMENTO_METAS_PESOS` com as vendas da `BASE_VENDAS`. Os registros são associados por chaves compostas que incluem competência, marca e filial (`COMPETENCIA|MARCA|LOJA`). O serviço utiliza mapas em memória para localizar os registros e grava o resultado consolidado em lote na aba `RESULTADOSS`, por meio de `setValues`.

#### Fechamento de competência — `FechamentoService.js`

Coordena o encerramento e a reabertura de competências. No fechamento, verifica as condições previstas pela aplicação, transfere os resultados para `HISTORICO_RESULTADOS`, registra o evento em `LOG_FECHAMENTOS`, atualiza `COMPETENCIA_ATUAL` em `CONFIGURAÇÕES` e prepara a competência seguinte.

O código prevê mecanismos de recuperação com cópia temporária dos dados em memória. Esse mecanismo não equivale a uma transação de banco de dados com garantias atômicas; falhas durante operações em diferentes abas devem ser consideradas na avaliação da integridade do fechamento.

#### Indicadores gerenciais — `GerencialService.js` e `gerencial.html`

Calcula indicadores de atingimento, projeção de fechamento, diferença absoluta entre realizado e meta, evolução mensal e classificações por marca e filial. A interface apresenta gráficos com Chart.js e uma matriz de atingimento por marca e filial.

#### Autenticação e permissões — `AuthService.js` e `config_acesso.html`

A aplicação define os perfis `ADMIN`, `GERENCIAL`, `OPERACIONAL` e `PLANEJAMENTO`. A implementação utiliza `PropertiesService` e `Session.getActiveUser()` para obter informações de configuração e identidade do usuário. As permissões efetivas dependem da configuração de implantação do Apps Script e das regras implementadas no código.

#### Interfaces

- `vendas_varejo.html`: acompanhamento operacional, planejamento de metas e fechamento mensal.
- `gerencial.html`: indicadores consolidados, evolução temporal, rankings e matriz marca × filial.
- `config_acesso.html`: administração de usuários e perfis de acesso.

## 5. Privacidade e anonimização dos dados

A versão de portfólio descrita neste repositório utiliza identificadores substitutos para representar as informações da operação original.

- **Filiais:** nomes e localizações foram substituídos por códigos como `FIL-01` a `FIL-11`, códigos numéricos de `101` a `111` e nomes genéricos.
- **Marcas:** as marcas originais foram substituídas por identificadores como `MARCA_01 (CARE)` a `MARCA_15 (TECH)`.
- **E-mails:** endereços presentes nos registros foram substituídos por um endereço fictício de exemplo.
- **Valores e quantidades:** os dados financeiros e os volumes foram multiplicados por fatores constantes aplicados às planilhas e aos scripts. O objetivo é manter as relações matemáticas utilizadas nos cálculos, como pesos e percentuais de atingimento, sem expor os valores originais.

A anonimização dos nomes e o escalonamento dos valores não garantem, isoladamente, a remoção de todo risco de reidentificação. Antes de publicar ou compartilhar o repositório, é necessário conferir também o conteúdo dos arquivos, o histórico de alterações, as configurações e eventuais credenciais ou identificadores remanescentes.
