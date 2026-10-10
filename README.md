# Museu das Conchas · Itapirubá

> **Um lugar como você nunca viu.**

Site do Museu das Conchas, em Itapirubá, Imbituba (SC): um mergulho que desce da superfície até o abismo dos gigantes
e volta para a areia de Itapirubá. Mais de 3.500 espécies, conchas 3D, tour 360° do Google Maps, horário ao vivo,
calculadora de ingressos e agendamento pelo WhatsApp. Feito pela Lumini.

O site é **estático**: HTML, CSS e JavaScript prontos, sem etapa de build e sem banco de dados.
Tudo que precisaria de um servidor vai para outro serviço: agendamento, doações e dúvidas abrem o WhatsApp do museu;
tour e rotas vão para o Google Maps e o Waze; o catálogo, para o Facebook.

## Deploy na Vercel

1. Na Vercel, clique em **Add New… → Project** e importe este repositório.
2. Em **Framework Preset**, escolha **Other**. Deixe **Build Command** vazio e **Output Directory** como `.` (a raiz).
3. Clique em **Deploy**.

Pronto: cada push na branch `main` publica de novo. O `vercel.json` já define o cache dos arquivos e o
`.vercelignore` deixa de fora o que não é do site (`tools/`, `docs/`, `lab.html`).

### Domínio

Para usar `museudasconchas.com.br`, adicione o domínio em **Settings → Domains** e siga as instruções de DNS da Vercel.
Se o domínio for outro, troque `https://www.museudasconchas.com.br/` nestes lugares:
`index.html` (`canonical`, `og:url`, `og:image` e o bloco `application/ld+json`), `sitemap.xml` e `robots.txt`.

## Ver no computador

O site usa módulos JavaScript, então precisa ser aberto por um servidor (abrir o arquivo direto não funciona):

```bash
npx serve .
```

## Onde mudar as informações do museu

| O quê | Onde |
|---|---|
| Horários | `index.html` (seção `#visite`) e a função `schedule()` em `js/main.js`, que decide a temporada (alta = dezembro a fevereiro e Carnaval) e o "Aberto agora" |
| Preços dos ingressos | `index.html` (seção `#visite`) e a constante `PRICE` em `js/main.js` (usada pela calculadora) |
| WhatsApp e telefone | Links `wa.me/5548996267470` e `tel:+5548996267470` no `index.html` |
| Tour 360° | Atributos `data-embed` e `data-link` da seção `#tour` no `index.html`. Para usar o tour oficial do museu, abra o tour no Google Maps, toque em **Compartilhar → Incorporar um mapa** e cole em `data-embed` o endereço que está dentro de `src="..."` |
| Espécies do acervo | `js/species.js` (textos) e `assets/conchas/` (imagens WebP com fundo transparente; fotos reais podem substituir os modelos 3D com o mesmo nome de arquivo) |
| Cores e fontes | Topo do `css/site.css` |

## Estrutura

```
index.html          o site
identidade.html     guia da marca (logo, cores, tipografia, componentes, movimento)
css/site.css        estilos
js/                 main.js (interações), ocean.js (oceano em WebGL), shells.js (conchas 3D),
                    species.js (fichas), viewer.js (3D da ficha), globe.js, audio.js
vendor/             three.js, GSAP + ScrollTrigger e Lenis (cópias locais, sem CDN)
assets/             logo, conchas renderizadas, ícones, imagem de compartilhamento
lab.html            bancada das conchas 3D (ferramenta, não vai para o ar)
tools/              scripts para regenerar a marca, as conchas e capturas de revisão
docs/pesquisa.md    pesquisa, fontes e o que confirmar com o museu
```

## Regenerar a marca e as conchas

```bash
cd tools
npm install
npm run logo       # SVGs da marca (o múrex) e o símbolo dentro do index.html
npm run conchas    # renderiza as 12 conchas 3D em WebP (usa o Chromium do Playwright)
```

Os parâmetros de cada concha (crescimento da espiral, formato, espinhos, cores) ficam em `js/shells.js`.
Abra `lab.html` pelo servidor local para ver todas as conchas lado a lado.

## Antes de publicar

Há informações que precisam ser confirmadas com o museu (endereço, telefone, meses da alta temporada, preços,
tour oficial, logo original e fotos do acervo). A lista completa está em [`docs/pesquisa.md`](docs/pesquisa.md).
