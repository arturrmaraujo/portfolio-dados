function validarPlanejamento_(competencia, exigirMetas) {
  var erros = [];
  var avisos = [];
  var leitura = lerPlanejamento_(competencia);
  var linhas = leitura.linhas;
  var chaves = {};
  var marcas = {};

  if (!linhas.length) erros.push('Não há planejamento para ' + competencia + '.');

  linhas.forEach(function(item) {
    var chave = item.competencia + '|' + chaveMarcaLoja_(item.marca, item.codigoLoja);
    if (chaves[chave]) erros.push('Linha duplicada no planejamento: ' + chave);
    chaves[chave] = true;

    if (!marcas[item.marca]) {
      marcas[item.marca] = {
        pesos: 0,
        linhasComPeso: 0,
        metasR: {},
        metasQtd: {},
        pendenciasPeso: 0
      };
    }
    var marca = marcas[item.marca];
    if (item.peso != null) {
      marca.pesos += item.peso;
      marca.linhasComPeso++;
    } else if (item.statusPeso === APP_CONFIG.STATUS.NOT_INFORMED) {
      marca.pendenciasPeso++;
    }
    if (item.metaMarcaR != null) marca.metasR[String(item.metaMarcaR)] = true;
    if (item.metaMarcaQtd != null) marca.metasQtd[String(item.metaMarcaQtd)] = true;
  });

  Object.keys(marcas).forEach(function(nomeMarca) {
    var marca = marcas[nomeMarca];
    if (marca.linhasComPeso && !pesoPlanejamentoValido_(marca.pesos)) {
      erros.push(
        nomeMarca + ': soma dos pesos = ' + (marca.pesos * 100).toFixed(2) + '%.'
      );
    }
    if (marca.pendenciasPeso) {
      avisos.push(nomeMarca + ': ' + marca.pendenciasPeso + ' peso(s) não informado(s).');
    }
    if (Object.keys(marca.metasR).length > 1) {
      erros.push(nomeMarca + ': há mais de uma meta financeira para a mesma competência.');
    }
    if (Object.keys(marca.metasQtd).length > 1) {
      erros.push(nomeMarca + ': há mais de uma meta de quantidade para a mesma competência.');
    }
    if (exigirMetas) {
      if (Object.keys(marca.metasR).length !== 1) erros.push(nomeMarca + ': meta financeira não informada.');
      if (Object.keys(marca.metasQtd).length !== 1) erros.push(nomeMarca + ': meta de quantidade não informada.');
    }
  });

  return resultadoValidacao_(erros, avisos, {
    competencia: competencia,
    linhas: linhas.length,
    marcas: Object.keys(marcas).length
  });
}

function validarPlanejamentoAtual() {
  var competencia = String(obterConfiguracoes_().COMPETENCIA_ATUAL || '').trim();
  return validarPlanejamento_(competencia, false);
}

function publicarPlanejamentoAtual() {
  return comBloqueio_(function() {
    var competencia = String(obterConfiguracoes_().COMPETENCIA_ATUAL || '').trim();
    recalcularMetasLojasPlanejamento_(competencia);
    SpreadsheetApp.flush();
    var validacao = validarPlanejamento_(competencia, true);
    if (!validacao.valido) throw new Error(mensagemValidacao_('Planejamento não publicado.', validacao));

    var leitura = lerPlanejamento_(competencia);
    var mapa = leitura.tabela.mapa;
    var colunaStatus = mapa.STATUS_PLANEJAMENTO + 1;
    var colunaData = mapa.DATA_PUBLICACAO + 1;
    var agora = new Date();

    leitura.linhas.forEach(function(item) {
      leitura.tabela.aba.getRange(item.linhaPlanilha, colunaStatus).setValue(APP_CONFIG.STATUS.PUBLISHED);
      var celulaData = leitura.tabela.aba.getRange(item.linhaPlanilha, colunaData);
      celulaData.setValue(agora);
    });

    SpreadsheetApp.flush();
    limparCacheOperacional_();
    limparCacheGerencial_();
    return {
      publicado: true,
      competencia: competencia,
      linhas: leitura.linhas.length,
      dataPublicacao: formatarDataPtBr_(agora)
    };
  });
}

