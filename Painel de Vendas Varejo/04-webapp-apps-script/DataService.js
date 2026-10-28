function lerLojas_() {
  var tabela = lerTabela_(APP_CONFIG.SHEETS.STORES);
  exigirCabecalhos_(tabela, ['CODIGO_LOJA', 'LOJA', 'NOME_EXIBICAO', 'ATIVA']);
  var lojas = [];
  tabela.linhas.forEach(function(linha, indice) {
    var codigo = valorDaLinha_(linha, tabela.mapa, 'CODIGO_LOJA');
    var sigla = normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'LOJA'));
    if (codigo === '' || !sigla) return;
    lojas.push({
      codigo: codigo,
      sigla: sigla,
      nome: String(valorDaLinha_(linha, tabela.mapa, 'NOME_EXIBICAO') || sigla).trim(),
      ativa: normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'ATIVA')) === 'SIM',
      ordem: indice
    });
  });
  return lojas;
}

function lerPlanejamento_(competencia) {
  var competenciaAlvo = competencia ? normalizarCompetencia_(competencia) : '';
  var tabela = lerTabela_(APP_CONFIG.SHEETS.PLANNING);
  exigirCabecalhos_(tabela, APP_CONFIG.PLANNING_HEADERS);
  var linhas = [];
  tabela.linhas.forEach(function(linha, indice) {
    var comp = normalizarCompetencia_(valorDaLinha_(linha, tabela.mapa, 'COMPETENCIA'));
    var marca = normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'MARCA'));
    var codigo = valorDaLinha_(linha, tabela.mapa, 'CODIGO_LOJA');
    if (!comp || !marca || codigo === '') return;
    if (competenciaAlvo && comp !== competenciaAlvo) return;
    linhas.push({
      linhaPlanilha: indice + 2,
      competencia: comp,
      marca: marca,
      codigoLoja: codigo,
      loja: normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'LOJA')),
      metaMarcaR: numeroOuNulo_(valorDaLinha_(linha, tabela.mapa, 'META_MARCA_R$')),
      metaMarcaQtd: numeroOuNulo_(valorDaLinha_(linha, tabela.mapa, 'META_MARCA_QTD')),
      peso: numeroOuNulo_(valorDaLinha_(linha, tabela.mapa, 'PESO')),
      statusPeso: normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'STATUS_PESO')),
      metaLojaR: numeroOuNulo_(valorDaLinha_(linha, tabela.mapa, 'META_LOJA_R$')),
      metaLojaQtd: numeroOuNulo_(valorDaLinha_(linha, tabela.mapa, 'META_LOJA_QTD')),
      statusPlanejamento: normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'STATUS_PLANEJAMENTO')),
      dataPublicacao: valorDaLinha_(linha, tabela.mapa, 'DATA_PUBLICACAO'),
      observacao: String(valorDaLinha_(linha, tabela.mapa, 'OBSERVACAO') || '').trim()
    });
  });
  return { tabela: tabela, linhas: linhas };
}

function lerVendas_() {
  var tabela = lerTabela_(APP_CONFIG.SHEETS.SALES);
  exigirCabecalhos_(tabela, ['MARCA', 'CÓDIGO', 'LOJA', 'QUANTIDADE', 'TOTAL PRECO']);
  var mapa = {};
  tabela.linhas.forEach(function(linha) {
    var marca = normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'MARCA'));
    var codigo = valorDaLinha_(linha, tabela.mapa, 'CÓDIGO');
    var loja = normalizarTexto_(valorDaLinha_(linha, tabela.mapa, 'LOJA'));
    if (!marca || codigo === '' || !loja) return;
    var chave = chaveMarcaLoja_(marca, codigo);
    if (!mapa[chave]) {
      mapa[chave] = { marca: marca, codigoLoja: codigo, loja: loja, quantidade: 0, valor: 0 };
    }
    mapa[chave].quantidade += numeroOuZero_(valorDaLinha_(linha, tabela.mapa, 'QUANTIDADE'));
    mapa[chave].valor += numeroOuZero_(valorDaLinha_(linha, tabela.mapa, 'TOTAL PRECO'));
  });
  return { tabela: tabela, mapa: mapa, linhas: Object.keys(mapa).map(function(chave) { return mapa[chave]; }) };
}

function lerResultados_() {
  var tabela = lerTabela_(APP_CONFIG.SHEETS.RESULTS);
  exigirCabecalhos_(tabela, APP_CONFIG.RESULT_HEADERS);
  return tabela;
}

function lerHistorico_() {
  var tabela = lerTabela_(APP_CONFIG.SHEETS.HISTORY);
  exigirCabecalhos_(tabela, APP_CONFIG.RESULT_HEADERS);
  return tabela;
}

function linhaResultadoParaObjeto_(linha, mapa) {
  return {
    competencia: normalizarCompetencia_(valorDaLinha_(linha, mapa, 'COMPETENCIA')),
    ano: Number(valorDaLinha_(linha, mapa, 'ANO')) || 0,
    mesNum: Number(valorDaLinha_(linha, mapa, 'MES_NUM')) || 0,
    mesNome: normalizarTexto_(valorDaLinha_(linha, mapa, 'MES_NOME')),
    marca: normalizarTexto_(valorDaLinha_(linha, mapa, 'MARCA')),
    codigoLoja: valorDaLinha_(linha, mapa, 'CODIGO_LOJA'),
    loja: normalizarTexto_(valorDaLinha_(linha, mapa, 'LOJA')),
    peso: numeroOuNulo_(valorDaLinha_(linha, mapa, 'PESO')),
    metaR: numeroOuNulo_(valorDaLinha_(linha, mapa, 'META_R$')),
    metaQtd: numeroOuNulo_(valorDaLinha_(linha, mapa, 'META_QTD')),
    realizadoR: numeroOuZero_(valorDaLinha_(linha, mapa, 'REALIZADO_R$')),
    realizadoQtd: numeroOuZero_(valorDaLinha_(linha, mapa, 'REALIZADO_QTD')),
    statusPeriodo: normalizarTexto_(valorDaLinha_(linha, mapa, 'STATUS_PERIODO')),
    dataReferencia: valorDaLinha_(linha, mapa, 'DATA_REFERENCIA'),
    idRegistro: String(valorDaLinha_(linha, mapa, 'ID_REGISTRO') || '').trim()
  };
}
