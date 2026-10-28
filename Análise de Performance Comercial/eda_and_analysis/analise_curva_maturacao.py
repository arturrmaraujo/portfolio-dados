import pandas as pd
import numpy as np

def calcular_benchmarks_por_estagio(df_performance):
    '''
    Constrói a curva M1-M12 calculando P25, Mediana (P50) e P75.
    Para proteção dos dados, os valores em reais foram convertidos 
    para um índice (Base 100), onde 100 representa o patamar saudável maduro.
    '''
    # Filtrar apenas os meses que o consultor alcançou e teve vendas (evitar distorção de meses zerados justificados)
    df_ativos = df_performance[(df_performance['faturamento_indice'] > 0) & (df_performance['mes_performance'] <= 12)]
    
    # Calcular estatísticas por Canal (ex: Generalista vs Contas-Chave) e Mês de Maturidade
    benchmarks = df_ativos.groupby(['canal_atuacao', 'mes_performance'])['faturamento_indice'].agg(
        P25=lambda x: np.percentile(x, 25),
        Mediana='median',
        P75=lambda x: np.percentile(x, 75),
        Qtd_Consultores='count'
    ).reset_index()
    
    return benchmarks

def projetar_curva_desafio_6m(benchmark_df):
    '''
    Simulação gerencial baseada no histórico estatístico:
    Encurta a curva de aprendizado para que o consultor alcance o Índice 100 no M6,
    substituindo a maturação orgânica de 12 meses observada no passado por um modelo de gestão ágil.
    '''
    curva_6m = {
        'M1': 31, # 31% do patamar maduro
        'M2': 46,
        'M3': 62,
        'M4': 74,
        'M5': 85,
        'M6': 100 # Atingimento da maturidade antecipada
    }
    return curva_6m
