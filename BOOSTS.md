# Impulsos do servidor

Os impulsos do Biscord são gratuitos. Não há assinatura ou cobrança. Cada servidor privado pode receber até 100 impulsos locais da conta proprietária. O endpoint POST `/api/servers/:id/boosts` aplica e remove impulsos e aloca benefícios. O backend calcula os resultados e publica atualizações para as sessões da conta. PUT do espaço de trabalho não pode alterar os registros de impulsos nem forjar benefícios.

Níveis 1, 2 e 3 precisam de 2, 7 e 14 impulsos para níveis, respectivamente. Tag e estilos de cargo usam 3 impulsos dedicados cada, separados do saldo de níveis. Alocar pode reduzir o nível; remover impulsos revoga benefícios sem saldo. As regras locais não simulam faturamento nem carência de assinaturas. Referência: https://support.discord.com/hc/en-us/articles/360028038352-Server-Boosting-FAQ

Aplicados: validação de ícone GIF a partir do nível 1, banner estático a partir do nível 2, GIF no banner no nível 3, tag alfanumérica de até quatro caracteres e cor secundária para gradientes de cargos quando alocada. A seleção da tag aparece na prévia. Os gradientes aparecem na lista de cargos. Assets mantidos após perda de nível ficam ocultos quando não há elegibilidade.

As cotas de emoji, figurinhas e sons são calculadas e armazenadas, mas esses módulos de conteúdo ainda não estão disponíveis. Voz, transmissão, convites públicos personalizados e uploads grandes também não têm infraestrutura operacional neste projeto. O painel informa essas limitações.

Testes: `node --test boosts.test.mjs`. Incluem progressão, alocação, remoção, isolamento de servidores e bloqueio de falsificação via workspace.

O acesso pelo menu do servidor ou pela barra lateral abre a apresentação em tela inteira, separada da administração. Os assets públicos originais da apresentação estão em client/assets/boosts, com hashes e origem no manifest.json. O botão de impulsionar abre uma confirmação; cancelar não muda o total. Gerenciar abre o painel administrativo existente. A prévia promocional usa a imagem oficial; não simula reprodução de vídeo.

A rota /channels/:serverId/boosts renderiza o painel interno, preservando as barras do servidor e os canais. O botão Impulsos de servidor na barra lateral navega para essa rota; o item do menu do nome do servidor continua abrindo a apresentação. O painel calcula disponíveis/gastos/total a partir dos benefícios retornados pelo backend e permite ativar/desativar as vantagens implementadas.
