function calcularIndicadoresAtuais_(item, config) {
  var atual = item.competencia === String(config.COMPETENCIA_ATUAL || '').trim();
  var diaReferencia = atual ? Number(config.DIA_REFERENCIA) || 0 : 0;
  var diasMes = atual ? Number(config.DIAS_NO_MES) || diasNoMes_(item.competencia) : diasNoMes_(item.competencia);
  var tendenciaR = null;
  var tendenciaQtd = null;
  var metaDiaQtd = null;
  var classificacaoTendencia = null;

  if (atual && diaReferencia > 0) {
    tendenciaR = item.realizadoR / diaReferencia * diasMes;
    tendenciaQtd = item.realizadoQtd / diaReferencia * diasMes;
    var diasRestantes = Math.max(diasMes - diaReferencia, 0);
    if (item.metaQtd != null) {
      var saldoQtd = Math.max(item.metaQtd - item.realizadoQtd, 0);
      metaDiaQtd = diasRestantes > 0 ? saldoQtd / diasRestantes : 0;
    }
    if (item.metaR != null && item.metaR > 0) {
      var indice = tendenciaR / item.metaR;
      var limiteMin = 1 + (Number(config.FAIXA_ESTABILIDADE_MIN) || -0.05);
      var limiteMax = 1 + (Number(config.FAIXA_ESTABILIDADE_MAX) || 0.05);
      classificacaoTendencia = indice < limiteMin ? 'ABAIXO' : (indice > limiteMax ? 'ACIMA' : 'ESTAVEL');
    }
  }

  return {
    atual: atual,
    diaReferencia: diaReferencia,
    diasMes: diasMes,
    tendenciaR: tendenciaR,
    tendenciaQtd: tendenciaQtd,
    metaDiaQtd: metaDiaQtd,
    classificacaoTendencia: classificacaoTendencia
  };
}

function montarCargaOperacional_() {
  SpreadsheetApp.flush();
  var config = obterConfiguracoes_();
  var anoPadrao = Number(config.ANO_PADRAO_PAINEL) || Number(config.ANO_ATUAL);
  var resultados = lerResultados_();
  var historico = lerHistorico_();
  var lojas = lerLojas_();
  var traducao = {};
  lojas.forEach(function(loja) { traducao[loja.sigla] = loja.nome; });

  var objetos = [];
  resultados.linhas.forEach(function(linha) {
    var item = linhaResultadoParaObjeto_(linha, resultados.mapa);
    if (item.competencia && item.marca && item.loja) objetos.push(item);
  });
  historico.linhas.forEach(function(linha) {
    var item = linhaResultadoParaObjeto_(linha, historico.mapa);
    if (item.competencia && item.marca && item.loja && item.ano === anoPadrao) objetos.push(item);
  });

  var mapaLojasPorMarca = {};
  var todasLojas = {};
  var periodos = {};
  var dbBruto = objetos.map(function(item) {
    var indicadores = calcularIndicadoresAtuais_(item, config);
    if (!mapaLojasPorMarca[item.marca]) mapaLojasPorMarca[item.marca] = {};
    mapaLojasPorMarca[item.marca][item.loja] = true;
    todasLojas[item.loja] = true;
    periodos[item.competencia] = {
      competencia: item.competencia,
      ano: item.ano,
      mesNum: item.mesNum,
      mesNome: item.mesNome,
      label: item.mesNome.charAt(0) + item.mesNome.slice(1).toLowerCase() + '/' + item.ano,
      fechado: item.statusPeriodo === APP_CONFIG.STATUS.CLOSED,
      dataReferencia: formatarDataPtBr_(item.dataReferencia)
    };
    return {
      competencia: item.competencia,
      ano: item.ano,
      mesNum: item.mesNum,
      mes: item.mesNome,
      marca: item.marca,
      codigoLoja: item.codigoLoja,
      lojaSigla: item.loja,
      peso: item.peso,
      metaR$: item.metaR,
      metaQtd: item.metaQtd,
      metaDisponivelR: item.metaR != null,
      metaDisponivelQtd: item.metaQtd != null,
      realizadoR$: item.realizadoR,
      realizadoQtd: item.realizadoQtd,
      tendenciaR$: indicadores.tendenciaR,
      tendenciaQtd: indicadores.tendenciaQtd,
      tendenciaDisponivel: indicadores.atual && indicadores.diaReferencia > 0,
      classificacaoTendencia: indicadores.classificacaoTendencia,
      metaDiaQtd: indicadores.metaDiaQtd,
      statusPeriodo: item.statusPeriodo,
      periodoFechado: item.statusPeriodo === APP_CONFIG.STATUS.CLOSED,
      dataReferencia: formatarDataPtBr_(item.dataReferencia)
    };
  });

  var mapaFinal = {};
  Object.keys(mapaLojasPorMarca).forEach(function(marca) {
    mapaFinal[marca] = Object.keys(mapaLojasPorMarca[marca]);
  });
  mapaFinal.TODAS = Object.keys(todasLojas);

  var periodosDisponiveis = Object.keys(periodos).sort().reverse().map(function(chave) {
    return periodos[chave];
  });
  var mesesDisponiveis = periodosDisponiveis.map(function(periodo) { return periodo.mesNome; });

  return {
    versaoContrato: 2,
    dadosBrutos: dbBruto,
    mapaLojas: mapaFinal,
    traducao: traducao,
    periodosDisponiveis: periodosDisponiveis,
    mesesDisponiveis: mesesDisponiveis,
    competenciaAtual: String(config.COMPETENCIA_ATUAL || ''),
    diaRelatorio: Number(config.DIA_REFERENCIA) || 0,
    dataReferencia: formatarDataPtBr_(config.DATA_REFERENCIA),
    diasNoMes: Number(config.DIAS_NO_MES) || 0,
    geradoEm: formatarDataIso_(new Date())
  };
}

function obterCargaOperacional() {
  var cache = CacheService.getScriptCache();
  var armazenado = cache.get(APP_CONFIG.CACHE_KEY_OPERATIONAL);
  if (armazenado) return JSON.parse(armazenado);
  var carga = montarCargaOperacional_();
  var json = JSON.stringify(carga);
  if (json.length < 95000) cache.put(APP_CONFIG.CACHE_KEY_OPERATIONAL, json, APP_CONFIG.CACHE_SECONDS);
  return carga;
}

// Mantém compatibilidade com o HTML atual.
function obterCargaInicial() {
  return obterCargaOperacional();
}