/**
 * Retorna as linhas que ainda podem ser alteradas pelo planejador gerencial.
 * Nesta primeira versão, o planejamento publicado fica imutável: a edição é
 * feita no rascunho e só passa a valer no painel após a publicação.
 */
function obterPlanejamentoEditavel_(competencia) {
  var leitura = lerPlanejamento_(competencia);
  var publicadas = leitura.linhas.filter(function(item) {
    return item.statusPlanejamento === APP_CONFIG.STATUS.PUBLISHED;
  });
  if (publicadas.length) {
    throw new Error(
      'O planejamento de ' + competencia + ' já foi publicado e não pode ser alterado nesta etapa.'
    );
  }
  if (!leitura.linhas.length) {
    throw new Error('Não há linhas de planejamento para ' + competencia + '.');
  }
  return leitura;
}

function salvarMetasPlanejamentoGerencial(token, metas) {
  validarSessaoGerencial_(token);
  if (!Array.isArray(metas) || !metas.length) {
    throw new Error('Informe ao menos uma meta de marca.');
  }

  return comBloqueio_(function() {
    var competencia = String(obterConfiguracoes_().COMPETENCIA_ATUAL || '').trim();
    validarCompetencia_(competencia);
    var leitura = obterPlanejamentoEditavel_(competencia);
    var porMarca = {};

    metas.forEach(function(item) {
      var marca = normalizarTexto_(item && item.marca);
      var metaR = numeroOuNulo_(item && item.metaR);
      var metaQtd = numeroOuNulo_(item && item.metaQtd);
      if (!marca) throw new Error('Há uma marca sem identificação.');
      if (metaR == null || metaR <= 0) throw new Error(marca + ': informe uma meta financeira maior que zero.');
      if (metaQtd == null || metaQtd <= 0 || Math.round(metaQtd) !== metaQtd) {
        throw new Error(marca + ': informe uma meta de unidades inteira e maior que zero.');
      }
      porMarca[marca] = { metaR: metaR, metaQtd: metaQtd };
    });

    var marcasPlanejamento = {};
    leitura.linhas.forEach(function(item) { marcasPlanejamento[item.marca] = true; });
    Object.keys(marcasPlanejamento).forEach(function(marca) {
      if (!porMarca[marca]) throw new Error('A meta da marca ' + marca + ' não foi informada.');
    });

    var aba = leitura.tabela.aba;
    var mapa = leitura.tabela.mapa;
    leitura.linhas.forEach(function(linha) {
      var meta = porMarca[linha.marca];
      aba.getRange(linha.linhaPlanilha, mapa.META_MARCA_R$ + 1).setValue(meta.metaR);
      aba.getRange(linha.linhaPlanilha, mapa.META_MARCA_QTD + 1).setValue(meta.metaQtd);
      aba.getRange(linha.linhaPlanilha, mapa.STATUS_PLANEJAMENTO + 1).setValue(APP_CONFIG.STATUS.DRAFT);
      aba.getRange(linha.linhaPlanilha, mapa.DATA_PUBLICACAO + 1).clearContent();
    });
    SpreadsheetApp.flush();
    recalcularMetasLojasPlanejamento_(competencia);
    SpreadsheetApp.flush();
    limparCacheOperacional_();
    limparCacheGerencial_();
    return montarCargaGerencial_();
  });
}

