function validarFechamentoAtual() {
  var erros = [];
  var avisos = [];
  var configValidacao = validarConfiguracoesAtuais_();
  erros = erros.concat(configValidacao.erros);
  avisos = avisos.concat(configValidacao.avisos);

  var resultadosValidacao = validarResultadosAtuais_();
  erros = erros.concat(resultadosValidacao.erros);
  avisos = avisos.concat(resultadosValidacao.avisos);

  var config = obterConfiguracoes_();
  var competencia = String(config.COMPETENCIA_ATUAL || '').trim();
  var historico = lerHistorico_();
  var existeNoHistorico = historico.linhas.some(function(linha) {
    return String(valorDaLinha_(linha, historico.mapa, 'COMPETENCIA') || '').trim() === competencia;
  });
  if (existeNoHistorico) erros.push('A competência ' + competencia + ' já existe no histórico.');

  var planejamento = validarPlanejamento_(competencia, false);
  erros = erros.concat(planejamento.erros);
  avisos = avisos.concat(planejamento.avisos);

  var linhasRascunho = lerPlanejamento_(competencia).linhas.filter(function(item) {
    return item.statusPlanejamento !== APP_CONFIG.STATUS.PUBLISHED;
  }).length;
  if (linhasRascunho) {
    avisos.push(linhasRascunho + ' linha(s) do planejamento ainda estão em RASCUNHO.');
  }

  return resultadoValidacao_(erros, avisos, {
    competencia: competencia,
    resultados: resultadosValidacao.detalhes,
    planejamento: planejamento.detalhes
  });
}

function registrarLogFechamento_(competencia, linhas, totais, observacao) {
  var aba = obterAba_(APP_CONFIG.SHEETS.LOG);
  var agora = new Date();
  var id = 'FECHAMENTO|' + competencia + '|' + Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  aba.appendRow([
    id,
    competencia,
    'FECHAMENTO_COMPETENCIA',
    'CONCLUIDO',
    linhas,
    totais.metaR,
    totais.realizadoR,
    totais.metaQtd,
    totais.realizadoQtd,
    agora,
    obterUsuarioAtual_(),
    observacao || ''
  ]);
  var linha = aba.getLastRow();
  definirFormatoNumericoSePossivel_(aba.getRange(linha, 6, 1, 2), 'R$ #,##0.00');
  definirFormatoNumericoSePossivel_(aba.getRange(linha, 8, 1, 2), '#,##0.00');
  definirFormatoNumericoSePossivel_(aba.getRange(linha, 10), 'dd/MM/yyyy HH:mm:ss');
}

function limparBaseVendas_() {
  var aba = obterAba_(APP_CONFIG.SHEETS.SALES);
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha > 1) aba.getRange(2, 1, ultimaLinha - 1, Math.max(aba.getLastColumn(), 5)).clearContent();
}

function atualizarCompetenciaEmResultados_(novaCompetencia) {
  var partes = validarCompetencia_(novaCompetencia);
  var tabela = lerResultados_();
  var aba = tabela.aba;
  var totalLinhas = tabela.linhas.length;
  if (!totalLinhas) return;

  var formulasA = aba.getRange(2, 1, 1, 4).getFormulas()[0];
  var temFormulaPeriodo = formulasA.some(function(f) { return !!f; });

  if (!temFormulaPeriodo) {
    var novosPeriodos = tabela.linhas.map(function() {
      return [partes.texto, String(partes.ano), String(partes.mes), MESES_PT[partes.mes]];
    });
    aba.getRange(2, 1, totalLinhas, 4).setValues(novosPeriodos);
  }

  var colunaId = tabela.mapa.ID_REGISTRO + 1;
  var formulaId = aba.getRange(2, colunaId).getFormula();
  if (!formulaId) {
    var novosIds = tabela.linhas.map(function(linha) {
      var marca = valorDaLinha_(linha, tabela.mapa, 'MARCA');
      var loja = valorDaLinha_(linha, tabela.mapa, 'LOJA');
      return [chaveRegistro_(partes.texto, marca, loja)];
    });
    aba.getRange(2, colunaId, totalLinhas, 1).setValues(novosIds);
  }
}

function fecharCompetenciaAtual() {
  return comBloqueio_(function() {
    SpreadsheetApp.flush();
    var validacao = validarFechamentoAtual();
    if (!validacao.valido) throw new Error(mensagemValidacao_('Fechamento bloqueado.', validacao));

    var config = obterConfiguracoes_();
    var competencia = String(config.COMPETENCIA_ATUAL).trim();
    var proxima = proximaCompetencia_(competencia);
    var resultados = lerResultados_();
    var linhasFechadas = [];
    var totais = { metaR: 0, realizadoR: 0, metaQtd: 0, realizadoQtd: 0 };

    resultados.linhas.forEach(function(linha) {
      var item = linhaResultadoParaObjeto_(linha, resultados.mapa);
      if (!item.competencia || !item.marca || !item.loja) return;
      totais.metaR += item.metaR == null ? 0 : item.metaR;
      totais.metaQtd += item.metaQtd == null ? 0 : item.metaQtd;
      totais.realizadoR += item.realizadoR;
      totais.realizadoQtd += item.realizadoQtd;
      linhasFechadas.push([
        item.competencia,
        String(item.ano),
        String(item.mesNum),
        item.mesNome,
        item.marca,
        item.codigoLoja,
        item.loja,
        item.peso == null ? '' : item.peso,
        item.metaR == null ? '' : item.metaR,
        item.metaQtd == null ? '' : item.metaQtd,
        item.realizadoR,
        item.realizadoQtd,
        APP_CONFIG.STATUS.CLOSED,
        item.dataReferencia || config.DATA_REFERENCIA,
        chaveRegistro_(item.competencia, item.marca, item.loja)
      ]);
    });
    if (!linhasFechadas.length) throw new Error('Nenhuma linha disponível para fechamento.');

    var historico = obterAba_(APP_CONFIG.SHEETS.HISTORY);
    var primeiraLinhaHistorico = historico.getLastRow() + 1;
    historico.getRange(
      primeiraLinhaHistorico,
      1,
      linhasFechadas.length,
      APP_CONFIG.RESULT_HEADERS.length
    ).setValues(linhasFechadas);

    criarPlanejamentoProximaCompetencia_(competencia, proxima);
    registrarLogFechamento_(
      competencia,
      linhasFechadas.length,
      totais,
      validacao.avisos.length ? validacao.avisos.join(' | ') : 'Fechamento sem avisos.'
    );

    limparBaseVendas_();
    abrirCompetencia_(proxima);
    atualizarCompetenciaEmResultados_(proxima);
    SpreadsheetApp.flush();
    limparCacheOperacional_();
    limparCacheGerencial_();

    return {
      fechado: true,
      competenciaFechada: competencia,
      competenciaAberta: proxima,
      linhasArquivadas: linhasFechadas.length,
      totais: totais,
      avisos: validacao.avisos
    };
  });
}