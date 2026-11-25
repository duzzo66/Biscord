# Chamadas e transmissão

Nas mensagens diretas entre amigos, use o telefone para ligar. O destinatário recebe Atender/Recusar. O painel permite silenciar o microfone, desativar áudio, ligar a câmera, compartilhar uma janela/tela e encerrar. Câmera e tela usam o mesmo canal de vídeo: pare a fonte atual antes de trocar.

Sinalização autenticada, CSRF, checagem de amizade e bloqueios no servidor; mídia WebRTC ponto a ponto, sem gravação. As chamadas são temporárias e encerram quando o servidor reinicia. Sessões sem heartbeat expiram em dois minutos.

A implementação usa STUN público. Redes que bloqueiam conexões diretas precisam de TURN; sem um serviço TURN configurado não há garantia de conexão entre todas as redes. Compartilhamento transmite vídeo da tela, sem áudio do sistema. Canais de voz dos servidores ainda não têm participantes sincronizados: esta implementação cobre chamadas entre duas contas amigas.

Web exige HTTPS, exceto localhost. Permita microfone/câmera no navegador e selecione a tela na caixa nativa. O cliente desktop precisa ser reempacotado para incluir o seletor de captura do Electron.
