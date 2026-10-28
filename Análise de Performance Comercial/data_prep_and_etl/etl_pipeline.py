import pandas as pd
import numpy as np

def limpar_base_vendas(df_vendas):
    '''
    Filtra marcas de uso interno, brindes e registros de avaria.
    As marcas reais estão mascaradas por motivos de confidencialidade.
    '''
    # Lista anonimizada de itens não-comerciais
    marcas_excluidas = ['Marca_Uso_Interno', 'Material_Apoio_MKT', 'Registro_Avaria']
    
    df_limpo = df_vendas[~df_vendas['marca'].isin(marcas_excluidas)].copy()
    return df_limpo

def normalizar_tempo_de_casa(df_vendas):
    '''
    Recalcula o tempo de casa baseando-se na primeira venda realizada,
    criando a régua de maturidade M1, M2, ..., M12.
    '''
    df_vendas['data_emissao'] = pd.to_datetime(df_vendas['data_emissao'])
    df_vendas['mes_ano'] = df_vendas['data_emissao'].dt.to_period('M')
    
    # Isolar apenas faturamento positivo
    df_vendas_positivas = df_vendas[df_vendas['valor_faturado'] > 0]
    
    # Identificar o M1 por consultor
    df_m1 = df_vendas_positivas.groupby('id_consultor')['mes_ano'].min().reset_index()
    df_m1.rename(columns={'mes_ano': 'mes_ativacao_m1'}, inplace=True)
    
    df_final = pd.merge(df_vendas, df_m1, on='id_consultor', how='left')
    
    # Calcular o mês de performance (Mn)
    df_final['mes_performance'] = (df_final['mes_ano'] - df_final['mes_ativacao_m1']).apply(lambda x: x.n) + 1
    
    return df_final

def calcular_positivacao_mix(df_vendas):
    '''
    Calcula o indicador de positivação no nível Cliente x Marca.
    '''
    positivacao = df_vendas.groupby(['id_consultor', 'mes_ano'])[['id_cliente', 'marca']].nunique().reset_index()
    return positivacao
