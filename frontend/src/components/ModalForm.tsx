import React, { useState } from 'react';

export interface ModalFormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'email' | 'password';
  value: string | number;
  onChange: (value: string | number) => void;
  required?: boolean;
  options?: { value: string; label: string }[]; // для select
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}

interface ModalFormProps {
  isOpen: boolean;
  title: string;
  fields: ModalFormField[];
  onSubmit: () => void;
  onCancel: () => void;
  submitText?: string;
  companyNameError?: string;
}

const ModalForm: React.FC<ModalFormProps> = ({ isOpen, title, fields, onSubmit, onCancel, submitText = 'Сохранить', companyNameError }) => {
  const [showPasswords, setShowPasswords] = useState<{[fieldName: string]: boolean}>({});
  
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0005', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 2px 16px #0002', position: 'relative' }}>
        <h3 style={{ marginTop: 0, marginBottom: 24 }}>{title}</h3>
        <form
          autoComplete="off"
          onSubmit={e => {
            e.preventDefault();
            onSubmit();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {fields.map(field => (
            <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontWeight: 500 }}>{field.label}{field.required && <span style={{ color: 'crimson' }}> *</span>}</label>
              {field.type === 'select' ? (
                <select
                  name={field.name}
                  autoComplete="off"
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  required={field.required}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
                >
                  <option value="">Выберите...</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'password' ? (
                <div style={{ position: 'relative' }}>
                  <input
                    name={field.name}
                    autoComplete="off"
                    type={showPasswords[field.name] ? 'text' : 'password'}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    style={{ 
                      padding: 10, 
                      paddingRight: 45,
                      borderRadius: 8, 
                      border: '1px solid #ccc', 
                      fontSize: 16,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 24,
                      width: 32,
                      outline: 'none',
                    }}
                    tabIndex={-1}
                    aria-label={showPasswords[field.name] ? 'Скрыть пароль' : 'Показать пароль'}
                    onMouseDown={e => e.preventDefault()}
                  >
                    <img
                      src={showPasswords[field.name] ? '/eye.png' : '/eye-off.png'}
                      alt={showPasswords[field.name] ? 'Скрыть пароль' : 'Показать пароль'}
                      style={{ width: 20, height: 20, outline: 'none', boxShadow: 'none' }}
                      draggable={false}
                    />
                  </button>
                </div>
              ) : (
                <input
                  name={field.name}
                  autoComplete="off"
                  type={field.type}
                  value={field.value}
                  onChange={e => field.onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
                />
              )}
              {field.error && (
                <span style={{ color: 'crimson', fontSize: 13, marginTop: 2 }}>{field.error}</span>
              )}
              {field.name === 'name' && companyNameError && (
                <span style={{ color: 'crimson', fontSize: 13, marginTop: 2 }}>{companyNameError}</span>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, background: '#eee', border: 'none', fontWeight: 500, cursor: 'pointer' }}>Отмена</button>
            <button type="submit" style={{ padding: '8px 20px', borderRadius: 8, background: '#646cff', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' }}>{submitText}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalForm; 