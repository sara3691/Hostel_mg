import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, GraduationCap, Calendar, Layers, Database, CheckCheck, ShieldAlert, Settings, CreditCard, Activity, RefreshCw, User, Save, Wrench, DollarSign, TrendingDown, FileText, Search, X, Check, UserCheck } from 'lucide-react';

interface PP { currentUser: any; showToast: (t: 'success'|'error'|'warning'|'info', title: string, msg?: string) => void; hostels?: any[]; rooms?: any[]; }

// ADMISSIONS PANEL
export const AdmissionsPanel: React.FC<PP> = ({ currentUser: _currentUser, showToast, hostels: _hostels = [] }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  useEffect(() => {
    setLoading(true);
    axios.get('/api/erp/admissions').then(r => { if (r.data?.success) setList(r.data.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const doAction = async (id: string, action: string) => {
    try {
      await axios.post('/api/erp/admissions/' + id + '/' + action);
      setList(prev => prev.map(a => a.id === id ? { ...a, status: action === 'checkin' ? 'CHECKED_IN' : 'CHECKED_OUT' } : a));
      showToast('success', action === 'checkin' ? 'Checked In' : 'Checked Out');
    } catch (e: any) { showToast('error', 'Error', e.response?.data?.error || ''); }
  };
  const filtered = list.filter(a => filter === 'ALL' || a.status === filter);
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}><GraduationCap size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Hostel Admissions</h2><p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Student admission lifecycle</p></div>
        <select className='form-input' style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>{['ALL','PENDING','APPROVED','CHECKED_IN','CHECKED_OUT','REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading admissions...</div> : (
        <div className='table-container'><table className='data-table'><thead><tr><th>Student</th><th>Hostel</th><th>Room/Bed</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>{filtered.map((a: any) => (
            <tr key={a.id}>
              <td><div style={{ fontWeight: 600 }}>{a.student?.fullName}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.student?.registerNumber}</div></td>
              <td>{a.hostel?.name}</td>
              <td>{a.room?.roomNumber}{a.bedNumber ? ' Bed ' + a.bedNumber : ''}</td>
              <td><span className={'badge ' + (a.status === 'CHECKED_IN' || a.status === 'APPROVED' ? 'badge-success' : a.status === 'PENDING' ? 'badge-warning' : 'badge-danger')}>{a.status}</span></td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.admissionDate ? new Date(a.admissionDate).toLocaleDateString() : '-'}</td>
              <td>{a.status === 'APPROVED' && <button className='btn btn-secondary' style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => doAction(a.id, 'checkin')}>Check In</button>}{a.status === 'CHECKED_IN' && <button className='btn btn-secondary' style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => doAction(a.id, 'checkout')}>Check Out</button>}</td>
            </tr>
          ))}{filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No admissions found</td></tr>}</tbody>
        </table></div>
      )}
    </div>
  );
};

// ACADEMIC YEAR PANEL
export const AcademicYearPanel: React.FC<PP> = ({ showToast }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  useEffect(() => { setLoading(true); axios.get('/api/erp/academic-years').then(r => { if (r.data?.success) setList(r.data.data); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const handleCreate = async (e: React.FormEvent) => { e.preventDefault(); try { const r = await axios.post('/api/erp/academic-years', { name, startDate, endDate }); if (r.data?.success) { setList(prev => [r.data.data, ...prev]); setShowForm(false); setName(''); showToast('success', 'Created', name); } } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); } };
  const setActive = async (id: string, n: string) => { try { await axios.patch('/api/erp/academic-years/' + id, { isActive: true }); setList(prev => prev.map(x => ({ ...x, isActive: x.id === id }))); showToast('success', 'Set Active', n); } catch (e: any) { showToast('error', 'Error', e.response?.data?.error || ''); } };
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}><Calendar size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Academic Years</h2></div>
        <button className='btn btn-primary' onClick={() => setShowForm(true)}><Plus size={14} /> New Year</button>
      </div>
      {showForm && (<form onSubmit={handleCreate} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gap: '1rem' }}>
        <input className='form-input' placeholder='e.g. 2026-27' value={name} onChange={e => setName(e.target.value)} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}><input className='form-input' type='date' value={startDate} onChange={e => setStartDate(e.target.value)} required /><input className='form-input' type='date' value={endDate} onChange={e => setEndDate(e.target.value)} required /></div>
        <div style={{ display: 'flex', gap: '0.75rem' }}><button type='button' className='btn btn-secondary' onClick={() => setShowForm(false)}>Cancel</button><button type='submit' className='btn btn-primary'>Create</button></div>
      </form>)}
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {list.map((ay: any) => (
            <div key={ay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div><div style={{ fontWeight: 700 }}>{ay.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ay.startDate).toLocaleDateString()} - {new Date(ay.endDate).toLocaleDateString()}</div></div>
              <div>{ay.isActive ? <span className='badge badge-success'>Active</span> : <button className='btn btn-secondary' style={{ fontSize: '0.75rem' }} onClick={() => setActive(ay.id, ay.name)}>Set Active</button>}</div>
            </div>
          ))}
          {list.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No academic years configured</div>}
        </div>
      )}
    </div>
  );
};

// BED MANAGEMENT PANEL
export const BedManagementPanel: React.FC<PP> = ({ currentUser, hostels = [] }) => {
  const [beds, setBeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hf, setHf] = useState(currentUser?.hostelId || '');
  useEffect(() => { setLoading(true); const q = hf ? '?hostelId=' + hf : ''; axios.get('/api/erp/beds' + q).then(r => { if (r.data?.success) setBeds(r.data.data); }).catch(() => {}).finally(() => setLoading(false)); }, [hf]);
  const occ = beds.filter(b => b.isOccupied).length;
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}><Layers size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Bed Management</h2><p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{occ}/{beds.length} occupied</p></div>
        <select className='form-input' style={{ width: 'auto' }} value={hf} onChange={e => setHf(e.target.value)}><option value=''>All Hostels</option>{hostels.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading beds...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem' }}>
          {beds.map((b: any) => (
            <div key={b.id} style={{ padding: '1rem', background: b.isOccupied ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: '1px solid ' + (b.isOccupied ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'), borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Rm {b.room?.roomNumber} B{b.bedNumber}</span><span className={'badge ' + (b.isOccupied ? 'badge-danger' : 'badge-success')}>{b.isOccupied ? 'Occ' : 'Free'}</span></div>
              {b.isOccupied && b.student && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.student.fullName}</div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.room?.block} Fl.{b.room?.floor}</div>
            </div>
          ))}
          {beds.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No bed data</div>}
        </div>
      )}
    </div>
  );
};