function salvarPesosPlanejamentoGerencial(token, marca, pesos) {
  validarSessaoGerencial_(token);
  marca = normalizarTexto_(marca);
  if (!marca) throw new Error('Selecione uma marca para salvar os pesos.');
  if (!Array.isArray(pesos) || !pesos.length) throw new Error('Informe os pesos das lojas.');

  return comBloqueio_(function() {
    var competencia = String(obterConfiguracoes_().COMPETENCIA_ATUAL || '').trim();
    var leitura = obterPlanejamentoEditavel_(competencia);
    salvarPesosMarca_(competencia, leitura, marca, pesos);
    SpreadsheetApp.flush();
    recalcularMetasLojasPlanejamento_(competencia);
    SpreadsheetApp.flush();
    limparCacheOperacional_();
    limparCacheGerencial_();
    return montarCargaGerencial_();
  });
}

function salvarTodosPesosPlanejamentoGerencial(token, pesosPorMarca) {
  validarSessaoGerencial_(token);
  if (!pesosPorMarca || typeof pesosPorMarca !== 'object') {
    throw new Error('Informe os pesos de todas as marcas.');
  }

  return comBloqueio_(function() {
    var competencia = String(obterConfiguracoes_().COMPETENCIA_ATUAL || '').trim();
    var leitura = obterPlanejamentoEditavel_(competencia);
    var marcas = {};
    leitura.linhas.forEach(function(linha) { marcas[linha.marca] = true; });
    Object.keys(marcas).forEach(function(marca) {
      if (!Array.isArray(pesosPorMarca[marca]) || !pesosPorMarca[marca].length) {
        throw new Error('Os pesos da marca ' + marca + ' não foram informados.');
      }
      salvarPesosMarca_(competencia, leitura, marca, pesosPorMarca[marca]);
      SpreadsheetApp.flush();
      leitura = lerPlanejamento_(competencia);
    });
    recalcularMetasLojasPlanejamento_(competencia);
    SpreadsheetApp.flush();
    limparCacheOperacional_();
    limparCacheGerencial_();
    return montarCargaGerencial_();
  });
}

