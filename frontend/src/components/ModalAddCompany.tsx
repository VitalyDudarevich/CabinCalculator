import React, { useState } from 'react';

interface ModalAddCompanyProps {
  isOpen: boolean;
  existingNames: string[];
  onSubmit: (values: { name: string; ownerName: string; ownerContact: string }) => void;
  onCancel: () => void;
}

const ModalAddCompany: React.FC<ModalAddCompanyProps> = ({ isOpen, existingNames, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Название компании обязательно');
      return;
    }
    if (existingNames.some(n => n.trim().toLowerCase() === name.trim().toLowerCase())) {
      setError('Компания с таким именем уже существует');
      return;
    }
    setError('');
    onSubmit({ name: name.trim(), ownerName: ownerName.trim(), ownerContact: ownerContact.trim() });
    setName('');
    setOwnerName('');
    setOwnerContact('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 2px 16px #0002', display: 'flex', flexDirection: 'column', gap: 18
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Добавить компанию</div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Название компании
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Имя владельца
          <input
            type="text"
            value={ownerName}
            onChange={e => setOwnerName(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Контакт владельца
          <input
            type="text"
            value={ownerContact}
            onChange={e => setOwnerContact(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
          />
        </label>
        {error && <div style={{ color: 'crimson', fontSize: 14 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Добавить
          </button>
          <button type="button" onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, background: '#eee', color: '#333', border: 'none', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default ModalAddCompany; 