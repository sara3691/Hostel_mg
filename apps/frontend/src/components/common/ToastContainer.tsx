import React from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertTriangle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} style={{ animationDuration: '0.35s' }}>
          <span className="toast-icon">{icons[t.type]}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button className="toast-close" onClick={() => removeToast(t.id)}><X size={14} /></button>
          <div className="toast-progress" style={{ animationDuration: `${t.duration || 4000}ms` }} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