// ASSET MANAGEMENT PANEL
export const AssetManagementPanel: React.FC<PP> = ({ currentUser, showToast, hostels = [] }) => {
  const CATS = ['FURNITURE','ELECTRONICS','APPLIANCE','SPORTS','LINEN','KITCHEN','SAFETY','OTHER'];
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [nm, setNm] = useState(''); const [ct, setCt] = useState('FURNITURE'); const [sr, setSr] = useState(''); const [hid, setHid] = useState(currentUser?.hostelId || '');
  useEffect(() => { setLoading(true); axios.get('/api/erp/assets').then(r => { if (r.data?.success) setAssets(r.data.data); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const handleAdd = async (e: React.FormEvent) => { e.preventDefault(); try { const r = await axios.post('/api/erp/assets', { name: nm, category: ct, serialNumber: sr, hostelId: hid }); if (r.data?.success) { setAssets(prev => [r.data.data, ...prev]); setShowForm(false); setNm(''); setSr(''); showToast('success', 'Added', nm); } } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); } };
  const filtered = assets.filter(a => (catF === 'ALL' || a.category === catF) && ((a.name || '').toLowerCase().includes(search.toLowerCase())));
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}><Database size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Assets ({assets.length})</h2></div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input className='form-input' placeholder='Search...' value={search} onChange={e => setSearch(e.target.value)} style={{ width: '150px' }} />
          <select className='form-input' style={{ width: 'auto' }} value={catF} onChange={e => setCatF(e.target.value)}><option value='ALL'>All</option>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <button className='btn btn-primary' onClick={() => setShowForm(true)}><Plus size={14} /> Add</button>
        </div>
      </div>
      {showForm && (<form onSubmit={handleAdd} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem' }}>
        <input className='form-input' placeholder='Name*' value={nm} onChange={e => setNm(e.target.value)} required />
        <select className='form-input' value={ct} onChange={e => setCt(e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <input className='form-input' placeholder='Serial#' value={sr} onChange={e => setSr(e.target.value)} />
        <select className='form-input' value={hid} onChange={e => setHid(e.target.value)}>{hostels.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
        <div style={{ display: 'flex', gap: '0.5rem', gridColumn: '1/-1' }}><button type='button' className='btn btn-secondary' onClick={() => setShowForm(false)}>Cancel</button><button type='submit' className='btn btn-primary'>Add Asset</button></div>
      </form>)}
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : (
        <div className='table-container'><table className='data-table'><thead><tr><th>Asset</th><th>Category</th><th>Status</th><th>Condition</th><th>Serial</th></tr></thead>
          <tbody>
            {filtered.map((a: any) => (<tr key={a.id}><td style={{ fontWeight: 600 }}>{a.name}</td><td><span className='badge' style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>{a.category}</span></td><td><span className={'badge ' + (a.status === 'AVAILABLE' ? 'badge-success' : a.status === 'ASSIGNED' ? 'badge-warning' : 'badge-danger')}>{a.status}</span></td><td><span className={'badge ' + (a.condition === 'GOOD' ? 'badge-success' : a.condition === 'FAIR' ? 'badge-warning' : 'badge-danger')}>{a.condition}</span></td><td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.serialNumber || '-'}</td></tr>))}
            {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No assets found</td></tr>}
          </tbody>
        </table></div>
      )}
    </div>
  );
};

// INSPECTIONS PANEL
export const InspectionsPanel: React.FC<PP> = () => {
  const [tab, setTab] = useState<'inspections'|'preventive'>('inspections');
  const [inspList, setInspList] = useState<any[]>([]);
  const [pmList, setPmList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    if (tab === 'inspections') { axios.get('/api/erp/room-inspections').then(r => { if (r.data?.success) setInspList(r.data.data); }).catch(() => {}).finally(() => setLoading(false)); }
    else { axios.get('/api/erp/preventive-maintenance').then(r => { if (r.data?.success) setPmList(r.data.data); }).catch(() => {}).finally(() => setLoading(false)); }
  }, [tab]);
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}><CheckCheck size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Inspections & Maintenance</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}><button className={'btn ' + (tab === 'inspections' ? 'btn-primary' : 'btn-secondary')} onClick={() => setTab('inspections')}>Room Inspections</button><button className={'btn ' + (tab === 'preventive' ? 'btn-primary' : 'btn-secondary')} onClick={() => setTab('preventive')}>Preventive Maintenance</button></div>
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : tab === 'inspections' ? (
        <div className='table-container'><table className='data-table'><thead><tr><th>Room</th><th>Inspector</th><th>Score</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>{inspList.map((i: any) => (<tr key={i.id}><td>{i.room?.roomNumber} ({i.room?.block})</td><td>{i.inspector?.fullName || '-'}</td><td style={{ fontWeight: 700, color: i.score >= 80 ? 'var(--success)' : i.score >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{i.score}/100</td><td><span className={'badge ' + (i.status === 'PASSED' ? 'badge-success' : i.status === 'FAILED' ? 'badge-danger' : 'badge-warning')}>{i.status}</span></td><td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(i.inspectionDate).toLocaleDateString()}</td></tr>))}{inspList.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No inspections</td></tr>}</tbody>
        </table></div>
      ) : (
        <div className='table-container'><table className='data-table'><thead><tr><th>Title</th><th>Category</th><th>Scheduled</th><th>Status</th><th>Priority</th></tr></thead>
          <tbody>{pmList.map((p: any) => (<tr key={p.id}><td style={{ fontWeight: 600 }}>{p.title}</td><td>{p.category}</td><td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.scheduledDate ? new Date(p.scheduledDate).toLocaleDateString() : '-'}</td><td><span className={'badge ' + (p.status === 'COMPLETED' ? 'badge-success' : p.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning')}>{p.status}</span></td><td><span className={'badge ' + (p.priority === 'HIGH' || p.priority === 'CRITICAL' ? 'badge-danger' : p.priority === 'MEDIUM' ? 'badge-warning' : 'badge-success')}>{p.priority}</span></td></tr>))}{pmList.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No tasks</td></tr>}</tbody>
        </table></div>
      )}
    </div>
  );
};

// INCIDENT PANEL
export const IncidentPanel: React.FC<PP> = ({ currentUser, showToast, hostels = [] }) => {
  const INC = ['DISCIPLINARY','PROPERTY_DAMAGE','THEFT','SUBSTANCE_ABUSE','HARASSMENT','SAFETY_VIOLATION','UNAUTHORIZED_ABSENCE','OTHER'];
  const [list, setList] = useState<any[]>([]); const [loading, setLoading] = useState(false); const [sf, setSf] = useState('ALL'); const [showForm, setShowForm] = useState(false);
  const [sid, setSid] = useState(''); const [it, setIt] = useState('DISCIPLINARY'); const [sv, setSv] = useState('MINOR'); const [desc, setDesc] = useState(''); const [fine, setFine] = useState('0');
  useEffect(() => { setLoading(true); axios.get('/api/erp/incidents').then(r => { if (r.data?.success) setList(r.data.data); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const file = async (e: React.FormEvent) => { e.preventDefault(); try { const r = await axios.post('/api/erp/incidents', { studentId: sid, hostelId: currentUser?.hostelId || hostels[0]?.id, incidentType: it, severity: sv, description: desc, fineAmount: Number(fine) }); if (r.data?.success) { setList(prev => [r.data.data, ...prev]); setShowForm(false); setSid(''); setDesc(''); setFine('0'); showToast('success', 'Incident Filed'); } } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); } };
  const filtered = list.filter(i => sf === 'ALL' || i.status === sf);
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}><ShieldAlert size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Incident Reports</h2><p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Open: {list.filter(i => i.status === 'OPEN').length}/{list.length}</p></div>
        <div style={{ display: 'flex', gap: '0.75rem' }}><select className='form-input' style={{ width: 'auto' }} value={sf} onChange={e => setSf(e.target.value)}><option value='ALL'>All</option><option value='OPEN'>Open</option><option value='UNDER_REVIEW'>Review</option><option value='CLOSED'>Closed</option></select><button className='btn btn-primary' onClick={() => setShowForm(true)}><Plus size={14} /> File</button></div>
      </div>
      {showForm && <form onSubmit={file} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem' }}>
        <input className='form-input' placeholder='Student ID*' value={sid} onChange={e => setSid(e.target.value)} required />
        <select className='form-input' value={it} onChange={e => setIt(e.target.value)}>{INC.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}</select>
        <select className='form-input' value={sv} onChange={e => setSv(e.target.value)}><option value='MINOR'>Minor</option><option value='MODERATE'>Moderate</option><option value='MAJOR'>Major</option><option value='CRITICAL'>Critical</option></select>
        <input className='form-input' type='number' value={fine} onChange={e => setFine(e.target.value)} placeholder='Fine (Rs)' />
        <textarea className='form-input' style={{ gridColumn: '1/-1' }} rows={2} value={desc} onChange={e => setDesc(e.target.value)} required placeholder='Description*' />
        <div style={{ display: 'flex', gap: '0.5rem', gridColumn: '1/-1' }}><button type='button' className='btn btn-secondary' onClick={() => setShowForm(false)}>Cancel</button><button type='submit' className='btn btn-primary'>File Report</button></div>
      </form>}
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : (
        <div className='table-container'><table className='data-table'><thead><tr><th>Student</th><th>Type</th><th>Severity</th><th>Status</th><th>Fine</th><th>Date</th></tr></thead>
          <tbody>{filtered.map((i: any) => (<tr key={i.id}><td><div style={{ fontWeight: 600 }}>{i.student?.fullName}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i.student?.registerNumber}</div></td><td style={{ fontSize: '0.85rem' }}>{(i.incidentType||'').replace(/_/g,' ')}</td><td><span className={'badge ' + (i.severity === 'CRITICAL' || i.severity === 'MAJOR' ? 'badge-danger' : i.severity === 'MODERATE' ? 'badge-warning' : 'badge-success')}>{i.severity}</span></td><td><span className={'badge ' + (i.status === 'CLOSED' ? 'badge-success' : i.status === 'OPEN' ? 'badge-danger' : 'badge-warning')}>{i.status}</span></td><td style={{ fontWeight: 600 }}>Rs.{i.fineAmount||0}</td><td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(i.incidentDate).toLocaleDateString()}</td></tr>))}{filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>None found</td></tr>}</tbody>
        </table></div>
      )}
    </div>
  );
};

