import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarRegistros, getRegistro, editarRegistro, deletarRegistro, alterarSenha } from '../lib/api'

const TOTAL_NOTEBOOKS = 2700

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="toast">
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}>&times;</button>
    </div>
  )
}

function DetailModal({ registro, onClose, onEdit }) {
  if (!registro) return null
  const fotos = [registro.foto1_url, registro.foto2_url, registro.foto3_url].filter(Boolean)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">Detalhes do Registro</h2>

        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Nome</span>
            <span className="detail-value">{registro.nome}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Email</span>
            <span className="detail-value">{registro.email}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Celular</span>
            <span className="detail-value">{registro.celular}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Serial</span>
            <span className="detail-value"><code>{registro.serial}</code></span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Modelo</span>
            <span className="detail-value">{registro.modelo_notebook || '-'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Acessórios</span>
            <span className="detail-value">
              {registro.com_mochila ? 'Mochila' : ''}
              {registro.com_mochila && registro.com_carregador ? ', ' : ''}
              {registro.com_carregador ? 'Carregador' : ''}
              {!registro.com_mochila && !registro.com_carregador ? '-' : ''}
            </span>
          </div>
          <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
            <span className="detail-label">Observações</span>
            <span className="detail-value">{registro.observacao || '-'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Status</span>
            <span className={`status-badge ${registro.enviado_em ? 'status-ok' : 'status-pendente'}`}>
              {registro.enviado_em ? 'Registrado' : 'Pendente'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Registrado em</span>
            <span className="detail-value">{registro.enviado_em ? new Date(registro.enviado_em).toLocaleString('pt-BR') : '-'}</span>
          </div>
        </div>

        {fotos.length > 0 && (
          <div className="detail-fotos">
            <span className="detail-label">Fotos</span>
            <div className="detail-fotos-grid">
              {fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Foto ${i + 1}`} className="detail-foto" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-sm" onClick={() => { onEdit(registro); onClose() }}>Editar</button>
          <button className="btn btn-sm btn-outline" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ registro, onClose, onSave }) {
  const [form, setForm] = useState({ nome: '', email: '', celular: '', serial: '', modelo_notebook: '', observacao: '', com_mochila: false, com_carregador: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (registro) {
      setForm({
        nome: registro.nome || '',
        email: registro.email || '',
        celular: registro.celular || '',
        serial: registro.serial || '',
        modelo_notebook: registro.modelo_notebook || '',
        observacao: registro.observacao || '',
        com_mochila: !!Number(registro.com_mochila),
        com_carregador: !!Number(registro.com_carregador),
      })
    }
  }, [registro])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const data = await editarRegistro(localStorage.getItem('admin_token'), registro.id, form)
    if (data.sucesso) {
      onSave()
      onClose()
    } else {
      setError(data.error || 'Erro ao atualizar')
    }
    setSaving(false)
  }

  if (!registro) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">Editar Registro</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome</label>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Celular</label>
            <input value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Serial</label>
            <input value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Modelo</label>
            <input value={form.modelo_notebook} onChange={e => setForm({ ...form, modelo_notebook: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Acessórios</label>
            <div className="checkbox-group" style={{ flexDirection: 'row' }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.com_mochila} onChange={e => setForm({ ...form, com_mochila: e.target.checked })} />
                <span>Mochila</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.com_carregador} onChange={e => setForm({ ...form, com_carregador: e.target.checked })} />
                <span>Carregador</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Observações</label>
            <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={3} />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-sm" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ registro, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setError('')
    setDeleting(true)
    const data = await deletarRegistro(localStorage.getItem('admin_token'), registro.id)
    if (data.sucesso) {
      onDeleted()
      onClose()
    } else {
      setError(data.error || 'Erro ao excluir')
    }
    setDeleting(false)
  }

  if (!registro) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">Confirmar Exclusão</h2>
        <p style={{ marginBottom: 16, color: 'var(--gray-600)' }}>
          Tem certeza que deseja excluir o registro de <strong>{registro.nome}</strong>?
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
          <button className="btn btn-sm btn-outline" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function PasswordModal({ onClose }) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (novaSenha.length < 6) { setError('A nova senha deve ter no mínimo 6 caracteres'); return }
    if (novaSenha !== confirmar) { setError('As senhas não conferem'); return }

    setSaving(true)
    const data = await alterarSenha(localStorage.getItem('admin_token'), senhaAtual, novaSenha)
    if (data.sucesso) {
      setSuccess('Senha alterada com sucesso!')
      setTimeout(onClose, 1500)
    } else {
      setError(data.error || 'Erro ao alterar senha')
    }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">Alterar Senha</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Senha atual</label>
            <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required placeholder="Digite a senha atual" />
          </div>
          <div className="form-group">
            <label>Nova senha (mín. 6 caracteres)</label>
            <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required placeholder="Nova senha" />
          </div>
          <div className="form-group">
            <label>Confirmar nova senha</label>
            <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required placeholder="Confirme a nova senha" />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-sm" disabled={saving}>{saving ? 'Alterando...' : 'Alterar Senha'}</button>
            <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [allRegistros, setAllRegistros] = useState([])
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFoto, setSelectedFoto] = useState(null)
  const [detailRegistro, setDetailRegistro] = useState(null)
  const [editRegistro, setEditRegistro] = useState(null)
  const [deleteRegistro, setDeleteRegistro] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [toast, setToast] = useState(null)
  const prevCount = useRef(0)
  const navigate = useNavigate()
  const token = localStorage.getItem('admin_token')

  const fetchRegistros = useCallback(async () => {
    if (!token) return
    const data = await listarRegistros(token)
    if (data.registros) {
      const registrados = data.registros.filter(r => r.enviado_em).length
      if (prevCount.current > 0 && registrados > prevCount.current) {
        setToast('Novo registro recebido!')
      }
      prevCount.current = registrados
      setAllRegistros(data.registros)
    } else {
      setError(data.error || 'Erro ao carregar')
    }
  }, [token])

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return }
    setLoading(true)
    fetchRegistros().then(() => setLoading(false))
    const interval = setInterval(fetchRegistros, 30000)
    return () => clearInterval(interval)
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
    if (statusFilter === 'pendente') list = list.filter(r => !r.enviado_em)
    else if (statusFilter === 'registrado') list = list.filter(r => r.enviado_em)
    return list
  }, [allRegistros, busca, statusFilter])

  async function handleRowClick(r) {
    const data = await getRegistro(token, r.id)
    if (data.registro) setDetailRegistro(data.registro)
  }

  function handleEditClick(r, e) { e.stopPropagation(); setEditRegistro(r) }
  function handleDeleteClick(r, e) { e.stopPropagation(); setDeleteRegistro(r) }
  function handleLogout() { localStorage.removeItem('admin_token'); navigate('/admin/login') }

  function exportCSV() {
    const headers = ['Nome', 'Email', 'Celular', 'Serial', 'Modelo', 'Mochila', 'Carregador', 'Observações', 'Data', 'Status']
    const rows = filteredRegistros.map(r => [
      r.nome, r.email, r.celular, r.serial, r.modelo_notebook || '',
      Number(r.com_mochila) ? 'Sim' : 'Não', Number(r.com_carregador) ? 'Sim' : 'Não',
      r.observacao || '', r.enviado_em || r.criado_em,
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

  function acessoriosText(r) {
    const items = []
    if (Number(r.com_mochila)) items.push('Mochila')
    if (Number(r.com_carregador)) items.push('Carregador')
    return items.length ? items.join(', ') : <span className="empty-field">-</span>
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Localiza &mdash; Registro de Notebooks</h1>
          <div className="admin-header-actions">
            <button className="btn btn-sm" onClick={() => navigate('/admin/enviar')}>Links</button>
            <button className="btn btn-sm btn-outline" onClick={() => setShowPasswordModal(true)}>Alterar Senha</button>
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
                <div className="progress-bar-fill" style={{ width: `${Math.min(stats.porcentagem, 100)}%` }} />
              </div>
              <div className="progress-footer">
                <span>{stats.registrados} de {TOTAL_NOTEBOOKS} notebooks registrados</span>
                <span>{Math.round(TOTAL_NOTEBOOKS - stats.registrados)} restantes</span>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="admin-toolbar">
              <div className="toolbar-left">
                <input className="search-input" placeholder="Buscar por nome, serial ou email..." value={busca} onChange={e => setBusca(e.target.value)} />
                <div className="filter-group">
                  <button className={`filter-btn ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>Todos ({stats.total})</button>
                  <button className={`filter-btn ${statusFilter === 'pendente' ? 'active' : ''}`} onClick={() => setStatusFilter('pendente')}>Pendentes ({stats.pendentes})</button>
                  <button className={`filter-btn ${statusFilter === 'registrado' ? 'active' : ''}`} onClick={() => setStatusFilter('registrado')}>Registrados ({stats.registrados})</button>
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
                    <th>Acessórios</th>
                    <th>Observações</th>
                    <th>Data</th>
                    <th>Fotos</th>
                    <th>Status</th>
                    <th style={{ width: 80 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistros.length === 0 ? (
                    <tr><td colSpan="11" className="empty">Nenhum registro encontrado</td></tr>
                  ) : (
                    filteredRegistros.map(r => (
                      <tr key={r.id} className="clickable-row" onClick={() => handleRowClick(r)}>
                        <td className="cell-name">{r.nome || <span className="empty-field">Aguardando</span>}</td>
                        <td>{r.email || <span className="empty-field">-</span>}</td>
                        <td>{r.celular || <span className="empty-field">-</span>}</td>
                        <td><code>{r.serial}</code></td>
                        <td>{r.modelo_notebook || <span className="empty-field">-</span>}</td>
                        <td style={{ fontSize: 12 }}>{acessoriosText(r)}</td>
                        <td style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.observacao || <span className="empty-field">-</span>}
                        </td>
                        <td className="cell-date">{new Date(r.enviado_em || r.criado_em).toLocaleString('pt-BR')}</td>
                        <td>
                          <div className="foto-thumbs">
                            {[r.foto1_url, r.foto2_url, r.foto3_url].filter(Boolean).map((url, i) => (
                              <img key={i} src={url} alt={`Foto ${i + 1}`} className="foto-thumb" onClick={e => { e.stopPropagation(); setSelectedFoto(url) }} />
                            ))}
                            {![r.foto1_url, r.foto2_url, r.foto3_url].some(Boolean) && <span className="no-fotos">-</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${r.enviado_em ? 'status-ok' : 'status-pendente'}`}>
                            {r.enviado_em ? 'Registrado' : 'Pendente'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="action-btn" title="Editar" onClick={(e) => handleEditClick(r, e)}>&#9998;</button>
                            <button className="action-btn action-delete" title="Excluir" onClick={(e) => handleDeleteClick(r, e)}>&#10005;</button>
                          </div>
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

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {selectedFoto && (
        <div className="overlay" onClick={() => setSelectedFoto(null)}>
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <button className="overlay-close" onClick={() => setSelectedFoto(null)}>&times;</button>
            <img src={selectedFoto} alt="Foto ampliada" className="overlay-img" />
          </div>
        </div>
      )}

      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}

      <DetailModal registro={detailRegistro} onClose={() => setDetailRegistro(null)} onEdit={(r) => setEditRegistro(r)} />
      <EditModal registro={editRegistro} onClose={() => setEditRegistro(null)} onSave={fetchRegistros} />
      <DeleteConfirm registro={deleteRegistro} onClose={() => setDeleteRegistro(null)} onDeleted={fetchRegistros} />
    </div>
  )
}
