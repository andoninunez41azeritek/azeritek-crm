'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

const PIPE_COLS = [
  { id: 'sin_contacto', label: 'Sin contacto', color: '#4a5168' },
  { id: 'contactado', label: 'Contactado', color: '#3b9eff' },
  { id: 'pendiente_presupuesto', label: 'Pdte. presupuesto', color: '#f5a623' },
  { id: 'presupuesto_enviado', label: 'Presup. enviado', color: '#8b7fff' },
  { id: 'pedido', label: 'Pedido ✓', color: '#1fc98a' },
  { id: 'mantenimiento', label: 'Mantenimiento', color: '#14b8a6' },
  { id: 'perdido', label: 'Perdido', color: '#ef4444' },
]
const AV_COLORS = { AN: '#8b7fff', JO: '#1fc98a', IK: '#3b9eff', MI: '#f5a623', CO: '#f5a623' }
const DEFAULT_TYPES = [
  { name: 'Industrial', color: '#a78bfa' }, { name: 'Tecnología', color: '#3b9eff' },
  { name: 'Construcción', color: '#f5a623' }, { name: 'Retail', color: '#1fc98a' },
  { name: 'Servicios', color: '#60a5fa' }, { name: 'Clínicas', color: '#ef4444' },
  { name: 'Hostelería', color: '#fb923c' }, { name: 'Automoción', color: '#ec4899' },
  { name: 'Logística', color: '#fbbf24' }, { name: 'Inmobiliaria', color: '#34d399' },
  { name: 'Educación', color: '#c084fc' }, { name: 'Alimentación', color: '#8b7fff' },
]
const COLORS = ['#8b7fff','#3b9eff','#1fc98a','#f5a623','#ef4444','#ec4899','#a78bfa','#34d399','#60a5fa','#fbbf24','#fb923c','#14b8a6','#c084fc','#f472b6']
const SERVICES = ['Agente IA WhatsApp','Reservas automáticas','CRM + integraciones','Web premium','Atención 24/7','Email automation']
const COMERCIALES = [
  { key: 'AN', name: 'Andoni' },
  { key: 'JO', name: 'Jon' },
  { key: 'IK', name: 'Iker' },
  { key: 'MI', name: 'Miren' },
  { key: 'CO', name: 'Comercial' },
]

