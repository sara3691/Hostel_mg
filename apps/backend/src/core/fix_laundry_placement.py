import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

with open(r'apps\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's clean up any duplicated or misplaced laundry blocks first
target = "            )}\n          </main>"

subviews_to_insert = """
            {/* LAUNDRY ERP MODULE */}
            {subView === 'laundry' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🧺 Laundry Management</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>Book pickup slots and track laundry delivery status</p>
                  </div>
                  <button className="btn btn-primary" onClick={loadLaundrySlots}>↻ Refresh</button>
                </div>

                {currentUser.role === 'STUDENT' && (
                  <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(16,185,129,0.04)' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>📅 Book a Laundry Slot</h4>
                    <form onSubmit={handleBookLaundry}>
                      <div className="responsive-grid" style={{ marginBottom: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Pickup Date</label>
                          <input className="form-input" type="date" value={laundryDate} onChange={e => setLaundryDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Time Slot</label>
                          <select className="form-input" value={laundryTimeSlot} onChange={e => setLaundryTimeSlot(e.target.value)}>
                            <option>8:00 AM - 10:00 AM</option>
                            <option>10:00 AM - 12:00 PM</option>
                            <option>12:00 PM - 2:00 PM</option>
                            <option>2:00 PM - 4:00 PM</option>
                            <option>4:00 PM - 6:00 PM</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>No. of Clothes</label>
                          <input className="form-input" type="number" min="1" max="50" value={laundryClothes} onChange={e => setLaundryClothes(Number(e.target.value))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Notes (optional)</label>
                          <input className="form-input" type="text" placeholder="e.g. Delicate items, handle with care" value={laundryNotes} onChange={e => setLaundryNotes(e.target.value)} />
                        </div>
                      </div>
                      <button className="btn btn-primary" type="submit">Book Laundry Slot</button>
                    </form>
                  </div>
                )}

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {laundrySlots.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧺</div>
                      <p>No laundry bookings found.</p>
                    </div>
                  ) : laundrySlots.map(slot => (
                    <div key={slot.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{slot.user?.fullName || 'Student'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Room: {slot.user?.room?.roomNumber || 'N/A'}</span></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          📅 {new Date(slot.date).toLocaleDateString()} · ⏰ {slot.timeSlot} · 👕 {slot.clothesCount} items
                        </div>
                        {slot.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notes: {slot.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge ${slot.status === 'DELIVERED' ? 'badge-success' : slot.status === 'PICKED_UP' ? 'badge-info' : slot.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>{slot.status}</span>
                        {['LAUNDRY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && slot.status === 'BOOKED' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLaundry(slot.id, 'PICKED_UP')}>Picked Up</button>
                        )}
                        {['LAUNDRY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && slot.status === 'PICKED_UP' && (
                          <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLaundry(slot.id, 'DELIVERED')}>✓ Delivered</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
"""

if target in content:
    content = content.replace(target, subviews_to_insert + target, 1)
    print("Laundry subview successfully placed inside main container!")
else:
    print("Could not find target </main> position")

with open(r'apps\frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
