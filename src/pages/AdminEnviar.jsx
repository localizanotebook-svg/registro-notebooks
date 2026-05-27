import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { enviarLink, listarRegistros } from '../lib/api'

export default function AdminEnviar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('admin_token')

  const [form, setForm] = useState({ nome: '', email: '', serial: '', modelo_notebook: '' })
  const [destinatarios, setDestinatarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchDestinatarios = useCallback(async () => {
    if (!token) return
    const data = await listarRegistros(token)
    if (data.registros) setDestinatarios(data.registros)
  }, [token])

  useEffect(() => {
    if (!token) {
      navigate('/admin/login')
      return
    }
    fetchDestinatarios()
  }, [token, navigate, fetchDestinatarios])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSending(true)

    const data = await enviarLink(token, form)
    if (data.sucesso) {
      setSuccess('Link enviado com sucesso!')
      setForm({ nome: '', email: '', serial: '', modelo_notebook: '' })
      await fetchDestinatarios()
    } else {
      setError(data.error || 'Erro ao enviar link')
    }
    setSending(false)
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Localiza - Enviar Link</h1>
          <div className="admin-header-actions">
            <button className="btn btn-sm" onClick={() => navigate('/admin')}>Dashboard</button>
            <button className="btn btn-sm btn-outline" onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin/login') }}>Sair</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="split-layout">
          <div className="split-left">
            <div className="card">
              <h3>Cadastrar Destinatário</h3>

              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nome *</label>
                  <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome completo" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="email@empresa.com" />
                </div>
                <div className="form-group">
                  <label>Número de série *</label>
                  <input name="serial" value={form.serial} onChange={handleChange} required placeholder="5CGXXXX" />
                </div>
                <div className="form-group">
                  <label>Modelo do notebook</label>
                  <input name="modelo_notebook" value={form.modelo_notebook} onChange={handleChange} placeholder="HP EliteBook 840" />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar Link por Email'}
                </button>
              </form>
            </div>
          </div>

          <div className="split-right">
            <h3>Destinatários ({destinatarios.length})</h3>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Serial</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {destinatarios.length === 0 ? (
                    <tr><td colSpan="4" className="empty">Nenhum destinatário cadastrado</td></tr>
                  ) : (
                    destinatarios.map(r => (
                      <tr key={r.id}>
                        <td>{r.nome}</td>
                        <td>{r.email}</td>
                        <td><code>{r.serial}</code></td>
                        <td>
                          <span className={`status-badge ${r.enviado_em ? 'status-ok' : 'status-pendente'}`}>
                            {r.enviado_em ? 'Enviado' : 'Pendente'}
                          </span>
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
