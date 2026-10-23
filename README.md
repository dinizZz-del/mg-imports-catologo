# Catálogo Virtual V1 — Camisas de Futebol

Primeira versão funcional com identidade preto/vermelho, foco mobile e integração com Google Sheets + Apps Script.

## O que existe nesta versão

- Catálogo público unificado, com todos os produtos em uma única listagem.
- Busca por produto/time/temporada.
- Filtros por categoria, modelo, tamanho e temporada.
- Cards 3D/animados, destaque de produtos e modal de detalhes.
- Seleção de tamanho e botão que abre o WhatsApp com a mensagem do produto pronta.
- Fallback de demonstração usando os produtos atuais da planilha.
- API pública do Apps Script que envia somente campos permitidos.
- Painel privado dentro da planilha para cadastrar produto + variantes.
- Bloqueio administrativo pelo proprietário da planilha.

## Arquivos do site

- `index.html`: estrutura da loja.
- `styles.css`: identidade visual completa e responsiva.
- `app.js`: busca, filtros, modal, WhatsApp e consumo da API.
- `config.js`: local onde entra a URL do Apps Script.
- `catalog-demo.js`: dados locais para a primeira prévia.

## 1. Preparar a planilha

Use `Controle_Ecommerce_Catalogo_V1.xlsx` deste pacote como base. Ao importar para Google Sheets, confira as abas `Produtos`, `Variantes`, `Categorias` e `Config_Catalogo`.

Na aba `Config_Catalogo`, altere principalmente:

- `nome_loja`
- `whatsapp` (DDI + DDD + número, apenas dígitos)
- `instagram`
- `titulo_hero`
- `subtitulo_hero`
- `texto_whatsapp`

## 2. Instalar o Apps Script

1. Abra a planilha no Google Sheets.
2. Acesse **Extensões → Apps Script**.
3. Substitua o conteúdo de `Code.gs` pelo arquivo `apps-script/Code.gs`.
4. Crie um arquivo HTML chamado **Admin** e cole `apps-script/Admin.html`.
5. Em Configurações do projeto, use o fuso `America/Sao_Paulo`.
6. Salve e recarregue a planilha.
7. Surgirá o menu **🛍️ CATÁLOGO → Cadastrar produto**.

O painel administrativo só aceita operações quando a conta ativa é a proprietária da planilha.

## 3. Publicar a API pública

No Apps Script:

1. Clique em **Implantar → Nova implantação**.
2. Tipo: **App da Web**.
3. Executar como: **Você**.
4. Acesso: escolha a opção pública necessária para seus clientes conseguirem carregar o catálogo.
5. Implante e copie a URL que termina em `/exec`.

A URL pública permite apenas `GET ?action=catalog`. Ela não possui rota de cadastro/edição e não envia fornecedor, custo, frete ou valor de estoque.

## 4. Conectar o site

Abra `config.js` e cole a URL:

```js
window.CATALOG_CONFIG = {
  apiUrl: "https://script.google.com/macros/s/SEU_ID/exec",
  fallbackToDemo: true
};
```

Depois disso, o catálogo deixa de depender dos dados de demonstração e passa a ler a planilha.

## 5. Publicar gratuitamente na Vercel

Envie os cinco arquivos do site (`index.html`, `styles.css`, `app.js`, `config.js`, `catalog-demo.js`) para um repositório/projeto e publique como site estático. Não é necessário servidor Node nem banco de dados adicional.

## Segurança

O navegador recebe somente: nome, time, temporada, modelo, categoria, imagem, disponibilidade, destaque, descrição pública, tamanhos e preço de venda. Dados de fornecedor e custos permanecem na planilha.

Não coloque senhas administrativas no `app.js` ou no HTML público. A administração desta V1 acontece exclusivamente dentro da planilha.
