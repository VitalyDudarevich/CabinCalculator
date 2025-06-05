import React from 'react';

const CalculationDetails: React.FC = () => {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #0001', padding: 24, minWidth: 320, flex: 1 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Детали расчёта</h2>
      {/* Здесь будут детали расчёта */}
      <div style={{ color: '#888', fontSize: 16 }}>
        Заполните данные проекта, чтобы увидеть детали расчёта.
      </div>
    </div>
  );
};

export default CalculationDetails; 