// HOSTEL CONFIG PANEL
export const HostelConfigPanel: React.FC<PP> = ({ currentUser, showToast, hostels = [] }) => {
  const [hid, setHid] = useState(currentUser?.hostelId || (hostels[0]?.id || ''));
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'timings'|'calendar'>('timings');
  const [cal, setCal] = useState<any[]>([]);
  const [go, setGo] = useState('06:00'); const [gc, setGc] = useState('22:00'); const [na, setNa] = useState('21:30'); const [op, setOp] = useState('20:00');
  useEffect(() => {
    if (!hid) return;
    setLoading(true);
    axios.get('/api/erp/hostel-config/' + hid).then(r => { if (r.data?.success && r.data.data) { const d = r.data.data; setGo(d.gateOpenTime||'06:00'); setGc(d.gateCloseTime||'22:00'); setNa(d.nightAttendanceTime||'21:30'); setOp(d.outpassDeadline||'20:00'); } }).catch(() => {}).finally(() => setLoading(false));
    const now = new Date();
    axios.get('/api/erp/hostel-config/' + hid + '/calendar?month=' + (now.getMonth()+1) + '&year=' + now.getFullYear()).then(r => { if (r.data?.success) setCal(r.data.data); }).catch(() => {});
  }, [hid]);
  const save = async () => { setSaving(true); try { await axios.post('/api/erp/hostel-config/' + hid, { gateOpenTime: go, gateCloseTime: gc, nightAttendanceTime: na, outpassDeadline: op }); showToast('success', 'Config Saved'); } catch (e: any) { showToast('error', 'Error', e.response?.data?.error || ''); } finally { setSaving(false); } };
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}><Settings size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Hostel Configuration</h2></div>
        <select className='form-input' style={{ width: 'auto' }} value={hid} onChange={e => setHid(e.target.value)}>{hostels.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}><button className={'btn ' + (tab === 'timings' ? 'btn-primary' : 'btn-secondary')} onClick={() => setTab('timings')}>Timings</button><button className={'btn ' + (tab === 'calendar' ? 'btn-primary' : 'btn-secondary')} onClick={() => setTab('calendar')}>Calendar</button></div>
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : tab === 'timings' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}><h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Gate Hours</h4><div style={{ display: 'grid', gap: '0.75rem' }}><div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open</label><input className='form-input' type='time' value={go} onChange={e => setGo(e.target.value)} /></div><div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Close</label><input className='form-input' type='time' value={gc} onChange={e => setGc(e.target.value)} /></div></div></div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}><h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Attendance</h4><div style={{ display: 'grid', gap: '0.75rem' }}><div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Night Attendance</label><input className='form-input' type='time' value={na} onChange={e => setNa(e.target.value)} /></div><div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outpass Deadline</label><input className='form-input' type='time' value={op} onChange={e => setOp(e.target.value)} /></div></div></div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}><button className='btn btn-primary' onClick={save} disabled={saving}><Save size={14} />{saving ? ' Saving...' : ' Save Config'}</button></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '0.5rem' }}>
          {cal.map((e: any) => (<div key={e.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{new Date(e.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div><span className={'badge ' + (e.dayType === 'HOLIDAY' ? 'badge-danger' : e.dayType === 'WORKING' ? 'badge-success' : 'badge-warning')} style={{ fontSize: '0.7rem' }}>{e.dayType}</span>{e.label && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.label}</div>}</div>))}
          {cal.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No entries this month</div>}
        </div>
      )}
    </div>
  );
};

