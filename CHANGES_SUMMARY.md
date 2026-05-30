# Resumo das alterações - SADA (para replicar no Localiza)

## 1. Assinatura desenhada na tela (canvas)

### Backend (`netlify/functions/api.js`)
- Adicionar coluna `assinatura_url` na tabela `registros`
- Adicionar no loop `ALTER TABLE`
- Adicionar nos `INSERT` e `UPDATE` de:
  - `handleRegistrar`
  - `handleRegistrarPublico`
  - `handleEditRegistro`
- Extrair do `getBody()` em todos os handlers

### Frontend (`src/pages/RegistroPage.jsx`)
- Instalar: `npm install react-signature-canvas`
- Import: `import SignatureCanvas from 'react-signature-canvas'`
- Criar `sigRef = useRef()`
- Estado: `assinatura_url: ''`, `signatureUploading`
- Funções:
  - `uploadSignature(blob)` — envia PNG pro Cloudinary
  - `handleSignatureEnd()` — captura canvas no fim do desenho
  - `clearSignature()` — limpa canvas
- Validação: `if (!form.assinatura_url)` no `handleSubmit`
- Reset no `resetForm()`
- UI: canvas dentro do fieldset "Assinatura de Recebimento", após matrícula

### Admin (`src/pages/AdminDashboard.jsx`)
- DetailModal: campo "Assinatura de Recebimento" com nome + matrícula + imagem
- Tabela: coluna "Assinatura" com miniatura e tooltip
- XLSX: coluna `Assinatura_URL`

### CSS (`src/App.css`)
- `.signature-wrapper` — borda tracejada, `border: 2px dashed var(--gray-300)`
- `.signature-canvas` — `width: 100%; height: 150px; cursor: crosshair`
- `.signature-preview` e `.signature-thumb`

---

## 2. Link Convidado (visualização read-only uso único)

### Backend (`netlify/functions/api.js`)
- Nova tabela: `guest_tokens (token TEXT PRIMARY KEY, usado INTEGER DEFAULT 0, criado_em TEXT)`
- SITE_URL com `.replace(/\/+$/, '')` para evitar barra dupla
- Rota: `POST /admin/gerar-convite` → gera UUID, salva, retorna link
- Rota: `GET /convidado/:token` → verifica se existe e `usado = 0`, marca como usado, retorna registros

### Frontend (`src/lib/api.js`)
- `gerarConvite(token)` → POST `/admin/gerar-convite`
- `visualizarConvidado(token)` → GET `/convidado/:token`

### Frontend (`src/pages/GuestView.jsx`) — novo arquivo
- Carrega registros via token
- Exibe stats e tabela completa (read-only, sem ações)
- Fotos ampliáveis
- Se token inválido/expirado: mensagem de erro

### Frontend (`src/App.jsx`)
- Rota: `<Route path="/convidado/:token" element={<GuestView />} />`

### Admin (`src/pages/AdminDashboard.jsx`)
- Import: `gerarConvite`
- Estado: `conviteLink`, `gerandoConvite`
- Função: `handleGerarConvite()`
- Botão: "Link Convidado" no cabeçalho
- Exibe box com link + botão copiar

---

## 3. Cloudinary Preset (SADA)
- `VITE_CLOUDINARY_UPLOAD_PRESET` = `sada_equipamentos`
- `VITE_CLOUDINARY_CLOUD_NAME` = `dvroudlt7`
- (Localiza usa os próprios: `ddj7sgmcm` / `registro_notebooks`)

---

## 4. SITE_URL
```js
const SITE_URL = (process.env.SITE_URL || 'https://localizanotebook.netlify.app').replace(/\/+$/, '')
```
