import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarRegistros } from '../lib/api'

const TOTAL_NOTEBOOKS = 2700

export default function AdminDashboard() {
  const [allRegistros, setAllRegistros] = useState([])
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
    const data = await listarRegistros(token)
    if (data.registros) {
      setAllRegistros(data.registros)
    } else {
      setError(data.error || 'Erro ao carregar')
    }
    setLoading(false)
  }, [token])

  useEffect(() => {
    if (!token) {
      navigate('/admin/login')
      return
    }
    fetchRegistros()
  }, [token, navigate, fetchRegistros])

  const stats = useMemo(() => {
    const total = allRegistros.length
    const registrados = allRegistros.filter(r => r.enviado_em).length
    const pendentes = total - registrados
    const porcentagem = TOTAL_NOTEBOOKS > 0 ? ((registrados / TOTAL_NOTEBOOKS) * 100) : 0
    return { total, registrados, pendentes, porcentagem }
  }, [allRegistros])

  const filteredRegistros = useMemo(() => {
    let list = allRegistros

    if (busca) {
      const term = busca.toLowerCase()
      list = list.filter(r =>
        (r.nome || '').toLowerCase().includes(term) ||
        (r.serial || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term)
      )
    }

    if (statusFilter === 'pendente') {
      list = list.filter(r => !r.enviado_em)
    } else if (statusFilter === 'registrado') {
      list = list.filter(r => r.enviado_em)
    }

    return list
  }, [allRegistros, busca, statusFilter])

  function handleLogout() {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  function exportCSV() {
    const headers = ['Nome', 'Email', 'Celular', 'Serial', 'Modelo', 'Data', 'Status']
    const rows = filteredRegistros.map(r => [
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
          <h1>Localiza &mdash; Registro de Notebooks</h1>
          <div className="admin-header-actions">
            <button className="btn btn-sm" onClick={() => navigate('/admin/enviar')}>Gerar Link</button>
            <button className="btn btn-sm btn-outline" onClick={handleLogout}>Sair</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {loading ? (
          <div className="page-center" style={{ minHeight: 400 }}><div className="spinner" /></div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card stat-total">
                <div className="stat-label">Total de Links</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-sub">links criados</div>
              </div>
              <div className="stat-card stat-ok">
                <div className="stat-label">Registrados</div>
                <div className="stat-value">{stats.registrados}</div>
                <div className="stat-sub">funcionários concluíram</div>
              </div>
              <div className="stat-card stat-pending">
                <div className="stat-label">Pendentes</div>
                <div className="stat-value">{stats.pendentes}</div>
                <div className="stat-sub">aguardando registro</div>
              </div>
              <div className="stat-card stat-meta">
                <div className="stat-label">Meta Total</div>
                <div className="stat-value">{TOTAL_NOTEBOOKS}</div>
                <div className="stat-sub">notebooks a distribuir</div>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-title">Progresso de Registros</span>
                <span className="progress-percent">{stats.porcentagem.toFixed(1)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(stats.porcentagem, 100)}%` }}
                />
              </div>
              <div className="progress-footer">
                <span>{stats.registrados} de {TOTAL_NOTEBOOKS} notebooks registrados</span>
                <span>{Math.round(TOTAL_NOTEBOOKS - stats.registrados)} restantes</span>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

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
                  >Todos ({stats.total})</button>
                  <button
                    className={`filter-btn ${statusFilter === 'pendente' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('pendente')}
                  >Pendentes ({stats.pendentes})</button>
                  <button
                    className={`filter-btn ${statusFilter === 'registrado' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('registrado')}
                  >Registrados ({stats.registrados})</button>
                </div>
              </div>
              <div className="toolbar-right">
                <span className="reg-count">{filteredRegistros.length} registro(s)</span>
                <button className="btn btn-outline btn-sm" onClick={exportCSV}>Exportar CSV</button>
              </div>
            </div>

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
                  {filteredRegistros.length === 0 ? (
                    <tr><td colSpan="8" className="empty">Nenhum registro encontrado</td></tr>
                  ) : (
                    filteredRegistros.map(r => (
                      <tr key={r.id}>
                        <td className="cell-name">{r.nome || <span className="empty-field">Aguardando</span>}</td>
                        <td>{r.email || <span className="empty-field">-</span>}</td>
                        <td>{r.celular || <span className="empty-field">-</span>}</td>
                        <td><code>{r.serial}</code></td>
                        <td>{r.modelo_notebook || <span className="empty-field">-</span>}</td>
                        <td className="cell-date">
                          {new Date(r.enviado_em || r.criado_em).toLocaleString('pt-BR')}
                        </td>
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
          </>
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
