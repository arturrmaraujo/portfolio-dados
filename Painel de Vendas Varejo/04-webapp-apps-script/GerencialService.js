function montarCargaGerencial_() {
  SpreadsheetApp.flush();
  var config = obterConfiguracoes_();
  var lojasCadastro = lerLojas_();
  var nomesLojas = {};
  lojasCadastro.forEach(function(loja) { nomesLojas[loja.sigla] = loja.nome; });

  var resultados = lerResultados_();
  var historico = lerHistorico_();
  var itens = [];

  function adicionarLinhas(tabela) {
    tabela.linhas.forEach(function(linha) {
      var item = linhaResultadoParaObjeto_(linha, tabela.mapa);
      if (!item.competencia || !item.marca || !item.loja) return;
      var indicadores = calcularIndicadoresAtuais_(item, config);
      itens.push({
        competencia: item.competencia,
        ano: item.ano,
        mesNum: item.mesNum,
        mesNome: item.mesNome,
        marca: item.marca,
        codigoLoja: item.codigoLoja,
        loja: item.loja,
        nomeLoja: nomesLojas[item.loja] || item.loja,
        peso: item.peso,
        metaR: item.metaR,
        metaQtd: item.metaQtd,
        realizadoR: item.realizadoR,
        realizadoQtd: item.realizadoQtd,
        statusPeriodo: item.statusPeriodo,
        periodoFechado: item.statusPeriodo === APP_CONFIG.STATUS.CLOSED,
        dataReferencia: formatarDataPtBr_(item.dataReferencia),
        tendenciaR: indicadores.tendenciaR,
        tendenciaQtd: indicadores.tendenciaQtd,
        metaDiaQtd: indicadores.metaDiaQtd,
        classificacaoTendencia: indicadores.classificacaoTendencia
      });
    });
  }
  adicionarLinhas(historico);
  adicionarLinhas(resultados);

  var competenciaPlanejamento = String(config.COMPETENCIA_ATUAL || '').trim();
  var leituraPlanejamento = lerPlanejamento_(competenciaPlanejamento);
  var ultimasMetasPorMarca = {};
  lerPlanejamento_().linhas.forEach(function(item) {
    if (item.competencia >= competenciaPlanejamento) return;
    if (item.metaMarcaR == null && item.metaMarcaQtd == null) return;
    var anterior = ultimasMetasPorMarca[item.marca];
    if (!anterior || item.competencia > anterior.competencia) {
      ultimasMetasPorMarca[item.marca] = {
        competencia:item.competencia,
        metaMarcaR:item.metaMarcaR,
        metaMarcaQtd:item.metaMarcaQtd
      };
    }
  });
  var validacaoPlanejamento = validarPlanejamento_(competenciaPlanejamento, false);
  var planejamento = leituraPlanejamento.linhas.map(function(item) {
    return {
      competencia: item.competencia,
      marca: item.marca,
      codigoLoja: item.codigoLoja,
      loja: item.loja,
      nomeLoja: nomesLojas[item.loja] || item.loja,
      metaMarcaR: item.metaMarcaR,
      metaMarcaQtd: item.metaMarcaQtd,
      peso: item.peso,
      statusPeso: item.statusPeso,
      metaLojaR: item.metaLojaR,
      metaLojaQtd: item.metaLojaQtd,
      statusPlanejamento: item.statusPlanejamento,
      dataPublicacao: item.dataPublicacao ? formatarDataPtBr_(item.dataPublicacao) : '',
      observacao: item.observacao
    };
  });

  var anos = {};
  var marcas = {};
  var lojas = {};
  var competencias = {};
  itens.forEach(function(item) {
    anos[item.ano] = true;
    marcas[item.marca] = true;
    lojas[item.loja] = item.nomeLoja;
    competencias[item.competencia] = {
      competencia: item.competencia,
      ano: item.ano,
      mesNum: item.mesNum,
      mesNome: item.mesNome,
      label: item.mesNome.charAt(0) + item.mesNome.slice(1).toLowerCase() + '/' + item.ano,
      fechado: item.periodoFechado
    };
  });

  return {
    versaoContrato: 1,
    linhas: itens,
    filtros: {
      anos: Object.keys(anos).map(Number).sort(function(a, b) { return b - a; }),
      marcas: Object.keys(marcas).sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); }),
      lojas: Object.keys(lojas).map(function(sigla) { return { sigla: sigla, nome: lojas[sigla] }; }).sort(function(a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
      competencias: Object.keys(competencias).sort().reverse().map(function(chave) { return competencias[chave]; })
    },
    padroes: {
      ano: Number(config.ANO_PADRAO_PAINEL) || Number(config.ANO_ATUAL),
      competencia: String(config.COMPETENCIA_ATUAL || ''),
      faixaMin: Number(config.FAIXA_ESTABILIDADE_MIN) || -0.05,
      faixaMax: Number(config.FAIXA_ESTABILIDADE_MAX) || 0.05,
      dataReferencia: formatarDataPtBr_(config.DATA_REFERENCIA),
      diaReferencia: Number(config.DIA_REFERENCIA) || 0,
      diasNoMes: Number(config.DIAS_NO_MES) || 0
    },
    planejamento: {
      competencia: competenciaPlanejamento,
      linhas: planejamento,
      ultimasMetasPorMarca: ultimasMetasPorMarca,
      lojasDisponiveis: lojasCadastro.filter(function(loja) {
        return loja.ativa;
      }).map(function(loja) {
        return {
          codigoLoja: String(loja.codigo),
          loja: loja.sigla,
          nomeLoja: loja.nome,
          ordem: loja.ordem
        };
      }),
      validacao: validacaoPlanejamento
    },
    geradoEm: formatarDataIso_(new Date())
  };
}

function obterCargaGerencial(token) {
  validarSessaoGerencial_(token);
  var cache = CacheService.getScriptCache();
  var armazenado = cache.get(APP_CONFIG.CACHE_KEY_MANAGERIAL);
  if (armazenado) return JSON.parse(armazenado);
  var carga = montarCargaGerencial_();
  var json = JSON.stringify(carga);
  if (json.length < 95000) cache.put(APP_CONFIG.CACHE_KEY_MANAGERIAL, json, APP_CONFIG.CACHE_SECONDS);
  return carga;
}

function limparCacheGerencial_() {
  CacheService.getScriptCache().remove(APP_CONFIG.CACHE_KEY_MANAGERIAL);
}
