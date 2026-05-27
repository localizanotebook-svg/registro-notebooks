import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { enviarLink, listarRegistros } from '../lib/api'

export default function AdminEnviar() {
  const navigate = useNavigate()
  const adminToken = localStorage.getItem('admin_token')

  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const fetchLinks = useCallback(async () => {
    if (!adminToken) return
    const data = await listarRegistros(adminToken)
    if (data.registros) setLinks(data.registros)
  }, [adminToken])

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login')
      return
    }
    fetchLinks()
  }, [adminToken, navigate, fetchLinks])

  async function handleGenerate() {
    setError('')
    setGeneratedLink('')
    setGenerating(true)

    const data = await enviarLink(adminToken, {})
    if (data.sucesso) {
      setGeneratedLink(data.link)
      await fetchLinks()
    } else {
      setError(data.error || 'Erro ao gerar link')
    }
    setGenerating(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Localiza - Gerar Links</h1>
          <div className="admin-header-actions">
            <button className="btn btn-sm" onClick={() => navigate('/admin')}>Dashboard</button>
            <button className="btn btn-sm btn-outline" onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin/login') }}>Sair</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="split-layout">
          <div className="split-left">
            <div className="card" style={{ textAlign: 'center' }}>
              <h3>Gerar Novo Link</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 20 }}>
                Clique no botão para gerar um link único de registro.
                O funcionário preenche os dados ao acessar o link.
              </p>

              {error && <div className="alert alert-error">{error}</div>}

              <button
                className="btn btn-primary btn-full"
                onClick={handleGenerate}
                disabled={generating}
                style={{ marginBottom: 20 }}
              >
                {generating ? 'Gerando...' : 'Gerar Novo Link'}
              </button>

              {generatedLink && (
                <div className="link-box" style={{ textAlign: 'left' }}>
                  <label>Link gerado:</label>
                  <div className="link-row">
                    <input type="text" value={generatedLink} readOnly className="link-input" />
                    <button type="button" className="btn btn-sm btn-primary" onClick={copyLink}>
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="split-right">
            <h3>Links Gerados ({links.length})</h3>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Link</th>
                    <th>Status</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {links.length === 0 ? (
                    <tr><td colSpan="3" className="empty">Nenhum link gerado</td></tr>
                  ) : (
                    links.toReversed().map(r => (
                      <tr key={r.id}>
                        <td>
                          <code style={{ fontSize: 11 }}>
                            {`${window.location.origin}/registrar/${r.token}`}
                          </code>
                        </td>
                        <td>
                          <span className={`status-badge ${r.enviado_em ? 'status-ok' : 'status-pendente'}`}>
                            {r.enviado_em ? 'Registrado' : 'Pendente'}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                          {new Date(r.criado_em).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
