# Vercel com backend neste computador

A interface continua em https://biscord-ashy.vercel.app. A API, SQLite, sessoes,
mensagens e chave TOTP ficam neste computador. Nao exige Supabase nem VPS.

## Iniciar

Requer Node.js 24 ou superior. Na pasta do projeto:

```powershell
npm ci
npm run start:local-internet
```

Esse modo ignora DATABASE_URL e BISCORD_CLOUD antigos: usa SQLite local e SSE.
O banco fica em data/biscord.sqlite e a chave TOTP em data/encryption.key.
BISCORD_DATA_DIR permite escolher outra pasta persistente. Nunca apague ou regenere
a chave de um banco existente. Imagens atuais continuam persistidas no banco;
esta alteracao nao implementa um novo sistema de uploads em disco.

Verifique http://127.0.0.1:4173/healthz. A resposta deve informar storage=sqlite.
Este modo serve somente a API; a interface permanece na Vercel.
Para desenvolvimento com interface no localhost, use npm start, sem API_ONLY.

## Tunel HTTPS

Instale o agente oficial ngrok e conecte sua conta seguindo https://ngrok.com/setup.
Configure o token diretamente no seu computador, sem coloca-lo no Git ou no chat.
Em outro terminal:

```powershell
ngrok http http://127.0.0.1:4173 --inspect=false
```

Mantenha os dois processos ativos. Copie a URL HTTPS publica mostrada pelo ngrok.
Nao use Quick Tunnel trycloudflare.com: ele nao suporta o SSE usado pelo projeto.
Um Cloudflare Tunnel configurado com conta e dominio e outra opcao.

## Preparar a interface Vercel

PUBLIC_ORIGIN e a URL da interface, nao a do tunel. No .env local:

```dotenv
PUBLIC_ORIGIN=https://biscord-ashy.vercel.app
BISCORD_API_ORIGIN=https://SEU-ENDERECO.ngrok-free.app
```

Com dist/ ja construido:

```powershell
npm run vercel:prepare
```

O resultado fica em .vercel-stage-local/. Contem a interface, o resolvedor de
catalogos e as rotas da API para o tunel, sem o backend de contas nem dependencias
de banco. A configuracao adiciona o cabecalho que evita a pagina intermediaria do
ngrok inclusive para EventSource e desativa cache da API.

O navegador continua chamando /api no dominio da Vercel. A Vercel encaminha para
<URL-do-tunel>/api. Cookies continuam HttpOnly, Secure, SameSite=Strict e sem Domain.
As verificacoes de origem e CSRF do backend permanecem ativas.

A publicacao deve partir de .vercel-stage-local/, no projeto biscord da equipe
correta. Primeiro valide um preview usando a origem exata desse preview no backend;
um preview tem dominio diferente da producao e nao e autorizado automaticamente.
Apenas depois aponte a producao e mantenha PUBLIC_ORIGIN no dominio de producao.
Nao publique o endereco ficticio usado nos testes.

## O que falta para ativar

- Instalar/autenticar o ngrok e obter a URL publica real.
- Iniciar o backend com os dados locais corretos.
- Conferir se as contas antigas precisam ser importadas do banco atualmente usado.
  Este modo nao copia contas, mensagens ou MFA do banco remoto automaticamente.
- Gerar/publicar o pacote com a URL real e validar login, DM e SSE pelo dominio Vercel.
- Se o tunel mudar de URL, regerar/publicar as rotas antes de o site voltar a funcionar.

O site publico nao foi alterado apenas por executar os testes locais.
Sem o PC ou o tunel ligados, o site estatico abre, mas a API fica indisponivel.
Recuperacao por email continua dependendo de SMTP configurado neste PC; voz/video
continuam usando WebRTC e podem precisar de TURN conforme as redes dos participantes.

## Backup e operacao

Para um backup simples, pare o backend e copie a pasta data/ inteira, incluindo a
chave de criptografia. SQLite e adequado para uma unica instancia deste backend;
nao rode varias copias com bancos separados esperando sincronizacao entre elas.
Suspensao do Windows, perda de internet e encerramento dos terminais interrompem
as conexoes. Esta preparacao nao instala um servico automatico no Windows.

## Testes

npm test inclui testes da configuracao de deploy e um fluxo real isolado com duas
contas, cookies Secure, amizade, DM, evento SSE e bloqueio de origem estrangeira.
Os testes locais nao verificam um tunel real ou uma publicacao Vercel.
