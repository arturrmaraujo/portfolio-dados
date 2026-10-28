function normalizarTexto_(valor) {
  return String(valor == null ? '' : valor).trim().toUpperCase();
}

function normalizarCompetencia_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  var texto = String(valor == null ? '' : valor).trim();
  var matchIso = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(texto);
  if (matchIso) return matchIso[1] + '-' + matchIso[2];
  var matchPt = /^(?:(\d{2})\/)?(0[1-9]|1[0-2])\/(\d{4})$/.exec(texto);
  if (matchPt) return matchPt[3] + '-' + matchPt[2];
  return texto;
}

function numeroOuNulo_(valor) {
  if (valor === '' || valor == null) return null;
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;
  var convertido = Number(String(valor).replace(/\s/g, '').replace(',', '.'));
  return isFinite(convertido) ? convertido : null;
}

function numeroOuZero_(valor) {
  var numero = numeroOuNulo_(valor);
  return numero == null ? 0 : numero;
}

function obterPlanilha_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function obterAba_(nome) {
  var aba = obterPlanilha_().getSheetByName(nome);
  if (!aba) throw new Error('Aba obrigatória não encontrada: ' + nome);
  return aba;
}

function mapearCabecalhos_(cabecalhos) {
  var mapa = {};
  cabecalhos.forEach(function(cabecalho, indice) {
    var nome = normalizarTexto_(cabecalho);
    if (nome) mapa[nome] = indice;
  });
  return mapa;
}

function lerTabela_(nomeAba) {
  var aba = obterAba_(nomeAba);
  var ultimaLinha = aba.getLastRow();
  var ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 1 || ultimaColuna < 1) {
    return { aba: aba, cabecalhos: [], mapa: {}, linhas: [] };
  }
  var valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  return {
    aba: aba,
    cabecalhos: valores[0],
    mapa: mapearCabecalhos_(valores[0]),
    linhas: valores.slice(1)
  };
}

function exigirCabecalhos_(tabela, obrigatorios) {
  var ausentes = obrigatorios.filter(function(nome) {
    return tabela.mapa[normalizarTexto_(nome)] == null;
  });
  if (ausentes.length) {
    throw new Error(
      'Cabeçalhos ausentes em ' + tabela.aba.getName() + ': ' + ausentes.join(', ')
    );
  }
}

function valorDaLinha_(linha, mapa, cabecalho) {
  var indice = mapa[normalizarTexto_(cabecalho)];
  return indice == null ? null : linha[indice];
}

function chaveMarcaLoja_(marca, codigoLoja) {
  return normalizarTexto_(marca) + '|' + String(codigoLoja == null ? '' : codigoLoja).trim();
}

function chaveRegistro_(competencia, marca, loja) {
  return String(competencia).trim() + '|' + normalizarTexto_(marca) + '|' + normalizarTexto_(loja);
}

function validarCompetencia_(competencia) {
  var texto = normalizarCompetencia_(competencia);
  var match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(texto);
  if (!match) throw new Error('Competência inválida. Use o formato AAAA-MM.');
  return { texto: texto, ano: Number(match[1]), mes: Number(match[2]) };
}

function proximaCompetencia_(competencia) {
  var partes = validarCompetencia_(competencia);
  var data = new Date(partes.ano, partes.mes, 1);
  return Utilities.formatDate(data, Session.getScriptTimeZone(), 'yyyy-MM');
}

function diasNoMes_(competencia) {
  var partes = validarCompetencia_(competencia);
  return new Date(partes.ano, partes.mes, 0).getDate();
}

function parseDataPtBr_(texto) {
  var match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto || '').trim());
  if (!match) throw new Error('Data inválida. Use DD/MM/AAAA.');
  var data = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  if (
    data.getFullYear() !== Number(match[3]) ||
    data.getMonth() !== Number(match[2]) - 1 ||
    data.getDate() !== Number(match[1])
  ) {
    throw new Error('Data inválida.');
  }
  return data;
}

function formatarDataIso_(valor) {
  if (!(valor instanceof Date) || isNaN(valor.getTime())) return '';
  return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatarDataPtBr_(valor) {
  if (!(valor instanceof Date) || isNaN(valor.getTime())) return '';
  return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function limparCacheOperacional_() {
  var cache = CacheService.getScriptCache();
  cache.remove(APP_CONFIG.CACHE_KEY_OPERATIONAL);
  if (APP_CONFIG.CACHE_KEY_MANAGERIAL) cache.remove(APP_CONFIG.CACHE_KEY_MANAGERIAL);
}

function obterUsuarioAtual_() {
  return Session.getActiveUser().getEmail() || 'USUARIO_NAO_IDENTIFICADO';
}

function comBloqueio_(callback) {
  var bloqueio = LockService.getScriptLock();
  bloqueio.waitLock(30000);
  try {
    return callback();
  } finally {
    bloqueio.releaseLock();
  }
}

function resultadoValidacao_(erros, avisos, detalhes) {
  return {
    valido: erros.length === 0,
    erros: erros,
    avisos: avisos,
    detalhes: detalhes || {}
  };
}

function mensagemValidacao_(titulo, validacao) {
  var partes = [titulo];
  if (validacao.erros.length) {
    partes.push('\nERROS:\n- ' + validacao.erros.join('\n- '));
  }
  if (validacao.avisos.length) {
    partes.push('\nAVISOS:\n- ' + validacao.avisos.join('\n- '));
  }
  if (!validacao.erros.length && !validacao.avisos.length) {
    partes.push('\nNenhuma inconsistência encontrada.');
  }
  return partes.join('');
}
