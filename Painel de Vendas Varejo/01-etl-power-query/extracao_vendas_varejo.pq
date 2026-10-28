// ============================================================================
// PIPELINE DE ENGENHARIA DE DADOS (POWER QUERY / LINGUAGEM M)
// Projeto: Gestão de Metas Ponderadas e Sell-Out Multimarca no Varejo
// Descrição: Extração automatizada em lote de relatórios de vendas do ERP,
//            higienização de cabeçalhos/totalizadores, correção de tipagem
//            numérica (separador de milhar) e junção dimensional (Star Schema).
// Nota: Todos os caminhos de rede, nomes de marcas e filiais foram anonimizados.
// ============================================================================

section Section1;

// ----------------------------------------------------------------------------
// 1. PARÂMETROS E FUNÇÃO DE TRANSFORMAÇÃO DE ARQUIVOS EM LOTE
// ----------------------------------------------------------------------------

// Diretório parametrizado onde os arquivos brutos exportados pelo ERP são salvos
shared DiretorioRelatorios = "C:\Dados_Varejo\2026\EXTRACAO_RELATORIOS_VENDAS" meta [
    IsParameterQuery = true,
    Type = "Text",
    IsParameterQueryRequired = true
];

// Arquivo de amostra utilizado como referência de schema pelo Power Query
shared #"Arquivo de Amostra" = let
    Fonte = Folder.Files(DiretorioRelatorios),
    Navegacao1 = Fonte{0}[Content]
in
    Navegacao1;

shared ParametroBinario = #"Arquivo de Amostra" meta [
    IsParameterQuery = true,
    BinaryIdentifier = #"Arquivo de Amostra",
    Type = "Binary",
    IsParameterQueryRequired = true
];

// Consulta base do arquivo de exemplo
shared #"Transformar o Arquivo de Exemplo" = let
    Fonte = Excel.Workbook(ParametroBinario, null, true),
    Sheet1_Sheet = Fonte{[Item="Sheet1", Kind="Sheet"]}[Data],
    #"Cabeçalhos Promovidos" = Table.PromoteHeaders(Sheet1_Sheet, [PromoteAllScalars=true])
in
    #"Cabeçalhos Promovidos";

// Função invocada dinamicamente para cada arquivo .xlsx presente na pasta
[ FunctionQueryBinding = "{""exemplarFormulaName"":""Transformar o Arquivo de Exemplo""}" ]
shared #"Transformar Arquivo" = let
    Fonte = (ParametroBinario as binary) => let
        Fonte = Excel.Workbook(ParametroBinario, null, true),
        Sheet1_Sheet = Fonte{[Item="Sheet1", Kind="Sheet"]}[Data],
        #"Cabeçalhos Promovidos" = Table.PromoteHeaders(Sheet1_Sheet, [PromoteAllScalars=true])
    in
        #"Cabeçalhos Promovidos"
in
    Fonte;

// ----------------------------------------------------------------------------
// 2. TABELA DIMENSIONAL DE FILIAIS (DE-PARA: CÓDIGO ERP -> SIGLA GERENCIAL)
// ----------------------------------------------------------------------------

shared Dim_Lojas = let
    // Lê a Tabela estruturada "Tabela4" (Aba LOJAS da pasta de trabalho)
    Fonte = Excel.CurrentWorkbook(){[Name="Tabela4"]}[Content],
    #"Tipo Alterado" = Table.TransformColumnTypes(
        Fonte,
        {
            {"CÓDIGO", Int64.Type},
            {"DESCRIÇÃO", type text},
            {"LOJA", type text}
        }
    )
in
    #"Tipo Alterado";

// ----------------------------------------------------------------------------
// 3. TABELA FATO CONSOLIDADA (PIPELINE PRINCIPAL DE SELL-OUT)
// ----------------------------------------------------------------------------