export default function Home() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [companies, setCompanies] = useState([])
  const [leads, setLeads] = useState([])
  const [types, setTypes] = useState(DEFAULT_TYPES)
  const [appointments, setAppointments] = useState([])

  // UI state
  const [coFilter, setCoFilter] = useState('all')
  const [pipeFilter, setPipeFilter] = useState({ sector: 'all', user: 'all' })
  const [selColor, setSelColor] = useState('#8b7fff')
  const [newType, setNewType] = useState('')

  // Modals
  const [modal, setModal] = useState(null) // 'addCo' | 'editCo' | 'addLead' | 'editLead' | 'addCita' | 'sendPipeline'
  const [editTarget, setEditTarget] = useState(null)

  // Forms
  const emptyLead = { name:'', sector:'', amount:'', monthly:'', assigned:'AN', status:'contactado', flag_color:'', flag_date:'' }
  const emptyCo = { name:'', contact:'', email:'', phone:'', type:'', service: [] }
  const emptyCita = { company:'', date:'', time:'10:00', service: SERVICES[0], assigned:'Andoni', notes:'' }
  const emptyPipeline = { status:'contactado', assigned:'AN', sector:'', amount:'', monthly:'' }

  const [formLead, setFormLead] = useState(emptyLead)
  const [formCo, setFormCo] = useState(emptyCo)
  const [formCita, setFormCita] = useState(emptyCita)
  const [formPipeline, setFormPipeline] = useState(emptyPipeline)
  const [calMonth, setCalMonth] = useState(new Date())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data)
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    const [c, l, t, a] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('types').select('*'),
      supabase.from('appointments').select('*').order('date', { ascending: true }),
    ])
    if (c.data) setCompanies(c.data)
    if (l.data) setLeads(l.data)
    if (t.data && t.data.length) setTypes(t.data)
    if (a.data) setAppointments(a.data)
  }

  async function logout() { await supabase.auth.signOut(); setPage('dashboard') }

  // ── COMPANIES ──
  async function saveCo() {
    if (!formCo.name.trim()) return
    const payload = { ...formCo, type: formCo.type || types[0]?.name, service: Array.isArray(formCo.service) ? formCo.service : [] }
    if (editTarget) {
      const { data } = await supabase.from('companies').update(payload).eq('id', editTarget.id).select()
      if (data) setCompanies(companies.map(c => c.id === editTarget.id ? data[0] : c))
    } else {
      const { data } = await supabase.from('companies').insert([payload]).select()
      if (data) setCompanies([data[0], ...companies])
    }
    setFormCo(emptyCo); setEditTarget(null); setModal(null)
  }
  async function deleteCo(id) {
    if (!confirm('¿Eliminar esta empresa?')) return
    await supabase.from('companies').delete().eq('id', id)
    setCompanies(companies.filter(c => c.id !== id))
  }

  // ── LEADS ──
  async function saveLead() {
    if (!formLead.name.trim()) return
    const payload = { ...formLead, amount: formLead.amount ? Number(formLead.amount) : null, monthly: formLead.monthly ? Number(formLead.monthly) : null }
    if (editTarget) {
      const { data } = await supabase.from('leads').update(payload).eq('id', editTarget.id).select()
      if (data) setLeads(leads.map(l => l.id === editTarget.id ? data[0] : l))
    } else {
      const withDate = { ...payload, date: new Date().toLocaleDateString('es-ES') }
      const { data } = await supabase.from('leads').insert([withDate]).select()
      if (data) setLeads([data[0], ...leads])
    }
    setFormLead(emptyLead); setEditTarget(null); setModal(null)
  }
  async function deleteLead(id) {
    if (!confirm('¿Eliminar este lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    setLeads(leads.filter(l => l.id !== id))
  }
  async function changeLeadStatus(id, status) {
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l))
  }

  // ── SEND TO PIPELINE ──
  async function sendToPipeline() {
    if (!editTarget) return
    const lead = {
      name: editTarget.name,
      sector: formPipeline.sector || editTarget.type || '',
      status: formPipeline.status,
      assigned: formPipeline.assigned,
      amount: formPipeline.amount ? Number(formPipeline.amount) : null,
      monthly: formPipeline.monthly ? Number(formPipeline.monthly) : null,
      date: new Date().toLocaleDateString('es-ES'),
    }
    const { data, error } = await supabase.from('leads').insert([lead]).select()
    if (error) { alert('Error: ' + error.message); return }
    if (data) setLeads([data[0], ...leads])
    setFormPipeline(emptyPipeline); setEditTarget(null); setModal(null)
    setPage('pipeline')
  }

  // ── TYPES ──
  async function addType() {
    if (!newType.trim()) return
    const { data } = await supabase.from('types').insert([{ name: newType, color: selColor }]).select()
    if (data) setTypes([...types, data[0]])
    else setTypes([...types, { name: newType, color: selColor }])
    setNewType('')
  }
  async function deleteType(idx) {
    const t = types[idx]
    if (t.id) await supabase.from('types').delete().eq('id', t.id)
    setTypes(types.filter((_, i) => i !== idx))
  }

  // ── APPOINTMENTS ──
  async function saveCita() {
    if (!formCita.company.trim() || !formCita.date) return
    // Validar que no haya otra cita el mismo día y hora
    const duplicate = appointments.find(a =>
      a.date === formCita.date &&
      String(a.time||'').slice(0,5) === String(formCita.time||'').slice(0,5) &&
      (!editTarget || a.id !== editTarget.id)
    )
    if (duplicate) {
      alert(`⚠️ Ya hay una cita con ${duplicate.company} el ${formCita.date} a las ${String(formCita.time).slice(0,5)}. Elige otra hora.`)
      return
    }
    if (editTarget) {
      const { data } = await supabase.from('appointments').update(formCita).eq('id', editTarget.id).select()
      if (data) setAppointments(appointments.map(a => a.id === editTarget.id ? data[0] : a))
    } else {
      const { data } = await supabase.from('appointments').insert([formCita]).select()
      if (data) setAppointments([...appointments, data[0]])
    }
    setFormCita(emptyCita); setEditTarget(null); setModal(null)
  }
  async function deleteCita(id) {
    if (!confirm('¿Eliminar esta cita?')) return
    await supabase.from('appointments').delete().eq('id', id)
    setAppointments(appointments.filter(a => a.id !== id))
  }

  const role = profile?.role || 'comercial'
  const filteredLeads = leads.filter(l => {
    if (pipeFilter.sector !== 'all' && l.sector !== pipeFilter.sector) return false
    if (pipeFilter.user !== 'all' && l.assigned !== pipeFilter.user) return false
    return true
  })
  const filteredCos = coFilter === 'all' ? companies : companies.filter(c => c.type === coFilter)

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0b0d12', color:'#8b7fff', fontSize:16, gap:12 }}><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⏳</span> Cargando...</div>
  if (!session) return <LoginScreen />

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0b0d12', color:'#edf0f8', fontFamily:'var(--font-sans)', position:'relative', overflow:'hidden' }}>
      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:150 }} />
      )}

      {/* Sidebar — fijo en móvil, normal en desktop */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : -240) : 0,
        top: 0, bottom: 0, zIndex: isMobile ? 200 : 'auto',
        transition: 'left .25s ease', flexShrink: 0,
      }}>
        <Sidebar page={page} setPage={p => { setPage(p); setSidebarOpen(false) }} role={role} profile={profile} onLogout={logout} leads={leads} />
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', minWidth:0, paddingBottom: isMobile ? 64 : 0 }}>
        <Topbar page={page} role={role} isMobile={isMobile} onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewCita={() => { setFormCita(emptyCita); setEditTarget(null); setModal('addCita') }}
          onAddCo={() => { setFormCo(emptyCo); setEditTarget(null); setModal('addCo') }}
          onAddLead={() => { setFormLead(emptyLead); setEditTarget(null); setModal('addLead') }}
        />
        <div style={{ padding: isMobile ? '14px' : '20px 24px', flex:1 }}>
          {page === 'dashboard' && <Dashboard leads={leads} companies={companies} setPage={setPage} appointments={appointments} isMobile={isMobile} />}
          {page === 'calendar' && (
            <CalendarPage appointments={appointments} month={calMonth} setMonth={setCalMonth} isMobile={isMobile}
              onAdd={() => { setFormCita(emptyCita); setEditTarget(null); setModal('addCita') }}
              onDelete={deleteCita}
              onEdit={a => { setFormCita({ company:a.company||'', date:a.date||'', time:a.time||'10:00', service:a.service||SERVICES[0], assigned:a.assigned||'Andoni', notes:a.notes||'' }); setEditTarget(a); setModal('addCita') }}
              onSelectDay={(d) => { setFormCita({ ...emptyCita, date: d }); setEditTarget(null); setModal('addCita') }}
            />
          )}
          {page === 'companies' && (
            <CompaniesPage companies={filteredCos} types={types} filter={coFilter} setFilter={setCoFilter}
              allCompanies={companies} role={role} isMobile={isMobile}
              onAdd={() => { setFormCo(emptyCo); setEditTarget(null); setModal('addCo') }}
              onEdit={co => { setFormCo({ name:co.name, contact:co.contact||'', email:co.email||'', phone:co.phone||'', type:co.type||'', service: Array.isArray(co.service) ? co.service : (co.service ? co.service.split(',').map(s=>s.trim()).filter(Boolean) : []) }); setEditTarget(co); setModal('addCo') }}
              onDelete={deleteCo}
              onSendPipeline={co => { setEditTarget(co); setFormPipeline({ ...emptyPipeline, sector: co.type||'' }); setModal('sendPipeline') }}
            />
          )}
          {page === 'pipeline' && (
            <PipelinePage leads={filteredLeads} allLeads={leads} filter={pipeFilter} setFilter={setPipeFilter} isMobile={isMobile}
              onAdd={() => { setFormLead(emptyLead); setEditTarget(null); setModal('addLead') }}
              onEdit={l => { setFormLead({ name:l.name, sector:l.sector||'', amount:l.amount||'', monthly:l.monthly||'', assigned:l.assigned||'AN', status:l.status||'contactado', flag_color:l.flag_color||'', flag_date:l.flag_date||'' }); setEditTarget(l); setModal('addLead') }}
              onDelete={deleteLead}
              onChangeStatus={changeLeadStatus}
            />
          )}
          {page === 'types' && role === 'admin' && <TypesPage types={types} companies={companies} newType={newType} setNewType={setNewType} selColor={selColor} setSelColor={setSelColor} onAdd={addType} onDelete={deleteType} colors={COLORS} />}
          {page === 'team' && role === 'admin' && <TeamPage leads={leads} />}
          {page === 'reports' && role === 'admin' && <ReportsPage leads={leads} companies={companies} isMobile={isMobile} />}
        </div>
      </div>

      {/* Bottom nav móvil */}
      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#13161f', borderTop:'1px solid rgba(255,255,255,.12)', display:'flex', zIndex:100, height:64 }}>
          {[
            { id:'dashboard', icon:'🏠', label:'Inicio' },
            { id:'companies', icon:'🏢', label:'Empresas' },
            { id:'pipeline', icon:'📊', label:'Pipeline' },
            { id:'calendar', icon:'📅', label:'Citas' },
            { id:'menu', icon:'☰', label:'Menú' },
          ].map(item => (
            <button key={item.id} onClick={() => item.id === 'menu' ? setSidebarOpen(!sidebarOpen) : setPage(item.id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'none', border:'none', cursor:'pointer', color: page===item.id?'#8b7fff':'#7880a0', transition:'color .15s', padding:'8px 0' }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ fontSize:10, fontWeight: page===item.id?700:400 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── MODALS ── */}
      {(modal === 'addCo') && (
        <Modal title={editTarget ? '✏️ Editar empresa' : '🏢 Nueva empresa'} onClose={() => setModal(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Nombre de la empresa *" value={formCo.name} onChange={v=>setFormCo({...formCo,name:v})} placeholder="Ej: Restaurante Kaia" />
            <FInput label="Persona de contacto" value={formCo.contact} onChange={v=>setFormCo({...formCo,contact:v})} placeholder="Nombre y apellido" />
            <FInput label="Email" value={formCo.email} onChange={v=>setFormCo({...formCo,email:v})} type="email" placeholder="contacto@empresa.com" />
            <FInput label="Teléfono" value={formCo.phone} onChange={v=>setFormCo({...formCo,phone:v})} placeholder="943 00 00 00" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FSel label="Tipo de empresa" value={formCo.type} onChange={v=>setFormCo({...formCo,type:v})} options={types.map(t=>t.name)} />
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#b8c0d8', marginBottom:8, display:'block', fontWeight:500 }}>Servicios de interés <span style={{ color:'#7880a0', fontWeight:400 }}>(selecciona uno o varios)</span></label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {SERVICES.map(s => {
                const selected = Array.isArray(formCo.service) ? formCo.service.includes(s) : false
                return (
                  <div key={s} onClick={() => {
                    const curr = Array.isArray(formCo.service) ? formCo.service : []
                    const updated = curr.includes(s) ? curr.filter(x=>x!==s) : [...curr, s]
                    setFormCo({...formCo, service: updated})
                  }} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 11px', borderRadius:8, border:`1px solid ${selected?'rgba(139,127,255,.5)':'rgba(255,255,255,.15)'}`, background:selected?'rgba(139,127,255,.15)':'#1c2030', cursor:'pointer', transition:'all .15s' }}>
                    <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${selected?'#8b7fff':'rgba(255,255,255,.3)'}`, background:selected?'#8b7fff':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
                      {selected && <span style={{ color:'#fff', fontSize:11, lineHeight:1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:12, color:selected?'#edf0f8':'#b8c0d8', fontWeight:selected?600:400 }}>{s}</span>
                  </div>
                )
              })}
            </div>
            {Array.isArray(formCo.service) && formCo.service.length === 0 && (
              <div style={{ fontSize:11, color:'#f5a623', marginTop:6 }}>⚠️ Selecciona al menos un servicio</div>
            )}
          </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <Btn variant="primary" onClick={saveCo}>✓ {editTarget ? 'Guardar cambios' : 'Crear empresa'}</Btn>
            <Btn onClick={() => setModal(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modal === 'addLead' && (
        <Modal title={editTarget ? '✏️ Editar lead' : '➕ Nuevo lead en pipeline'} onClose={() => setModal(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Nombre del lead *" value={formLead.name} onChange={v=>setFormLead({...formLead,name:v})} placeholder="Ej: Restaurante Kaia" />
            <FInput label="Sector" value={formLead.sector} onChange={v=>setFormLead({...formLead,sector:v})} placeholder="Ej: Hostelería" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FSel label="Estado en pipeline" value={formLead.status} onChange={v=>setFormLead({...formLead,status:v})} options={PIPE_COLS.map(c=>({ value:c.id, label:c.label }))} />
            <FSel label="Comercial asignado" value={formLead.assigned} onChange={v=>setFormLead({...formLead,assigned:v})} options={COMERCIALES.map(c=>({ value:c.key, label:c.name }))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Importe (€)" value={formLead.amount} onChange={v=>setFormLead({...formLead,amount:v})} type="number" placeholder="0" />
            <FInput label="Cuota mensual (€/mes)" value={formLead.monthly} onChange={v=>setFormLead({...formLead,monthly:v})} type="number" placeholder="0" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FSel label="Flag de alerta" value={formLead.flag_color} onChange={v=>setFormLead({...formLead,flag_color:v})} options={[{ value:'', label:'Sin alerta' },{ value:'red', label:'🚩 Urgente (rojo)' },{ value:'blue', label:'📅 Seguimiento (azul)' }]} />
            <FInput label="Fecha de alerta" value={formLead.flag_date} onChange={v=>setFormLead({...formLead,flag_date:v})} placeholder="Ej: 20/06" />
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <Btn variant="primary" onClick={saveLead}>✓ {editTarget ? 'Guardar cambios' : 'Añadir al pipeline'}</Btn>
            <Btn onClick={() => setModal(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modal === 'sendPipeline' && editTarget && (
        <Modal title={`📊 Enviar al pipeline`} onClose={() => setModal(null)}>
          <div style={{ background:'rgba(139,127,255,.1)', border:'1px solid rgba(139,127,255,.3)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#edf0f8' }}>{editTarget.name}</div>
            <div style={{ fontSize:12, color:'#7880a0', marginTop:2 }}>{editTarget.type} · {editTarget.contact}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FSel label="Estado inicial" value={formPipeline.status} onChange={v=>setFormPipeline({...formPipeline,status:v})} options={PIPE_COLS.map(c=>({ value:c.id, label:c.label }))} />
            <FSel label="Comercial asignado" value={formPipeline.assigned} onChange={v=>setFormPipeline({...formPipeline,assigned:v})} options={COMERCIALES.map(c=>({ value:c.key, label:c.name }))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Sector" value={formPipeline.sector} onChange={v=>setFormPipeline({...formPipeline,sector:v})} placeholder="Ej: Hostelería" />
            <FInput label="Importe estimado (€)" value={formPipeline.amount} onChange={v=>setFormPipeline({...formPipeline,amount:v})} type="number" placeholder="0" />
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <Btn variant="primary" onClick={sendToPipeline}>📊 Añadir al pipeline</Btn>
            <Btn onClick={() => setModal(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modal === 'addCita' && (
        <Modal title={editTarget ? '✏️ Editar cita' : '📅 Nueva cita'} onClose={() => { setModal(null); setEditTarget(null) }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Empresa *" value={formCita.company} onChange={v=>setFormCita({...formCita,company:v})} placeholder="Nombre de la empresa" />
            <FSel label="Comercial" value={formCita.assigned} onChange={v=>setFormCita({...formCita,assigned:v})} options={COMERCIALES.map(c=>c.name)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Fecha *" type="date" value={formCita.date} onChange={v=>setFormCita({...formCita,date:v})} />
            <FInput label="Hora" type="time" value={formCita.time} onChange={v=>setFormCita({...formCita,time:v})} />
          </div>
          <FSel label="Servicio a tratar" value={formCita.service} onChange={v=>setFormCita({...formCita,service:v})} options={SERVICES} />
          <FInput label="Notas" value={formCita.notes} onChange={v=>setFormCita({...formCita,notes:v})} placeholder="Contexto, objetivo de la reunión..." />
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <Btn variant="primary" onClick={saveCita}>✓ Guardar cita</Btn>
            <Btn onClick={() => setModal(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── LOGIN ──────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Rellena todos los campos'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0b0d12' }}>
      <div style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.2)', borderRadius:18, padding:40, width:380 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, background:'#8b7fff', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:24, color:'#fff', margin:'0 auto 16px' }}>A</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#edf0f8' }}>Azeritek CRM</div>
          <div style={{ fontSize:13, color:'#7880a0', marginTop:4 }}>Panel de gestión comercial</div>
        </div>
        <FInput label="Email" value={email} onChange={setEmail} type="email" placeholder="tu@azeritek.es" />
        <FInput label="Contraseña" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        {error && <div style={{ fontSize:12, color:'#ef4444', marginBottom:12, background:'rgba(239,68,68,.1)', padding:'10px 14px', borderRadius:9, border:'1px solid rgba(239,68,68,.2)' }}>⚠️ {error}</div>}
        <Btn variant="primary" style={{ width:'100%', justifyContent:'center', padding:'12px 0', marginTop:4, fontSize:14 }} onClick={handleLogin}>
          {loading ? '⏳ Entrando...' : 'Acceder →'}
        </Btn>
        <div style={{ fontSize:11, color:'#4a5168', textAlign:'center', marginTop:20 }}>Azeritek · Donostia, País Vasco</div>
      </div>
    </div>
  )
}

// ── SIDEBAR ────────────────────────────────────────────
function Sidebar({ page, setPage, role, profile, onLogout, leads }) {
  const items = [
    { id:'dashboard', icon:'🏠', label:'Dashboard' },
    { id:'calendar', icon:'📅', label:'Calendario' },
    { id:'companies', icon:'🏢', label:'Empresas' },
    { id:'pipeline', icon:'📊', label:'Pipeline', badge: leads.length },
    ...(role==='admin' ? [
      { id:'types', icon:'🏷️', label:'Tipos de empresa' },
      { id:'team', icon:'👥', label:'Equipo' },
      { id:'reports', icon:'📈', label:'Informes' },
    ] : [])
  ]
  return (
    <div style={{ width:220, background:'#13161f', borderRight:'1px solid rgba(255,255,255,.12)', display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', gap:11 }}>
        <div style={{ width:36, height:36, background:'#8b7fff', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:'#fff' }}>A</div>
        <div><div style={{ fontSize:15, fontWeight:700, color:'#edf0f8' }}>Azeritek</div><div style={{ fontSize:10, color:'#7880a0' }}>CRM comercial</div></div>
      </div>
      <div style={{ padding:'8px 0', flex:1 }}>
        <div style={{ padding:'12px 16px 4px', fontSize:10, color:'#4a5168', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Principal</div>
        {items.slice(0,2).map(item => <NavItem key={item.id} item={item} active={page===item.id} onClick={() => setPage(item.id)} />)}
        <div style={{ padding:'12px 16px 4px', fontSize:10, color:'#4a5168', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Gestión</div>
        {items.slice(2).map(item => <NavItem key={item.id} item={item} active={page===item.id} onClick={() => setPage(item.id)} />)}
      </div>
      <div style={{ padding:12, borderTop:'1px solid rgba(255,255,255,.12)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(139,127,255,.25)', color:'#c4beff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>{profile?.initials || profile?.name?.[0] || 'U'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#edf0f8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.name || profile?.email?.split('@')[0]}</div>
            <div style={{ fontSize:11, color:'#7880a0' }}>{role === 'admin' ? 'Administrador' : 'Comercial'}</div>
          </div>
          <Btn onClick={onLogout} style={{ padding:'6px 8px', flexShrink:0 }} title="Cerrar sesión">↩</Btn>
        </div>
      </div>
    </div>
  )
}

function NavItem({ item, active, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, cursor:'pointer', fontSize:13, color: active?'#edf0f8': hover?'#edf0f8':'#b8c0d8', margin:'1px 8px', background: active?'rgba(139,127,255,.15)': hover?'rgba(255,255,255,.05)':'transparent', border: active?'1px solid rgba(139,127,255,.4)':'1px solid transparent', transition:'all .15s' }}>
      <span style={{ fontSize:15 }}>{item.icon}</span>
      <span style={{ flex:1 }}>{item.label}</span>
      {item.badge ? <span style={{ background:'rgba(139,127,255,.3)', color:'#c4beff', fontSize:10, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>{item.badge}</span> : null}
    </div>
  )
}

// ── TOPBAR ─────────────────────────────────────────────
function Topbar({ page, role, isMobile, onMenuToggle, onNewCita, onAddCo, onAddLead }) {
  const titles = { dashboard:'Dashboard', calendar:'Calendario', companies:'Empresas', pipeline:'Pipeline', types:'Tipos', team:'Equipo', reports:'Informes' }
  const hints = { dashboard:'Resumen general', calendar:'Gestiona tus reuniones', companies:'Clientes y prospectos', pipeline:'Estado de los leads', types:'Categorías de empresa', team:'Miembros del equipo', reports:'Métricas y rendimiento' }
  return (
    <div style={{ padding: isMobile ? '12px 14px' : '14px 24px', background:'#13161f', borderBottom:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {isMobile && (
          <button onClick={onMenuToggle} style={{ background:'none', border:'none', color:'#edf0f8', cursor:'pointer', fontSize:20, padding:'4px', lineHeight:1 }}>☰</button>
        )}
        <div>
          <div style={{ fontSize: isMobile ? 15 : 17, fontWeight:700, color:'#edf0f8' }}>{titles[page]}</div>
          {!isMobile && <div style={{ fontSize:11, color:'#7880a0', marginTop:2 }}>{hints[page]}</div>}
        </div>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {!isMobile && <Btn onClick={onNewCita} title="Añadir cita">📅 Nueva cita</Btn>}
        {isMobile && page === 'calendar' && <Btn variant="primary" onClick={onNewCita} style={{ padding:'7px 10px', fontSize:12 }}>+ Cita</Btn>}
        {page === 'pipeline' && <Btn variant="primary" onClick={onAddLead} style={{ fontSize: isMobile ? 12 : 13, padding: isMobile ? '7px 10px' : '7px 14px' }}>➕ {isMobile ? '' : 'Nuevo lead'}</Btn>}
        {role === 'admin' && page === 'companies' && <Btn variant="primary" onClick={onAddCo} style={{ fontSize: isMobile ? 12 : 13, padding: isMobile ? '7px 10px' : '7px 14px' }}>🏢 {isMobile ? '' : 'Nueva empresa'}</Btn>}
      </div>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────
function Dashboard({ leads, companies, setPage, appointments, isMobile }) {
  const mrr = leads.filter(l=>l.status==='mantenimiento').reduce((s,l)=>s+(Number(l.monthly)||0),0)
  const today = new Date().toISOString().split('T')[0]
  const todayCitas = appointments.filter(a => a.date === today)
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
        {[
          { icon:'🏢', val: companies.length, label:'Empresas', sub:'+3 este mes', color:'rgba(139,127,255,.15)', ic:'#c4beff', page:'companies' },
          { icon:'📊', val: leads.length, label:'Leads activos', sub: leads.filter(l=>l.status==='presupuesto_enviado').length+' presupuestos pendientes', color:'rgba(245,166,35,.15)', ic:'#fcd34d', page:'pipeline' },
          { icon:'✅', val: leads.filter(l=>l.status==='pedido').length, label:'Pedidos cerrados', sub:'este periodo', color:'rgba(31,201,138,.15)', ic:'#6ee7b7', page:'pipeline' },
          { icon:'💰', val: `€${mrr}/mes`, label:'Ingresos recurrentes', sub: leads.filter(l=>l.status==='mantenimiento').length+' clientes activos', color:'rgba(59,158,255,.15)', ic:'#93c5fd', page:'pipeline' },
        ].map((s,i) => (
          <div key={i} onClick={()=>setPage(s.page)} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:14, padding:16, cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(139,127,255,.4)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.2)'}>
            <div style={{ width:36, height:36, borderRadius:10, background:s.color, color:s.ic, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, marginBottom:12 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:700, color:'#edf0f8' }}>{s.val}</div>
            <div style={{ fontSize:12, color:'#b8c0d8', marginTop:4, fontWeight:500 }}>{s.label}</div>
            <div style={{ fontSize:11, color:'#1fc98a', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {todayCitas.length > 0 && (
        <div style={{ background:'rgba(139,127,255,.08)', border:'1px solid rgba(139,127,255,.3)', borderRadius:14, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#c4beff', marginBottom:10 }}>📅 Citas de hoy</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {todayCitas.map((a,i) => (
              <div key={i} style={{ background:'rgba(139,127,255,.15)', borderRadius:9, padding:'8px 14px', fontSize:13 }}>
                <span style={{ fontWeight:600, color:'#edf0f8' }}>{a.company}</span>
                <span style={{ color:'#7880a0', marginLeft:8 }}>{String(a.time||'').slice(0,5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 16, marginBottom: isMobile ? 10 : 16 }}>
        <Card title="🕐 Actividad reciente" sub="Últimos leads añadidos">
          {leads.length === 0 && <Empty text="No hay leads todavía. ¡Añade el primero desde Pipeline!" />}
          {leads.slice(0,5).map((l,i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background: PIPE_COLS.find(c=>c.id===l.status)?.color||'#8b7fff', marginTop:5, flexShrink:0 }}></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:'#edf0f8', fontWeight:500 }}>{l.name}</div>
                <div style={{ fontSize:11, color:'#7880a0', marginTop:2 }}>{l.sector} · <span style={{ color: PIPE_COLS.find(c=>c.id===l.status)?.color||'#8b7fff' }}>{PIPE_COLS.find(c=>c.id===l.status)?.label||l.status}</span></div>
              </div>
              <div style={{ fontSize:10, color:'#4a5168' }}>{l.date}</div>
            </div>
          ))}
        </Card>
        <Card title="🚨 Alertas activas" sub="Leads con flags pendientes">
          {leads.filter(l=>l.flag_color).length === 0 && <Empty text="Sin alertas pendientes ✓" color="#1fc98a" />}
          {leads.filter(l=>l.flag_color).slice(0,4).map((l,i) => (
            <div key={i} style={{ background: l.flag_color==='red'?'rgba(239,68,68,.08)':'rgba(59,158,255,.08)', border:`1px solid ${l.flag_color==='red'?'rgba(239,68,68,.2)':'rgba(59,158,255,.2)'}`, borderRadius:10, padding:'10px 14px', marginBottom:8 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#edf0f8' }}>{l.flag_color==='red'?'🚩':'📅'} {l.name}</div>
              <div style={{ fontSize:11, color:'#b8c0d8', marginTop:3 }}>{l.sector} · Fecha: <strong>{l.flag_date}</strong></div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="📊 Estado del pipeline" action={<Btn onClick={()=>setPage('pipeline')}>Ver pipeline →</Btn>}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(6,1fr)', gap:8 }}>
          {PIPE_COLS.slice(1).map(col => (
            <div key={col.id} onClick={()=>setPage('pipeline')} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:12, textAlign:'center', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=col.color; e.currentTarget.style.background='#262c3e' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.12)'; e.currentTarget.style.background='#1c2030' }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:col.color, marginBottom:8 }}>{col.label}</div>
              <div style={{ fontSize:28, fontWeight:700, color:'#edf0f8' }}>{leads.filter(l=>l.status===col.id).length}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── CALENDAR ───────────────────────────────────────────
// ── CALENDAR ───────────────────────────────────────────
function CalendarPage({ appointments, month, setMonth, onAdd, onDelete, onEdit, onSelectDay, isMobile }) {
  const [openDay, setOpenDay] = useState(null)
  const year = month.getFullYear()
  const mon = month.getMonth()
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const firstDay = new Date(year, mon, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, mon + 1, 0).getDate()
  const today = new Date()

  const evByDay = {}
  appointments.forEach(a => {
    if (!a.date) return
    const d = new Date(a.date)
    if (d.getFullYear() === year && d.getMonth() === mon) {
      const day = d.getDate()
      if (!evByDay[day]) evByDay[day] = []
      evByDay[day].push(a)
    }
  })

  const upcoming = appointments
    .filter(a => a.date && new Date(a.date) >= new Date())
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8)

  function handleDayClick(d, evs, dateStr) {
    if (evs.length > 0) setOpenDay(openDay === d ? null : d)
    else onSelectDay(dateStr)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap:16 }}>
      <div>
        <div style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.12)', borderRadius:14, padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:'#edf0f8' }}>{monthNames[mon]} {year}</div>
              <div style={{ fontSize:12, color:'#7880a0', marginTop:2 }}>
                {appointments.filter(a=>{ const d=new Date(a.date); return d.getFullYear()===year&&d.getMonth()===mon }).length} citas · Clic en día con citas para ver detalles · Clic en día vacío para añadir
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Btn onClick={() => setMonth(new Date(year, mon-1))} style={{ padding:'6px 12px' }}>← Anterior</Btn>
              <Btn onClick={() => setMonth(new Date())} style={{ padding:'6px 12px', fontSize:12 }}>Hoy</Btn>
              <Btn onClick={() => setMonth(new Date(year, mon+1))} style={{ padding:'6px 12px' }}>Siguiente →</Btn>
              <Btn variant="primary" onClick={onAdd}>+ Nueva cita</Btn>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><div key={d} style={{ fontSize:11, textAlign:'center', color:'#4a5168', padding:'6px 0', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {Array.from({length:offset}).map((_,i) => <div key={'e'+i}></div>)}
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
              const isToday = d===today.getDate() && mon===today.getMonth() && year===today.getFullYear()
              const evs = evByDay[d] || []
              const isOpen = openDay === d
              const dateStr = `${year}-${String(mon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              return (
                <div key={d} style={{ position:'relative' }}>
                  <div onClick={() => handleDayClick(d, evs, dateStr)}
                    style={{ minHeight:64, background: isOpen?'rgba(139,127,255,.18)':isToday?'rgba(139,127,255,.12)':evs.length?'rgba(139,127,255,.06)':'#1c2030', border:`1.5px solid ${isOpen||isToday?'#8b7fff':evs.length?'rgba(139,127,255,.35)':'rgba(255,255,255,.08)'}`, borderRadius:10, padding:'7px 8px', cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(139,127,255,.6)'; e.currentTarget.style.background='rgba(139,127,255,.12)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=isOpen||isToday?'#8b7fff':evs.length?'rgba(139,127,255,.35)':'rgba(255,255,255,.08)'; e.currentTarget.style.background=isOpen?'rgba(139,127,255,.18)':isToday?'rgba(139,127,255,.12)':evs.length?'rgba(139,127,255,.06)':'#1c2030' }}>
                    <div style={{ fontSize:12, fontWeight:isToday?700:500, color:isToday?'#c4beff':'#b8c0d8', marginBottom:4 }}>{d}</div>
                    {evs.slice(0,2).map((ev,i)=>(
                      <div key={i} style={{ fontSize:9, background:'#8b7fff', color:'#fff', borderRadius:4, padding:'2px 5px', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }}>
                        {String(ev.time||'').slice(0,5)} {ev.company}
                      </div>
                    ))}
                    {evs.length > 2 && <div style={{ fontSize:9, color:'#c4beff', fontWeight:600 }}>+{evs.length-2} más ▾</div>}
                    {evs.length > 0 && evs.length <= 2 && <div style={{ fontSize:9, color:'#7880a0', marginTop:2 }}>▾ ver detalles</div>}
                    {evs.length === 0 && <div style={{ fontSize:9, color:'#4a5168', marginTop:2 }}>+ añadir</div>}
                  </div>
                  {isOpen && (
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:'50%', transform:'translateX(-50%)', zIndex:200, background:'#13161f', border:'1px solid rgba(139,127,255,.5)', borderRadius:12, padding:14, boxShadow:'0 12px 40px rgba(0,0,0,.6)', minWidth:240, maxWidth:280 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#c4beff' }}>📅 {d} de {monthNames[mon]}</div>
                        <div style={{ display:'flex', gap:5 }}>
                          <Btn onClick={() => { onSelectDay(dateStr); setOpenDay(null) }} style={{ padding:'3px 9px', fontSize:11 }}>+ Cita</Btn>
                          <button onClick={()=>setOpenDay(null)} style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:6, color:'#edf0f8', cursor:'pointer', fontSize:13, padding:'3px 7px', lineHeight:1 }}>×</button>
                        </div>
                      </div>
                      {evs.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).map((ev,i)=>(
                        <div key={i} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 12px', marginBottom:8 }}>
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:'#edf0f8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.company}</div>
                              <div style={{ fontSize:12, color:'#8b7fff', marginTop:3, fontWeight:600 }}>🕐 {String(ev.time||'').slice(0,5)}</div>
                              {ev.service && <div style={{ fontSize:11, color:'#7880a0', marginTop:3 }}>🔧 {ev.service}</div>}
                              {ev.assigned && <div style={{ fontSize:11, color:'#7880a0', marginTop:2 }}>👤 {ev.assigned}</div>}
                              {ev.notes && <div style={{ fontSize:11, color:'#5a6382', marginTop:5, fontStyle:'italic', borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:5 }}>"{ev.notes}"</div>}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                              <button onClick={()=>{ onEdit(ev); setOpenDay(null) }} style={{ background:'rgba(139,127,255,.2)', border:'1px solid rgba(139,127,255,.35)', borderRadius:6, color:'#c4beff', cursor:'pointer', fontSize:11, padding:'4px 8px', fontWeight:600 }}>✏️</button>
                              <button onClick={()=>{ onDelete(ev.id); if(evs.length===1) setOpenDay(null) }} style={{ background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', borderRadius:6, color:'#fca5a5', cursor:'pointer', fontSize:11, padding:'4px 8px', fontWeight:600 }}>🗑️</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <Card title="📋 Próximas citas" sub={`${upcoming.length} pendientes`}>
          {upcoming.length === 0 && <Empty text="No hay citas próximas. Clic en cualquier día del calendario para añadir una." />}
          {upcoming.map((a,i) => {
            const d = new Date(a.date)
            const isToday = d.toDateString() === new Date().toDateString()
            const isTomorrow = d.toDateString() === new Date(Date.now()+86400000).toDateString()
            return (
              <div key={i} style={{ background:isToday?'rgba(139,127,255,.1)':'rgba(255,255,255,.03)', border:`1px solid ${isToday?'rgba(139,127,255,.3)':'rgba(255,255,255,.07)'}`, borderRadius:10, padding:'11px 14px', marginBottom:8 }}>
                {isToday && <div style={{ fontSize:10, color:'#c4beff', fontWeight:700, marginBottom:5, background:'rgba(139,127,255,.2)', display:'inline-block', padding:'2px 8px', borderRadius:5 }}>HOY</div>}
                {isTomorrow && <div style={{ fontSize:10, color:'#6ee7b7', fontWeight:700, marginBottom:5, background:'rgba(31,201,138,.15)', display:'inline-block', padding:'2px 8px', borderRadius:5 }}>MAÑANA</div>}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#edf0f8' }}>{a.company}</div>
                    <div style={{ fontSize:12, color:'#8b7fff', marginTop:3, fontWeight:600 }}>🕐 {String(a.time||'').slice(0,5)} · {d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' })}</div>
                    {a.service && <div style={{ fontSize:11, color:'#7880a0', marginTop:3 }}>🔧 {a.service}</div>}
                    {a.assigned && <div style={{ fontSize:11, color:'#7880a0', marginTop:2 }}>👤 {a.assigned}</div>}
                    {a.notes && <div style={{ fontSize:11, color:'#5a6382', marginTop:5, fontStyle:'italic', borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:5 }}>"{a.notes}"</div>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, marginLeft:8 }}>
                    <button onClick={()=>onEdit(a)} style={{ background:'rgba(139,127,255,.15)', border:'1px solid rgba(139,127,255,.3)', borderRadius:6, color:'#c4beff', cursor:'pointer', fontSize:11, padding:'4px 7px' }}>✏️</button>
                    <button onClick={()=>onDelete(a.id)} style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#fca5a5', cursor:'pointer', fontSize:11, padding:'4px 7px' }}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

// ── COMPANIES ──────────────────────────────────────────
function CompaniesPage({ companies, types, filter, setFilter, allCompanies, role, isMobile, onAdd, onEdit, onDelete, onSendPipeline }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1 }}>
          <FilterBtn active={filter==='all'} onClick={()=>setFilter('all')}>Todas ({allCompanies.length})</FilterBtn>
          {types.filter(t=>allCompanies.some(c=>c.type===t.name)).map(t=>(
            <FilterBtn key={t.name} active={filter===t.name} onClick={()=>setFilter(t.name)}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:t.color, display:'inline-block' }}></span>
              {t.name} ({allCompanies.filter(c=>c.type===t.name).length})
            </FilterBtn>
          ))}
        </div>
        {role==='admin' && <Btn variant="primary" onClick={onAdd} style={{ marginLeft:12, flexShrink:0 }}>🏢 Nueva empresa</Btn>}
      </div>

      {companies.length === 0 && (
        <Empty text={filter==='all' ? "No hay empresas todavía. Pulsa '+ Nueva empresa' para añadir la primera." : "No hay empresas en esta categoría."} />
      )}

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
        {companies.map((c,i) => {
          const col = types.find(t=>t.name===c.type)?.color || '#7880a0'
          return (
            <div key={i} style={{ background:'#1a1f2e', border:'1px solid rgba(255,255,255,.12)', borderRadius:14, padding:16, transition:'border-color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.25)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.12)'}>
              <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:col, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff', flexShrink:0 }}>{c.name?.[0]?.toUpperCase()}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#edf0f8' }}>{c.name}</div>
                  <div style={{ fontSize:12, color:'#b8c0d8', display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:col, display:'inline-block', flexShrink:0 }}></span>{c.type || 'Sin tipo'}
                  </div>
                </div>
                {c.service && (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignSelf:'flex-start', maxWidth:140 }}>
                    {(Array.isArray(c.service) ? c.service : c.service.split(',').map(s=>s.trim()).filter(Boolean)).map((s,j) => (
                      <span key={j} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(139,127,255,.18)', color:'#c4beff', border:'1px solid rgba(139,127,255,.3)', whiteSpace:'nowrap', fontWeight:500 }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:10, display:'grid', gap:5 }}>
                {c.contact && <div style={{ display:'flex', gap:8, fontSize:12, color:'#b8c0d8' }}><span>👤</span><span>{c.contact}</span></div>}
                {c.email && <div style={{ display:'flex', gap:8, fontSize:12, color:'#b8c0d8' }}><span>✉️</span><span>{c.email}</span></div>}
                {c.phone && <div style={{ display:'flex', gap:8, fontSize:12, color:'#b8c0d8' }}><span>📞</span><span>{c.phone}</span></div>}
              </div>
              {role==='admin' && (
                <div style={{ display:'flex', gap:6, marginTop:12, borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:12 }}>
                  <Btn onClick={()=>onSendPipeline(c)} style={{ flex:1, justifyContent:'center', padding:'6px 0', fontSize:12, background:'rgba(31,201,138,.12)', borderColor:'rgba(31,201,138,.3)', color:'#6ee7b7' }}>📊 Enviar al pipeline</Btn>
                  <Btn onClick={()=>onEdit(c)} style={{ padding:'6px 10px', fontSize:12 }}>✏️</Btn>
                  <Btn variant="danger" onClick={()=>onDelete(c.id)} style={{ padding:'6px 10px', fontSize:12 }}>🗑️</Btn>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PIPELINE ───────────────────────────────────────────
function PipelinePage({ leads, allLeads, filter, setFilter, isMobile, onAdd, onEdit, onDelete, onChangeStatus }) {
  const presup = allLeads.filter(l=>l.status==='presupuesto_enviado').reduce((s,l)=>s+(Number(l.amount)||0),0)
  const ganado = allLeads.filter(l=>l.status==='pedido').reduce((s,l)=>s+(Number(l.amount)||0),0)
  const mant = allLeads.filter(l=>l.status==='mantenimiento').reduce((s,l)=>s+(Number(l.monthly)||0),0)
  const perdido = allLeads.filter(l=>l.status==='perdido').reduce((s,l)=>s+(Number(l.amount)||0),0)
  const SECTORS = [...new Set(allLeads.map(l=>l.sector).filter(Boolean))]

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 8 : 10, marginBottom:16 }}>
        {[
          { label:'Presupuestado', val:`€${presup.toLocaleString()}`, sub: allLeads.filter(l=>l.status==='presupuesto_enviado').length+' leads', bg:'rgba(139,127,255,.08)', bd:'rgba(139,127,255,.25)', color:'#c4beff' },
          { label:'Ganado', val:`€${ganado.toLocaleString()}`, sub: allLeads.filter(l=>l.status==='pedido').length+' leads', bg:'rgba(31,201,138,.08)', bd:'rgba(31,201,138,.25)', color:'#6ee7b7' },
          { label:'Mantenimiento', val:`€${mant}/mes`, sub: allLeads.filter(l=>l.status==='mantenimiento').length+' activos', bg:'rgba(20,184,166,.08)', bd:'rgba(20,184,166,.25)', color:'#5eead4' },
          { label:'Perdido', val:`€${perdido.toLocaleString()}`, sub: allLeads.filter(l=>l.status==='perdido').length+' leads', bg:'rgba(239,68,68,.06)', bd:'rgba(239,68,68,.2)', color:'#fca5a5' },
        ].map((m,i)=>(
          <div key={i} style={{ background:m.bg, border:`1px solid ${m.bd}`, borderRadius:12, padding:'13px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#7880a0', marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:m.color, marginBottom:3 }}>{m.val}</div>
            <div style={{ fontSize:11, color:'#7880a0' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filter.sector} onChange={e=>setFilter({...filter,sector:e.target.value})}
          style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:9, color:'#edf0f8', fontSize:12, padding:'7px 12px', cursor:'pointer', outline:'none' }}>
          <option value="all">🏭 Todos los sectores</option>
          {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.user} onChange={e=>setFilter({...filter,user:e.target.value})}
          style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:9, color:'#edf0f8', fontSize:12, padding:'7px 12px', cursor:'pointer', outline:'none' }}>
          <option value="all">👥 Todos los comerciales</option>
          {COMERCIALES.map(c=><option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
        {(filter.sector!=='all'||filter.user!=='all') && (
          <Btn onClick={()=>setFilter({sector:'all',user:'all'})} style={{ padding:'5px 10px', fontSize:11 }}>✕ Limpiar filtros</Btn>
        )}
        <div style={{ marginLeft:'auto', fontSize:12, color:'#7880a0' }}>{leads.length} leads</div>
      </div>

      {allLeads.length === 0 && (
        <Empty text="No hay leads en el pipeline. Pulsa '+ Nuevo lead' o envía una empresa desde la sección Empresas." />
      )}

      <div style={{ overflowX:'auto', paddingBottom:8 }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${PIPE_COLS.length},minmax(160px,1fr))`, gap:9, minWidth:1000 }}>
          {PIPE_COLS.map(col => {
            const colLeads = leads.filter(l=>l.status===col.id)
            return (
              <div key={col.id} style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'11px 9px', minHeight:200, display:'flex', flexDirection:'column', gap:7 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 4px', marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:col.color }}>{col.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'2px 8px', color:'#b8c0d8' }}>{colLeads.length}</span>
                </div>
                {colLeads.length === 0
                  ? <div style={{ textAlign:'center', padding:'20px 8px', fontSize:11, color:'#4a5168', border:'1px dashed rgba(255,255,255,.07)', borderRadius:9, lineHeight:1.5 }}>Sin leads aquí</div>
                  : colLeads.map((l,i) => {
                    const avc = AV_COLORS[l.assigned] || '#7880a0'
                    return (
                      <div key={i} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 11px', transition:'border-color .15s' }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.28)'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.12)'}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:5 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'#edf0f8', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginRight:8 }}>{l.name}</div>
                          <div style={{ width:24, height:24, borderRadius:'50%', background:avc, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', flexShrink:0 }} title={COMERCIALES.find(c=>c.key===l.assigned)?.name||l.assigned}>{l.assigned}</div>
                        </div>
                        {l.sector && <div style={{ fontSize:11, color:'#7880a0', marginBottom:6 }}>{l.sector}</div>}
                        {l.amount ? <div style={{ fontSize:13, fontWeight:700, color:col.color, marginBottom:5 }}>€{Number(l.amount).toLocaleString()}</div> : null}
                        {l.monthly ? <div style={{ fontSize:13, fontWeight:700, color:col.color, marginBottom:5 }}>€{l.monthly}<span style={{ fontSize:10, fontWeight:400 }}>/mes</span></div> : null}
                        {l.flag_color && (
                          <div style={{ fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:5, background:l.flag_color==='red'?'rgba(239,68,68,.18)':'rgba(59,158,255,.18)', color:l.flag_color==='red'?'#fca5a5':'#93c5fd', display:'inline-block', marginBottom:6 }}>
                            {l.flag_color==='red'?'🚩':'📅'} {l.flag_date}
                          </div>
                        )}
                        <div style={{ fontSize:10, color:'#4a5168', marginBottom:7 }}>{l.date}</div>
                        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:7 }}>
                          <div style={{ fontSize:10, color:'#7880a0', marginBottom:5 }}>Mover a:</div>
                          <select value={l.status} onChange={e=>onChangeStatus(l.id, e.target.value)}
                            style={{ width:'100%', background:'#13161f', border:'1px solid rgba(255,255,255,.15)', borderRadius:7, color:'#edf0f8', fontSize:11, padding:'5px 8px', cursor:'pointer', outline:'none', marginBottom:6 }}>
                            {PIPE_COLS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                          <div style={{ display:'flex', gap:4 }}>
                            <Btn onClick={()=>onEdit(l)} style={{ flex:1, justifyContent:'center', padding:'4px 0', fontSize:11 }}>✏️ Editar</Btn>
                            <Btn variant="danger" onClick={()=>onDelete(l.id)} style={{ padding:'4px 8px', fontSize:11 }}>🗑️</Btn>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── TYPES ──────────────────────────────────────────────
function TypesPage({ types, companies, newType, setNewType, selColor, setSelColor, onAdd, onDelete, colors }) {
  return (
    <Card title="Tipos de empresa" sub="Define categorías con colores personalizados">
      {types.length === 0 && <Empty text="No hay tipos creados todavía." />}
      <div style={{ marginBottom:16 }}>
        {types.map((t,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
            <div style={{ width:36, height:36, borderRadius:9, background:t.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{t.name?.[0]}</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#edf0f8' }}>{t.name}</div>
              <div style={{ fontSize:11, color:'#7880a0', marginTop:2 }}>{companies.filter(c=>c.type===t.name).length} empresas asignadas</div>
            </div>
            <Btn variant="danger" onClick={()=>onDelete(i)} style={{ padding:'5px 10px' }}>🗑️ Eliminar</Btn>
          </div>
        ))}
      </div>
      <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:18 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#edf0f8', marginBottom:14 }}>➕ Crear nuevo tipo</div>
        <FInput label="Nombre del tipo" value={newType} onChange={setNewType} placeholder="Ej: Farmacia, Energía, Logística..." />
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'#b8c0d8', marginBottom:8, display:'block', fontWeight:500 }}>Elige un color</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {colors.map(c=>(
              <div key={c} onClick={()=>setSelColor(c)} style={{ width:30, height:30, borderRadius:8, background:c, cursor:'pointer', border:selColor===c?'3px solid #fff':'3px solid transparent', transform:selColor===c?'scale(1.15)':'scale(1)', transition:'all .15s' }} title={c}></div>
            ))}
          </div>
        </div>
        <Btn variant="primary" onClick={onAdd}>✓ Crear tipo</Btn>
      </div>
    </Card>
  )
}

// ── TEAM ───────────────────────────────────────────────
function TeamPage({ leads }) {
  const team = [
    { ini:'A', name:'Admin', email:'admin@azeritek.es', role:'admin', color:'rgba(139,127,255,.25)', tc:'#c4beff', key:'AN' },
    { ini:'C', name:'Comercial', email:'comercial@azeritek.es', role:'comercial', color:'rgba(31,201,138,.2)', tc:'#6ee7b7', key:'CO' },
  ]
  return (
    <Card title="Equipo comercial">
      {team.map((m,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom: i<team.length-1?'1px solid rgba(255,255,255,.08)':'none' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:m.color, color:m.tc, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, flexShrink:0 }}>{m.ini}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#edf0f8' }}>{m.name}</div>
            <div style={{ fontSize:12, color:'#b8c0d8', marginTop:2 }}>{m.email}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#edf0f8' }}>{leads.filter(l=>l.assigned===m.key).length}</div>
            <div style={{ fontSize:11, color:'#7880a0' }}>leads activos</div>
          </div>
          <span style={{ fontSize:11, padding:'4px 12px', borderRadius:10, fontWeight:600, background:m.role==='admin'?'rgba(139,127,255,.22)':'rgba(31,201,138,.18)', color:m.role==='admin'?'#c4beff':'#6ee7b7' }}>{m.role==='admin'?'Admin':'Comercial'}</span>
        </div>
      ))}
    </Card>
  )
}

// ── REPORTS ────────────────────────────────────────────
function ReportsPage({ leads, companies }) {
  const mrr = leads.filter(l=>l.status==='mantenimiento').reduce((s,l)=>s+(Number(l.monthly)||0),0)
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { val: leads.filter(l=>l.status==='pedido').length, label:'Pedidos cerrados', delta:'este periodo', color:'rgba(31,201,138,.15)', tc:'#6ee7b7', icon:'✅' },
          { val: '€'+leads.filter(l=>l.status==='presupuesto_enviado').reduce((s,l)=>s+(Number(l.amount)||0),0).toLocaleString(), label:'En presupuesto', delta: leads.filter(l=>l.status==='presupuesto_enviado').length+' leads', color:'rgba(139,127,255,.15)', tc:'#c4beff', icon:'📋' },
          { val: `€${mrr}/mes`, label:'Ingresos recurrentes', delta: leads.filter(l=>l.status==='mantenimiento').length+' clientes', color:'rgba(20,184,166,.15)', tc:'#5eead4', icon:'🔄' },
          { val: companies.length, label:'Empresas en cartera', delta:'total acumulado', color:'rgba(59,158,255,.15)', tc:'#93c5fd', icon:'🏢' },
        ].map((s,i)=>(
          <div key={i} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:14, padding:16 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, marginBottom:12 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:700, color:'#edf0f8' }}>{s.val}</div>
            <div style={{ fontSize:12, color:'#b8c0d8', marginTop:5 }}>{s.label}</div>
            <div style={{ fontSize:11, color:s.tc, marginTop:5 }}>{s.delta}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <Card title="Servicios más solicitados">
          {[['Agente IA WhatsApp',72,'#8b7fff'],['Reservas automáticas',58,'#3b9eff'],['CRM + integraciones',45,'#1fc98a'],['Email automation',30,'#f5a623'],['Web premium',22,'#ef4444']].map(([label,pct,color],i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ fontSize:12, color:'#b8c0d8', width:160 }}>{label}</div>
              <div style={{ flex:1, height:7, background:'#1c2030', borderRadius:4, overflow:'hidden' }}><div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4 }}></div></div>
              <div style={{ fontSize:12, color:'#edf0f8', width:32, textAlign:'right', fontWeight:600 }}>{pct}%</div>
            </div>
          ))}
        </Card>
        <Card title="Estado del pipeline">
          {PIPE_COLS.slice(1).map((col,i)=>{
            const cnt = leads.filter(l=>l.status===col.id).length
            const max = Math.max(...PIPE_COLS.slice(1).map(c=>leads.filter(l=>l.status===c.id).length), 1)
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:12, color:'#b8c0d8', width:160 }}>{col.label}</div>
                <div style={{ flex:1, height:7, background:'#1c2030', borderRadius:4, overflow:'hidden' }}><div style={{ width:`${(cnt/max)*100}%`, height:'100%', background:col.color, borderRadius:4, transition:'width .3s' }}></div></div>
                <div style={{ fontSize:12, color:'#edf0f8', width:32, textAlign:'right', fontWeight:600 }}>{cnt}</div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

// ── SHARED COMPONENTS ──────────────────────────────────
function Modal({ title, onClose, children }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:1000, padding: isMobile ? 0 : 20 }} onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.2)', borderRadius: isMobile ? '16px 16px 0 0' : 16, padding: isMobile ? '20px 16px 32px' : 28, width:'100%', maxWidth: isMobile ? '100%' : 520, maxHeight: isMobile ? '90vh' : '90vh', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#edf0f8' }}>{title}</div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:8, color:'#edf0f8', cursor:'pointer', fontSize:16, padding:'4px 10px', lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Card({ title, sub, action, children }) {
  return (
    <div style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.12)', borderRadius:14, padding:'18px 20px', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'#edf0f8' }}>{title}</div>
          {sub && <div style={{ fontSize:12, color:'#7880a0', marginTop:2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Empty({ text, color }) {
  return (
    <div style={{ textAlign:'center', padding:'32px 20px', color: color||'#4a5168', fontSize:13, lineHeight:1.6 }}>
      {text}
    </div>
  )
}

function FInput({ label, value, onChange, type='text', placeholder }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:12, color:'#b8c0d8', marginBottom:5, display:'block', fontWeight:500 }}>{label}</label>
      <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,.18)', borderRadius:9, fontSize:13, background:'#1c2030', color:'#edf0f8', outline:'none', transition:'border-color .15s' }}
        onFocus={e=>e.target.style.borderColor='rgba(139,127,255,.6)'}
        onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.18)'} />
    </div>
  )
}

function FSel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:12, color:'#b8c0d8', marginBottom:5, display:'block', fontWeight:500 }}>{label}</label>
      <select value={value||''} onChange={e=>onChange(e.target.value)}
        style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,.18)', borderRadius:9, fontSize:13, background:'#1c2030', color:'#edf0f8', outline:'none' }}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  )
}

function Btn({ children, onClick, variant, style, title }) {
  const C = {
    primary: { bg:'#8b7fff', bd:'#8b7fff', co:'#fff', hbg:'#6a5fd4' },
    danger:  { bg:'rgba(239,68,68,.18)', bd:'rgba(239,68,68,.45)', co:'#fca5a5', hbg:'rgba(239,68,68,.3)' },
    default: { bg:'#1c2030', bd:'rgba(255,255,255,.22)', co:'#fff', hbg:'#2e3450' },
  }
  const c = C[variant] || C.default
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} title={title} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, fontSize:13, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', border:`1px solid ${c.bd}`, background: hover?c.hbg:c.bg, color:c.co, transition:'all .15s', ...style }}>
      {children}
    </button>
  )
}

function FilterBtn({ children, active, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight: active?700:500, border:`1px solid ${active?'rgba(139,127,255,.5)':'rgba(255,255,255,.15)'}`, background: active?'rgba(139,127,255,.2)': hover?'rgba(255,255,255,.06)':'#1c2030', color:'#ffffff', transition:'all .15s' }}>
      {children}
    </button>
  )
}