function salvarPesosMarca_(competencia, leitura, marca, pesos) {
  var linhasMarca = leitura.linhas.filter(function(item) { return item.marca === marca; });
  if (!linhasMarca.length) throw new Error('Marca não encontrada no planejamento: ' + marca + '.');

  var lojasCadastradas = {};
  lerLojas_().filter(function(loja) { return loja.ativa; }).forEach(function(loja) {
    lojasCadastradas[String(loja.codigo)] = loja;
  });
  var linhasPorCodigo = {};
  linhasMarca.forEach(function(linha) { linhasPorCodigo[String(linha.codigoLoja)] = linha; });
  var pesosInformados = {};
  pesos.forEach(function(item) {
    var codigo = String(item && item.codigoLoja == null ? '' : item.codigoLoja).trim();
    var peso = numeroOuNulo_(item && item.peso);
    if (!codigo) throw new Error('Há uma loja sem código no envio dos pesos.');
    if (!lojasCadastradas[codigo] && !linhasPorCodigo[codigo]) throw new Error('A loja informada não está disponível no cadastro: ' + codigo + '.');
    if (pesosInformados[codigo]) throw new Error('A loja ' + codigo + ' foi informada mais de uma vez.');
    var ativa = item && item.ativa === true;
    if (ativa && (peso == null || peso < 0)) throw new Error('Informe um peso válido para cada loja ativada da marca ' + marca + '.');
    pesosInformados[codigo] = { ativa: ativa, peso: ativa ? peso : 0 };
  });
  Object.keys(lojasCadastradas).forEach(function(codigo) {
    if (!Object.prototype.hasOwnProperty.call(pesosInformados, codigo)) throw new Error('Defina se a loja ' + lojasCadastradas[codigo].sigla + ' estará ativa para a marca ' + marca + '.');
  });
  var total = Object.keys(pesosInformados).reduce(function(acumulado, codigo) {
    return acumulado + (pesosInformados[codigo].ativa ? pesosInformados[codigo].peso : 0);
  }, 0);
  if (!pesoPlanejamentoValido_(total)) throw new Error('A soma dos pesos das lojas ativas de ' + marca + ' deve ser exatamente 100%. Valor informado: ' + (total * 100).toFixed(2) + '%.');

  var aba = leitura.tabela.aba;
  var mapa = leitura.tabela.mapa;
  linhasMarca.forEach(function(linha) {
    var codigo = String(linha.codigoLoja).trim();
    if (!Object.prototype.hasOwnProperty.call(pesosInformados, codigo)) return;
    var pesoInformado = pesosInformados[codigo];
    if (pesoInformado.ativa) {
      aba.getRange(linha.linhaPlanilha, mapa.PESO + 1).setValue(pesoInformado.peso);
      aba.getRange(linha.linhaPlanilha, mapa.STATUS_PESO + 1).setValue(APP_CONFIG.STATUS.REGISTERED);
    } else {
      aba.getRange(linha.linhaPlanilha, mapa.PESO + 1).clearContent();
      aba.getRange(linha.linhaPlanilha, mapa.STATUS_PESO + 1).setValue(APP_CONFIG.STATUS.NOT_APPLICABLE);
    }
    aba.getRange(linha.linhaPlanilha, mapa.STATUS_PLANEJAMENTO + 1).setValue(APP_CONFIG.STATUS.DRAFT);
    aba.getRange(linha.linhaPlanilha, mapa.DATA_PUBLICACAO + 1).clearContent();
  });

  var novasLinhas = [];
  Object.keys(pesosInformados).forEach(function(codigo) {
    var pesoInformado = pesosInformados[codigo];
    if (!pesoInformado.ativa || linhasPorCodigo[codigo]) return;
    var loja = lojasCadastradas[codigo];
    var referenciaMarca = linhasMarca[0];
    novasLinhas.push([competencia, marca, codigo, loja.sigla, referenciaMarca.metaMarcaR == null ? '' : referenciaMarca.metaMarcaR, referenciaMarca.metaMarcaQtd == null ? '' : referenciaMarca.metaMarcaQtd, pesoInformado.peso, APP_CONFIG.STATUS.REGISTERED, '', '', APP_CONFIG.STATUS.DRAFT, '', 'Loja ativada pelo painel gerencial']);
  });
  if (novasLinhas.length) {
    var primeiraLinha = aba.getLastRow() + 1;
    aba.getRange(primeiraLinha, 1, novasLinhas.length, APP_CONFIG.PLANNING_HEADERS.length).setValues(novasLinhas);
    var metasLojas = novasLinhas.map(function(linha) {
      return [numeroOuNulo_(linha[4]) == null ? '' : numeroOuNulo_(linha[4]) * linha[6], numeroOuNulo_(linha[5]) == null ? '' : numeroOuNulo_(linha[5]) * linha[6]];
    });
    aba.getRange(primeiraLinha, mapa.META_LOJA_R$ + 1, novasLinhas.length, 2).setValues(metasLojas);
  }
}

function recalcularMetasLojasPlanejamento_(competencia) {
  var leitura = lerPlanejamento_(competencia);
  var mapa = leitura.tabela.mapa;
  var linhasPorMarca = {};

  leitura.linhas.forEach(function(linha) {
    if (!linhasPorMarca[linha.marca]) linhasPorMarca[linha.marca] = [];
    linhasPorMarca[linha.marca].push(linha);
  });

  Object.keys(linhasPorMarca).forEach(function(marca) {
    var linhasMarca = linhasPorMarca[marca];
    var referencia = linhasMarca[0];
    var ativas = linhasMarca.filter(function(linha) {
      return linha.statusPeso !== APP_CONFIG.STATUS.NOT_APPLICABLE && linha.peso != null;
    });
    var metasR = distribuirMetaPorPeso_(referencia.metaMarcaR, ativas, 100);
    var metasQtd = distribuirMetaPorPeso_(referencia.metaMarcaQtd, ativas, 1);

    linhasMarca.forEach(function(linha) {
      var metaR = Object.prototype.hasOwnProperty.call(metasR, linha.linhaPlanilha)
        ? metasR[linha.linhaPlanilha] / 100
        : '';
      var metaQtd = Object.prototype.hasOwnProperty.call(metasQtd, linha.linhaPlanilha)
        ? metasQtd[linha.linhaPlanilha]
        : '';
      leitura.tabela.aba
        .getRange(linha.linhaPlanilha, mapa.META_LOJA_R$ + 1, 1, 2)
        .setValues([[metaR, metaQtd]]);
    });
  });
}

