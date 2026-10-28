function obterConfiguracoes_() {
  var tabela = lerTabela_(APP_CONFIG.SHEETS.CONFIG);
  exigirCabecalhos_(tabela, ['CHAVE', 'VALOR']);
  var indiceChave = tabela.mapa.CHAVE;
  var indiceValor = tabela.mapa.VALOR;
  var configuracoes = {};
  tabela.linhas.forEach(function(linha) {
    var chave = normalizarTexto_(linha[indiceChave]);
    if (!chave) return;
    var valor = linha[indiceValor];
    if (chave === 'COMPETENCIA_ATUAL') valor = normalizarCompetencia_(valor);
    configuracoes[chave] = valor;
  });
  return configuracoes;
}

function atualizarConfiguracoes_(alteracoes) {
  var tabela = lerTabela_(APP_CONFIG.SHEETS.CONFIG);
  exigirCabecalhos_(tabela, ['CHAVE', 'VALOR']);
  var indiceChave = tabela.mapa.CHAVE;
  var indiceValor = tabela.mapa.VALOR;
  var pendentes = {};
  Object.keys(alteracoes).forEach(function(chave) {
    pendentes[normalizarTexto_(chave)] = alteracoes[chave];
  });

  tabela.linhas.forEach(function(linha, indice) {
    var chave = normalizarTexto_(linha[indiceChave]);
    if (!Object.prototype.hasOwnProperty.call(pendentes, chave)) return;
    tabela.aba.getRange(indice + 2, indiceValor + 1).setValue(pendentes[chave]);
    delete pendentes[chave];
  });

  var ausentes = Object.keys(pendentes);
  if (ausentes.length) {
    throw new Error('Chaves não encontradas em CONFIGURAÇÕES: ' + ausentes.join(', '));
  }
}

function validarConfiguracoesAtuais_() {
  var erros = [];
  var avisos = [];
  var config = obterConfiguracoes_();
  var partes;
  try {
    partes = validarCompetencia_(config.COMPETENCIA_ATUAL);
  } catch (erro) {
    erros.push(erro.message);
    return resultadoValidacao_(erros, avisos, { configuracoes: config });
  }

  if (Number(config.ANO_ATUAL) !== partes.ano) {
    erros.push('ANO_ATUAL não corresponde à competência.');
  }
  if (Number(config.MES_NUM_ATUAL) !== partes.mes) {
    erros.push('MES_NUM_ATUAL não corresponde à competência.');
  }
  if (normalizarTexto_(config.MES_NOME_ATUAL) !== MESES_PT[partes.mes]) {
    erros.push('MES_NOME_ATUAL não corresponde à competência.');
  }
  if (Number(config.DIAS_NO_MES) !== diasNoMes_(partes.texto)) {
    erros.push('DIAS_NO_MES não corresponde à competência.');
  }
  if (normalizarTexto_(config.STATUS_COMPETENCIA) !== APP_CONFIG.STATUS.OPEN) {
    avisos.push('A competência atual não está marcada como ABERTA.');
  }

  var dataReferencia = config.DATA_REFERENCIA;
  if (!(dataReferencia instanceof Date) || isNaN(dataReferencia.getTime())) {
    erros.push('DATA_REFERENCIA não é uma data válida.');
  } else {
    if (
      dataReferencia.getFullYear() !== partes.ano ||
      dataReferencia.getMonth() + 1 !== partes.mes
    ) {
      erros.push('DATA_REFERENCIA não pertence à competência atual.');
    }
    if (Number(config.DIA_REFERENCIA) !== dataReferencia.getDate()) {
      erros.push('DIA_REFERENCIA não corresponde à DATA_REFERENCIA.');
    }
  }

  return resultadoValidacao_(erros, avisos, { configuracoes: config });
}

function definirDataReferencia_(dataReferencia) {
  var config = obterConfiguracoes_();
  var partes = validarCompetencia_(config.COMPETENCIA_ATUAL);
  if (
    dataReferencia.getFullYear() !== partes.ano ||
    dataReferencia.getMonth() + 1 !== partes.mes
  ) {
    throw new Error('A data de corte deve pertencer à competência ' + partes.texto + '.');
  }
  atualizarConfiguracoes_({
    DATA_REFERENCIA: dataReferencia,
    DIA_REFERENCIA: dataReferencia.getDate(),
    DIAS_NO_MES: diasNoMes_(partes.texto)
  });
}

function abrirCompetencia_(competencia) {
  var partes = validarCompetencia_(competencia);
  atualizarConfiguracoes_({
    COMPETENCIA_ATUAL: partes.texto,
    ANO_ATUAL: partes.ano,
    MES_NUM_ATUAL: partes.mes,
    MES_NOME_ATUAL: MESES_PT[partes.mes],
    STATUS_COMPETENCIA: APP_CONFIG.STATUS.OPEN,
    DATA_REFERENCIA: '',
    DIA_REFERENCIA: 0,
    DIAS_NO_MES: diasNoMes_(partes.texto),
    ANO_PADRAO_PAINEL: partes.ano
  });
}