shared Fato_Vendas_Consolidada = let
    // Etapa 3.1: Leitura de todos os arquivos da pasta e exclusão de arquivos ocultos/temporários
    Fonte = Folder.Files(DiretorioRelatorios),
    #"Arquivos Ocultos Filtrados" = Table.SelectRows(
        Fonte,
        each [Attributes]?[Hidden]? <> true
    ),

    // Etapa 3.2: Aplicação da função de extração em cada arquivo da pasta
    #"Invocar Função Personalizada" = Table.AddColumn(
        #"Arquivos Ocultos Filtrados",
        "Transformar Arquivo",
        each #"Transformar Arquivo"([Content])
    ),

    // Etapa 3.3: Extração do nome da Marca a partir do nome do arquivo bruto exportado pelo ERP
    // Exemplo de arquivo bruto: "Controle-Controle de Estoque-Estatistica MARCA_01.xlsx"
    #"Colunas Renomeadas1" = Table.RenameColumns(
        #"Invocar Função Personalizada",
        {"Name", "Nome da Origem"}
    ),
    #"Colunas Renomeadas2" = Table.RenameColumns(
        #"Colunas Renomeadas1",
        {{"Nome da Origem", "MARCA"}}
    ),
    #"Outras Colunas Removidas" = Table.SelectColumns(
        #"Colunas Renomeadas2",
        {"MARCA", "Transformar Arquivo"}
    ),

    // Etapa 3.4: Expansão das tabelas internas empilhando todas as marcas em uma única base
    #"Coluna de Tabela Expandida" = Table.ExpandTableColumn(
        #"Outras Colunas Removidas",
        "Transformar Arquivo",
        Table.ColumnNames(#"Transformar Arquivo"(#"Arquivo de Amostra"))
    ),

    // Etapa 3.5: Tipagem preliminar e higienização da string de Marca
    #"Tipo Alterado Preliminar" = Table.TransformColumnTypes(
        #"Coluna de Tabela Expandida",
        {
            {"MARCA", type text},
            {"Controle->Controle de Estoque->Estatistica", type text},
            {"Column2", type any},
            {"Column3", type text},
            {"Column4", type any},
            {"Column5", type text},
            {"Column6", type text},
            {"Column7", type text},
            {"Column8", type text},
            {"Column9", type text}
        }
    ),
    #"Prefixo Removido" = Table.ReplaceValue(
        #"Tipo Alterado Preliminar",
        "Controle-Controle de Estoque-Estatistica ",
        "",
        Replacer.ReplaceText,
        {"MARCA"}
    ),
    #"Extensao Removida" = Table.ReplaceValue(
        #"Prefixo Removido",
        ".xlsx",
        "",
        Replacer.ReplaceText,
        {"MARCA"}
    ),
    #"Texto em Maiúscula" = Table.TransformColumns(
        #"Extensao Removida",
        {{"MARCA", Text.Upper, type text}}
    ),

    // Etapa 3.6: Remoção de colunas de metadados do relatório e filtragem de linhas em branco
    #"Coluna Metadados Removida" = Table.RemoveColumns(
        #"Texto em Maiúscula",
        {"Controle->Controle de Estoque->Estatistica"}
    ),
    #"Linhas Vazias Filtradas" = Table.SelectRows(
        #"Coluna Metadados Removida",
        each [Column2] <> null and [Column2] <> ""
    ),

    // Etapa 3.7: Promoção de cabeçalhos reais e descarte de linhas de subtítulo/rodapé via tratamento de erro
    #"Cabeçalhos Promovidos" = Table.PromoteHeaders(
        #"Linhas Vazias Filtradas",
        [PromoteAllScalars=true]
    ),
    #"Coluna Marca Padronizada" = Table.RenameColumns(
        #"Cabeçalhos Promovidos",
        {{Table.ColumnNames(#"Cabeçalhos Promovidos"){0}, "MARCA"}}
    ),
    #"Tipagem com Deteccao de Cabecalhos Repetidos" = Table.TransformColumnTypes(
        #"Coluna Marca Padronizada",
        {
            {"MARCA", type text},
            {"CÓDIGO", Int64.Type},
            {"DESCRIÇÃO", type text},
            {"QUANTIDADE", type any},
            {"TOTAL PRECO", type text},
            {"TOTAL CUSTO", type text},
            {"%", type text},
            {"MARKUP", type text},
            {"MARKUP ATUAL", type text}
        }
    ),
    // Linhas de totalizador ou cabeçalhos repetidos no meio dos relatórios geram erro ao converter CÓDIGO para Int64 e são eliminadas aqui
    #"Erros Removidos" = Table.RemoveRowsWithErrors(
        #"Tipagem com Deteccao de Cabecalhos Repetidos",
        {"CÓDIGO"}
    ),

    // Etapa 3.8: Descarte de colunas financeiras internas (custo/markup) mantendo foco em Sell-Out
    #"Colunas Custo Removidas" = Table.RemoveColumns(
        #"Erros Removidos",
        {"TOTAL CUSTO", "%", "MARKUP", "MARKUP ATUAL"}
    ),

    // Etapa 3.9: Limpeza de espaços e conversão do faturamento (TOTAL PRECO) para número decimal
    #"Espacos Preco Removidos" = Table.ReplaceValue(
        #"Colunas Custo Removidas",
        " ",
        "",
        Replacer.ReplaceText,
        {"TOTAL PRECO"}
    ),
    #"Preco Convertido" = Table.TransformColumnTypes(
        #"Espacos Preco Removidos",
        {{"TOTAL PRECO", type number}}
    ),

    // Etapa 3.10: Correção da anomalia de separador de milhar em QUANTIDADE
    // Quando o volume supera 999 unidades (ex.: 1.244), a exportação do ERP grava com ponto de milhar,
    // que o interpretador lê como decimal (1,244). A regra identifica parte fracionária e recompõe a escala (* 1000).
    #"Quantidade Corrigida Adicionada" = Table.AddColumn(
        #"Preco Convertido",
        "QUANTIDADE COR",
        each if Number.RoundDown([QUANTIDADE]) <> [QUANTIDADE]
             then [QUANTIDADE] * 1000
             else [QUANTIDADE]
    ),
    #"Quantidade Original Removida" = Table.RemoveColumns(
        #"Quantidade Corrigida Adicionada",
        {"QUANTIDADE"}
    ),
    #"Colunas Reordenadas" = Table.ReorderColumns(
        #"Quantidade Original Removida",
        {"MARCA", "CÓDIGO", "DESCRIÇÃO", "QUANTIDADE COR", "TOTAL PRECO"}
    ),
    #"Quantidade Renomeada" = Table.RenameColumns(
        #"Colunas Reordenadas",
        {{"QUANTIDADE COR", "QUANTIDADE"}}
    ),
    #"Quantidade Inteira" = Table.TransformColumnTypes(
        #"Quantidade Renomeada",
        {{"QUANTIDADE", Int64.Type}}
    ),

    // Etapa 3.11: Enriquecimento Dimensional (Left Outer Join com Dim_Lojas / Tabela4)
    #"Consultas Mescladas" = Table.NestedJoin(
        #"Quantidade Inteira",
        {"CÓDIGO"},
        Dim_Lojas,
        {"CÓDIGO"},
        "Dim_Lojas",
        JoinKind.LeftOuter
    ),
    #"Loja Expandida" = Table.ExpandTableColumn(
        #"Consultas Mescladas",
        "Dim_Lojas",
        {"LOJA"},
        {"LOJA"}
    ),

    // Etapa 3.12: Seleção e ordenação do schema final entregue para a aba BASE_VENDAS
    #"Schema Final Reordenado" = Table.ReorderColumns(
        #"Loja Expandida",
        {"MARCA", "CÓDIGO", "LOJA", "DESCRIÇÃO", "QUANTIDADE", "TOTAL PRECO"}
    ),
    #"Descricao Bruta Removida" = Table.RemoveColumns(
        #"Schema Final Reordenado",
        {"DESCRIÇÃO"}
    )
in
    #"Descricao Bruta Removida";
