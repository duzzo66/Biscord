# Insígnias

O catálogo em `client/assets/badges/catalog.json` inclui 79 insígnias e níveis de perfil para pessoas: clássicas, históricas, impulso, Nitro, tempo de conta, tempo e variedade de jogos, transmissões e presentes. O download preserva os SVGs/PNGs, a licença, URLs de origem e hashes SHA-256. Fonte visual: https://github.com/mezotv/discord-badges. Os significados e a estrutura de seis espaços foram conferidos na documentação oficial do Discord.

Atualização: `node download-badges.mjs` e `node build-client.mjs`.

O destaque usa as referências oficiais de `reference-client/badge-art-catalog.json`, contendo somente metadados públicos de arte. `node download-badge-art.mjs` atualiza as 79 prévias: 56 ilustrações complexas e 23 ícones oficiais nas insígnias que não possuem arte complexa. Cada nível aponta para sua própria imagem. Os ícones compactos do perfil e da grade permanecem separados das prévias. Origem e SHA-256 de cada prévia ficam no catálogo.

Abra Editar perfil e selecione “Adicionar insígnias” ou a linha de insígnias existente. O catálogo permite buscar, selecionar, ocultar e ordenar até seis itens. Um novo nível substitui o anterior da mesma série. Arraste os espaços ou use as setas para ordenar. “Cancelar” descarta a seleção; “Aplicar” atualiza o rascunho; “Salvar alterações” persiste na conta e sincroniza as outras sessões.

O backend valida IDs, quantidade, duplicatas e séries. A seleção é armazenada no campo `badges` do perfil. A exibição para outras pessoas segue a configuração de privacidade do perfil. As escolhas pertencem ao Biscord e não alteram conquistas ou contas do Discord.

O catálogo é filtrado por `badge-policy.mjs`. Bots, aplicações, variações antigas duplicadas e Nitro Basic separado não aparecem. Nitro tem Inicial + oito evoluções. Cada série possui ordem numérica e requisitos de referência; o diretório oferece uma entrada por família, com os níveis no painel de detalhes. A ordem manual dos seis espaços do perfil é preservada. IDs antigos compatíveis são normalizados na leitura do perfil.

O diretório é uma tela de consulta: não altera o perfil ao navegar pelos níveis. Mostra as escolhas exibidas na conta e as nove famílias de progressão. O botão inferior esquerdo abre o personalizador do perfil e o popover de insígnias. Os rótulos de exibição refletem a conta local; não representam conquistas verificadas pelo Discord.
