function montarEscopoResultados_(competencia) {
  var partes = validarCompetencia_(competencia);
  var config = obterConfiguracoes_();
  var planejamento = lerPlanejamento_(competencia).linhas;
  var vendas = lerVendas_().mapa;
  var lojas = lerLojas_();
  var ordemLoja = {};
  lojas.forEach(function(loja) { ordemLoja[String(loja.codigo)] = loja.ordem; });

  var registros = {};
  planejamento.forEach(function(item) {
    var chave = chaveMarcaLoja_(item.marca, item.codigoLoja);
    var possuiVenda = !!vendas[chave];
    var incluir = item.statusPeso !== APP_CONFIG.STATUS.NOT_APPLICABLE || possuiVenda;
    if (!incluir) return;
    registros[chave] = {
      marca: item.marca,
      codigoLoja: item.codigoLoja,
      loja: item.loja || (vendas[chave] && vendas[chave].loja) || '',
      statusPeso: item.statusPeso
    };
  });

  Object.keys(vendas).forEach(function(chave) {
    if (registros[chave]) return;
    var venda = vendas[chave];
    registros[chave] = {
      marca: venda.marca,
      codigoLoja: venda.codigoLoja,
      loja: venda.loja,
      statusPeso: APP_CONFIG.STATUS.NOT_INFORMED
    };
  });

  var lista = Object.keys(registros).map(function(chave) { return registros[chave]; });
  lista.sort(function(a, b) {
    var marca = a.marca.localeCompare(b.marca, 'pt-BR');
    if (marca !== 0) return marca;
    var ordemA = ordemLoja[String(a.codigoLoja)];
    var ordemB = ordemLoja[String(b.codigoLoja)];
    ordemA = ordemA == null ? 9999 : ordemA;
    ordemB = ordemB == null ? 9999 : ordemB;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return a.loja.localeCompare(b.loja, 'pt-BR');
  });

  return lista.map(function(item) {
    return [
      partes.texto,
      String(partes.ano),
      String(partes.mes),
      MESES_PT[partes.mes],
      item.marca,
      item.codigoLoja,
      item.loja
    ];
  });
}

function formulasResultados_(quantidadeLinhas) {
  var formulas = [];
  for (var indice = 0; indice < quantidadeLinhas; indice++) {
    var linha = indice + 2;
    formulas.push([
      '=IF(COUNTIFS(PLANEJAMENTO_METAS_PESOS!$A:$A,$A' + linha + ',PLANEJAMENTO_METAS_PESOS!$B:$B,$E' + linha + ',PLANEJAMENTO_METAS_PESOS!$C:$C,$F' + linha + ')=0,"",SUMIFS(PLANEJAMENTO_METAS_PESOS!$G:$G,PLANEJAMENTO_METAS_PESOS!$A:$A,$A' + linha + ',PLANEJAMENTO_METAS_PESOS!$B:$B,$E' + linha + ',PLANEJAMENTO_METAS_PESOS!$C:$C,$F' + linha + '))',
      '=IF(COUNTIFS(PLANEJAMENTO_METAS_PESOS!$A:$A,$A' + linha + ',PLANEJAMENTO_METAS_PESOS!$B:$B,$E' + linha + ',PLANEJAMENTO_METAS_PESOS!$C:$C,$F' + linha + ',PLANEJAMENTO_METAS_PESOS!$K:$K,"PUBLICADO")=0,"",SUMIFS(PLANEJAMENTO_METAS_PESOS!$I:$I,PLANEJAMENTO_METAS_PESOS!$A:$A,$A' + linha + ',PLANEJAMENTO_METAS_PESOS!$B:$B,$E' + linha + ',PLANEJAMENTO_METAS_PESOS!$C:$C,$F' + linha + ',PLANEJAMENTO_METAS_PESOS!$K:$K,"PUBLICADO"))',
      '=IF(COUNTIFS(PLANEJAMENTO_METAS_PESOS!$A:$A,$A' + linha + ',PLANEJAMENTO_METAS_PESOS!$B:$B,$E' + linha + ',PLANEJAMENTO_METAS_PESOS!$C:$C,$F' + linha + ',PLANEJAMENTO_METAS_PESOS!$K:$K,"PUBLICADO")=0,"",SUMIFS(PLANEJAMENTO_METAS_PESOS!$J:$J,PLANEJAMENTO_METAS_PESOS!$A:$A,$A' + linha + ',PLANEJAMENTO_METAS_PESOS!$B:$B,$E' + linha + ',PLANEJAMENTO_METAS_PESOS!$C:$C,$F' + linha + ',PLANEJAMENTO_METAS_PESOS!$K:$K,"PUBLICADO"))',
      '=SUMIFS(BASE_VENDAS!$E:$E,BASE_VENDAS!$A:$A,$E' + linha + ',BASE_VENDAS!$B:$B,$F' + linha + ')',
      '=SUMIFS(BASE_VENDAS!$D:$D,BASE_VENDAS!$A:$A,$E' + linha + ',BASE_VENDAS!$B:$B,$F' + linha + ')',
      '=IF($A' + linha + '="","",IFERROR(INDEX(\'CONFIGURAÇÕES\'!$B:$B,MATCH("STATUS_COMPETENCIA",\'CONFIGURAÇÕES\'!$A:$A,0)),""))',
      '=IF($A' + linha + '="","",IFERROR(INDEX(\'CONFIGURAÇÕES\'!$B:$B,MATCH("DATA_REFERENCIA",\'CONFIGURAÇÕES\'!$A:$A,0)),""))'
    ]);
  }
  return formulas;
}

