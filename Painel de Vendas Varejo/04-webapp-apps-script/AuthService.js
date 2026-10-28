function hashSenhaGerencial_(senha, salt) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + '|' + String(senha),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(byte) {
    return ('0' + (byte & 255).toString(16)).slice(-2);
  }).join('');
}

function chaveTentativasAuth_(usuario) {
  var resumo = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normalizarTexto_(usuario))
  ).slice(0, 24);
  return 'AUTH_FAIL_' + resumo;
}

function validarPermissaoConfiguracaoAcesso_() {
  var emailAtivo = Session.getActiveUser().getEmail();
  if (!emailAtivo) throw new Error('Não foi possível identificar o usuário ativo da planilha.');
  var proprietario = DriveApp.getFileById(obterPlanilha_().getId()).getOwner().getEmail();
  if (normalizarTexto_(emailAtivo) !== normalizarTexto_(proprietario)) {
    throw new Error('Somente o proprietário da planilha pode configurar o acesso gerencial.');
  }
}

function salvarConfiguracaoAcessoGerencial(usuario, senha) {
  validarPermissaoConfiguracaoAcesso_();
  usuario = String(usuario || '').trim().toLowerCase();
  senha = String(senha || '');
  if (usuario.length < 3) throw new Error('O usuário deve ter pelo menos 3 caracteres.');
  if (senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');

  var salt = Utilities.getUuid();
  var propriedades = {};
  propriedades[APP_CONFIG.AUTH_PROPERTIES.USER] = usuario;
  propriedades[APP_CONFIG.AUTH_PROPERTIES.SALT] = salt;
  propriedades[APP_CONFIG.AUTH_PROPERTIES.PASSWORD_HASH] = hashSenhaGerencial_(senha, salt);
  PropertiesService.getScriptProperties().setProperties(propriedades, false);
  return { salvo: true, usuario: usuario };
}

function acessoGerencialConfigurado_() {
  var props = PropertiesService.getScriptProperties();
  return !!(
    props.getProperty(APP_CONFIG.AUTH_PROPERTIES.USER) &&
    props.getProperty(APP_CONFIG.AUTH_PROPERTIES.SALT) &&
    props.getProperty(APP_CONFIG.AUTH_PROPERTIES.PASSWORD_HASH)
  );
}

function autenticarGerencia(usuario, senha) {
  usuario = String(usuario || '').trim().toLowerCase();
  senha = String(senha || '');
  if (!acessoGerencialConfigurado_()) {
    return { autenticado: false, codigo: 'ACESSO_NAO_CONFIGURADO', mensagem: 'Acesso gerencial ainda não configurado.' };
  }

  var cache = CacheService.getScriptCache();
  var chaveFalhas = chaveTentativasAuth_(usuario);
  var falhas = Number(cache.get(chaveFalhas)) || 0;
  if (falhas >= APP_CONFIG.AUTH_MAX_ATTEMPTS) {
    return { autenticado: false, codigo: 'ACESSO_TEMPORARIAMENTE_BLOQUEADO', mensagem: 'Muitas tentativas. Aguarde 10 minutos.' };
  }

  var props = PropertiesService.getScriptProperties();
  var usuarioValido = props.getProperty(APP_CONFIG.AUTH_PROPERTIES.USER);
  var salt = props.getProperty(APP_CONFIG.AUTH_PROPERTIES.SALT);
  var hashValido = props.getProperty(APP_CONFIG.AUTH_PROPERTIES.PASSWORD_HASH);
  var hashInformado = hashSenhaGerencial_(senha, salt);

  if (usuario !== usuarioValido || hashInformado !== hashValido) {
    falhas++;
    cache.put(chaveFalhas, String(falhas), APP_CONFIG.AUTH_BLOCK_SECONDS);
    return { autenticado: false, codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'Usuário ou senha inválidos.' };
  }

  cache.remove(chaveFalhas);
  var token = Utilities.getUuid() + Utilities.getUuid();
  cache.put(
    'SESSAO_GERENCIAL_' + token,
    JSON.stringify({ usuario: usuario, criadaEm: new Date().toISOString() }),
    APP_CONFIG.AUTH_SESSION_SECONDS
  );
  return {
    autenticado: true,
    token: token,
    usuario: usuario,
    expiraEmSegundos: APP_CONFIG.AUTH_SESSION_SECONDS
  };
}

/**
 * Autentica e devolve a carga gerencial na mesma chamada do navegador.
 *
 * O HtmlService pode perder uma segunda chamada google.script.run feita
 * imediatamente dentro do callback da autenticação. Consolidar as duas
 * operações evita que a interface permaneça bloqueada entre uma chamada e
 * outra.
 */
function autenticarECarregarGerencia(usuario, senha) {
  var autenticacao = autenticarGerencia(usuario, senha);

  if (!autenticacao.autenticado) {
    return autenticacao;
  }

  try {
    return {
      autenticado: true,
      token: autenticacao.token,
      usuario: autenticacao.usuario,
      expiraEmSegundos: autenticacao.expiraEmSegundos,
      carga: obterCargaGerencial(autenticacao.token)
    };
  } catch (erro) {
    encerrarSessaoGerencial(autenticacao.token);
    throw erro;
  }
}

function validarSessaoGerencial_(token) {
  token = String(token || '').trim();
  if (!token) throw new Error('Sessão gerencial não informada.');
  var cache = CacheService.getScriptCache();
  var chave = 'SESSAO_GERENCIAL_' + token;
  var sessao = cache.get(chave);
  if (!sessao) throw new Error('Sessão gerencial expirada. Entre novamente.');
  cache.put(chave, sessao, APP_CONFIG.AUTH_SESSION_SECONDS);
  return JSON.parse(sessao);
}

function encerrarSessaoGerencial(token) {
  token = String(token || '').trim();
  if (token) CacheService.getScriptCache().remove('SESSAO_GERENCIAL_' + token);
  return { encerrada: true };
}
