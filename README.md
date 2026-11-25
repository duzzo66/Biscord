# Biscord

Site e aplicação de chat com identidade própria, mascote de raposa, contas locais, perfis, configurações, temas e interface de servidores. Backend em Node.js com SQLite ou PostgreSQL/Supabase; frontend em JavaScript, HTML e CSS.

## Executar

Requer **Node.js 24 ou superior**, npm e acesso à internet na primeira preparação.

```sh
npm ci
npm run assets:restore
npm run build
npm start
```

Abra **http://127.0.0.1:4173**. Crie uma conta em `/register`; a aplicação fica em `/channels/@me`.

O cache de mídia de referência tem aproximadamente 6 GB e não é versionado. `asset-cache.json` registra os endereços e arquivos usados pelo projeto. `assets:restore` baixa arquivos públicos ausentes, retoma downloads interrompidos e verifica tamanho e checksum quando disponível. A arte própria da raposa e os catálogos estão incluídos no repositório. Uma origem externa pode deixar de disponibilizar um arquivo; nesse caso o comando relata o caminho e o erro.

```sh
npm run assets:check
npm test
```

## Estrutura

- `client/`: aplicação, configurações, perfis, temas e catálogos.
- `auth/`: cadastro, login e recuperação de conta.
- `backend.mjs`: API, persistência, sessões, CSRF e sincronização.
- `pages/`: páginas públicas arquivadas usadas pelo build.
- `branding/`: raposa, logos, GIFs e substituições de mídia.
- `build-brand.mjs`: aplica a identidade Biscord ao fim do build.
- `dist/`: resultado gerado, não versionado.

Contas, mensagens, sessões e preferências ficam em `data/`, excluída do Git. `.env`, capturas e resultados de testes também não são publicados. Use `.env.example` como referência para configuração local; não coloque credenciais no código.

O servidor escuta somente em `127.0.0.1`. O envio ao GitHub não publica a aplicação na internet.

Para usar PostgreSQL/Supabase, configure `DATABASE_URL` no `.env`. O backend cria suas tabelas no schema privado `biscord` e não importa contas locais. Veja [Supabase e ngrok](SUPABASE.md) para conexão, testes e acesso pelo túnel HTTPS.

## Recursos e limites

Cadastro e login próprios, sessões, TOTP, recuperação por SMTP opcional, perfil, preferências, mensagens diretas e sincronização por SSE. Servidores e canais são espaços privados da conta. A interface inclui impulsos locais gratuitos, catálogos de personalização e prévias de voz e vídeo; chamadas, pagamentos e serviços de terceiros não estão implementados. Não existe integração com contas autenticadas de outro serviço.

Algumas páginas e mídias de referência foram obtidas de fontes públicas do Discord e de catálogos públicos. A identidade visual própria usa Biscord e a raposa. Os arquivos de origem e metadados técnicos preservam referências necessárias para reproduzir o cache. Downloads externos e links presentes em páginas arquivadas continuam sujeitos à disponibilidade de suas origens.

Detalhes: [backend](BACKEND.md), [marca e arte](BRANDING.md), [impulsos](BOOSTS.md), [insígnias](BADGES.md), [cosméticos](COSMETICS.md).
