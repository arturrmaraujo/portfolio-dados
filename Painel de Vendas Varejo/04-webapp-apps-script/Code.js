function doGet(e) {
  var pagina = e && e.parameter
    ? String(e.parameter.pagina || e.parameter.view || '')
    : '';

  pagina = pagina.trim().toLowerCase();

  var gerencial = pagina === 'gerencial';

  return HtmlService
    .createHtmlOutputFromFile(
      gerencial ? 'gerencial' : 'vendas_varejo'
    )
    .setTitle(
      gerencial
        ? 'Visão Gerencial - Rede Varejo'
        : 'Painel de Vendas - Rede Varejo'
    )
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1'
    );
}

function obterUrlAplicacao() {
  return ScriptApp.getService().getUrl();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Painel Rede Varejo')
    .addItem(
      'Atualizar resultados atuais',
      'atualizarResultadosMenu'
    )
    .addSeparator()
    .addItem(
      'Validar planejamento',
      'validarPlanejamentoMenu'
    )
    .addItem(
      'Publicar metas',
      'publicarPlanejamentoMenu'
    )
    .addSeparator()
    .addItem(
      'Configurar acesso gerencial',
      'configurarAcessoGerencialMenu'
    )
    .addSeparator()
    .addItem(
      'Validar fechamento',
      'validarFechamentoMenu'
    )
    .addItem(
      'Fechar competência',
      'fecharCompetenciaMenu'
    )
    .addToUi();
}

function configurarAcessoGerencialMenu() {
  try {
    validarPermissaoConfiguracaoAcesso_();

    var html = HtmlService
      .createHtmlOutputFromFile('config_acesso')
      .setWidth(430)
      .setHeight(430);

    SpreadsheetApp
      .getUi()
      .showModalDialog(
        html,
        'Configurar acesso gerencial'
      );
  } catch (erro) {
    SpreadsheetApp.getUi().alert(
      'Acesso não alterado',
      erro.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function atualizarResultadosMenu() {
  var ui = SpreadsheetApp.getUi();
  var config = obterConfiguracoes_();

  var resposta = ui.prompt(
    'Atualizar resultados',
    'Informe a data de corte da BASE_VENDAS para ' +
      config.COMPETENCIA_ATUAL +
      ' no formato DD/MM/AAAA.',
    ui.ButtonSet.OK_CANCEL
  );

  if (resposta.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  try {
    var data = parseDataPtBr_(
      resposta.getResponseText()
    );

    var retorno = comBloqueio_(function() {
      return sincronizarResultadosAtuais_({
        dataReferencia: data
      });
    });

    ui.alert(
      'Atualização concluída',
      retorno.linhas +
        ' linhas geradas para ' +
        retorno.competencia +
        '.\nData de corte: ' +
        retorno.dataReferencia,
      ui.ButtonSet.OK
    );
  } catch (erro) {
    ui.alert(
      'Atualização não concluída',
      erro.message,
      ui.ButtonSet.OK
    );
  }
}

function validarPlanejamentoMenu() {
  var ui = SpreadsheetApp.getUi();

  try {
    var validacao = validarPlanejamentoAtual();

    ui.alert(
      'Validação do planejamento',
      mensagemValidacao_('', validacao),
      ui.ButtonSet.OK
    );
  } catch (erro) {
    ui.alert(
      'Erro na validação',
      erro.message,
      ui.ButtonSet.OK
    );
  }
}

function publicarPlanejamentoMenu() {
  var ui = SpreadsheetApp.getUi();

  var confirmacao = ui.alert(
    'Publicar metas',
    'As metas publicadas passarão a aparecer no painel. Deseja continuar?',
    ui.ButtonSet.YES_NO
  );

  if (confirmacao !== ui.Button.YES) {
    return;
  }

  try {
    var retorno = publicarPlanejamentoAtual();

    ui.alert(
      'Planejamento publicado',
      retorno.linhas +
        ' linhas publicadas para ' +
        retorno.competencia +
        '.',
      ui.ButtonSet.OK
    );
  } catch (erro) {
    ui.alert(
      'Publicação não concluída',
      erro.message,
      ui.ButtonSet.OK
    );
  }
}

function validarFechamentoMenu() {
  var ui = SpreadsheetApp.getUi();

  try {
    var validacao = validarFechamentoAtual();

    ui.alert(
      'Validação do fechamento',
      mensagemValidacao_('', validacao),
      ui.ButtonSet.OK
    );
  } catch (erro) {
    ui.alert(
      'Erro na validação',
      erro.message,
      ui.ButtonSet.OK
    );
  }
}

function fecharCompetenciaMenu() {
  var ui = SpreadsheetApp.getUi();

  try {
    var validacao = validarFechamentoAtual();

    if (!validacao.valido) {
      ui.alert(
        'Fechamento bloqueado',
        mensagemValidacao_('', validacao),
        ui.ButtonSet.OK
      );

      return;
    }

    var mensagem =
      'A competência ' +
      validacao.detalhes.competencia +
      ' será arquivada como valores.\n' +
      'A BASE_VENDAS será limpa e a competência seguinte será aberta.';

    if (validacao.avisos.length) {
      mensagem +=
        '\n\nAvisos:\n- ' +
        validacao.avisos.join('\n- ');
    }

    var confirmacao = ui.alert(
      'Confirmar fechamento',
      mensagem,
      ui.ButtonSet.YES_NO
    );

    if (confirmacao !== ui.Button.YES) {
      return;
    }

    var retorno = fecharCompetenciaAtual();

    ui.alert(
      'Fechamento concluído',
      retorno.competenciaFechada +
        ' foi fechada com ' +
        retorno.linhasArquivadas +
        ' linhas.\nNova competência: ' +
        retorno.competenciaAberta +
        '.',
      ui.ButtonSet.OK
    );
  } catch (erro) {
    ui.alert(
      'Fechamento não concluído',
      erro.message,
      ui.ButtonSet.OK
    );
  }
}