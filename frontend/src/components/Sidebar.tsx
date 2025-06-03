import React from 'react';

interface SidebarProps {
  sections: { key: string; label: string }[];
  section: string;
  setSection: (key: string) => void;
  user: { role: string };
  companies: { _id: string; name: string }[];
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sections, section, setSection, user, companies, selectedCompanyId, setSelectedCompanyId }) => {
  return (
    <nav style={{ minWidth: 180, borderRight: '1px solid #eee', padding: '16px 0' }}>
      {/* Блок Компания + селектор */}
      <div style={{ marginBottom: 24 }}>
        <div
          onClick={() => setSection('company')}
          style={{ padding: '12px 24px 4px 24px', cursor: 'pointer', background: section === 'company' ? '#f6f8ff' : 'none', fontWeight: section === 'company' ? 600 : 400, color: section === 'company' ? '#646cff' : '#333', borderRadius: 8 }}
        >
          Компания
        </div>
        {user.role === 'superadmin' && (
          <select
            value={selectedCompanyId || ''}
            onChange={e => setSelectedCompanyId(e.target.value)}
            style={{ width: 'calc(100% - 32px)', margin: '4px 16px 0 16px', padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', fontWeight: 500, background: '#fff', fontSize: 15 }}
          >
            <option value="">Все компании</option>
            {companies.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>
      {/* Остальные пункты меню */}
      {sections.filter(s => s.key !== 'company').map((s) => (
        <div
          key={s.key}
          onClick={() => setSection(s.key)}
          style={{ padding: '12px 24px', cursor: 'pointer', background: section === s.key ? '#f6f8ff' : 'none', fontWeight: section === s.key ? 600 : 400, color: section === s.key ? '#646cff' : '#333', borderRadius: 8, marginTop: 0 }}
        >
          {s.label}
        </div>
      ))}
    </nav>
  );
};

export default Sidebar; 