// src/components/Sidebar.jsx
import { 
  Home, 
  Building2, 
  FileText, 
  ArrowLeftRight, 
  CalendarDays, 
  ClipboardCheck, 
  LogOut 
} from 'lucide-react';

export function Sidebar() {
  const menuItens = [
    { nome: 'Home', icone: Home, ativo: true },
    { nome: 'Imóveis', icone: Building2, ativo: false },
    { nome: 'Contratos', icone: FileText, ativo: false },
    { nome: 'Pagamentos', icone: ArrowLeftRight, ativo: false },
    { nome: 'Visitas', icone: CalendarDays, ativo: false },
    { nome: 'Vistorias', icone: ClipboardCheck, ativo: false },
  ];

  return (
    <aside style={{
      width: '220px',
      backgroundColor: '#1877f2',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '0px 12px 6px',
      minHeight: '100vh'
    }}>
      <div> 
        <h2 style={{ marginBottom: '30px', fontSize: '22px', fontWeight: 'bold'}}>Locus</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItens.map((item, index) => {
            const Icone = item.icone;
            return (
              <button
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: item.ativo ? '#52a3f7' : 'transparent',
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: item.ativo ? 'bold' : 'normal'
                }}
              >
                <Icone size={18} />
                {item.nome}
              </button>
            );
          })}
        </nav>
      </div>

      <button style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ffffff',
        color: '#1877f2',
        border: 'none',
        borderRadius: '6px',
        padding: '10px 16px',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}>
        <LogOut size={18} color="#FF0000"/>
        Sair
      </button>
    </aside>
  );
}