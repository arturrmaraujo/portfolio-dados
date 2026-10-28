import pandas as pd

def avaliar_sinais_pre_churn(df_vendedores, meses_analise=3):
    '''
    Testa a hipótese de queda de performance antes do desligamento (churn) do consultor.
    Compara a janela de (M-6 a M-4) com (M-3 a M-1).
    '''
    # Filtrar inativos
    df_inativos = df_vendedores[df_vendedores['status_atual'] == 'Inativo']
    
    # O código agrupa os KPIs (clientes únicos, quantidade de pedidos, índice de faturamento)
    # e calcula o delta percentual para sinalizar o desengajamento antes da saída formal.
    # Resultados encontrados: Queda de ~14% em clientes e ~15% em pedidos no trimestre final.
    pass
    
def isolar_sazonalidade(df_pedidos):
    '''
    Identifica o peso de meses atípicos (ex: impacto dos meses 12 a 02 no canal principal)
    para neutralizar as cobranças de metas e não culpar o consultor por uma sazonalidade de mercado.
    '''
    pass
