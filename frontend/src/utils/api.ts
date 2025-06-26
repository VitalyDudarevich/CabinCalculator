export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

// Интерфейсы
export interface ProjectApiResponse {
  _id: string;
  name: string;
  customer?: string;
  status?: string;
  statusId?: {
    _id: string;
    name: string;
    color: string;
    order: number;
  };
  price?: number;
  priceHistory?: { price: number; date: string }[];
  statusHistory?: { status: string; statusId?: string; date: string }[];
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
  companyId?: string;
  userId?: string;
}

// Получить все проекты
export const getProjects = async (params?: {
  companyId?: string;
  userId?: string;
  statusId?: string;
}): Promise<ProjectApiResponse[]> => {
  const token = localStorage.getItem('token');

  const queryParams = new URLSearchParams();
  if (params?.companyId) queryParams.append('companyId', params.companyId);
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.statusId) queryParams.append('statusId', params.statusId);

  const url = `${API_URL}/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }

  return await response.json();
};

// Получить проект по ID
export const getProjectById = async (projectId: string): Promise<ProjectApiResponse> => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.statusText}`);
  }

  return await response.json();
};

// Быстрое обновление статуса проекта (для drag & drop)
export const updateProjectStatus = async (
  projectId: string,
  statusId: string,
): Promise<ProjectApiResponse> => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/projects/${projectId}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ statusId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update project status: ${response.statusText}`);
  }

  return await response.json();
};

// Создать проект
export const createProject = async (projectData: {
  name?: string;
  customer?: string;
  statusId?: string;
  companyId: string;
  data: Record<string, unknown>;
  price?: number;
}): Promise<ProjectApiResponse> => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }

  return await response.json();
};

// Обновить проект
export const updateProject = async (
  projectId: string,
  projectData: {
    name?: string;
    customer?: string;
    statusId?: string;
    price?: number;
    data?: Record<string, unknown>;
  },
): Promise<ProjectApiResponse> => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    throw new Error(`Failed to update project: ${response.statusText}`);
  }

  return await response.json();
};

// Удалить проект
export const deleteProject = async (projectId: string): Promise<{ message: string }> => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`);
  }

  return await response.json();
};
