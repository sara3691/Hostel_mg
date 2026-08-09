import sys
import os

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open(r'apps\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f"Total lines: {len(lines)}")

# --- STEP 1: Add new state variables after newMessName state ---
insert_after_state = "  const [newMessName, setNewMessName] = useState('');"
new_states = """
  // Gate Pass state
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [gpPurpose, setGpPurpose] = useState('');
  const [gpDestination, setGpDestination] = useState('');
  const [gpExpectedReturn, setGpExpectedReturn] = useState('');

  // Notices state
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeAudience, setNoticeAudience] = useState('ALL');
  const [noticeIsEmergency, setNoticeIsEmergency] = useState(false);
  const [noticeIsPinned, setNoticeIsPinned] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Laundry date state
  const [laundryDate, setLaundryDate] = useState('');
  const [laundryTimeSlot, setLaundryTimeSlot] = useState('8:00 AM - 10:00 AM');
  const [laundryClothes, setLaundryClothes] = useState(5);
  const [laundryNotes, setLaundryNotes] = useState('');

  // Mess menu state
  const [messMenus, setMessMenus] = useState<any[]>([]);
  const [menuDay, setMenuDay] = useState('Monday');
  const [menuBreakfast, setMenuBreakfast] = useState('');
  const [menuLunch, setMenuLunch] = useState('');
  const [menuDinner, setMenuDinner] = useState('');

  // Reports state
  const [reportType, setReportType] = useState('fees');
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any>(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
"""

if insert_after_state in content:
    content = content.replace(insert_after_state, insert_after_state + new_states, 1)
    print("STATE VARS: OK")
else:
    print("STATE VARS: FAILED - could not find insert point")

# --- STEP 2: Add new handlers before the loading screen ---
# Find loading screen
insert_before_loading = "  if (loading) {"
new_handlers = r"""
  const loadGatePasses = async () => {
    try { const res = await axios.get('/api/gate-passes'); if (res.data?.success) setGatePasses(res.data.data); } catch (e) {}
  };
  const loadNotices = async () => {
    try { const res = await axios.get('/api/notices'); if (res.data?.success) setNotices(res.data.data); } catch (e) {}
  };
  const loadNotifications = async () => {
    try { const res = await axios.get('/api/notifications'); if (res.data?.success) { setNotifications(res.data.data); setUnreadCount(res.data.unreadCount || 0); } } catch (e) {}
  };
  const loadLaundrySlots = async () => {
    try { const res = await axios.get('/api/laundry'); if (res.data?.success) setLaundrySlots(res.data.data); } catch (e) {}
  };
  const loadMessMenus = async () => {
    try { const res = await axios.get('/api/mess-menus'); if (res.data?.success) setMessMenus(res.data.data); } catch (e) {}
  };

  const handleCreateGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/gate-passes', { purpose: gpPurpose, destination: gpDestination, expectedReturn: gpExpectedReturn });
      if (res.data?.success) { alert('Gate pass requested!'); setGpPurpose(''); setGpDestination(''); setGpExpectedReturn(''); loadGatePasses(); }
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to create gate pass'); }
  };
  const handleUpdateGatePass = async (id: string, status: string, remarks?: string) => {
    try {
      const res = await axios.patch(`/api/gate-passes/${id}`, { status, remarks });
      if (res.data?.success) { alert(`Gate pass ${status}!`); loadGatePasses(); }
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/notices', { title: noticeTitle, content: noticeContent, audience: noticeAudience, isEmergency: noticeIsEmergency, isPinned: noticeIsPinned, hostelId: currentUser?.hostelId || undefined });
      if (res.data?.success) { alert('Notice posted!'); setNoticeTitle(''); setNoticeContent(''); loadNotices(); }
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };
  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Delete this notice?')) return;
    try { await axios.delete(`/api/notices/${id}`); loadNotices(); } catch (e) { alert('Failed to delete notice'); }
  };
  const handleMarkNotificationRead = async (id: string) => {
    try { await axios.patch(`/api/notifications/${id}/read`); loadNotifications(); } catch (e) {}
  };
  const handleMarkAllRead = async () => {
    try { await axios.post('/api/notifications/mark-all-read'); loadNotifications(); } catch (e) {}
  };
  const handleBookLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/laundry', { date: laundryDate, timeSlot: laundryTimeSlot, clothesCount: laundryClothes, notes: laundryNotes });
      if (res.data?.success) { alert('Laundry slot booked!'); setLaundryDate(''); setLaundryNotes(''); loadLaundrySlots(); }
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };
  const handleUpdateLaundry = async (id: string, status: string) => {
    try { await axios.patch(`/api/laundry/${id}`, { status }); loadLaundrySlots(); } catch (e) { alert('Failed to update'); }
  };
  const handleUpdateMessMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/mess-menus', { dayOfWeek: menuDay, breakfast: menuBreakfast, lunch: menuLunch, dinner: menuDinner, hostelId: currentUser?.hostelId || hostels[0]?.id });
      if (res.data?.success) { alert(`Menu for ${menuDay} updated!`); setMenuBreakfast(''); setMenuLunch(''); setMenuDinner(''); loadMessMenus(); }
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try { const res = await axios.get(`/api/reports/${reportType}`); if (res.data?.success) setReportData(res.data.data); }
    catch (err: any) { alert('Failed to generate report'); } finally { setReportLoading(false); }
  };
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchQuery.length < 2) return;
    setGlobalSearchLoading(true);
    try { const res = await axios.get(`/api/search?q=${encodeURIComponent(globalSearchQuery)}`); if (res.data?.success) setGlobalSearchResults(res.data.data); }
    catch (e) { alert('Search failed'); } finally { setGlobalSearchLoading(false); }
  };

"""

if insert_before_loading in content:
    content = content.replace(insert_before_loading, new_handlers + "  " + "if (loading) {", 1)
    print("HANDLERS: OK")
else:
    print("HANDLERS: FAILED")

# --- STEP 3: Update sidebar menus ---
# Super Admin: add gate_pass, notices, notifications, mess_menu, reports, search
old_sa_end = "        { id: 'audit_logs', label: 'System Logs', icon: Activity },\n        { id: 'settings', label: 'System Settings', icon: Settings },\n        { id: 'profile', label: 'Profile', icon: User }\n      );\n    } else if (currentUser.role === 'HOSTEL_ADMIN') {"
new_sa_end = "        { id: 'gate_pass', label: 'Gate Pass', icon: Shield },\n        { id: 'notices', label: 'Notice Board', icon: Bell },\n        { id: 'notifications', label: 'Notifications', icon: Bell },\n        { id: 'mess_menu', label: 'Mess Menu', icon: BookOpen },\n        { id: 'reports', label: 'Reports', icon: BarChart2 },\n        { id: 'search', label: 'Search', icon: Search },\n        { id: 'audit_logs', label: 'System Logs', icon: Activity },\n        { id: 'settings', label: 'System Settings', icon: Settings },\n        { id: 'profile', label: 'Profile', icon: User }\n      );\n    } else if (currentUser.role === 'HOSTEL_ADMIN') {"

if old_sa_end in content:
    content = content.replace(old_sa_end, new_sa_end, 1)
    print("SUPER_ADMIN MENU: OK")
else:
    print("SUPER_ADMIN MENU: FAILED - trying alternate search")

# Hostel Admin: Add new items
old_ha_end = "        { id: 'expenses', label: 'Expenses', icon: CreditCard },\n        { id: 'profile', label: 'Profile', icon: User }\n      );\n    } else if (currentUser.role === 'ASSISTANT_WARDEN') {"
new_ha_end = "        { id: 'expenses', label: 'Expenses', icon: CreditCard },\n        { id: 'gate_pass', label: 'Gate Pass', icon: Shield },\n        { id: 'notices', label: 'Notice Board', icon: Bell },\n        { id: 'notifications', label: 'Notifications', icon: Bell },\n        { id: 'mess_menu', label: 'Mess Menu', icon: BookOpen },\n        { id: 'reports', label: 'Reports', icon: BarChart2 },\n        { id: 'profile', label: 'Profile', icon: User }\n      );\n    } else if (currentUser.role === 'ASSISTANT_WARDEN') {"

if old_ha_end in content:
    content = content.replace(old_ha_end, new_ha_end, 1)
    print("HOSTEL_ADMIN MENU: OK")
else:
    print("HOSTEL_ADMIN MENU: FAILED")

# Student: Add gate_pass, notices, notifications
old_student_end = "        { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles },\n        { id: 'profile', label: 'My Profile', icon: User }\n      );\n    } else {"
new_student_end = "        { id: 'gate_pass', label: 'Gate Pass', icon: Shield },\n        { id: 'notices', label: 'Notice Board', icon: Bell },\n        { id: 'notifications', label: 'Notifications', icon: Bell },\n        { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles },\n        { id: 'profile', label: 'My Profile', icon: User }\n      );\n    } else {"

if old_student_end in content:
    content = content.replace(old_student_end, new_student_end, 1)
    print("STUDENT MENU: OK")
else:
    print("STUDENT MENU: FAILED")

# --- STEP 4: Inject sub-view JSX before footer ---
old_footer = "      {/* Footer */}\n      <footer"

gate_pass_view = r"""
      {/* GATE PASS MODULE */}
      {subView === 'gate_pass' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Gate Pass Management</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>Student exit/entry pass with QR verification</p>
            </div>
            <button className="btn btn-secondary" onClick={loadGatePasses}>Refresh</button>
          </div>
          {currentUser.role === 'STUDENT' && (
            <div style={{ padding: '1.5rem', background: 'rgba(99,102,241,0.04)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Request Gate Pass</h4>
              <form onSubmit={handleCreateGatePass} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <input className="form-input" type="text" placeholder="Purpose (e.g. Medical)" value={gpPurpose} onChange={e => setGpPurpose(e.target.value)} required />
                <input className="form-input" type="text" placeholder="Destination" value={gpDestination} onChange={e => setGpDestination(e.target.value)} required />
                <input className="form-input" type="datetime-local" value={gpExpectedReturn} onChange={e => setGpExpectedReturn(e.target.value)} required />
                <button className="btn btn-primary" type="submit">Submit Request</button>
              </form>
            </div>
          )}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {gatePasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No gate passes found.</p></div>
            ) : gatePasses.map((gp: any) => (
              <div key={gp.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{gp.student?.fullName || 'Student'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{gp.student?.registerNumber || '-'}</span></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>To: {gp.destination} | Purpose: {gp.purpose}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Return by: {new Date(gp.expectedReturn).toLocaleString()}</div>
                    {gp.lateReturn && <span className="badge badge-danger">LATE RETURN</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge ${gp.status === 'APPROVED' ? 'badge-success' : gp.status === 'REJECTED' ? 'badge-danger' : gp.status === 'EXITED' ? 'badge-info' : gp.status === 'RETURNED' ? 'badge-success' : 'badge-warning'}`}>{gp.status}</span>
                    {['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'PENDING' && (
                      <>
                        <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'APPROVED')}>Approve</button>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'REJECTED')}>Reject</button>
                      </>
                    )}
                    {['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'APPROVED' && (
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'EXITED')}>Mark Exit</button>
                    )}
                    {['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'EXITED' && (
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'RETURNED')}>Mark Return</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTICE BOARD */}
      {subView === 'notices' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Notice Board</h2>
            <button className="btn btn-secondary" onClick={loadNotices}>Refresh</button>
          </div>
          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (
            <div style={{ padding: '1.5rem', background: 'rgba(99,102,241,0.04)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Post Notice</h4>
              <form onSubmit={handleCreateNotice} style={{ display: 'grid', gap: '1rem' }}>
                <input className="form-input" type="text" placeholder="Notice Title" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} required />
                <textarea className="form-input" rows={3} placeholder="Notice content..." value={noticeContent} onChange={e => setNoticeContent(e.target.value)} style={{ resize: 'vertical' }} required />
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select className="form-input" style={{ width: 'auto' }} value={noticeAudience} onChange={e => setNoticeAudience(e.target.value)}>
                    <option value="ALL">All Users</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="STAFF">Staff Only</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={noticeIsEmergency} onChange={e => setNoticeIsEmergency(e.target.checked)} />
                    Emergency Alert
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={noticeIsPinned} onChange={e => setNoticeIsPinned(e.target.checked)} />
                    Pin Notice
                  </label>
                  <button className="btn btn-primary" type="submit">Post Notice</button>
                </div>
              </form>
            </div>
          )}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {notices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No notices posted yet.</p></div>
            ) : notices.map((notice: any) => (
              <div key={notice.id} style={{ padding: '1.5rem', background: notice.isEmergency ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${notice.isEmergency ? 'rgba(239,68,68,0.3)' : notice.isPinned ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`, borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {notice.isPinned && <span style={{ fontSize: '1rem' }}>📌</span>}
                    {notice.isEmergency && <span className="badge badge-danger">Emergency</span>}
                    <h4 style={{ fontWeight: 700 }}>{notice.title}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-info">{notice.audience}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    {['SUPER_ADMIN', 'HOSTEL_ADMIN'].includes(currentUser.role) && (
                      <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDeleteNotice(notice.id)}>X</button>
                    )}
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{notice.content}</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>By: {notice.postedBy}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {subView === 'notifications' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Notifications {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{unreadCount}</span>}</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={loadNotifications}>Refresh</button>
              {unreadCount > 0 && <button className="btn btn-primary" onClick={handleMarkAllRead}>Mark All Read</button>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No notifications. You are all caught up!</p></div>
            ) : notifications.map((notif: any) => (
              <div key={notif.id} onClick={() => !notif.isRead && handleMarkNotificationRead(notif.id)} style={{ padding: '1rem 1.25rem', background: notif.isRead ? 'rgba(255,255,255,0.01)' : 'rgba(99,102,241,0.06)', border: `1px solid ${notif.isRead ? 'var(--border-color)' : 'rgba(99,102,241,0.25)'}`, borderRadius: '10px', cursor: notif.isRead ? 'default' : 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {!notif.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', marginRight: '0.5rem' }}></span>}
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{notif.message}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MESS MENU MODULE */}
      {subView === 'mess_menu' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Weekly Mess Menu</h2>
            <button className="btn btn-secondary" onClick={loadMessMenus}>Refresh</button>
          </div>
          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (
            <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.04)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Update Day Menu</h4>
              <form onSubmit={handleUpdateMessMenu} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <select className="form-input" value={menuDay} onChange={e => setMenuDay(e.target.value)}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                </select>
                <input className="form-input" type="text" placeholder="Breakfast" value={menuBreakfast} onChange={e => setMenuBreakfast(e.target.value)} />
                <input className="form-input" type="text" placeholder="Lunch" value={menuLunch} onChange={e => setMenuLunch(e.target.value)} />
                <input className="form-input" type="text" placeholder="Dinner" value={menuDinner} onChange={e => setMenuDinner(e.target.value)} />
                <button className="btn btn-primary" type="submit">Save Menu</button>
              </form>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                  {['Day', 'Breakfast', 'Lunch', 'Dinner'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border-color)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                  const menu = messMenus.find((m: any) => m.dayOfWeek === day);
                  return (
                    <tr key={day} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{day}</td>
                      <td style={{ padding: '0.75rem 1rem', color: menu?.breakfast ? 'var(--text-main)' : 'var(--text-muted)' }}>{menu?.breakfast || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: menu?.lunch ? 'var(--text-main)' : 'var(--text-muted)' }}>{menu?.lunch || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: menu?.dinner ? 'var(--text-main)' : 'var(--text-muted)' }}>{menu?.dinner || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORTS MODULE */}
      {subView === 'reports' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Reports and Analytics</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {[{id:'fees',label:'Fee Collection'},{id:'attendance',label:'Attendance'},{id:'occupancy',label:'Room Occupancy'}].map(rt => (
              <button key={rt.id} className={`btn ${reportType === rt.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReportType(rt.id)}>{rt.label}</button>
            ))}
            <button className="btn btn-primary" onClick={handleGenerateReport} disabled={reportLoading}>
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
          {reportData && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {reportData.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {Object.entries(reportData.summary).map(([key, val]) => (
                    <div key={key} className="glass-panel" style={{ padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{typeof val === 'number' && (key.includes('Due') || key.includes('Collected') || key.includes('outstanding')) ? '₹' + Number(val).toLocaleString() : String(val)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                      {reportType === 'fees' && ['Student', 'Fee', 'Amount', 'Paid', 'Status', 'Due Date'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'attendance' && ['Student', 'Reg No', 'Date', 'Status', 'Session'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'occupancy' && ['Block', 'Room', 'Category', 'Capacity', 'Occupied', 'Available'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {reportType === 'fees' && reportData.fees?.slice(0, 50).map((f: any) => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{f.student?.fullName || '-'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{f.title}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>Rs.{f.amount.toLocaleString()}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>Rs.{f.paidAmount.toLocaleString()}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${f.status === 'PAID' ? 'badge-success' : f.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>{f.status}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(f.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {reportType === 'attendance' && reportData.records?.slice(0, 50).map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.user?.fullName || '-'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.user?.registerNumber || '-'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(r.date).toLocaleDateString()}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${r.isPresent ? 'badge-success' : 'badge-danger'}`}>{r.isPresent ? 'Present' : 'Absent'}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.session || 'Morning'}</td>
                      </tr>
                    ))}
                    {reportType === 'occupancy' && reportData.rooms?.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.block}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.roomNumber}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-info">{r.category}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.capacity}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.occupied}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span style={{ color: r.available === 0 ? 'var(--danger)' : 'var(--accent)' }}>{r.available}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GLOBAL SEARCH */}
      {subView === 'search' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Global Search</h2>
          <form onSubmit={handleGlobalSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input className="form-input" style={{ flex: 1, minWidth: '200px' }} type="text" placeholder="Search students, complaints, fees..." value={globalSearchQuery} onChange={e => setGlobalSearchQuery(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={globalSearchLoading}>{globalSearchLoading ? 'Searching...' : 'Search'}</button>
          </form>
          {globalSearchResults && (
            <div style={{ display: 'grid', gap: '2rem' }}>
              {globalSearchResults.students?.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Students ({globalSearchResults.students.length})</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {globalSearchResults.students.map((s: any) => (
                      <div key={s.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <div><span style={{ fontWeight: 700 }}>{s.fullName}</span> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.email} | #{s.registerNumber}</span></div>
                        <span className={`badge ${s.status === 'APPROVED' ? 'badge-success' : s.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {globalSearchResults.complaints?.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Complaints ({globalSearchResults.complaints.length})</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {globalSearchResults.complaints.map((c: any) => (
                      <div key={c.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700 }}>{c.title}</span>
                        <span className={`badge ${c.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {globalSearchResults.fees?.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Fee Records ({globalSearchResults.fees.length})</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {globalSearchResults.fees.map((f: any) => (
                      <div key={f.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <div><span style={{ fontWeight: 700 }}>{f.title}</span> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student: {f.student?.fullName} | Rs.{f.amount}</span></div>
                        <span className={`badge ${f.status === 'PAID' ? 'badge-success' : f.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>{f.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!globalSearchResults.students?.length && !globalSearchResults.complaints?.length && !globalSearchResults.fees?.length && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No results found for "{globalSearchResults.query}"</p></div>
              )}
            </div>
          )}
        </div>
      )}

"""

if old_footer in content:
    content = content.replace(old_footer, gate_pass_view + "      {/* Footer */}\n      <footer", 1)
    print("SUBVIEWS: OK")
else:
    print("SUBVIEWS: FAILED")

# --- STEP 5: Update loadDashboardData to call new loaders ---
old_load_end_str = "    } catch (err) {\n      console.error('Error loading dashboard sub-data', err);\n    }\n  };"
new_load_end_str = "      // Load new ERP modules\n      try { loadGatePasses(); } catch (e) {}\n      try { loadNotices(); } catch (e) {}\n      try { loadNotifications(); } catch (e) {}\n      try { loadLaundrySlots(); } catch (e) {}\n      try { loadMessMenus(); } catch (e) {}\n    } catch (err) {\n      console.error('Error loading dashboard sub-data', err);\n    }\n  };"

if old_load_end_str in content:
    content = content.replace(old_load_end_str, new_load_end_str, 1)
    print("DASHBOARD LOADERS: OK")
else:
    print("DASHBOARD LOADERS: FAILED")

# Write back
with open(r'apps\frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

new_lines = content.split('\n')
print(f"Done! App.tsx now has {len(new_lines)} lines (was {len(lines)} lines)")
