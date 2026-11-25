# Plaquinhas de nome

`node download-nameplates.mjs` consulta todas as páginas do catálogo público indexado pelo Dripcord e baixa os arquivos diretamente do CDN do Discord. Em 15/11/2026: 325 itens encontrados, 324 disponíveis, 648 arquivos estáticos/animados. Os dois arquivos de “Buffering...” retornam HTTP 400; o item não aparece com imagem quebrada. As falhas estão em `reference-client/nameplates-failures.json`.

Origem, MIME, tamanho e SHA-256 ficam em `client/assets/collectibles/downloads.json`. A atualização preserva decorações, efeitos e molduras existentes. `download-collectibles.mjs` também atualiza as plaquinhas ao terminar. Execute `node build-client.mjs` após atualizar os assets.

Em Editar perfil → Plaquinha de nome, busque por nome ou coleção, confira a prévia e aplique ao rascunho. Cancelar descarta a escolha. Salvar alterações persiste `nameplateId` no backend; Nenhum remove a plaquinha. O backend valida o tipo e sincroniza as sessões. A exibição nas listas segue a privacidade do perfil. O modo de movimento reduzido usa a imagem estática.
