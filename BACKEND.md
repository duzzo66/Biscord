# Biscord: contas e configurações

Execute com Node.js 24 ou superior:

```powershell
npm install
node build-auth.mjs
npm start
```

Abra http://127.0.0.1:4173/register para criar uma conta deste servidor. As telas antigas só guardavam um perfil de apresentação; esses perfis não eram contas e não são convertidos em credenciais. O Biscord é independente do Discord e não valida credenciais do Discord.

O servidor escuta apenas em `127.0.0.1`. Não foi publicado na internet.

## Recursos implementados

- Cadastro, login com e-mail ou usuário e sessões com cookie HttpOnly e SameSite=Strict.
- Senhas com scrypt e salt aleatório; proteção de mutações por CSRF e verificação de origem; limites de tentativas.
- Perfil com avatar, nome, pronomes, descrição e cor; troca de e-mail e usuário com confirmação de senha.
- Autenticador TOTP, confirmação por código, códigos de recuperação de uso único, troca de senha e revogação de outras sessões.
- Lista e revogação de dispositivos conectados; exportação JSON; desativação, reativação e exclusão de conta.
- Preferências no servidor: temas, acessibilidade, mensagens, notificações, dispositivos de áudio, privacidade e modo desenvolvedor.
- Sincronização por Server-Sent Events e controle de revisão para evitar sobrescrever alterações concorrentes no espaço de trabalho.
- Solicitações de amizade entre contas deste servidor, aceitação, bloqueios, mensagens diretas, imagens, reações e mensagens fixadas. As permissões de recebimento são verificadas no backend.
- Servidores e canais da interface são espaços privados da conta e sincronizam entre suas sessões. Seus links não criam servidores compartilhados nem concedem acesso a outras contas.
- Microfone e câmera têm testes locais por permissão explícita no navegador; não são enviados ao servidor.

## Persistência

`data/biscord.sqlite` guarda as contas e os dados. `data/encryption.key` cifra os segredos TOTP. Faça backup da pasta inteira com o servidor parado, incluindo a chave. Não versione essa pasta. As senhas, os tokens de sessão e os códigos de recuperação não são armazenados em texto puro.

## E-mail e serviços externos

Para recuperação de conta, copie `.env.example` para `.env`, configure SMTP e `RESET_BASE_URL`, e inicie com `node --env-file=.env server.mjs`. Sem SMTP, a interface informa que a recuperação está indisponível; não finge enviar mensagens.

Cobrança, Nitro, presentes, impulsos, Central da Família, OAuth e chamadas entre usuários não estão conectados. As páginas correspondentes indicam sua indisponibilidade. Não há assinaturas ou transações fictícias, nem integração com contas do Discord.

## Verificação

```powershell
npm test
```

Os testes usam banco isolado no diretório temporário e verificam autenticação, permissões, CSRF, isolamento, persistência, concorrência, sessões, TOTP, recuperação por código, ciclo da conta e mensagens entre usuários. Nenhuma conta real é usada.

## Sons e movimento

O pacote `client/assets/sounds` contém 93 arquivos MP3 obtidos dos assets públicos do Discord. O manifesto registra URL original, tamanho e SHA-256. `node download-sounds.mjs` atualiza esses arquivos a partir do bundle público atual.

As notificações de mensagens e os controles de microfone/áudio usam os sons originais. Entrar e desconectar da sala de voz da interface também tem retorno sonoro; isso não adiciona transporte de chamadas. Em Configurações → Notificações há volume, seleção de toque e amostras. O navegador exige uma interação antes de reproduzir automaticamente. Modo streamer, Não perturbe, áudio desativado e preferências de som são respeitados.

`polish.css` e `polish.js` são compartilhados pelas páginas públicas, autenticação e área interna. `node build-polish.mjs` injeta esses recursos nas páginas já geradas; o build do cliente também executa essa etapa. As animações respeitam `prefers-reduced-motion` e a preferência de acessibilidade da conta. Os vídeos da home continuam sem áudio automático.

## Editor de perfil

Em Configurações → Editar perfis, o editor mostra campos e prévia em duas colunas. Alterações em nome, pronomes, descrição, avatar, banner e cores ficam em rascunho até salvar. Há recorte e zoom para PNG/JPG/WEBP, preservação de GIFs de até 600 KB, redefinição e proteção contra saída com alterações pendentes. Banner e cor de destaque são persistidos no perfil da conta. Decorações e efeitos do catálogo oficial não estão conectados. A fidelidade visual à aba autenticada ainda requer comparação por captura de tela.
