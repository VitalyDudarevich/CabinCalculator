import React from 'react';
import CalculationDetails from '../components/CalculationDetails';
import CalculatorForm from '../components/CalculatorForm';
import ProjectHistory from '../components/ProjectHistory';
// import { useContext } from 'react';
import type { User } from '../types/User';

const CalculatorPage: React.FC<{ companyId?: string; user?: User | null }> = ({ companyId, user }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 0, alignItems: 'flex-start', justifyContent: 'center', padding: 32, minHeight: 'calc(100vh - 56px)', background: '#f6f8fa' }}>
      <CalculationDetails />
      <CalculatorForm companyId={companyId} />
      <ProjectHistory user={user} />
    </div>
  );
};

export default CalculatorPage; 