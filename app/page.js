'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

export default function Home() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [companies, setCompanies] = useState([])
  const [leads, setLeads] = useState([])
  const [types, setTypes] = useState(DEFAULT_TYPES)
  const [appointments, setAppointments] = useState([])
  const [coFilter, setCoFilter] = useState('all')
  const [pipeFilter, setPipeFilter] = useState({ sector: 'all', user: 'all' })
  const [selColor, setSelColor] = useState('#8b7fff')
  const [newType, setNewType] = useState('')
  const [showAddCo, setShowAddCo] = useState(false)
  const [showCitaForm, setShowCitaForm] = useState(false)
  const [showNewLead, setShowNewLead] = useState(false)
  const [editCo, setEditCo] = useState(null)
  const [editLead, setEditLead] = useState(null)
  const [newCo, setNewCo] = useState({ name:'', contact:'', email:'', phone:'', type:'', service: SERVICES[0] })
  const [newLead, setNewLead] = useState({ name:'', sector:'', amount:'', monthly:'', assigned:'AN', status:'contactado' })
  const [newCita, setNewCita] = useState({ company:'', date:'', time:'10:00', service: SERVICES[0], assigned:'Andoni', notes:'' })
  const [pipelineModal, setPipelineModal] = useState(null) // empresa seleccionada para enviar al pipeline
  const [pipelineForm, setPipelineForm] = useState({ status:'contactado', assigned:'AN', sector:'' })

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

  async function logout() {
    await supabase.auth.signOut()
    setPage('dashboard')
  }

  // COMPANIES CRUD
  async function saveCompany() {
    if (!newCo.name) return
    if (editCo) {
      const { data } = await supabase.from('companies').update(newCo).eq('id', editCo.id).select()
      if (data) setCompanies(companies.map(c => c.id === editCo.id ? data[0] : c))
      setEditCo(null)
    } else {
      const { data } = await supabase.from('companies').insert([{ ...newCo, type: newCo.type || types[0]?.name }]).select()
      if (data) setCompanies([data[0], ...companies])
    }
    setNewCo({ name:'', contact:'', email:'', phone:'', type:'', service: SERVICES[0] })
    setShowAddCo(false)
  }
  async function deleteCo(id) {
    await supabase.from('companies').delete().eq('id', id)
    setCompanies(companies.filter(c => c.id !== id))
  }

  async function sendToPipeline() {
    if (!pipelineModal) return
    const lead = {
      name: pipelineModal.name,
      sector: pipelineForm.sector || pipelineModal.type || '',
      status: pipelineForm.status,
      assigned: pipelineForm.assigned,
      date: new Date().toLocaleDateString('es-ES'),
      amount: '',
      monthly: '',
    }
    const { data } = await supabase.from('leads').insert([lead]).select()
    if (data) setLeads([data[0], ...leads])
    setPipelineModal(null)
    setPipelineForm({ status:'contactado', assigned:'AN', sector:'' })
    setPage('pipeline')
  }
  function startEditCo(co) {
    setNewCo({ name: co.name, contact: co.contact||'', email: co.email||'', phone: co.phone||'', type: co.type||'', service: co.service||SERVICES[0] })
    setEditCo(co)
    setShowAddCo(true)
  }

  // LEADS CRUD
  async function saveLead() {
    if (!newLead.name) return
    if (editLead) {
      const { data } = await supabase.from('leads').update(newLead).eq('id', editLead.id).select()
      if (data) setLeads(leads.map(l => l.id === editLead.id ? data[0] : l))
      setEditLead(null)
    } else {
      const { data } = await supabase.from('leads').insert([{ ...newLead, date: new Date().toLocaleDateString('es-ES') }]).select()
      if (data) setLeads([data[0], ...leads])
    }
    setNewLead({ name:'', sector:'', amount:'', monthly:'', assigned:'AN', status:'contactado' })
    setShowNewLead(false)
  }
  async function deleteLead(id) {
    await supabase.from('leads').delete().eq('id', id)
    setLeads(leads.filter(l => l.id !== id))
  }
  function startEditLead(lead) {
    setNewLead({ name: lead.name, sector: lead.sector||'', amount: lead.amount||'', monthly: lead.monthly||'', assigned: lead.assigned||'AN', status: lead.status||'contactado' })
    setEditLead(lead)
    setShowNewLead(true)
  }

  // TYPES CRUD
  async function addType() {
    if (!newType) return
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

  // APPOINTMENTS
  async function saveCita() {
    const { data } = await supabase.from('appointments').insert([newCita]).select()
    if (data) setAppointments([...appointments, data[0]])
    setNewCita({ company:'', date:'', time:'10:00', service: SERVICES[0], assigned:'Andoni', notes:'' })
    setShowCitaForm(false)
  }
  async function deleteCita(id) {
    await supabase.from('appointments').delete().eq('id', id)
    setAppointments(appointments.filter(a => a.id !== id))
  }

  const CAL_EVENTS = {}
  appointments.forEach(a => {
    if (!a.date) return
    const d = new Date(a.date).getDate()
    if (!CAL_EVENTS[d]) CAL_EVENTS[d] = []
    CAL_EVENTS[d].push({ text: a.company + ' · ' + (a.time||'').slice(0,5), id: a.id })
  })

  const filteredLeads = leads.filter(l => {
    if (pipeFilter.sector !== 'all' && l.sector !== pipeFilter.sector) return false
    if (pipeFilter.user !== 'all' && l.assigned !== pipeFilter.user) return false
    return true
  })
  const filteredCos = coFilter === 'all' ? companies : companies.filter(c => c.type === coFilter)
  const role = profile?.role || 'comercial'

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0b0d12', color:'#8b7fff', fontSize:16 }}>Cargando...</div>
  if (!session) return <LoginScreen />

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0b0d12', color:'#edf0f8', fontFamily:'var(--font-sans)' }}>
      <Sidebar page={page} setPage={setPage} role={role} profile={profile} onLogout={logout} leads={leads} />
      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
        <Topbar title={{ dashboard:'Dashboard', calendar:'Calendario', companies:'Empresas', pipeline:'Pipeline', types:'Tipos de empresa', team:'Equipo', reports:'Informes' }[page]}
          role={role} onNewCita={() => { setPage('calendar'); setShowCitaForm(true) }}
          onAddCo={() => { setEditCo(null); setNewCo({ name:'', contact:'', email:'', phone:'', type:'', service: SERVICES[0] }); setPage('companies'); setShowAddCo(true) }} />
        <div style={{ padding:'20px 24px', flex:1 }}>
          {page === 'dashboard' && <Dashboard leads={leads} companies={companies} setPage={setPage} />}
          {page === 'calendar' && <CalendarPage events={CAL_EVENTS} showForm={showCitaForm} setShowForm={setShowCitaForm} newCita={newCita} setNewCita={setNewCita} onSave={saveCita} onDelete={deleteCita} appointments={appointments} />}
          {page === 'companies' && <CompaniesPage companies={filteredCos} types={types} filter={coFilter} setFilter={setCoFilter} allCompanies={companies} showAdd={showAddCo} setShowAdd={setShowAddCo} newCo={newCo} setNewCo={setNewCo} onSave={saveCompany} onEdit={startEditCo} onDelete={deleteCo} editMode={!!editCo} role={role} onSendPipeline={co=>{ setPipelineModal(co); setPipelineForm({ status:'contactado', assigned:'AN', sector: co.type||'' }) }} />}
          {pipelineModal && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
              <div style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.2)', borderRadius:16, padding:28, width:380 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#edf0f8', marginBottom:6 }}>📊 Añadir al pipeline</div>
                <div style={{ fontSize:13, color:'#7880a0', marginBottom:20 }}>{pipelineModal.name}</div>
                <FSel label="Estado inicial" value={pipelineForm.status} onChange={v=>setPipelineForm({...pipelineForm,status:v})} options={PIPE_COLS.map(c=>({ value:c.id, label:c.label }))} />
                <FSel label="Comercial asignado" value={pipelineForm.assigned} onChange={v=>setPipelineForm({...pipelineForm,assigned:v})} options={['AN','JO','IK','MI','CO']} />
                <FInput label="Sector" value={pipelineForm.sector} onChange={v=>setPipelineForm({...pipelineForm,sector:v})} placeholder="Ej: Hostelería, Retail..." />
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <Btn variant="primary" onClick={sendToPipeline}>✓ Añadir al pipeline</Btn>
                  <Btn onClick={()=>setPipelineModal(null)}>Cancelar</Btn>
                </div>
              </div>
            </div>
          )}
          {page === 'pipeline' && <PipelinePage leads={filteredLeads} allLeads={leads} filter={pipeFilter} setFilter={setPipeFilter} showNew={showNewLead} setShowNew={setShowNewLead} newLead={newLead} setNewLead={setNewLead} onSave={saveLead} onEdit={startEditLead} onDelete={deleteLead} editMode={!!editLead} />}
          {page === 'types' && role === 'admin' && <TypesPage types={types} companies={companies} newType={newType} setNewType={setNewType} selColor={selColor} setSelColor={setSelColor} onAdd={addType} onDelete={deleteType} colors={COLORS} />}
          {page === 'team' && role === 'admin' && <TeamPage leads={leads} />}
          {page === 'reports' && role === 'admin' && <ReportsPage leads={leads} companies={companies} />}
        </div>
      </div>
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
      <div style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.2)', borderRadius:18, padding:36, width:360 }}>
        <div style={{ display:'flex', gap:12, marginBottom:28, alignItems:'center' }}>
          <div style={{ width:44, height:44, background:'#8b7fff', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:20, color:'#fff' }}>A</div>
          <div><div style={{ fontSize:18, fontWeight:700, color:'#edf0f8' }}>Azeritek CRM</div><div style={{ fontSize:12, color:'#7880a0' }}>Panel de gestión comercial</div></div>
        </div>
        <FInput label="Email" value={email} onChange={setEmail} type="email" placeholder="tu@azeritek.es" />
        <FInput label="Contraseña" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        {error && <div style={{ fontSize:12, color:'#ef4444', marginBottom:12, background:'rgba(239,68,68,.1)', padding:'8px 12px', borderRadius:8 }}>{error}</div>}
        <Btn variant="primary" style={{ width:'100%', justifyContent:'center', padding:'11px 0', marginTop:4 }} onClick={handleLogin}>
          {loading ? 'Entrando...' : 'Acceder →'}
        </Btn>
        <div style={{ fontSize:11, color:'#4a5168', textAlign:'center', marginTop:16 }}>Azeritek · Donostia, País Vasco</div>
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
      <div style={{ padding:'12px 0', flex:1 }}>
        <div style={{ padding:'12px 16px 4px', fontSize:10, color:'#4a5168', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Principal</div>
        {items.slice(0,2).map(item => <NavItem key={item.id} item={item} active={page===item.id} onClick={() => setPage(item.id)} />)}
        <div style={{ padding:'12px 16px 4px', fontSize:10, color:'#4a5168', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Gestión</div>
        {items.slice(2).map(item => <NavItem key={item.id} item={item} active={page===item.id} onClick={() => setPage(item.id)} />)}
      </div>
      <div style={{ padding:12, borderTop:'1px solid rgba(255,255,255,.12)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(139,127,255,.25)', color:'#c4beff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>{profile?.initials || profile?.name?.[0] || 'U'}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#edf0f8' }}>{profile?.name || profile?.email?.split('@')[0]}</div>
            <div style={{ fontSize:11, color:'#7880a0' }}>{role === 'admin' ? 'Administrador' : 'Comercial'}</div>
          </div>
          <Btn onClick={onLogout} style={{ padding:'6px 8px' }}>↩</Btn>
        </div>
      </div>
    </div>
  )
}

function NavItem({ item, active, onClick }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, cursor:'pointer', fontSize:13, color: active?'#edf0f8':'#b8c0d8', margin:'1px 8px', background: active?'rgba(139,127,255,.15)':'transparent', border: active?'1px solid rgba(139,127,255,.4)':'1px solid transparent' }}>
      <span>{item.icon}</span><span style={{ flex:1 }}>{item.label}</span>
      {item.badge ? <span style={{ background:'rgba(139,127,255,.3)', color:'#c4beff', fontSize:10, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>{item.badge}</span> : null}
    </div>
  )
}

// ── TOPBAR ─────────────────────────────────────────────
function Topbar({ title, role, onNewCita, onAddCo }) {
  return (
    <div style={{ padding:'14px 24px', background:'#13161f', borderBottom:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ fontSize:17, fontWeight:700, color:'#edf0f8' }}>{title}</div>
      <div style={{ display:'flex', gap:8 }}>
        <Btn onClick={onNewCita}>📅 Nueva cita</Btn>
        {role==='admin' && <Btn variant="primary" onClick={onAddCo}>+ Añadir empresa</Btn>}
      </div>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────
function Dashboard({ leads, companies, setPage }) {
  const mrr = leads.filter(l=>l.status==='mantenimiento').reduce((s,l)=>s+(Number(l.monthly)||0),0)
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { icon:'🏢', val: companies.length, label:'Empresas en cartera', delta:'+3 este mes', color:'rgba(139,127,255,.15)', ic:'#c4beff' },
          { icon:'📊', val: leads.length, label:'Leads en pipeline', delta: leads.filter(l=>l.status==='presupuesto_enviado').length+' presupuestos', color:'rgba(245,166,35,.15)', ic:'#fcd34d' },
          { icon:'✅', val: leads.filter(l=>l.status==='pedido').length, label:'Pedidos confirmados', delta:'este periodo', color:'rgba(31,201,138,.15)', ic:'#6ee7b7' },
          { icon:'💰', val: `€${mrr}/mes`, label:'Ingresos recurrentes', delta:`${leads.filter(l=>l.status==='mantenimiento').length} clientes activos`, color:'rgba(59,158,255,.15)', ic:'#93c5fd' },
        ].map((s,i) => (
          <div key={i} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:14, padding:16 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:s.color, color:s.ic, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, marginBottom:12 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:700, color:'#edf0f8' }}>{s.val}</div>
            <div style={{ fontSize:12, color:'#b8c0d8', marginTop:5 }}>{s.label}</div>
            <div style={{ fontSize:11, color:'#1fc98a', marginTop:5 }}>{s.delta}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <Card title="Actividad reciente" sub="Últimos leads">
          {leads.slice(0,5).map((l,i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#8b7fff', marginTop:5, flexShrink:0 }}></div>
              <div><div style={{ fontSize:13, color:'#edf0f8' }}>{l.name}</div><div style={{ fontSize:11, color:'#7880a0', marginTop:2 }}>{l.sector} · {l.status}</div></div>
            </div>
          ))}
          {!leads.length && <div style={{ fontSize:13, color:'#7880a0' }}>No hay leads todavía</div>}
        </Card>
        <Card title="Alertas" sub="Pendientes">
          {leads.filter(l=>l.flag_color==='red').slice(0,4).map((l,i) => (
            <div key={i} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'10px 14px', marginBottom:8 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#edf0f8' }}>🚩 {l.name}</div>
              <div style={{ fontSize:12, color:'#b8c0d8', marginTop:2 }}>{l.sector} · {l.flag_date}</div>
            </div>
          ))}
          {!leads.filter(l=>l.flag_color==='red').length && <div style={{ fontSize:13, color:'#1fc98a' }}>✓ Sin alertas pendientes</div>}
        </Card>
      </div>
      <Card title="Resumen del pipeline" action={<Btn onClick={()=>setPage('pipeline')}>Ver pipeline →</Btn>}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8 }}>
          {PIPE_COLS.slice(1).map(col => (
            <div key={col.id} onClick={()=>setPage('pipeline')} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:12, textAlign:'center', cursor:'pointer' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:col.color, marginBottom:8 }}>{col.label}</div>
              <div style={{ fontSize:24, fontWeight:700, color:'#edf0f8' }}>{leads.filter(l=>l.status===col.id).length}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── CALENDAR ───────────────────────────────────────────
function CalendarPage({ events, showForm, setShowForm, newCita, setNewCita, onSave, onDelete, appointments }) {
  return (
    <div>
      <Card title="Junio 2025" sub={`${appointments.length} citas`} action={<Btn variant="primary" onClick={()=>setShowForm(!showForm)}>+ Nueva cita</Btn>}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><div key={d} style={{ fontSize:11, textAlign:'center', color:'#7880a0', padding:'4px 0', fontWeight:600 }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
          {Array.from({length:30},(_,i)=>i+1).map(d=>(
            <div key={d} style={{ minHeight:54, background: events[d]?'rgba(139,127,255,.1)':'#1c2030', border:`1px solid ${d===12?'rgba(139,127,255,.7)':events[d]?'rgba(139,127,255,.4)':'rgba(255,255,255,.12)'}`, borderRadius:9, padding:'6px 7px' }}>
              <div style={{ fontSize:12, fontWeight:600, color: d===12?'#c4beff':'#b8c0d8', marginBottom:3 }}>{d}</div>
              {events[d]?.map((ev,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ fontSize:9, background:'#8b7fff', color:'#fff', borderRadius:4, padding:'2px 5px', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.text}</div>
                  <div onClick={()=>onDelete(ev.id)} style={{ cursor:'pointer', color:'#ef4444', fontSize:10, flexShrink:0 }}>×</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
      {showForm && (
        <Card title="Nueva cita">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <FInput label="Empresa" value={newCita.company} onChange={v=>setNewCita({...newCita,company:v})} />
            <FInput label="Fecha" type="date" value={newCita.date} onChange={v=>setNewCita({...newCita,date:v})} />
            <FInput label="Hora" type="time" value={newCita.time} onChange={v=>setNewCita({...newCita,time:v})} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FSel label="Servicio" value={newCita.service} onChange={v=>setNewCita({...newCita,service:v})} options={SERVICES} />
            <FInput label="Comercial" value={newCita.assigned} onChange={v=>setNewCita({...newCita,assigned:v})} />
          </div>
          <FInput label="Notas" value={newCita.notes} onChange={v=>setNewCita({...newCita,notes:v})} placeholder="Contexto, motivo..." />
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="primary" onClick={onSave}>✓ Guardar cita</Btn>
            <Btn onClick={()=>setShowForm(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── COMPANIES ──────────────────────────────────────────
function CompaniesPage({ companies, types, filter, setFilter, allCompanies, showAdd, setShowAdd, newCo, setNewCo, onSave, onEdit, onDelete, editMode, role, onSendPipeline }) {
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        <FilterBtn active={filter==='all'} onClick={()=>setFilter('all')}>Todas ({allCompanies.length})</FilterBtn>
        {types.filter(t=>allCompanies.some(c=>c.type===t.name)).map(t=>(
          <FilterBtn key={t.name} active={filter===t.name} onClick={()=>setFilter(t.name)}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:t.color, display:'inline-block', verticalAlign:'middle', marginRight:5 }}></span>
            {t.name} ({allCompanies.filter(c=>c.type===t.name).length})
          </FilterBtn>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {companies.map((c,i) => {
          const col = types.find(t=>t.name===c.type)?.color || '#7880a0'
          return (
            <div key={i} style={{ background:'#1a1f2e', border:'1px solid rgba(255,255,255,.18)', borderRadius:14, padding:15 }}>
              <div style={{ display:'flex', gap:11, marginBottom:12 }}>
                <div style={{ width:42, height:42, borderRadius:11, background:col, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'#fff', flexShrink:0 }}>{c.name?.[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#edf0f8' }}>{c.name}</div>
                  <div style={{ fontSize:12, color:'#b8c0d8', display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:col, display:'inline-block' }}></span>{c.type}
                  </div>
                </div>
                <span style={{ fontSize:10, padding:'3px 9px', borderRadius:6, background:'rgba(139,127,255,.22)', color:'#c4beff', border:'1px solid rgba(139,127,255,.4)', whiteSpace:'nowrap', alignSelf:'flex-start' }}>{c.service}</span>
              </div>
              <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:10, display:'grid', gap:4 }}>
                {[['👤',c.contact],['✉️',c.email],['📞',c.phone]].map(([icon,val],j)=>(
                  <div key={j} style={{ display:'flex', gap:8, fontSize:12, color:'#b8c0d8' }}><span>{icon}</span><span>{val}</span></div>
                ))}
              </div>
              {role==='admin' && (
                <div style={{ display:'flex', gap:6, marginTop:10, borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:10 }}>
                  <Btn onClick={()=>onSendPipeline(c)} style={{ padding:'4px 10px', fontSize:12, background:'rgba(31,201,138,.15)', borderColor:'rgba(31,201,138,.4)', color:'#6ee7b7' }}>📊 Pipeline</Btn>
                  <Btn onClick={()=>onEdit(c)} style={{ padding:'4px 10px', fontSize:12 }}>✏️ Editar</Btn>
                  <Btn variant="danger" onClick={()=>onDelete(c.id)} style={{ padding:'4px 10px', fontSize:12 }}>🗑️ Eliminar</Btn>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!companies.length && <div style={{ textAlign:'center', padding:40, color:'#7880a0', fontSize:13 }}>No hay empresas en este tipo</div>}
      {showAdd && (
        <Card title={editMode ? 'Editar empresa' : 'Nueva empresa'} style={{ marginTop:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Nombre" value={newCo.name} onChange={v=>setNewCo({...newCo,name:v})} placeholder="Ej: Metalurgia Lasa SL" />
            <FInput label="Contacto" value={newCo.contact} onChange={v=>setNewCo({...newCo,contact:v})} />
            <FInput label="Email" value={newCo.email} onChange={v=>setNewCo({...newCo,email:v})} type="email" />
            <FInput label="Teléfono" value={newCo.phone} onChange={v=>setNewCo({...newCo,phone:v})} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FSel label="Tipo" value={newCo.type} onChange={v=>setNewCo({...newCo,type:v})} options={types.map(t=>t.name)} />
            <FSel label="Servicio de interés" value={newCo.service} onChange={v=>setNewCo({...newCo,service:v})} options={SERVICES} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="primary" onClick={onSave}>✓ {editMode ? 'Guardar cambios' : 'Guardar empresa'}</Btn>
            <Btn onClick={()=>setShowAdd(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── PIPELINE ───────────────────────────────────────────
function PipelinePage({ leads, allLeads, filter, setFilter, showNew, setShowNew, newLead, setNewLead, onSave, onEdit, onDelete, editMode }) {
  const presup = allLeads.filter(l=>l.status==='presupuesto_enviado').reduce((s,l)=>s+(Number(l.amount)||0),0)
  const ganado = allLeads.filter(l=>l.status==='pedido').reduce((s,l)=>s+(Number(l.amount)||0),0)
  const mant = allLeads.filter(l=>l.status==='mantenimiento').reduce((s,l)=>s+(Number(l.monthly)||0),0)
  const perdido = allLeads.filter(l=>l.status==='perdido').reduce((s,l)=>s+(Number(l.amount)||0),0)
  const SECTORS = [...new Set(allLeads.map(l=>l.sector).filter(Boolean))]

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:700, color:'#edf0f8' }}>Pipeline comercial</div>
          <div style={{ fontSize:13, color:'#7880a0', marginTop:2 }}>{leads.length} leads activos</div>
        </div>
        <Btn variant="primary" onClick={()=>{ setShowNew(!showNew); if(showNew){ setNewLead({ name:'', sector:'', amount:'', monthly:'', assigned:'AN', status:'contactado' }) } }}>+ Nuevo lead</Btn>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, margin:'14px 0 16px' }}>
        {[
          { label:'Presupuestado', val:`€${presup.toLocaleString()}`, sub: allLeads.filter(l=>l.status==='presupuesto_enviado').length+' leads', bg:'rgba(139,127,255,.08)', bd:'rgba(139,127,255,.25)', color:'#c4beff' },
          { label:'Ganado', val:`€${ganado.toLocaleString()}`, sub: allLeads.filter(l=>l.status==='pedido').length+' leads', bg:'rgba(31,201,138,.08)', bd:'rgba(31,201,138,.25)', color:'#6ee7b7' },
          { label:'Mantenimiento', val:`€${mant}/mes`, sub: allLeads.filter(l=>l.status==='mantenimiento').length+' activos', bg:'rgba(20,184,166,.08)', bd:'rgba(20,184,166,.25)', color:'#5eead4' },
          { label:'Perdido', val:`€${perdido.toLocaleString()}`, sub: allLeads.filter(l=>l.status==='perdido').length+' leads', bg:'rgba(239,68,68,.06)', bd:'rgba(239,68,68,.2)', color:'#fca5a5' },
        ].map((m,i)=>(
          <div key={i} style={{ background:m.bg, border:`1px solid ${m.bd}`, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#7880a0', marginBottom:8 }}>{m.label}</div>
            <div style={{ fontSize:24, fontWeight:700, color:m.color, marginBottom:3 }}>{m.val}</div>
            <div style={{ fontSize:12, color:'#7880a0' }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filter.sector} onChange={e=>setFilter({...filter,sector:e.target.value})} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:9, color:'#edf0f8', fontSize:12, padding:'7px 12px', cursor:'pointer', outline:'none' }}>
          <option value="all">Todos los sectores</option>
          {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.user} onChange={e=>setFilter({...filter,user:e.target.value})} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.2)', borderRadius:9, color:'#edf0f8', fontSize:12, padding:'7px 12px', cursor:'pointer', outline:'none' }}>
          <option value="all">Todos los usuarios</option>
          {['AN','JO','IK','MI','CO'].map(u=><option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {showNew && (
        <Card title={editMode ? 'Editar lead' : 'Nuevo lead'} style={{ marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FInput label="Nombre" value={newLead.name} onChange={v=>setNewLead({...newLead,name:v})} placeholder="Nombre del lead" />
            <FInput label="Sector" value={newLead.sector} onChange={v=>setNewLead({...newLead,sector:v})} placeholder="Ej: Hostelería" />
            <FInput label="Importe (€)" value={newLead.amount} onChange={v=>setNewLead({...newLead,amount:v})} type="number" />
            <FInput label="Mensual (€/mes)" value={newLead.monthly} onChange={v=>setNewLead({...newLead,monthly:v})} type="number" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FSel label="Estado" value={newLead.status} onChange={v=>setNewLead({...newLead,status:v})} options={PIPE_COLS.map(c=>({ value:c.id, label:c.label }))} />
            <FSel label="Comercial" value={newLead.assigned} onChange={v=>setNewLead({...newLead,assigned:v})} options={['AN','JO','IK','MI','CO']} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="primary" onClick={onSave}>✓ {editMode ? 'Guardar cambios' : 'Guardar lead'}</Btn>
            <Btn onClick={()=>setShowNew(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}
      <div style={{ overflowX:'auto', paddingBottom:6 }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${PIPE_COLS.length},minmax(145px,1fr))`, gap:9, minWidth:900 }}>
          {PIPE_COLS.map(col => {
            const colLeads = leads.filter(l=>l.status===col.id)
            return (
              <div key={col.id} style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.14)', borderRadius:12, padding:'11px 9px', minHeight:200, display:'flex', flexDirection:'column', gap:7 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 3px', marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:col.color }}>{col.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, background:'#1c2030', border:'1px solid rgba(255,255,255,.18)', borderRadius:10, padding:'2px 8px', color:'#b8c0d8' }}>{colLeads.length}</span>
                </div>
                {colLeads.length===0
                  ? <div style={{ textAlign:'center', padding:'24px 0', fontSize:12, color:'#4a5168', border:'1px dashed rgba(255,255,255,.08)', borderRadius:9 }}>Sin leads</div>
                  : colLeads.map((l,i) => {
                    const avc = AV_COLORS[l.assigned] || '#7880a0'
                    return (
                      <div key={i} style={{ background:'#1c2030', border:'1px solid rgba(255,255,255,.18)', borderRadius:10, padding:'11px 12px', cursor:'pointer' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'#edf0f8', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginRight:8 }}>{l.name}</div>
                          <div style={{ width:26, height:26, borderRadius:'50%', background:avc, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>{l.assigned}</div>
                        </div>
                        <div style={{ fontSize:11, color:'#7880a0', marginBottom:6 }}>{l.sector}</div>
                        {l.amount ? <div style={{ fontSize:14, fontWeight:700, color:col.color, marginBottom:7 }}>€{Number(l.amount).toLocaleString()}</div> : null}
                        {l.monthly ? <div style={{ fontSize:14, fontWeight:700, color:col.color, marginBottom:7 }}>€{l.monthly}<span style={{ fontSize:10, fontWeight:400 }}>/mes</span></div> : null}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:10, color:'#4a5168' }}>{l.date}</span>
                          {l.flag_color && <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5, background:l.flag_color==='red'?'rgba(239,68,68,.18)':'rgba(59,158,255,.18)', color:l.flag_color==='red'?'#fca5a5':'#93c5fd' }}>{l.flag_color==='red'?'🚩':'📅'} {l.flag_date}</span>}
                        </div>
                        <div style={{ display:'flex', gap:4, borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:6 }}>
                          <Btn onClick={()=>onEdit(l)} style={{ padding:'3px 8px', fontSize:11 }}>✏️</Btn>
                          <Btn variant="danger" onClick={()=>onDelete(l.id)} style={{ padding:'3px 8px', fontSize:11 }}>🗑️</Btn>
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
      <div style={{ marginBottom:8 }}>
        {types.map((t,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:t.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{t.name?.[0]}</span>
            </div>
            <div style={{ flex:1, fontSize:13, fontWeight:500, color:'#edf0f8' }}>{t.name}</div>
            <div style={{ fontSize:12, color:'#7880a0' }}>{companies.filter(c=>c.type===t.name).length} empresas</div>
            <Btn variant="danger" onClick={()=>onDelete(i)} style={{ padding:'5px 10px' }}>🗑️</Btn>
          </div>
        ))}
      </div>
      <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:18, marginTop:8 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#edf0f8', marginBottom:13 }}>Crear nuevo tipo</div>
        <FInput label="Nombre" value={newType} onChange={setNewType} placeholder="Ej: Farmacia, Energía, Logística..." />
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, color:'#b8c0d8', marginBottom:8, display:'block', fontWeight:500 }}>Color</label>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {colors.map(c=>(
              <div key={c} onClick={()=>setSelColor(c)} style={{ width:28, height:28, borderRadius:7, background:c, cursor:'pointer', border:selColor===c?'2px solid #fff':'2px solid transparent', transform:selColor===c?'scale(1.12)':'scale(1)', transition:'all .15s' }}></div>
            ))}
          </div>
        </div>
        <Btn variant="primary" onClick={onAdd}>+ Crear tipo</Btn>
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
    <Card title="Equipo comercial" action={<Btn variant="primary">+ Añadir miembro</Btn>}>
      {team.map((m,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom: i<team.length-1?'1px solid rgba(255,255,255,.08)':'none' }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:m.color, color:m.tc, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{m.ini}</div>
          <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'#edf0f8' }}>{m.name}</div><div style={{ fontSize:11, color:'#b8c0d8' }}>{m.email}</div></div>
          <div style={{ fontSize:12, color:'#7880a0' }}>{leads.filter(l=>l.assigned===m.key).length} leads</div>
          <span style={{ fontSize:10, padding:'3px 10px', borderRadius:10, fontWeight:600, background:m.role==='admin'?'rgba(139,127,255,.22)':'rgba(31,201,138,.18)', color:m.role==='admin'?'#c4beff':'#6ee7b7' }}>{m.role==='admin'?'Admin':'Comercial'}</span>
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
          { val: leads.filter(l=>l.status==='pedido').length, label:'Pedidos confirmados', delta:'este periodo', color:'rgba(31,201,138,.15)', tc:'#6ee7b7', icon:'✅' },
          { val: '€'+leads.filter(l=>l.status==='presupuesto_enviado').reduce((s,l)=>s+(Number(l.amount)||0),0).toLocaleString(), label:'Presupuestado activo', delta: leads.filter(l=>l.status==='presupuesto_enviado').length+' leads', color:'rgba(139,127,255,.15)', tc:'#c4beff', icon:'📋' },
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
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
              <div style={{ fontSize:12, color:'#b8c0d8', width:150 }}>{label}</div>
              <div style={{ flex:1, height:7, background:'#1c2030', borderRadius:4, overflow:'hidden' }}><div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4 }}></div></div>
              <div style={{ fontSize:12, color:'#edf0f8', width:30, textAlign:'right', fontWeight:600 }}>{pct}%</div>
            </div>
          ))}
        </Card>
        <Card title="Pipeline por estado">
          {PIPE_COLS.slice(1).map((col,i)=>{
            const cnt = leads.filter(l=>l.status===col.id).length
            const max = Math.max(...PIPE_COLS.slice(1).map(c=>leads.filter(l=>l.status===c.id).length), 1)
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
                <div style={{ fontSize:12, color:'#b8c0d8', width:150 }}>{col.label}</div>
                <div style={{ flex:1, height:7, background:'#1c2030', borderRadius:4, overflow:'hidden' }}><div style={{ width:`${(cnt/max)*100}%`, height:'100%', background:col.color, borderRadius:4 }}></div></div>
                <div style={{ fontSize:12, color:'#edf0f8', width:30, textAlign:'right', fontWeight:600 }}>{cnt}</div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

// ── SHARED ─────────────────────────────────────────────
function Card({ title, sub, action, children, style }) {
  return (
    <div style={{ background:'#13161f', border:'1px solid rgba(255,255,255,.18)', borderRadius:14, padding:'18px 20px', marginBottom:16, ...style }}>
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

function FInput({ label, value, onChange, type='text', placeholder }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:12, color:'#b8c0d8', marginBottom:5, display:'block', fontWeight:500 }}>{label}</label>
      <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,.2)', borderRadius:9, fontSize:13, background:'#1c2030', color:'#edf0f8', outline:'none' }} />
    </div>
  )
}

function FSel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:12, color:'#b8c0d8', marginBottom:5, display:'block', fontWeight:500 }}>{label}</label>
      <select value={value||''} onChange={e=>onChange(e.target.value)}
        style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,.2)', borderRadius:9, fontSize:13, background:'#1c2030', color:'#edf0f8', outline:'none' }}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  )
}

function Btn({ children, onClick, variant, style }) {
  const C = {
    primary: { bg:'#8b7fff', bd:'#8b7fff', co:'#fff', hbg:'#6a5fd4' },
    danger:  { bg:'rgba(239,68,68,.18)', bd:'rgba(239,68,68,.45)', co:'#fca5a5', hbg:'rgba(239,68,68,.3)' },
    default: { bg:'#1c2030', bd:'rgba(255,255,255,.28)', co:'#fff', hbg:'#2e3450' },
  }
  const c = C[variant] || C.default
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, fontSize:13, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', border:`1px solid ${c.bd}`, background: hover?c.hbg:c.bg, color:c.co, transition:'all .15s', ...style }}>
      {children}
    </button>
  )
}

function FilterBtn({ children, active, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight: active?700:500, border:`1px solid ${active?'rgba(139,127,255,.5)':'rgba(255,255,255,.2)'}`, background: active?'rgba(139,127,255,.2)': hover?'#2e3450':'#1c2030', color:'#ffffff', transition:'all .15s' }}>
      {children}
    </button>
  )
}