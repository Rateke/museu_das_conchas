# Museu das Conchas Itapirubá: site conceito

Site feito pela Lumini como projeto conceito para o **Museu das Conchas**, em Itapirubá, Imbituba (SC).
O código do site está na raiz deste repositório.

## A ideia: "A descida"

O site é um mergulho. Rolar a página é descer pelo oceano: a cor da água, a luz, as cáusticas e as
partículas mudam com a profundidade, e um profundímetro mostra metros, zona, temperatura, pressão e luz.
O ponto mais fundo (≈ 4.200 m) fica nos **gigantes**. Depois a página sobe, "trazendo tudo à tona"
com a história do fundador, até chegar à **areia de Itapirubá**, onde ficam o contato e o rodapé.

Slogan (o do próprio museu): **Um lugar como você nunca viu.**

| Profundidade | Seção |
|---|---|
| 0 m | Topo, com o náutilo 3D |
| 20 m | O museu e os números |
| 90 m | Como nasce uma concha (a espiral cresce com a rolagem) |
| 180 m | Anatomia de uma concha (pontos interativos) |
| 320 m | Acervo: 12 espécies com ficha e modelo 3D para girar |
| 1.100 m | Histórias que vêm do fundo (trilho horizontal) |
| 3.000 m | Os gigantes, em escala real entre si |
| 4.200 m → 600 m | Quem trouxe tudo isso à tona (fundador, globo com a rota) |
| 600 m → 150 m | Itapirubá e região (mapa, baleia-franca, sambaquis, APA) |
| 150 m | Tour 360° do Google Maps (carrega só quando a pessoa pede) |
| 60 m | Planeje sua visita (horário ao vivo, ingressos, calculadora, como chegar) |
| 25 m | Escolas e grupos (agendamento direto no WhatsApp do museu) |
| 12 m | Apoie o museu e perguntas frequentes |
| +2 m | Na areia: contato e rodapé |

## O que tem no site

- **Oceano em WebGL** atrás de tudo: raios de sol, cáusticas, superfície vista de baixo, neve marinha que sobe enquanto você desce, bolhas e bioluminescência no fundo.
- **Conchas 3D procedurais**: 12 espécies modeladas por código com o modelo de crescimento em espiral logarítmica (Raup 1966, Cortie 1989). Cada ficha tem o modelo para girar.
- **Horário ao vivo** no fuso de Brasília, com temporada, feriados nacionais e Carnaval ("Aberto agora · até as 18h").
- **Calculadora de ingressos** com a conta discriminada linha a linha. O ingresso família (R$ 10,00 para até 5 pessoas) só entra quando a pessoa marca "Somos uma família" e quando sai mais barato.
- **Nada depende de banco de dados.** O site não guarda nenhuma informação: agendar visita, doar conchas e tirar dúvidas abre o WhatsApp do museu com uma mensagem pronta; o tour vai para o Google Maps; o catálogo, para o Facebook; avaliações, para o Google. Tem também um botão fixo de WhatsApp.
- **Tour 360°** com as imagens do Google Maps, que só carrega quando a pessoa toca em "Começar o tour", e um link para abrir direto no Google Maps.
- **Som do mar** opcional, sintetizado ao vivo, que fica mais grave com a profundidade.
- Cursor com bolhas, botões magnéticos, textos que emergem, rolagem suave (Lenis + GSAP ScrollTrigger).
- SEO e compartilhamento: dados estruturados `Museum` (schema.org), Open Graph com imagem, favicon, ícone de app, manifest, `robots.txt` e `sitemap.xml`.
- Acessibilidade: navegação por teclado (a ficha prende o foco, Esc fecha, setas trocam de espécie), link "pular para o conteúdo", textos alternativos e site parado para quem pede menos movimento no sistema.
- **Guia da marca** em [`identidade.html`](../identidade.html): conceito, logo e construção, cores por profundidade com contraste, tipografia, ícones, ilustração 3D, componentes, movimento, voz e aplicações.

## Identidade em resumo