function recalcularMetasLojasPlanejamentoAtual() {
  return comBloqueio_(function() {
    var competencia = String(obterConfiguracoes_().COMPETENCIA_ATUAL || '').trim();
    validarCompetencia_(competencia);
    recalcularMetasLojasPlanejamento_(competencia);
    SpreadsheetApp.flush();
    limparCacheOperacional_();
    limparCacheGerencial_();
    return {
      competencia: competencia,
      mensagem: 'Metas por loja recalculadas sem alterar RESULTADOS.'
    };
  });
}

function pesoPlanejamentoValido_(total) {
  return Math.abs(Number(total) - 1) < 0.0000001;
}

function distribuirMetaPorPeso_(metaTotal, linhas, multiplicador) {
  var distribuicao = {};
  if (metaTotal == null || !linhas.length) return distribuicao;

  var totalEmMenorUnidade = Math.round(Number(metaTotal) * multiplicador);
  var calculos = linhas.map(function(linha) {
    var exato = totalEmMenorUnidade * Number(linha.peso);
    var base = Math.floor(exato);
    return {
      linhaPlanilha: linha.linhaPlanilha,
      base: base,
      resto: exato - base,
      codigoLoja: String(linha.codigoLoja)
    };
  });
  var distribuido = calculos.reduce(function(total, item) { return total + item.base; }, 0);
  var restante = totalEmMenorUnidade - distribuido;

  calculos.sort(function(a, b) {
    if (b.resto !== a.resto) return b.resto - a.resto;
    return a.codigoLoja.localeCompare(b.codigoLoja, 'pt-BR');
  });
  for (var indice = 0; indice < restante; indice++) calculos[indice].base++;

  calculos.forEach(function(item) {
    distribuicao[item.linhaPlanilha] = item.base;
  });
  return distribuicao;
}

function publicarPlanejamentoGerencial(token) {
  validarSessaoGerencial_(token);
  return publicarPlanejamentoAtual();
}

function criarPlanejamentoProximaCompetencia_(competenciaOrigem, competenciaDestino) {
  var destinoExistente = lerPlanejamento_(competenciaDestino);
  if (destinoExistente.linhas.length) {
    return { criado: false, linhas: destinoExistente.linhas.length, motivo: 'Planejamento já existente.' };
  }

  var origem = lerPlanejamento_(competenciaOrigem);
  if (!origem.linhas.length) throw new Error('Planejamento de origem não encontrado: ' + competenciaOrigem);
  var linhasNovas = origem.linhas.map(function(item) {
    return [
      competenciaDestino,
      item.marca,
      item.codigoLoja,
      item.loja,
      '',
      '',
      item.peso == null ? '' : item.peso,
      item.statusPeso,
      '',
      '',
      APP_CONFIG.STATUS.DRAFT,
      '',
      'Pesos copiados de ' + competenciaOrigem
    ];
  });

  var aba = origem.tabela.aba;
  var primeiraLinha = aba.getLastRow() + 1;
  aba.getRange(primeiraLinha, 1, linhasNovas.length, APP_CONFIG.PLANNING_HEADERS.length).setValues(linhasNovas);

  return { criado: true, linhas: linhasNovas.length };
}
