import { createClient } from '@libsql/client'
import { Resend } from 'resend'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

const JWT_SECRET = process.env.JWT_SECRET || 'localiza-admin-secret-2024'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const SITE_URL = process.env.SITE_URL || 'https://registro-notebooks.netlify.app'

let db

function getDb() {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return db
}

function parsePath(path) {
  const parts = path.replace(/^\/?\.netlify\/functions\/api\/?/, '').replace(/^\/?api\/?/, '').split('/')
  return parts.filter(Boolean)
}

function getBody(event) {
  try {
    return JSON.parse(event.body || '{}')
  } catch {
    return {}
  }
}

function json(data, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(data),
  }
}

function authenticate(event) {
  const auth = event.headers.authorization || event.headers.Authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  const token = auth.split(' ')[1]
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json({ ok: true })
  }

  const parts = parsePath(event.path)
  const method = event.httpMethod

  try {
    await initDb()
  } catch (err) {
    console.error('DB init error:', err)
    return json({ error: 'Erro interno do servidor' }, 500)
  }

  if (method === 'POST' && parts[0] === 'registrar') {
    return handleRegistrar(event)
  }

  if (parts[0] === 'admin') {
    if (method === 'POST' && parts[1] === 'login') {
      return handleAdminLogin(event)
    }

    const user = authenticate(event)
    if (!user) {
      return json({ error: 'Não autorizado' }, 401)
    }

    if (method === 'GET' && parts[1] === 'registros') {
      return handleListRegistros(event)
    }

    if (method === 'POST' && parts[1] === 'enviar-link') {
      return handleEnviarLink(event)
    }
  }

  if (method === 'GET' && parts[0] === 'validar-token') {
    return handleValidarToken(event)
  }

  return json({ error: 'Rota não encontrada' }, 404)
}

async function initDb() {
  const client = getDb()
  await client.execute(`
    CREATE TABLE IF NOT EXISTS registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      celular TEXT NOT NULL,
      serial TEXT UNIQUE NOT NULL,
      modelo_notebook TEXT,
      foto1_url TEXT,
      foto2_url TEXT,
      foto3_url TEXT,
      enviado_em TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

async function handleValidarToken(event) {
  const token = event.queryStringParameters?.token
  if (!token) {
    return json({ error: 'Token não fornecido' }, 400)
  }

  const client = getDb()
  const result = await client.execute({
    sql: 'SELECT id, enviado_em FROM registros WHERE token = ?',
    args: [token],
  })

  if (result.rows.length === 0) {
    return json({ valido: false, error: 'Token inválido' })
  }

  const row = result.rows[0]
  if (row.enviado_em) {
    return json({ valido: false, usado: true, error: 'Este link já foi utilizado.' })
  }

  return json({ valido: true })
}

async function handleRegistrar(event) {
  const { token, nome, email, celular, serial, modelo_notebook, foto1_url, foto2_url, foto3_url } = getBody(event)

  if (!token || !nome || !email || !celular || !serial) {
    return json({ error: 'Campos obrigatórios: token, nome, email, celular, serial' }, 400)
  }

  const client = getDb()

  const tokenResult = await client.execute({
    sql: 'SELECT id, enviado_em FROM registros WHERE token = ?',
    args: [token],
  })

  if (tokenResult.rows.length === 0) {
    return json({ error: 'Token inválido' }, 400)
  }

  if (tokenResult.rows[0].enviado_em) {
    return json({ error: 'Este link já foi utilizado.' }, 400)
  }

  const serialResult = await client.execute({
    sql: 'SELECT nome, criado_em FROM registros WHERE serial = ?',
    args: [serial],
  })

  if (serialResult.rows.length > 0) {
    const existing = serialResult.rows[0]
    return json({
      error: `Este equipamento já foi registrado em ${existing.criado_em} por ${existing.nome}`,
    }, 409)
  }

  await client.execute({
    sql: `UPDATE registros SET
      nome = ?, email = ?, celular = ?, serial = ?,
      modelo_notebook = ?, foto1_url = ?, foto2_url = ?, foto3_url = ?,
      enviado_em = CURRENT_TIMESTAMP
    WHERE token = ?`,
    args: [nome, email, celular, serial, modelo_notebook || null, foto1_url || null, foto2_url || null, foto3_url || null, token],
  })

  return json({ sucesso: true, mensagem: 'Registro concluído com sucesso!' })
}

async function handleAdminLogin(event) {
  const { username, password } = getBody(event)

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return json({ error: 'Credenciais inválidas' }, 401)
  }

  const token = jwt.sign({ admin: true, username }, JWT_SECRET, { expiresIn: '24h' })
  return json({ token })
}

async function handleListRegistros(event) {
  const client = getDb()
  const busca = event.queryStringParameters?.busca || ''
  const status = event.queryStringParameters?.status || ''

  let sql = 'SELECT * FROM registros WHERE 1=1'
  const args = []

  if (busca) {
    sql += ' AND (nome LIKE ? OR email LIKE ? OR serial LIKE ?)'
    const term = `%${busca}%`
    args.push(term, term, term)
  }

  if (status === 'pendente') {
    sql += ' AND enviado_em IS NULL'
  } else if (status === 'registrado') {
    sql += ' AND enviado_em IS NOT NULL'
  }

  sql += ' ORDER BY criado_em DESC'

  const result = await client.execute({ sql, args })
  return json({ registros: result.rows })
}

async function handleEnviarLink(event) {
  const { nome, email, serial, modelo_notebook } = getBody(event)

  if (!nome || !email || !serial) {
    return json({ error: 'Campos obrigatórios: nome, email, serial' }, 400)
  }

  const client = getDb()

  const serialCheck = await client.execute({
    sql: 'SELECT id FROM registros WHERE serial = ?',
    args: [serial],
  })

  if (serialCheck.rows.length > 0) {
    return json({ error: 'Este número de série já foi cadastrado no sistema' }, 409)
  }

  const token = uuidv4()

  await client.execute({
    sql: `INSERT INTO registros (token, nome, email, celular, serial, modelo_notebook, enviado_em)
    VALUES (?, ?, ?, '', ?, ?, NULL)`,
    args: [token, nome, email, serial, modelo_notebook || null],
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const link = `${SITE_URL}/registrar/${token}`

    await resend.emails.send({
      from: 'Localiza <onboarding@resend.dev>',
      to: email,
      subject: 'Registro do seu Notebook HP - Localiza',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Olá, ${nome}!</h2>
          <p>Seu notebook HP chegou! Para registrar o equipamento, clique no link abaixo:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #0047BB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
              Registrar Notebook
            </a>
          </p>
          <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="word-break: break-all; color: #0047BB;">${link}</p>
          <p><strong>Número de série:</strong> ${serial}</p>
          ${modelo_notebook ? `<p><strong>Modelo:</strong> ${modelo_notebook}</p>` : ''}
          <hr style="margin: 30px 0;" />
          <p style="color: #666; font-size: 12px;">Este é um email automático. Não responda.</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Erro ao enviar email:', err)
    return json({ error: 'Erro ao enviar email. Verifique as configurações do Resend.' }, 500)
  }

  return json({ sucesso: true, mensagem: 'Link enviado com sucesso!' })
}
