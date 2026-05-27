import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarRegistros } from '../lib/api'

export default function AdminDashboard() {
  const [registros, setRegistros] = useState([])
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFoto, setSelectedFoto] = useState(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('admin_token')

  const fetchRegistros = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const params = {}
    if (busca) params.busca = busca
    if (statusFilter) params.status = statusFilter

    const data = await listarRegistros(token, params)
    if (data.registros) {
      setRegistros(data.registros)
    } else {
      setError(data.error || 'Erro ao carregar')
    }
    setLoading(false)
  }, [token, busca, statusFilter])

  useEffect(() => {
    if (!token) {
      navigate('/admin/login')
      return
    }
    fetchRegistros()
  }, [token, navigate, fetchRegistros])

  function handleLogout() {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  function exportCSV() {
    const headers = ['Nome', 'Email', 'Celular', 'Serial', 'Modelo', 'Data', 'Status']
    const rows = registros.map(r => [
      r.nome,
      r.email,
      r.celular,
      r.serial,
      r.modelo_notebook || '',
      r.enviado_em || r.criado_em,
      r.enviado_em ? 'Registrado' : 'Pendente',
    ])

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registros_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Localiza - Registro de Notebooks</h1>
          <div className="admin-header-actions">
            <button className="btn btn-sm" onClick={() => navigate('/admin/enviar')}>Enviar Link</button>
            <button className="btn btn-sm btn-outline" onClick={handleLogout}>Sair</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-toolbar">
          <div className="toolbar-left">
            <input
              className="search-input"
              placeholder="Buscar por nome, serial ou email..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <div className="filter-group">
              <button
                className={`filter-btn ${statusFilter === '' ? 'active' : ''}`}
                onClick={() => setStatusFilter('')}
              >Todos</button>
              <button
                className={`filter-btn ${statusFilter === 'pendente' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pendente')}
              >Pendentes</button>
              <button
                className={`filter-btn ${statusFilter === 'registrado' ? 'active' : ''}`}
                onClick={() => setStatusFilter('registrado')}
              >Registrados</button>
            </div>
          </div>
          <div className="toolbar-right">
            <span className="reg-count">{registros.length} registro(s)</span>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>Exportar CSV</button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="page-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Celular</th>
                  <th>Serial</th>
                  <th>Modelo</th>
                  <th>Data</th>
                  <th>Fotos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr><td colSpan="8" className="empty">Nenhum registro encontrado</td></tr>
                ) : (
                  registros.map(r => (
                    <tr key={r.id}>
                      <td>{r.nome}</td>
                      <td>{r.email}</td>
                      <td>{r.celular}</td>
                      <td><code>{r.serial}</code></td>
                      <td>{r.modelo_notebook || '-'}</td>
                      <td>{new Date(r.enviado_em || r.criado_em).toLocaleString('pt-BR')}</td>
                      <td>
                        <div className="foto-thumbs">
                          {[r.foto1_url, r.foto2_url, r.foto3_url].filter(Boolean).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Foto ${i + 1}`}
                              className="foto-thumb"
                              onClick={() => setSelectedFoto(url)}
                            />
                          ))}
                          {![r.foto1_url, r.foto2_url, r.foto3_url].some(Boolean) && <span className="no-fotos">-</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${r.enviado_em ? 'status-ok' : 'status-pendente'}`}>
                          {r.enviado_em ? 'Registrado' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selectedFoto && (
        <div className="overlay" onClick={() => setSelectedFoto(null)}>
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <button className="overlay-close" onClick={() => setSelectedFoto(null)}>&times;</button>
            <img src={selectedFoto} alt="Foto ampliada" className="overlay-img" />
          </div>
        </div>
      )}
    </div>
  )
}
