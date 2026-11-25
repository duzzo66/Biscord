# Biscord na Vercel

Produção: https://biscord-ashy.vercel.app. Web, Electron e Android conectam-se à mesma API e ao mesmo Supabase. O servidor local e o ngrok não são necessários para esses clientes publicados.

`node vercel-prepare.mjs` prepara `.vercel-stage` sem credenciais, usando os arquivos já construídos em `dist`. Publique nesse diretório com `npx vercel deploy --prod --yes --archive=tgz`. Essa pasta é ignorada pelo Git. A conexão automática do GitHub ainda não foi configurada; publicar exige executar o comando novamente após alterações.

Variáveis privadas de produção: DATABASE_URL, SUPABASE_PROJECT_REF, BISCORD_ENCRYPTION_KEY (base64 da chave local existente, 32 bytes) e BISCORD_CLOUD=true. Nunca recrie a chave para contas existentes. O cookie é Secure e HttpOnly. A origem é validada contra o hostname atendido, sem depender de cabeçalhos encaminhados arbitrários.

As funções compartilham sinalização e eventos via tabelas privadas cloud_calls/cloud_events. SSE reconecta periodicamente para respeitar o tempo máximo das funções. A mídia permanece WebRTC ponto a ponto; TURN ainda é necessário para redes que não permitem conexão direta.

Mídia grande já catalogada é resolvida por um mapa fixo de URLs públicas, mantendo os arquivos de branding e aplicação no deploy. URLs fornecidas arbitrariamente não são usadas como proxy. Os clientes precisam de internet para esses arquivos.

Android público: /downloads/Biscord-Android.apk. O pacote Windows atualizado fica em desktop-release-cloud. Binários antigos que apontam para localhost precisam ser substituídos.

Verificação: `node --env-file=.env cloud-check.mjs` cria duas contas descartáveis, testa sessão, amizade, mensagem, SSE e sinalização, e remove somente os IDs criados. Nunca use dumps de contas no diretório público.
