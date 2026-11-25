# Cosméticos de perfil

Os arquivos ficam em `client/assets/collectibles/media`. O catálogo local em `catalog.json` relaciona os itens às imagens, às camadas de efeitos e às quatro posições de molduras. `downloads.json` registra URL original, tamanho, MIME e SHA-256 de cada arquivo.

Atualização: `node download-collectibles.mjs` e depois `node build-client.mjs`. O download pode ser retomado; arquivos já registrados são reutilizados. O índice público é paginado em três categorias. Os arquivos são obtidos diretamente do CDN do Discord. O catálogo registra a data, as páginas consultadas e eventuais falhas.

Na personalização de perfil, abra Decoração, Efeito ou Moldura, busque por nome/coleção e selecione um item. A prévia altera o rascunho. “Salvar alterações” persiste os campos `decorationId`, `effectId` e `frameId` na conta; “Nenhum” limpa o campo. O backend valida o ID e o tipo do item e sincroniza as alterações entre sessões. A visibilidade de perfil continua sendo respeitada.

Os efeitos usam suas camadas, atrasos, duração e repetição. Decorações usam as imagens animadas originais. Molduras usam camadas superiores/inferiores e os dados originais de largura/overflow. O modo de movimento reduzido mostra a imagem estática.

O catálogo corresponde aos itens publicados pelo índice público consultado, sem garantia de incluir itens privados ou ausentes desse índice.
