# vulcord para Windows

O cliente Electron abre diretamente a interface da conta, com login e cadastro iguais aos do navegador. A sessão fica salva no aplicativo. A home institucional abre somente no navegador externo.

Execute `npm run desktop` com o servidor ligado. Para gerar o executável: `npm run desktop:build`. A saída fica em `desktop-release-vulcord/vulcord-1.0.5-Windows.exe`.

O build usa somente PUBLIC_ORIGIN (ou BISCORD_DESKTOP_URL) para localizar o servidor. O aplicativo não contém DATABASE_URL, senha do banco nem o arquivo .env. O servidor Node e o túnel precisam permanecer disponíveis. Se a URL do ngrok mudar, gere o cliente novamente.

Uma única janela e instância, aceleração gráfica padrão e limitação de trabalho em segundo plano reduzem trabalho desnecessário. Desempenho depende também do PC, da rede e dos efeitos selecionados.