- **Símbolo:** o **múrex**, a concha que o museu já usa como marca, redesenhado como silhueta cheia em uma cor só (espira em degraus, corpo largo, abertura vazada, canal curto e espinhos grossos curvados para cima). Gerado por código em `tools/museu-logo.mjs`.
- **Cores:** as zonas do oceano (Superfície `#1E7F95`, Raso `#0F5872`, Crepúsculo `#0A3550`, Meia-noite `#071F33`, Abismo `#04121D`, Fossa `#02080E`) e as luzes (Espuma `#EAF5F2`, Nácar com brilho iridescente, Areia `#E8CFA0`, Bio `#6FF2DC`, Coral `#FF8A6B`).
- **Tipos:** Fraunces com SOFT 100 (títulos, nomes científicos em itálico), Geist (texto), Geist Mono (dados de mergulho). Todas gratuitas no Google Fonts.

## Pesquisa: o que encontramos

### O museu

- Museu **particular**, com **mais de 3.500 espécies** de conchas catalogadas (número informado pelo museu; o site oficial antigo falava em 2.000 e o Facebook em 3.000), nacionais e internacionais, catalogadas, aberto ao público **sem apoio governamental**. Mantido por **Antonie Maljers** e **Marilene Brandalise**. ([site do museu](https://www.museudasconchas.com.br/en/))
- Antonie começou ainda na infância, em **Veere** (Holanda), tem **mais de 60 anos de conquiliologia** e viajou por **83 países** observando a fauna e estudando livros antigos em grandes museus. O acervo cresce com doações de visitantes, pesquisadores e colecionadores. ([Lê Notícias](https://www.lenoticias.com.br/noticia/34519/museu-das-conchas-reune-acervo-unico-no-litoral-sul-catarinense))
- **Ano de abertura: 2016**, segundo o [Cadastro Nacional de Museus](https://cadastro.museus.gov.br/museus/museu-das-conchas-itapiruba/) (tipologia: Ciências Naturais e História Natural).
- **Horários** (site do museu e [WhichMuseum](https://whichmuseum.com/museum/museu-das-conchas-imbituba-23904)): alta temporada, terça a domingo, 15h às 20h; média e baixa temporada, sábados, domingos e feriados, 14h às 18h.
- **Ingressos:** adulto R$ 5,00; crianças e idosos R$ 2,50; família R$ 10,00 (até 5 pessoas, segundo o Cadastro Nacional de Museus).
- O museu lançou no [Facebook](https://www.facebook.com/museudasconchasitapiruba/) um catálogo com mais de 60 espécies de conchas e artesanato local.

### "É o maior museu de conchas da América do Sul?"

**Não encontramos nenhuma fonte que diga isso**, e por isso o site não afirma. Coleções científicas são bem maiores:
o [Museu Oceanográfico do Vale do Itajaí (MOVI)](https://ndmais.com.br/turismo/tour-cultural-sabia-que-o-maior-museu-oceanografico-da-america-latina-esta-em-picarras/), em Piçarras (SC), tem cerca de 90 mil exemplares de conchas, e a coleção de moluscos do
[Museu Oceanográfico Eliézer de Carvalho Rios](https://brasil.oceana.org/blog/museu-oceanografico-do-rio-grande-tem-acervo-unico-na-america-do-sul/), em Rio Grande (RS), é apontada como a mais importante da América do Sul.
O que dá para dizer com segurança (e o site diz): é um acervo particular com mais de 3.500 espécies, que a imprensa local descreve como "único no Litoral Sul catarinense".

### A região

- **Itapirubá**: do tupi-guarani, "pedras que rolam para o mar" na tradução mais citada; um morro de pedras divide a praia entre Imbituba (Norte) e Laguna (Sul). ([Itapirubá Norte](https://www.itapirubanorte.com.br/itapirub%C3%A1), [Guia Santa Catarina](https://guiasantacatarina.com.br/litoral-norte/laguna/atrativos-naturais-em-laguna/praia-de-itapiruba/))
- **Baleia-franca**: Imbituba é Capital Nacional da Baleia-Franca pela Lei nº 12.282/2010; temporada de julho a novembro; observação de terra. A **APA da Baleia Franca** foi criada em 2000 e é administrada pelo ICMBio. ([NSC](https://www.nsctotal.com.br/?p=7952975), [Itatiaia](https://www.itatiaia.com.br/turismo/area-de-protecao-ambiental-combina-praias-trilhas-e-observacao-de-baleias-em-sc/))
- **Sambaquis**: o Sambaqui de Garopaba do Sul, em Jaguaruna, é considerado o maior do mundo, com cerca de 30 m de altura e mais de 6 mil anos. ([NSC](https://www.nsctotal.com.br/?p=7814280))
- **Fazendas do mar**: Santa Catarina respondeu por cerca de 98% da produção nacional de moluscos cultivados em 2017 (IBGE, citado pela [Epagri](https://publicacoes.epagri.sc.gov.br/BT/article/download/2314/2063/18365)).

### As espécies

Tamanhos e recordes: trombeta-australiana ([Guinness](https://www.guinnessworldrecords.com/world-records/70399-largest-snail-marine), 77,2 cm), tridacna-gigante ([Guinness](https://guinnessworldrecords.com/world-records/70401-largest-clam), 1,15 m e 333 kg; até ~1,37 m), búzio-de-chapéu (até 38 cm, maior estrombídeo vivo, Brasil),
voluta-brasiliana ([Wikipedia](https://en.wikipedia.org/wiki/Pachycymbiola_brasiliana)) e cultivo da vieira em SC ([Ciencias Marinas](https://www.doi.org/10.7773/CM.V38I3.1982)).
As curiosidades (cauri como moeda, púrpura-de-tiro, escalária falsificada com arroz, veneno do cone, argonauta, náutilo) são conhecimento geral de malacologia: vale o fundador revisar o texto.

## Antes de publicar: confirmar com o museu

1. **Endereço**: o site oficial usa Av. Atlântica, 2322 (Praia Norte); outra listagem traz o número 738, e algumas escrevem "Atlântida".
2. **Telefone e WhatsApp**: usamos (48) 99626-7470; o Trip.com lista (48) 99215-0131. Confirmar qual atende no WhatsApp.
3. **Meses da alta temporada**: o site considera dezembro a fevereiro, mais o Carnaval. O horário ao vivo depende disso.
4. **Preços**: a página oficial com os valores tem quase dois anos.
5. **Tour 360°:** não conseguimos abrir o site do museu para copiar o tour exato. O site usa as coordenadas do museu (−28,3289, −48,7105) para abrir o Street View do Google. Para usar o tour oficial, cole em `data-embed` (seção `#tour` do `index.html`) o endereço do "Incorporar um mapa" do Google Maps.
6. **Logo:** o símbolo é um múrex redesenhado no estilo da identidade, porque não conseguimos ver o arquivo original. Com o logo oficial em mãos (SVG ou PNG), dá para ajustar o desenho para ficar fiel a ele.
7. **Quais peças o museu tem de fato.** As 12 espécies do site são "estrelas do mundo das conchas", não uma lista do acervo. O ideal é trocar por destaques reais da coleção.
8. **Fotos reais.** Nossa rede não acessava o site, o Facebook nem o Google Maps do museu, então não usamos fotos deles (e usar sem autorização também não seria certo). As conchas são modelos 3D gerados por código e estão sinalizadas como ilustrativas. Com fotos do acervo, é só substituir os arquivos em `assets/conchas/` (WebP com fundo transparente).
9. **Detalhes pessoais**: "holandês de nascimento e cidadão norueguês", "começou ainda menino em Veere" e "2016" vêm de reportagem e do cadastro federal. Vale o Antonie aprovar.
10. **Instagram, acessibilidade e estacionamento**: não encontramos informação, então o site não fala disso.

## Como rodar e regenerar

Veja o [README](../README.md).
