import { fetchWithAuth } from './auth';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

export interface Status {
  _id: string;
  name: string;
  color: string;
  order: number;
  companyId: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StatusStats extends Status {
  projectCount: number;
}

// Получить все статусы компании
export const getStatuses = async (companyId: string): Promise<Status[]> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/statuses?companyId=${companyId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch statuses: ${response.statusText}`);
  }

  return await response.json();
};

// Получить статистику статусов
export const getStatusStats = async (companyId: string): Promise<StatusStats[]> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/statuses/stats?companyId=${companyId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status stats: ${response.statusText}`);
  }

  return await response.json();
};

// Получить статус по ID
export const getStatusById = async (statusId: string): Promise<Status> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/statuses/${statusId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }

  return await response.json();
};

// Создать новый статус
export const createStatus = async (statusData: {
  name: string;
  color: string;
  companyId: string;
  order?: number;
}): Promise<Status> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/statuses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create status: ${response.statusText}`);
  }

  return await response.json();
};

// Обновить статус
export const updateStatus = async (
  statusId: string,
  statusData: {
    name?: string;
    color?: string;
    order?: number;
    isActive?: boolean;
  },
): Promise<Status> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/statuses/${statusId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusData),
  });

  if (!response.ok) {
    throw new Error(`Failed to update status: ${response.statusText}`);
  }

  return await response.json();
};

// Изменить порядок статусов
export const reorderStatuses = async (
  statusOrder: { id: string; order: number }[],
): Promise<void> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/statuses/reorder`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ statusOrder }),
  });

  if (!response.ok) {
    throw new Error(`Failed to reorder statuses: ${response.statusText}`);
  }
};

// Удалить статус
export const deleteStatus = async (
  statusId: string,
): Promise<{ message: string; projectsMoved: number }> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/statuses/${statusId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete status: ${response.statusText}`);
  }

  return await response.json();
};

// Обновить статус проекта (для drag & drop)
export const updateProjectStatus = async (
  projectId: string,
  statusId: string,
): Promise<{ _id: string; statusId: Status; status: string; updatedAt: string }> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ statusId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update project status: ${response.statusText}`);
  }

  return await response.json();
};
