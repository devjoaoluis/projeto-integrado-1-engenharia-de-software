import { User, Bell } from 'lucide-react';

export function Header() {
  return (
    <header style={{
      backgroundColor: '#1877f2',
      color: '#ffffff',
      height: '60px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px'
    }}>
      <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>Home</h1>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#ffffff', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center',
            padding: 0 
          }}
          aria-label="Perfil"
        >
          <User size={22} />
        </button>

        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#ffffff', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center',
            padding: 0 
          }}
          aria-label="Notificações"
        >
          <Bell size={22} />
        </button>
      </div>
    </header>
  );
}