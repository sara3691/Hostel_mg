import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  User,
  Users,
  Home,
  PlusCircle,
  CheckCircle,
  XCircle,
  LogOut,
  Moon,
  Sun,
  Key,
  Phone,
  FileText,
  AlertTriangle,
  Settings,
  Grid,
  Clipboard,
  Calendar,
  Compass,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Inbox
} from 'lucide-react';

// Setup base url
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000';
axios.defaults.withCredentials = true;

type UserRole = 'SUPER_ADMIN' | 'WARDEN' | 'STUDENT' | 'STAFF';

interface Hostel {
  id: string;
  name: string;
  code: string;
  collegeName: string;
  address: string;
  capacity: number;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hostel?: Hostel;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'register' | 'dashboard'>('home');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form states
  const [regRole, setRegRole] = useState<UserRole>('STUDENT');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regHostelId, setRegHostelId] = useState('');
  const [regCollege, setRegCollege] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regYear, setRegYear] = useState('1st Year');
  const [regNumber, setRegNumber] = useState('');
  const [regParentName, setRegParentName] = useState('');
  const [regParentMobile, setRegParentMobile] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Loaded data
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);

  // Modal / Inputs
  const [newHostelName, setNewHostelName] = useState('');
  const [newHostelCode, setNewHostelCode] = useState('');
  const [newHostelCollege, setNewHostelCollege] = useState('');
  const [newHostelAddress, setNewHostelAddress] = useState('');
  const [newHostelCapacity, setNewHostelCapacity] = useState('');

  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compCategory, setCompCategory] = useState('Electrical');
  const [compPriority, setCompPriority] = useState('MEDIUM');

  const [visName, setVisName] = useState('');
  const [visPurpose, setVisPurpose] = useState('');
  const [visDate, setVisDate] = useState('');

  useEffect(() => {
    // Check initial auth state
    checkAuth();
    // Load public hostels
    loadHostels();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      if (res.data?.success) {
        setCurrentUser(res.data.data);
        setView('dashboard');
        loadDashboardData(res.data.data);
      }
    } catch (err) {
      setCurrentUser(null);
      setView('home');
    } finally {
      setLoading(false);
    }
  };

  const loadHostels = async () => {
    try {
      const res = await axios.get('/api/hostels');
      if (res.data?.success) {
        setHostels(res.data.data);
        if (res.data.data.length > 0) {
          setRegHostelId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load hostels');
    }
  };

  const loadDashboardData = async (user: UserProfile) => {
    try {
      if (user.role === 'SUPER_ADMIN' || user.role === 'WARDEN') {
        const resPending = await axios.get('/api/admin/pending-approvals');
        if (resPending.data?.success) {
          setPendingUsers(resPending.data.data);
        }
      }
      const resComp = await axios.get('/api/complaints');
      if (resComp.data?.success) {
        setComplaints(resComp.data.data);
      }
      const resVis = await axios.get('/api/visitors');
      if (resVis.data?.success) {
        setVisitors(resVis.data.data);
      }
    } catch (err) {
      console.error('Error loading dashboard sub-data');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/auth/login', {
        email: loginEmail,
        password: loginPassword
      });
      if (res.data?.success) {
        setCurrentUser(res.data.data);
        setView('dashboard');
        loadDashboardData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/auth/register', {
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        mobileNumber: regMobile,
        role: regRole,
        hostelId: regHostelId,
        collegeName: regCollege,
        department: regDept,
        year: regYear,
        registerNumber: regNumber,
        parentName: regParentName,
        parentMobile: regParentMobile,
        address: regAddress
      });
      if (res.data?.success) {
        alert(res.data.message);
        setView('login');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setCurrentUser(null);
      setView('home');
    } catch (err) {
      console.error('Logout request failed');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await axios.post('/api/admin/approve-user', { userId });
      if (res.data?.success) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        alert('User registration approved successfully!');
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const res = await axios.post('/api/admin/reject-user', { userId });
      if (res.data?.success) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        alert('User registration rejected successfully!');
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/hostels', {
        name: newHostelName,
        code: newHostelCode,
        collegeName: newHostelCollege,
        address: newHostelAddress,
        capacity: Number(newHostelCapacity)
      });
      if (res.data?.success) {
        alert('Hostel created successfully!');
        loadHostels();
        setNewHostelName('');
        setNewHostelCode('');
        setNewHostelCollege('');
        setNewHostelAddress('');
        setNewHostelCapacity('');
      }
    } catch (err) {
      alert('Failed to create hostel');
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/complaints', {
        title: compTitle,
        description: compDesc,
        category: compCategory,
        priority: compPriority
      });
      if (res.data?.success) {
        alert('Complaint filed successfully!');
        setCompTitle('');
        setCompDesc('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Failed to file complaint. Make sure you belong to a hostel.');
    }
  };

  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/visitors', {
        name: visName,
        purpose: visPurpose,
        visitDate: visDate
      });
      if (res.data?.success) {
        alert('Visitor request registered successfully!');
        setVisName('');
        setVisPurpose('');
        setVisDate('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Failed to request visitor.');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Loading SmartHostel Portal...</h2>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header / Navbar */}
      <header style={{
        height: '64px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justify-content: 'between',
        padding: '0 2rem',
        background: 'var(--bg-card)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setView(currentUser ? 'dashboard' : 'home')}>
          <Shield size={24} color="#6366f1" />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>SmartHostel <span style={{ color: '#6366f1' }}>AI</span></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
          {view === 'home' && (
            <>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('login')}>Login</button>
              <button className="btn btn-primary" onClick={() => setView('register')}>Register</button>
            </>
          )}

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{currentUser.fullName}</span>
                <span style={{ fontSize: '0.75rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 700 }}>{currentUser.role.replace('_', ' ')}</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          )}

          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ flex: 1, padding: '2rem' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span>{error}</span>
          </div>
        )}

        {/* HOME VIEW */}
        {view === 'home' && (
          <div className="animate-slide-up" style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center' }}>
            <Sparkles size={48} color="#6366f1" style={{ marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', lineHeight: '1.1' }}>Centralized Digital Hostel Management</h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>An enterprise-grade platform supporting multiple hostels, real-time approvals, automated slot-booking, mess recommendations, and student profiles.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }} onClick={() => setView('register')}>Start Rebuild Setup <ArrowRight size={18} /></button>
              <button className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1rem' }} onClick={() => setView('login')}>Sign In to Admin</button>
            </div>
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '420px', margin: '3rem auto', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Enter credentials to access your hostel profile</p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Email / Username</label>
                <input className="form-input" type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@user" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Password</label>
                <input className="form-input" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem' }}>Sign In</button>
            </form>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '640px', margin: '2rem auto', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Register Account</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>All applications require administrator approval before logging in.</p>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Role Type</label>
                  <select className="form-input" value={regRole} onChange={e => setRegRole(e.target.value as UserRole)}>
                    <option value="STUDENT">Student</option>
                    <option value="WARDEN">Warden</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Full Name</label>
                  <input className="form-input" type="text" value={regFullName} onChange={e => setRegFullName(e.target.value)} placeholder="John Doe" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email Address</label>
                  <input className="form-input" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="john@example.com" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Password</label>
                  <input className="form-input" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimum 8 characters" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Mobile Number</label>
                  <input className="form-input" type="tel" value={regMobile} onChange={e => setRegMobile(e.target.value)} placeholder="10 Digit Number" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Select Hostel</label>
                  <select className="form-input" value={regHostelId} onChange={e => setRegHostelId(e.target.value)}>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {regRole === 'STUDENT' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>College Name</label>
                      <input className="form-input" type="text" value={regCollege} onChange={e => setRegCollege(e.target.value)} placeholder="College name" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Department</label>
                      <input className="form-input" type="text" value={regDept} onChange={e => setRegDept(e.target.value)} placeholder="CSE, ECE etc" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Year</label>
                      <select className="form-input" value={regYear} onChange={e => setRegYear(e.target.value)}>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Register Number</label>
                      <input className="form-input" type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Reg No" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Parent Name</label>
                      <input className="form-input" type="text" value={regParentName} onChange={e => setRegParentName(e.target.value)} placeholder="Parent's Name" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Parent Mobile</label>
                      <input className="form-input" type="tel" value={regParentMobile} onChange={e => setRegParentMobile(e.target.value)} placeholder="Parent's Mobile" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Residential Address</label>
                <textarea className="form-input" value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Full street address..." rows={2}></textarea>
              </div>

              <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem' }}>Submit Registration Application</button>
            </form>
          </div>
        )}

        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && currentUser && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Intro Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Approval Status</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>{currentUser.status}</h3>
                  </div>
                  <CheckCircle size={32} color="#10b981" />
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Assigned Hostel</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{currentUser.hostel?.name || 'Central Platform'}</h3>
                  </div>
                  <Home size={32} color="#6366f1" />
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Active Complaints</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{complaints.length}</h3>
                  </div>
                  <AlertTriangle size={32} color="#f59e0b" />
                </div>
              </div>
            </div>

            {/* SUPER ADMIN OR WARDEN: Pending approvals */}
            {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'WARDEN') && (
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <Users size={20} color="#6366f1" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Pending Registrations ({pendingUsers.length})</h2>
                </div>
                {pendingUsers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No registrations pending approval.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {pendingUsers.map(u => (
                      <div key={u.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'between',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px'
                      }}>
                        <div>
                          <h4 style={{ fontWeight: 600 }}>{u.fullName} ({u.email})</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {u.role} | Mobile: {u.mobileNumber}</p>
                          {u.collegeName && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>College: {u.collegeName} | Dept: {u.department}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleApprove(u.id)}>Approve</button>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', color: '#ef4444' }} onClick={() => handleReject(u.id)}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUPER ADMIN: Add Hostels */}
            {currentUser.role === 'SUPER_ADMIN' && (
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <PlusCircle size={20} color="#6366f1" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hostel Management</h2>
                </div>
                <form onSubmit={handleCreateHostel} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <input className="form-input" type="text" value={newHostelName} onChange={e => setNewHostelName(e.target.value)} placeholder="Hostel Name" required />
                  <input className="form-input" type="text" value={newHostelCode} onChange={e => setNewHostelCode(e.target.value)} placeholder="Hostel Code" required />
                  <input className="form-input" type="text" value={newHostelCollege} onChange={e => setNewHostelCollege(e.target.value)} placeholder="College Name" required />
                  <input className="form-input" type="text" value={newHostelAddress} onChange={e => setNewHostelAddress(e.target.value)} placeholder="Address" required />
                  <input className="form-input" type="number" value={newHostelCapacity} onChange={e => setNewHostelCapacity(e.target.value)} placeholder="Capacity" required />
                  <button className="btn btn-primary" type="submit">Add Hostel</button>
                </form>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Registered Hostels ({hostels.length})</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {hostels.map(h => (
                      <div key={h.id} style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <h4 style={{ fontWeight: 600 }}>{h.name}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {h.code} | Cap: {h.capacity}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>College: {h.collegeName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STUDENT: Raise Complaints & Visitors */}
            {currentUser.role === 'STUDENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Complaints */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>File Complaint</h2>
                  <form onSubmit={handleCreateComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input className="form-input" type="text" value={compTitle} onChange={e => setCompTitle(e.target.value)} placeholder="Complaint Title" required />
                    <textarea className="form-input" value={compDesc} onChange={e => setCompDesc(e.target.value)} placeholder="Explain the issue..." rows={3} required></textarea>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <select className="form-input" value={compCategory} onChange={e => setCompCategory(e.target.value)}>
                        <option value="Electrical">Electrical</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Internet">Internet</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Cleaning">Cleaning</option>
                      </select>
                      <select className="form-input" value={compPriority} onChange={e => setCompPriority(e.target.value)}>
                        <option value="LOW">Low Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High Priority</option>
                      </select>
                    </div>
                    <button className="btn btn-primary" type="submit">Submit Complaint</button>
                  </form>
                </div>

                {/* Visitors */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Request Visitor Pass</h2>
                  <form onSubmit={handleCreateVisitor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input className="form-input" type="text" value={visName} onChange={e => setVisName(e.target.value)} placeholder="Visitor Name" required />
                    <input className="form-input" type="text" value={visPurpose} onChange={e => setVisPurpose(e.target.value)} placeholder="Purpose of visit" required />
                    <input className="form-input" type="date" value={visDate} onChange={e => setVisDate(e.target.value)} required />
                    <button className="btn btn-primary" type="submit">Request Pass</button>
                  </form>
                </div>
              </div>
            )}

            {/* Complaints List */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Active Complaints ({complaints.length})</h2>
              {complaints.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active complaints registered.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {complaints.map(c => (
                    <div key={c.id} style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ fontWeight: 600 }}>{c.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.description}</p>
                        <span style={{
                          fontSize: '0.7rem',
                          background: c.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: c.priority === 'HIGH' ? '#ef4444' : '#818cf8',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          marginRight: '0.5rem'
                        }}>{c.priority}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {c.category} | Status: {c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visitors List */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Registered Visitor Passes ({visitors.length})</h2>
              {visitors.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No visitor passes found.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {visitors.map(v => (
                    <div key={v.id} style={{
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px'
                    }}>
                      <h4 style={{ fontWeight: 600 }}>Visitor: {v.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Purpose: {v.purpose} | Date: {new Date(v.visitDate).toLocaleDateString()}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approval Status: {v.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        height: '48px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-card)'
      }}>
        © 2026 SmartHostel AI · Secure Enterprise Edition
      </footer>
    </div>
  );
}
