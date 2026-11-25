# Identidade Biscord

O build publica a marca Biscord em títulos, metadados, textos públicos, navegação, autenticação e interface. O símbolo vetorial é uma cabeça de raposa. Os identificadores internos e endereços dos arquivos originais continuam compatíveis para preservar referências, srcsets e catálogos existentes.

`build-polish.mjs` executa `build-brand.mjs` no fim do build. `npm run build:brand` reaplica a identidade sem copiar novamente o catálogo completo. O manifesto publicado em `/brand/manifest.json` enumera os arquivos substituídos, dimensões e pôsteres para movimento reduzido. Os originais permanecem nas pastas de referência; as substituições ficam em `branding/overrides` e são copiadas para `dist`.

## Arte

Imagens criadas com a ferramenta integrada de geração de imagens. Fontes finais: `branding/fox-wave-sheet.png`, `branding/fox-poses-sheet.png` e `branding/fox-home-hero.png`. Exportações prontas: `branding/assets`. A montagem dos quadros e a codificação de GIF, APNG e WebP usam Pillow em `branding/prepare-fox.py`.

A raposa tem poses sentada, apontando para os dois lados, correndo, comemorando e jogando. O aceno usa oito quadros com fundo transparente. Os GIFs e imagens animadas substituídos mantêm o tamanho do canvas original. O banner do monitor foi editado para trocar os personagens e marcas incorporados à ilustração.

## Prompts de produção

1. Criar uma folha transparente de animação 4×2 com a mesma raposa laranja em oito quadros de aceno. Pelagem laranja, focinho e peito creme, orelhas triangulares, patas escuras e cauda com ponta branca. Estilo de brinquedo 3D, câmera e escala fixas, sem texto. Sequência: pata baixa, subindo, alta à esquerda, alta à direita, esquerda com piscada, direita, descendo, posição inicial.
2. Usar a raposa anterior como referência e criar uma folha 3×2 com poses sentada, apontando à esquerda, apontando à direita, correndo, comemorando com chapéu e confete, e jogando com headset roxo. Preservar a identidade do personagem e o fundo transparente. Uma edição adicional removeu os fundos e halos da folha de poses.
3. Editar a arte original do monitor e celular, preservando composição, hardware, perspectiva e transparência. Substituir os dois personagens do chat por raposas, a marca do aplicativo por cabeça de raposa, os nomes Wumpus/Clyde por Raposa e Discord por Biscord. Trocar também a marca lateral do monitor e o desenho do post-it.

## Verificação

`npm test` inclui os testes de marca. A validação de mídia confere dimensões de cada substituição e múltiplos quadros nos arquivos animados. As prévias visuais ficam em `test-output/biscord-brand-*.png`. Os domínios e exemplos técnicos nas referências não são renomeados para domínios inventados, e os dados pessoais das contas não são migrados.