// DIGITAL ID PANEL
export const DigitalIDPanel: React.FC<PP> = ({ currentUser }) => {
  const [idData, setIdData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setLoading(true); axios.get('/api/erp/students/' + currentUser?.id + '/hostel-id').then(r => { if (r.data?.success) setIdData(r.data.data); }).catch(() => {}).finally(() => setLoading(false)); }, [currentUser?.id]);
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><CreditCard size={22} /> Digital Hostel ID</h2>
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Generating ID card...</div> : idData ? (
        <div style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)', borderRadius: '20px', padding: '2rem', color: 'white', boxShadow: '0 20px 40px rgba(99,102,241,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div><div style={{ fontSize: '0.7rem', opacity: 0.8, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>SmartHostel Enterprise</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{idData.fullName}</div><div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{idData.department}</div></div>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idData.photo ? <img src={idData.photo} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} alt='Photo' /> : <User size={28} />}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Reg. No.</div><div style={{ fontWeight: 700 }}>{idData.registerNumber}</div></div>
            <div><div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Room</div><div style={{ fontWeight: 700 }}>{idData.room?.roomNumber || 'N/A'}</div></div>
            <div><div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Hostel</div><div style={{ fontWeight: 700 }}>{idData.hostel?.name || '-'}</div></div>
            <div><div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Blood</div><div style={{ fontWeight: 700 }}>{idData.bloodGroup || '-'}</div></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><div style={{ background: 'white', padding: '12px', borderRadius: '12px' }}><QRCodeSVG value={'HOSTEL-ID:' + idData.id} size={120} /></div></div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.7 }}>Valid: {idData.validUntil ? new Date(idData.validUntil).toLocaleDateString() : 'Academic Year End'}</div>
        </div>
      ) : <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>ID not available. Contact admin.</div>}
    </div>
  );
};

// LIVE TRACKING PANEL
export const LiveTrackingPanel: React.FC<PP> = () => {
  const [trackData, setTrackData] = useState<any>(null);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const [r1, r2] = await Promise.all([axios.get('/api/erp/reports/currently-outside'), axios.get('/api/erp/reports/overdue-returns')]); if (r1.data?.success) setTrackData(r1.data.data); if (r2.data?.success) setOverdue(r2.data.data); } catch (_) {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const sm = trackData?.summary || { outsideCount: 0, overdueCount: 0, expectedBeforeEvening: 0, returnedToday: 0, exitedToday: 0 };
  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div><h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}><Activity size={22} style={{ display:'inline', marginRight:'0.5rem' }} />Live Gate Tracking</h2><p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Updated: {new Date().toLocaleTimeString()}</p></div>
        <button className='btn btn-secondary' onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[{l:'Currently Outside',v:sm.outsideCount,c:'var(--primary)'},{l:'Overdue Returns',v:sm.overdueCount,c:'var(--danger)'},{l:'Before Evening',v:sm.expectedBeforeEvening,c:'var(--warning)'},{l:'Exited Today',v:sm.exitedToday,c:'var(--text-muted)'},{l:'Returned Today',v:sm.returnedToday,c:'var(--success)'}].map(s => (<div key={s.l} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}><div style={{ fontSize: '2rem', fontWeight: 800, color: s.c }}>{loading ? '...' : s.v}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.l}</div></div>))}
      </div>
      {overdue.length > 0 && <div style={{ marginBottom: '1.5rem' }}><h4 style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '1rem' }}>Overdue Returns ({overdue.length})</h4><div style={{ display: 'grid', gap: '0.5rem' }}>{overdue.slice(0,8).map((o: any) => (<div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px' }}><div><div style={{ fontWeight: 700 }}>{o.student?.fullName}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.student?.registerNumber}</div></div><div style={{ color: 'var(--danger)', fontWeight: 700 }}>Due: {new Date(o.expectedReturn).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>))}</div></div>}
      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : trackData?.currentlyOutside?.length > 0 ? (
        <div><h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Outside ({trackData.currentlyOutside.length})</h4>
          <div className='table-container'><table className='data-table'><thead><tr><th>Student</th><th>Destination</th><th>Expected Return</th><th>Status</th></tr></thead>
            <tbody>{trackData.currentlyOutside.map((p: any) => (<tr key={p.id} style={{ background: p.isOverdue ? 'rgba(239,68,68,0.05)' : 'transparent' }}><td><div style={{ fontWeight: 600 }}>{p.student?.fullName}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.student?.registerNumber}</div></td><td>{p.destination}</td><td style={{ fontSize: '0.8rem', color: p.isOverdue ? 'var(--danger)' : 'var(--text)' }}>{new Date(p.expectedReturn).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}{p.isOverdue && ' (+' + p.overdueMinutes + 'm)'}</td><td><span className={'badge ' + (p.isOverdue ? 'badge-danger' : 'badge-warning')}>{p.isOverdue ? 'OVERDUE' : 'OUT'}</span></td></tr>))}</tbody>
          </table></div>
        </div>
      ) : <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>All students inside the hostel</div>}
    </div>
  );
};