function valoresResultadosAtuais_(competencia, linhasBase, config) {
  var planejamento = lerPlanejamento_(competencia).linhas;
  var planejamentoPorChave = {};
  planejamento.forEach(function(item) {
    planejamentoPorChave[chaveMarcaLoja_(item.marca, item.codigoLoja)] = item;
  });
  var vendasPorChave = lerVendas_().mapa;
  return linhasBase.map(function(linha) {
    var marca = linha[4];
    var codigoLoja = linha[5];
    var planejamentoLoja = planejamentoPorChave[chaveMarcaLoja_(marca, codigoLoja)];
    var venda = vendasPorChave[chaveMarcaLoja_(marca, codigoLoja)];
    var publicado = planejamentoLoja && planejamentoLoja.statusPlanejamento === APP_CONFIG.STATUS.PUBLISHED;
    return [
      planejamentoLoja && planejamentoLoja.peso != null ? planejamentoLoja.peso : '',
      publicado && planejamentoLoja.metaLojaR != null ? planejamentoLoja.metaLojaR : '',
      publicado && planejamentoLoja.metaLojaQtd != null ? planejamentoLoja.metaLojaQtd : '',
      venda ? venda.valor : 0,
      venda ? venda.quantidade : 0,
      String(config.STATUS_COMPETENCIA || ''),
      config.DATA_REFERENCIA || ''
    ];
  });
}

