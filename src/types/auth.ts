export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'PROFESOR' | 'ESTUDIANTE' | 'ADMINISTRATIVO';
  is_active: boolean;
  profile?: UserProfile;
  curso?: number | null;
  curso_detail?: {
    id: number;
    nombre: string;
    nivel: string;
    materias: number[];
  } | null;
}

export interface UserProfile {
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  foto?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