// PREVENTIVE MAINTENANCE PANEL (Phase 7)
export const PreventiveMaintenancePanel: React.FC<PP> = ({ currentUser: _currentUser, showToast, hostels = [] }) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showService, setShowService] = useState<any>(null);
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceCost, setServiceCost] = useState('0');
  const [form, setForm] = useState({
    equipmentName: '',
    location: '',
    frequency: 'MONTHLY',
    nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    assignedRole: 'MAINTENANCE',
    notes: '',
    hostelId: hostels[0]?.id || ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get('/api/erp/maintenance-schedules');
      if (r.data?.success) setSchedules(r.data.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await axios.post('/api/erp/maintenance-schedules', form);
      if (r.data?.success) {
        showToast('success', 'Schedule Created', 'Preventive schedule registered');
        setShowAdd(false);
        load();
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to create');
    }
  };

  const handleService = async (id: string) => {
    try {
      const r = await axios.post(`/api/erp/maintenance-schedules/${id}/service`, {
        notes: serviceNotes,
        cost: Number(serviceCost)
      });
      if (r.data?.success) {
        showToast('success', 'Maintenance Recorded', 'Asset serviced and schedule advanced');
        setShowService(null);
        setServiceNotes('');
        setServiceCost('0');
        load();
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to record service');
    }
  };

  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            <Wrench size={22} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Preventive Maintenance
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Asset lifecycle & scheduled servicing routines</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className='btn btn-secondary' onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button className='btn btn-primary' onClick={() => setShowAdd(true)}><Plus size={14} /> New Schedule</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{schedules.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total Schedules</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
            {schedules.filter(s => new Date(s.nextDueDate) <= new Date()).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Due for Servicing</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
            {schedules.filter(s => s.status === 'ACTIVE').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active Schedules</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading maintenance schedules...</div>
      ) : schedules.length > 0 ? (
        <div className='table-container'>
          <table className='data-table'>
            <thead>
              <tr>
                <th>Equipment / Asset</th>
                <th>Location</th>
                <th>Frequency</th>
                <th>Next Due Date</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => {
                const isOverdue = new Date(s.nextDueDate) <= new Date();
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.equipmentName}</div>
                      {s.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.notes}</div>}
                    </td>
                    <td>{s.location || 'Central Facility'}</td>
                    <td><span className='badge badge-info'>{s.frequency}</span></td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : 'var(--text)', fontWeight: isOverdue ? 700 : 400 }}>
                      {new Date(s.nextDueDate).toLocaleDateString()}
                      {isOverdue && ' (DUE)'}
                    </td>
                    <td>{s.assignedRole}</td>
                    <td>
                      <span className={'badge ' + (isOverdue ? 'badge-danger' : 'badge-success')}>
                        {isOverdue ? 'DUE' : s.status}
                      </span>
                    </td>
                    <td>
                      <button className='btn btn-secondary' style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setShowService(s)}>
                        <Check size={12} /> Service
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No preventive maintenance routines configured. Click "New Schedule" to register one.
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className='modal-overlay' onClick={() => setShowAdd(false)}>
          <div className='modal-content' onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className='modal-header'>
              <h3 className='modal-title'>Add Maintenance Schedule</h3>
              <button className='modal-close' onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1rem', padding: '1.5rem' }}>
              <div>
                <label className='form-label'>Equipment / Machine Name</label>
                <input className='form-input' required placeholder='e.g. RO Water Plant - Block B' value={form.equipmentName} onChange={e => setForm({ ...form, equipmentName: e.target.value })} />
              </div>
              <div>
                <label className='form-label'>Location</label>
                <input className='form-input' required placeholder='e.g. Terrace / Basement Pump Room' value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className='form-label'>Frequency</label>
                  <select className='form-input' value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                    {['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className='form-label'>Next Due Date</label>
                  <input className='form-input' type='date' required value={form.nextDueDate} onChange={e => setForm({ ...form, nextDueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className='form-label'>Assigned Role</label>
                <select className='form-input' value={form.assignedRole} onChange={e => setForm({ ...form, assignedRole: e.target.value })}>
                  {['MAINTENANCE', 'ELECTRICIAN', 'PLUMBER', 'HVAC_TECH', 'HOSTEL_ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className='form-label'>Notes / Standard Procedure</label>
                <textarea className='form-input' rows={2} placeholder='Check filter pressure, clean carbon cartridge...' value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type='button' className='btn btn-secondary' style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type='submit' className='btn btn-primary' style={{ flex: 1.5 }}>Save Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showService && (
        <div className='modal-overlay' onClick={() => setShowService(null)}>
          <div className='modal-content' onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className='modal-header'>
              <h3 className='modal-title'>Complete Service: {showService.equipmentName}</h3>
              <button className='modal-close' onClick={() => setShowService(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
              <div>
                <label className='form-label'>Service Notes & Observations</label>
                <textarea className='form-input' rows={3} placeholder='Replaced filter, calibrated pressure gauge...' value={serviceNotes} onChange={e => setServiceNotes(e.target.value)} />
              </div>
              <div>
                <label className='form-label'>Cost Incurred (₹)</label>
                <input className='form-input' type='number' min='0' value={serviceCost} onChange={e => setServiceCost(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type='button' className='btn btn-secondary' style={{ flex: 1 }} onClick={() => setShowService(null)}>Cancel</button>
                <button type='button' className='btn btn-primary' style={{ flex: 1.5 }} onClick={() => handleService(showService.id)}>Record Completed</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// MESS WASTE & DEMAND FORECAST PANEL (Phase 9+10)
export const MessWasteForecastPanel: React.FC<PP> = ({ currentUser: _currentUser, showToast }) => {
  const [wasteReport, setWasteReport] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [meals, setMeals] = useState<any[]>([]);
  const [selectedMealId, setSelectedMealId] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [prepWasteKg, setPrepWasteKg] = useState('0');
  const [studentCount, setStudentCount] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        axios.get('/api/erp/mess/waste-report'),
        axios.get('/api/erp/mess/demand-forecast'),
        axios.get('/api/erp/meals')
      ]);
      if (r1.data?.success) setWasteReport(r1.data.data);
      if (r2.data?.success) setForecast(r2.data.data);
      if (r3.data?.success) {
        setMeals(r3.data.data || []);
        if (r3.data.data?.length > 0) setSelectedMealId(r3.data.data[0].id);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMealId) {
      showToast('error', 'Select Meal', 'Please choose a meal to log waste for');
      return;
    }
    try {
      const r = await axios.post(`/api/erp/meals/${selectedMealId}/waste-log`, {
        wasteKg: parseFloat(wasteKg) || 0,
        prepWasteKg: parseFloat(prepWasteKg) || 0,
        studentCount: parseInt(studentCount, 10) || 0,
        notes
      });
      if (r.data?.success) {
        showToast('success', 'Waste Logged', 'Daily mess waste metrics recorded');
        setShowLogModal(false);
        setWasteKg('');
        setNotes('');
        load();
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to log waste');
    }
  };

  const summary = wasteReport?.summary || { totalWasteKg: 0, averageWasteKg: 0, logCount: 0 };

  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            <TrendingDown size={22} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Mess Waste & AI Demand Forecast
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Reduce food wastage and optimize preparation volume</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className='btn btn-secondary' onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button className='btn btn-primary' onClick={() => setShowLogModal(true)}><Plus size={14} /> Log Waste</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>{summary.totalWasteKg?.toFixed(1) || 0} kg</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total Food Waste Logged</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{summary.averageWasteKg?.toFixed(1) || 0} kg</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Average Waste per Meal</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
            {forecast?.estimatedAttendance || 120}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Tomorrow's Headcount Forecast</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>
            {forecast?.recommendedKg || 42} kg
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Recommended Prep Batch</div>
        </div>
      </div>

      {forecast && (
        <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
          <h4 style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>AI Smart Kitchen Recommendation</h4>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
            Based on active approved leaves ({forecast.leaveCount || 0} students), meal skip opt-outs ({forecast.skipCount || 0} students), and historical waste logs, we forecast a demand of <strong>{forecast.estimatedAttendance || 120} diners</strong>. Reducing raw grain prep by {forecast.suggestedSavingPct || '8%'} will prevent approximately {forecast.estimatedWasteSavingKg || '3.5'} kg of surplus waste.
          </p>
        </div>
      )}

      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Meal Waste Logs</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading records...</div>
      ) : wasteReport?.recentLogs?.length > 0 ? (
        <div className='table-container'>
          <table className='data-table'>
            <thead>
              <tr>
                <th>Date & Meal</th>
                <th>Menu Item</th>
                <th>Waste (kg)</th>
                <th>Prep Waste</th>
                <th>Diners Served</th>
                <th>Waste / Student</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {wasteReport.recentLogs.map((l: any) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.meal?.type || 'MEAL'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(l.date || l.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>{l.meal?.menu || 'Standard Menu'}</td>
                  <td style={{ fontWeight: 700, color: l.wasteKg > 10 ? 'var(--danger)' : 'var(--warning)' }}>{l.wasteKg} kg</td>
                  <td>{l.prepWasteKg || 0} kg</td>
                  <td>{l.studentCount || '—'}</td>
                  <td>{l.studentCount ? `${((l.wasteKg / l.studentCount) * 1000).toFixed(0)} g` : '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No meal waste records logged yet.</div>
      )}

      {showLogModal && (
        <div className='modal-overlay' onClick={() => setShowLogModal(false)}>
          <div className='modal-content' onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className='modal-header'>
              <h3 className='modal-title'>Log Meal Food Waste</h3>
              <button className='modal-close' onClick={() => setShowLogModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleLogWaste} style={{ display: 'grid', gap: '1rem', padding: '1.5rem' }}>
              <div>
                <label className='form-label'>Select Meal</label>
                <select className='form-input' required value={selectedMealId} onChange={e => setSelectedMealId(e.target.value)}>
                  {meals.map(m => (
                    <option key={m.id} value={m.id}>
                      {new Date(m.date).toLocaleDateString()} - {m.type} ({m.menu?.slice(0, 25)})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className='form-label'>Plate Waste (kg)</label>
                  <input className='form-input' type='number' step='0.1' min='0' required placeholder='e.g. 6.5' value={wasteKg} onChange={e => setWasteKg(e.target.value)} />
                </div>
                <div>
                  <label className='form-label'>Prep Waste (kg)</label>
                  <input className='form-input' type='number' step='0.1' min='0' placeholder='e.g. 1.2' value={prepWasteKg} onChange={e => setPrepWasteKg(e.target.value)} />
                </div>
              </div>
              <div>
                <label className='form-label'>Total Diners Attended</label>
                <input className='form-input' type='number' min='0' placeholder='e.g. 145' value={studentCount} onChange={e => setStudentCount(e.target.value)} />
              </div>
              <div>
                <label className='form-label'>Root Cause / Chef Notes</label>
                <textarea className='form-input' rows={2} placeholder='Excess sambar prepared due to sudden evening rain...' value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type='button' className='btn btn-secondary' style={{ flex: 1 }} onClick={() => setShowLogModal(false)}>Cancel</button>
                <button type='submit' className='btn btn-primary' style={{ flex: 1.5 }}>Submit Waste Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// INVENTORY LEDGER PANEL (Phase 11)
export const InventoryLedgerPanel: React.FC<PP> = ({ currentUser: _currentUser, showToast }) => {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [changeType, setChangeType] = useState('AUDIT_ADJUSTMENT');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    axios.get('/api/erp/inventory').then(r => {
      if (r.data?.success && r.data.data?.length > 0) {
        setItems(r.data.data);
        setSelectedItemId(r.data.data[0].id);
      }
    }).catch(() => {});
  }, []);

  const loadLedger = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await axios.get(`/api/erp/inventory/${id}/ledger`);
      if (r.data?.success) setLedger(r.data.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItemId) loadLedger(selectedItemId);
  }, [selectedItemId]);

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    try {
      const r = await axios.post(`/api/erp/inventory/${selectedItemId}/adjustment`, {
        changeType,
        quantity: parseFloat(quantity) || 0,
        reason
      });
      if (r.data?.success) {
        showToast('success', 'Stock Adjusted', 'Ledger transaction recorded');
        setShowAdjustModal(false);
        setQuantity('');
        setReason('');
        loadLedger(selectedItemId);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to adjust');
    }
  };

  const currentItem = items.find(i => i.id === selectedItemId);

  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            <Database size={22} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Inventory Stock Ledger
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Audit trail of stock movements, receipts, and write-offs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className='btn btn-secondary' onClick={() => loadLedger(selectedItemId)} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button className='btn btn-primary' onClick={() => setShowAdjustModal(true)}><Plus size={14} /> Audit Adjustment</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label className='form-label' style={{ marginBottom: '0.35rem' }}>Select Inventory Item</label>
          <select className='form-input' value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
            {items.map(it => (
              <option key={it.id} value={it.id}>
                {it.name} ({it.category}) — Current Stock: {it.quantity} {it.unit}
              </option>
            ))}
          </select>
        </div>
        {currentItem && (
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: currentItem.quantity <= (currentItem.minQuantity || 10) ? 'var(--danger)' : 'var(--success)' }}>
                {currentItem.quantity} {currentItem.unit}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safety Threshold</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentItem.minQuantity || 10} {currentItem.unit}</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading ledger movements...</div>
      ) : ledger.length > 0 ? (
        <div className='table-container'>
          <table className='data-table'>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Movement Type</th>
                <th>Quantity</th>
                <th>Balance After</th>
                <th>Reason / Reference</th>
                <th>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(tx => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={'badge ' + (tx.changeType === 'PURCHASE' ? 'badge-success' : tx.changeType === 'DAMAGE' ? 'badge-danger' : 'badge-info')}>
                      {tx.changeType}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: tx.quantityChange > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                  </td>
                  <td style={{ fontWeight: 600 }}>{tx.balanceAfter}</td>
                  <td style={{ fontSize: '0.8rem' }}>{tx.notes || tx.reason || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tx.performedBy || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No ledger transactions logged for this item yet.
        </div>
      )}

      {showAdjustModal && (
        <div className='modal-overlay' onClick={() => setShowAdjustModal(false)}>
          <div className='modal-content' onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className='modal-header'>
              <h3 className='modal-title'>Stock Ledger Adjustment</h3>
              <button className='modal-close' onClick={() => setShowAdjustModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdjustment} style={{ display: 'grid', gap: '1rem', padding: '1.5rem' }}>
              <div>
                <label className='form-label'>Item</label>
                <input className='form-input' disabled value={currentItem?.name || ''} />
              </div>
              <div>
                <label className='form-label'>Adjustment Type</label>
                <select className='form-input' value={changeType} onChange={e => setChangeType(e.target.value)}>
                  <option value='AUDIT_ADJUSTMENT'>Physical Audit Reconciliation</option>
                  <option value='DAMAGE'>Damage / Write-off</option>
                  <option value='PURCHASE'>Direct Stock Addition</option>
                  <option value='USAGE'>Ad-hoc Usage</option>
                </select>
              </div>
              <div>
                <label className='form-label'>Quantity Change (+ or -)</label>
                <input className='form-input' type='number' step='any' required placeholder='e.g. -5 or 12' value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div>
                <label className='form-label'>Audit Reference / Justification</label>
                <textarea className='form-input' rows={2} required placeholder='Quarterly stock physical verification discrepancy...' value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type='button' className='btn btn-secondary' style={{ flex: 1 }} onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type='submit' className='btn btn-primary' style={{ flex: 1.5 }}>Record in Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// FEE STRUCTURE & INVOICING PANEL (Phase 12)
export const FeeStructurePanel: React.FC<PP> = ({ currentUser: _currentUser, showToast, hostels = [] }) => {
  const [structures, setStructures] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    academicYearId: '',
    roomType: 'DOUBLE',
    term: 'ANNUAL',
    baseAmount: '45000',
    messFee: '35000',
    amenitiesFee: '5000',
    cautionDeposit: '5000',
    dueDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    penaltyPerDay: '50',
    hostelId: hostels[0]?.id || ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get('/api/erp/fee-structures'),
        axios.get('/api/erp/academic-years')
      ]);
      if (r1.data?.success) setStructures(r1.data.data);
      if (r2.data?.success) {
        setAcademicYears(r2.data.data);
        if (r2.data.data?.length > 0 && !form.academicYearId) {
          setForm(f => ({ ...f, academicYearId: r2.data.data[0].id }));
        }
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await axios.post('/api/erp/fee-structures', form);
      if (r.data?.success) {
        showToast('success', 'Fee Structure Created', 'Fee schedule registered for room category');
        setShowAdd(false);
        load();
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to create fee structure');
    }
  };

  const handleGenerateInvoices = async (id: string) => {
    setGeneratingId(id);
    try {
      const r = await axios.post(`/api/erp/fee-structures/${id}/generate`);
      if (r.data?.success) {
        showToast('success', 'Invoices Generated', `${r.data.data?.count || 'All'} student fee records generated!`);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to generate fees');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            <DollarSign size={22} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Hostel Fee Structures
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configure term fees by room type and batch generate invoices</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className='btn btn-secondary' onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button className='btn btn-primary' onClick={() => setShowAdd(true)}><Plus size={14} /> New Structure</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading fee structures...</div>
      ) : structures.length > 0 ? (
        <div className='table-container'>
          <table className='data-table'>
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Room Type</th>
                <th>Term</th>
                <th>Rent / Base</th>
                <th>Mess Fee</th>
                <th>Amenities & Caution</th>
                <th>Total Fee</th>
                <th>Due Date</th>
                <th>Invoicing</th>
              </tr>
            </thead>
            <tbody>
              {structures.map(s => {
                const total = (Number(s.baseAmount) || 0) + (Number(s.messFee) || 0) + (Number(s.amenitiesFee) || 0) + (Number(s.cautionDeposit) || 0);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.academicYear?.name || 'All Years'}</td>
                    <td><span className='badge badge-info'>{s.roomType}</span></td>
                    <td>{s.term}</td>
                    <td>₹{Number(s.baseAmount).toLocaleString()}</td>
                    <td>₹{Number(s.messFee).toLocaleString()}</td>
                    <td style={{ fontSize: '0.8rem' }}>₹{Number(s.amenitiesFee).toLocaleString()} + ₹{Number(s.cautionDeposit).toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>₹{total.toLocaleString()}</td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(s.dueDate).toLocaleDateString()}</td>
                    <td>
                      <button className='btn btn-secondary' style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} disabled={generatingId === s.id} onClick={() => handleGenerateInvoices(s.id)}>
                        <FileText size={12} /> {generatingId === s.id ? 'Generating...' : 'Bill Students'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No fee structures defined yet. Click "New Structure" to create term billing rules.
        </div>
      )}

      {showAdd && (
        <div className='modal-overlay' onClick={() => setShowAdd(false)}>
          <div className='modal-content' onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className='modal-header'>
              <h3 className='modal-title'>Create Fee Structure</h3>
              <button className='modal-close' onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className='form-label'>Academic Year</label>
                  <select className='form-input' value={form.academicYearId} onChange={e => setForm({ ...form, academicYearId: e.target.value })}>
                    {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className='form-label'>Room Type</label>
                  <select className='form-input' value={form.roomType} onChange={e => setForm({ ...form, roomType: e.target.value })}>
                    {['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED', 'DORMITORY'].map(rt => <option key={rt} value={rt}>{rt}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className='form-label'>Term Frequency</label>
                  <select className='form-input' value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}>
                    {['ANNUAL', 'SEMESTER', 'MONTHLY'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className='form-label'>Payment Due Date</label>
                  <input className='form-input' type='date' required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className='form-label'>Base Room Rent (₹)</label>
                  <input className='form-input' type='number' required min='0' value={form.baseAmount} onChange={e => setForm({ ...form, baseAmount: e.target.value })} />
                </div>
                <div>
                  <label className='form-label'>Mess Fee (₹)</label>
                  <input className='form-input' type='number' required min='0' value={form.messFee} onChange={e => setForm({ ...form, messFee: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className='form-label'>Amenities Fee (₹)</label>
                  <input className='form-input' type='number' min='0' value={form.amenitiesFee} onChange={e => setForm({ ...form, amenitiesFee: e.target.value })} />
                </div>
                <div>
                  <label className='form-label'>Caution Deposit (Refundable) (₹)</label>
                  <input className='form-input' type='number' min='0' value={form.cautionDeposit} onChange={e => setForm({ ...form, cautionDeposit: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type='button' className='btn btn-secondary' style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type='submit' className='btn btn-primary' style={{ flex: 1.5 }}>Save Fee Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// GUARDIAN / PARENT VIEW PANEL (Phase 17)
export const GuardianPortalPanel: React.FC<PP> = ({ currentUser, showToast }) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [wardData, setWardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'STUDENT') {
      loadWard(currentUser.id);
    }
  }, [currentUser]);

  const loadWard = async (studentIdOrReg: string) => {
    if (!studentIdOrReg) return;
    setLoading(true);
    try {
      const r = await axios.get(`/api/erp/guardian/student/${encodeURIComponent(studentIdOrReg)}`);
      if (r.data?.success) {
        setWardData(r.data.data);
      } else {
        showToast('error', 'Not Found', 'Could not locate student record');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Student not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentSearch.trim()) loadWard(studentSearch.trim());
  };

  const student = wardData?.student;
  const gateStatus = wardData?.gateStatus;
  const fees = wardData?.feeSummary || { totalDue: 0, totalPaid: 0, pendingBalance: 0 };

  return (
    <div className='glass-panel animate-slide-up' style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            <UserCheck size={22} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Parent & Guardian Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Real-time ward safety, campus attendance, leave & fee tracking</p>
        </div>
      </div>

      {currentUser?.role !== 'STUDENT' && (
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '600px' }}>
          <input className='form-input' placeholder="Enter Student's Register No or Student ID..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} required />
          <button type='submit' className='btn btn-primary' disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            <Search size={14} /> Search Ward
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Retrieving ward profile and real-time logs...</div>
      ) : student ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Header Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '16px', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                {student.fullName?.charAt(0) || 'S'}
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{student.fullName}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Reg No: {student.registerNumber} · {student.department || 'B.Tech'} Year {student.year || 'I'}</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  <strong>Hostel:</strong> {student.hostel?.name || 'Main Campus'} · <strong>Room:</strong> {student.room?.roomNumber || '—'} · <strong>Bed:</strong> {student.bedNumber || '—'}
                </div>
              </div>
            </div>
            <div>
              <span className={'badge ' + (gateStatus?.isOutside ? 'badge-warning' : 'badge-success')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                {gateStatus?.isOutside ? 'OUTSIDE CAMPUS' : 'INSIDE HOSTEL'}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: gateStatus?.isOutside ? 'var(--warning)' : 'var(--success)' }}>
                {gateStatus?.isOutside ? 'On Pass' : 'Present'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Current Gate Status</div>
            </div>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                {wardData?.attendancePct || '96%'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Monthly Attendance</div>
            </div>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: fees.pendingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                ₹{fees.pendingBalance?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Fee Dues Outstanding</div>
            </div>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
                {wardData?.recentPasses?.length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Recent Gate Passes</div>
            </div>
          </div>

          {/* Real-time Gate Pass Details if Outside */}
          {gateStatus?.isOutside && gateStatus.activePass && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '1.25rem' }}>
              <h4 style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '0.5rem' }}>Active Outing Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div><strong>Destination:</strong> {gateStatus.activePass.destination}</div>
                <div><strong>Purpose:</strong> {gateStatus.activePass.purpose}</div>
                <div><strong>Exited At:</strong> {gateStatus.activePass.actualExit ? new Date(gateStatus.activePass.actualExit).toLocaleTimeString() : 'Pending'}</div>
                <div><strong>Expected Return:</strong> {new Date(gateStatus.activePass.expectedReturn).toLocaleTimeString()}</div>
              </div>
            </div>
          )}

          {/* Recent Leaves & Passes */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Recent Leave & Movement History</h4>
            {wardData?.recentPasses?.length > 0 ? (
              <div className='table-container'>
                <table className='data-table'>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Destination</th>
                      <th>Out Date</th>
                      <th>Return Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wardData.recentPasses.map((p: any) => (
                      <tr key={p.id}>
                        <td>Gate Pass</td>
                        <td>{p.destination}</td>
                        <td>{new Date(p.expectedExit).toLocaleDateString()}</td>
                        <td>{new Date(p.expectedReturn).toLocaleDateString()}</td>
                        <td><span className={'badge ' + (p.status === 'RETURNED' ? 'badge-success' : 'badge-warning')}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent outings recorded.</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Search for a student using their Register Number to view the guardian monitoring portal.
        </div>
      )}
    </div>
  );
};