function sincronizarResultadosAtuais_(opcoes) {
  opcoes = opcoes || {};
  var config = obterConfiguracoes_();
  var competencia = String(config.COMPETENCIA_ATUAL || '').trim();
  validarCompetencia_(competencia);

  if (opcoes.dataReferencia) definirDataReferencia_(opcoes.dataReferencia);
  var linhasBase = montarEscopoResultados_(competencia);
  if (!linhasBase.length) throw new Error('Nenhuma combinação de marca e loja encontrada para a competência.');

  var aba = obterAba_(APP_CONFIG.SHEETS.RESULTS);
  var ultimaLinhaAnterior = Math.max(aba.getLastRow(), 2);
  var quantidadeLimpar = Math.max(ultimaLinhaAnterior - 1, linhasBase.length);
  aba.getRange(2, 1, quantidadeLimpar, APP_CONFIG.RESULT_HEADERS.length).clearContent();

  var valoresCalculados = valoresResultadosAtuais_(competencia, linhasBase, obterConfiguracoes_());
  var linhasCompletas = linhasBase.map(function(linha, indice) {
    return linha.concat(valoresCalculados[indice]).concat([
      chaveRegistro_(linha[0], linha[4], linha[6])
    ]);
  });
  aba.getRange(2, 1, linhasCompletas.length, APP_CONFIG.RESULT_HEADERS.length).setValues(linhasCompletas);

  definirFormatoNumericoSePossivel_(aba.getRange(2, 8, linhasBase.length, 1), '0.000%');
  definirFormatoNumericoSePossivel_(aba.getRange(2, 9, linhasBase.length, 1), 'R$ #,##0.00');
  definirFormatoNumericoSePossivel_(aba.getRange(2, 10, linhasBase.length, 1), '#,##0.00');
  definirFormatoNumericoSePossivel_(aba.getRange(2, 11, linhasBase.length, 1), 'R$ #,##0.00');
  definirFormatoNumericoSePossivel_(aba.getRange(2, 12, linhasBase.length, 1), '#,##0');
  definirFormatoNumericoSePossivel_(aba.getRange(2, 14, linhasBase.length, 1), 'dd/MM/yyyy');

  SpreadsheetApp.flush();
  limparCacheOperacional_();
  limparCacheGerencial_();
  return {
    competencia: competencia,
    linhas: linhasBase.length,
    dataReferencia: formatarDataPtBr_(obterConfiguracoes_().DATA_REFERENCIA)
  };
}

function validarResultadosAtuais_() {
  SpreadsheetApp.flush();
  var erros = [];
  var avisos = [];
  var tabela = lerResultados_();
  var config = obterConfiguracoes_();
  var competencia = String(config.COMPETENCIA_ATUAL || '').trim();
  var vendas = lerVendas_();
  var chaves = {};
  var ids = {};
  var totalR = 0;
  var totalQtd = 0;

  tabela.linhas.forEach(function(linha) {
    var item = linhaResultadoParaObjeto_(linha, tabela.mapa);
    if (!item.competencia || !item.marca || !item.loja) return;
    if (item.competencia !== competencia) {
      erros.push('RESULTADOS contém linha de outra competência: ' + item.idRegistro);
    }
    var chave = chaveMarcaLoja_(item.marca, item.codigoLoja);
    if (chaves[chave]) erros.push('Combinação duplicada em RESULTADOS: ' + chave);
    chaves[chave] = true;
    if (!item.idRegistro) erros.push('ID_REGISTRO vazio para ' + chave);
    if (ids[item.idRegistro]) erros.push('ID_REGISTRO duplicado: ' + item.idRegistro);
    ids[item.idRegistro] = true;
    totalR += item.realizadoR;
    totalQtd += item.realizadoQtd;
  });

  vendas.linhas.forEach(function(venda) {
    var chave = chaveMarcaLoja_(venda.marca, venda.codigoLoja);
    if (!chaves[chave]) erros.push('Venda sem linha correspondente em RESULTADOS: ' + chave);
  });

  var totalBaseR = vendas.linhas.reduce(function(total, item) { return total + item.valor; }, 0);
  var totalBaseQtd = vendas.linhas.reduce(function(total, item) { return total + item.quantidade; }, 0);
  if (Math.abs(totalR - totalBaseR) > APP_CONFIG.MONEY_TOLERANCE) {
    erros.push('Total financeiro de RESULTADOS não confere com BASE_VENDAS.');
  }
  if (Math.abs(totalQtd - totalBaseQtd) > 0.000001) {
    erros.push('Quantidade de RESULTADOS não confere com BASE_VENDAS.');
  }

  return resultadoValidacao_(erros, avisos, {
    competencia: competencia,
    linhasResultados: Object.keys(chaves).length,
    linhasVendas: vendas.linhas.length,
    totalRealizadoR: totalR,
    totalRealizadoQtd: totalQtd
  });
}
