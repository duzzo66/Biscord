# Supabase e ngrok

O frontend e a API Node continuam neste computador. O Supabase armazena os dados PostgreSQL; o ngrok encaminha o endereço público para a porta local 4173.

## Banco

Copie `.env.example` para `.env` e configure `DATABASE_URL` com a URI **Session pooler** do painel **Connect**. Informe `SUPABASE_PROJECT_REF` para validar o projeto de destino. A conexão usa TLS com verificação de certificado; `PGSSLROOTCERT=certs/supabase-ca.crt` aponta para a CA do Supabase incluída no projeto.

```powershell
npm run supabase:setup
npm start
```

As tabelas ficam no schema privado `biscord`, separado do schema `public`. Nenhuma conta ou mensagem do SQLite é importada automaticamente. Com `DATABASE_URL` vazio, o backend continua usando SQLite local.

O script `npm run supabase:test-social` cria duas contas fictícias com nomes aleatórios, testa pedido de amizade, recebimento em SSE, aceitação, mensagem e bloqueio, e remove somente essas contas ao final.

O arquivo `data/encryption.key` deve continuar guardado neste computador: ele protege os segredos TOTP das contas do banco. Não envie esse arquivo, `.env` ou dumps de contas para o GitHub.

## Expor pelo ngrok

Com o ngrok instalado e autenticado:

```powershell
ngrok http 4173
```

Copie o endereço HTTPS mostrado pelo ngrok para o `.env`:

```dotenv
PUBLIC_ORIGIN=https://SEU-ENDERECO.ngrok-free.app
RESET_BASE_URL=https://SEU-ENDERECO.ngrok-free.app
```

Reinicie `npm start` e acesse a URL HTTPS. `PUBLIC_ORIGIN` ativa cookies Secure e define a origem permitida para alterações na API. Se o endereço do túnel mudar, atualize essas variáveis e reinicie o servidor. Para voltar a acessar pelo endereço HTTP local, esvazie `PUBLIC_ORIGIN` e use `COOKIE_SECURE=false`.

Crie duas contas novas, em navegadores ou perfis separados. Na primeira, abra **Amigos → Adicionar amigo** e informe o nome de usuário da segunda. Na segunda, abra **Amigos → Pendente** e aceite a solicitação.

Referências: [conexão PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [TLS](https://supabase.com/docs/guides/platform/ssl-enforcement), [ngrok HTTP](https://ngrok.com/docs/gateway/endpoints/http).
