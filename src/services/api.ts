import axios from 'axios';
import { LoginCredentials, AuthResponse, User } from '@/types/auth';
import {
    Materia,
    Curso,
    CursoCreate,
    Nota,
    Asistencia,
    Participacion,
    Prediccion,
    DashboardStats,
    Periodo,
    EstudianteDashboard,
    ComparativoRendimiento,
    EstadisticasMateria,
    ReporteTrimestral
} from '@/types/academic';

export type FilterParams = {
    estudiante?: number;
    materia?: number;
    curso?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    periodo?: number;
    trimestre?: string;
    anio_academico?: string;
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
    [key: string]: string | number | boolean | undefined;
};

// Interfaz para Notificacion basada en el modelo del backend
export interface Notificacion {
    id: number;
    usuario: number;
    titulo: string;
    mensaje: string;
    tipo: string; // 'INFO' | 'ALERTA' | 'PREDICCION' | 'RECORDATORIO' | 'SISTEMA'
    estado: string; // 'NO_LEIDA' | 'LEIDA' | 'ARCHIVADA'
    fecha_creacion: string;
    fecha_lectura?: string;
    url_accion?: string;
}

// Interfaz genérica para respuestas paginadas
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface ParticipacionFilters {
    estudiante?: number;
    materia?: number;
    curso?: number;
    fecha?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo?: string;
}

// Instancia de Axios
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30000, // Aumentado de 10000 a 30000 ms (30 segundos)
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor para añadir token JWT automáticamente
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    console.error('Error en la configuración de la solicitud:', error);
    return Promise.reject(error);
});

// Interceptor para manejar errores
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Manejar timeout específicamente
        if (error.code === 'ECONNABORTED') {
            console.error('Tiempo de espera agotado para la solicitud:', originalRequest.url);
            return Promise.reject({
                ...error,
                message: 'El servidor está tardando demasiado en responder. Por favor, inténtelo de nuevo más tarde.'
            });
        }

        // Si el error es 401 (Unauthorized) y no es una solicitud de refresh token
        if (error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/usuarios/login/refresh/')) {

            originalRequest._retry = true;

            try {
                // Intentar refrescar el token
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(
                        `${import.meta.env.VITE_API_URL}/usuarios/login/refresh/`,
                        { refresh: refreshToken },
                        { timeout: 15000 } // Timeout específico para refresh token
                    );

                    if (response.data.access) {
                        // Guardar el nuevo token
                        localStorage.setItem('accessToken', response.data.access);

                        // Actualizar el token en la solicitud original y reintentarla
                        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
                        return axios(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Error al refrescar el token:', refreshError);

                // Si hay un error al refrescar, redirigir al login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.dispatchEvent(new CustomEvent('auth:logout'));

                return Promise.reject({
                    ...error,
                    message: 'Su sesión ha expirado. Por favor, inicie sesión de nuevo.'
                });
            }
        }

        // Manejo específico de errores de red
        if (!error.response) {
            console.error('Error de red o servidor no disponible');
            return Promise.reject({
                ...error,
                message: 'No se puede conectar con el servidor. Verifique su conexión a internet.'
            });
        }

        // Propagar el error si no se puede manejar
        return Promise.reject(error);
    }
);


export const getMateriasByRole = async (user: any | null, selectedMateria: number | null, setSelectedMateria: (id: number) => void) => {
    const allMaterias = await axiosInstance.get('/materias/').then(res => res.data);

    // Si es profesor, filtrar materias por profesor
    if (user?.role === 'PROFESOR' && user?.id) {
        const materiasFiltradas = allMaterias.filter((materia: any) => materia.profesor === user.id);

        // Si hay materias filtradas y no hay materia seleccionada, seleccionar la primera automáticamente
        if (materiasFiltradas.length > 0 && !selectedMateria) {
            setSelectedMateria(materiasFiltradas[0].id);
        }

        return materiasFiltradas;
    } else {
        // Si es admin o cualquier otro rol, devolver todas las materias
        return allMaterias;
    }
};

// Métodos de la API
const api = {
    // Autenticación
    login: (credentials: LoginCredentials): Promise<AuthResponse> =>
        axiosInstance.post('/usuarios/login/', credentials).then(res => res.data),
    refreshToken: (refresh: string): Promise<AuthResponse> =>
        axiosInstance.post('/usuarios/login/refresh/', { refresh }).then(res => res.data),
    getProfile: (): Promise<User> =>
        axiosInstance.get('/usuarios/perfil/').then(res => res.data),

    // Usuarios
    fetchUsuarios: (filters?: { rol?: string; [key: string]: string | number | boolean | undefined }): Promise<User[]> => // Corregido any
        axiosInstance.get('/usuarios/lista/', { params: filters }).then(res => res.data),
    fetchEstudiantes: (filters?: { curso?: number; [key: string]: string | number | boolean | undefined }): Promise<User[]> => // Corregido any
        axiosInstance.get('/usuarios/estudiantes/', { params: filters }).then(res => res.data),
    createUsuario: (data: Omit<User, 'id'>): Promise<User> =>
        axiosInstance.post('/usuarios/registro/', data).then(res => res.data),
    updateUsuario: (data: Partial<User>): Promise<User> =>
        axiosInstance.put(`/usuarios/perfil/`, data).then(res => res.data),
    adminUpdateUsuario: (id: number, data: Partial<User>): Promise<{message: string, user: User}> =>
        axiosInstance.put(`/usuarios/actualizar/${id}/`, data)
            .then(res => res.data)
            .catch(error => {
                console.error(`Error al actualizar usuario ${id}:`, error);
                throw error;
            }),
    deleteUsuario: (id: number): Promise<void> =>
        axiosInstance.delete(`/usuarios/${id}/`).then(() => {}),

    // Materias
    fetchMaterias: (): Promise<Materia[]> =>
        axiosInstance.get('/materias/').then(res => res.data),
    getMateriaById: (id: number): Promise<Materia> =>
        axiosInstance.get(`/materias/${id}/`).then(res => res.data),
    createMateria: (data: Omit<Materia, 'id' | 'profesor_detail'>): Promise<Materia> =>
        axiosInstance.post('/materias/', data).then(res => res.data),
    updateMateria: (id: number, data: Partial<Materia>): Promise<Materia> =>
        axiosInstance.put(`/materias/${id}/`, data).then(res => res.data),
    deleteMateria: (id: number): Promise<void> =>
        axiosInstance.delete(`/materias/${id}/`).then(() => {}),

    // Cursos
    fetchCursos: (): Promise<Curso[]> =>
        axiosInstance.get('/cursos/').then(res => res.data),
    getCursoById: (id: number): Promise<Curso> =>
        axiosInstance.get(`/cursos/${id}/`).then(res => res.data),
    createCurso: (data: CursoCreate): Promise<Curso> =>
        axiosInstance.post('/cursos/', data).then(res => res.data),
    updateCurso: (id: number, data: Partial<CursoCreate>): Promise<Curso> =>
        axiosInstance.put(`/cursos/${id}/`, data).then(res => res.data),
    deleteCurso: (id: number): Promise<void> =>
        axiosInstance.delete(`/cursos/${id}/`).then(() => {}),

    // Periodos
    fetchPeriodos: (): Promise<Periodo[]> =>
        axiosInstance.get('/notas/periodos/').then(res => res.data),
    getPeriodoById: (id: number): Promise<Periodo> =>
        axiosInstance.get(`/notas/periodos/${id}/`).then(res => res.data),
    createPeriodo: (data: Omit<Periodo, 'id' | 'trimestre_display'>): Promise<Periodo> =>
        axiosInstance.post('/notas/periodos/', data).then(res => res.data),
    updatePeriodo: (id: number, data: Partial<Omit<Periodo, 'id' | 'trimestre_display'>>): Promise<Periodo> =>
        axiosInstance.put(`/notas/periodos/${id}/`, data).then(res => res.data),
    deletePeriodo: (id: number): Promise<void> =>
        axiosInstance.delete(`/notas/periodos/${id}/`).then(() => {}),

    // Notas (anteriormente llamado Calificaciones)
    fetchNotas: (filters?: FilterParams): Promise<PaginatedResponse<Nota> | Nota[]> =>
        axiosInstance.get('/notas/calificaciones/', { params: filters }).then(res => {
            // Procesar las notas para asegurar que los campos numéricos sean números
            const processNota = (nota: any): Nota => {
                return {
                    ...nota,
                    ser_puntaje: Number(nota.ser_puntaje || 0),
                    saber_puntaje: Number(nota.saber_puntaje || 0),
                    hacer_puntaje: Number(nota.hacer_puntaje || 0),
                    decidir_puntaje: Number(nota.decidir_puntaje || 0),
                    autoevaluacion_ser: Number(nota.autoevaluacion_ser || 0),
                    autoevaluacion_decidir: Number(nota.autoevaluacion_decidir || 0),
                    ser_total: nota.ser_total !== null ? Number(nota.ser_total) : null,
                    decidir_total: nota.decidir_total !== null ? Number(nota.decidir_total) : null,
                    nota_total: nota.nota_total !== null ? Number(nota.nota_total) : null
                };
            };

            // Comprobar si es una respuesta paginada o un array directo
            if (res.data && 'results' in res.data) {
                const paginatedResponse = res.data as PaginatedResponse<any>;
                return {
                    ...paginatedResponse,
                    results: paginatedResponse.results.map(processNota)
                };
            }
            return (res.data as any[]).map(processNota);
        }),
    getNotaById: (id: number): Promise<Nota> =>
        axiosInstance.get(`/notas/calificaciones/${id}/`).then(res => res.data),
    createNota: (data: Omit<Nota, 'id' | 'estudiante_detail' | 'materia_detail' | 'periodo_detail' | 'ser_total' | 'decidir_total' | 'nota_total' | 'aprobado' | 'fecha_registro' | 'ultima_modificacion'>): Promise<Nota> =>
        axiosInstance.post('/notas/calificaciones/', data).then(res => res.data),
    updateNota: (id: number, data: Partial<Nota>): Promise<Nota> =>
        axiosInstance.put(`/notas/calificaciones/${id}/`, data).then(res => res.data),
    deleteNota: (id: number): Promise<void> =>
        axiosInstance.delete(`/notas/calificaciones/${id}/`).then(() => {}),

    // Nuevos endpoints para estadísticas y reportes (usuarios administrativos)
    fetchEstadisticasMateria: (materia: number, periodo?: number): Promise<EstadisticasMateria> =>
        axiosInstance.get('/notas/calificaciones/estadisticas_materia/', {
            params: { materia, periodo }
        }).then(res => res.data),

    fetchReporteTrimestral: (curso: number, periodo: number): Promise<ReporteTrimestral> =>
        axiosInstance.get('/notas/calificaciones/reporte_trimestral/', {
            params: { curso, periodo }
        }).then(res => res.data),

    // Asistencias
    fetchAsistencias: (filters?: FilterParams): Promise<PaginatedResponse<Asistencia> | Asistencia[]> =>
        axiosInstance.get('/asistencias/', { params: filters }).then(res => {
            // Si la respuesta tiene una estructura paginada (con count, next, previous, results)
            if (res.data && 'results' in res.data) {
                return res.data as PaginatedResponse<Asistencia>;
            }
            // Si la respuesta es un array directo
            return res.data as Asistencia[];
        }),
    getAsistenciaById: (id: number): Promise<Asistencia> =>
        axiosInstance.get(`/asistencias/${id}/`).then(res => res.data),
    recordAsistencia: (data: Omit<Asistencia, 'id'>): Promise<Asistencia> =>
        axiosInstance.post('/asistencias/', data).then(res => res.data),
    bulkRecordAsistencias: (asistencias: Omit<Asistencia, 'id'>[]): Promise<any> =>
        axiosInstance.post('/asistencias/bulk_create/', { asistencias }).then(res => res.data),
    updateAsistencia: (id: number, data: Partial<Asistencia>): Promise<Asistencia> =>
        axiosInstance.put(`/asistencias/${id}/`, data).then(res => res.data),
    deleteAsistencia: (id: number): Promise<void> =>
        axiosInstance.delete(`/asistencias/${id}/`).then(() => {}),

    // Participaciones
    fetchParticipaciones: (
        filters?: ParticipacionFilters
    ): Promise<Participacion[]> =>
        axiosInstance
            .get('/participaciones/', { params: filters })
            .then(res => res.data.results as Participacion[]),
    getParticipacionById: (id: number): Promise<Participacion> =>
        axiosInstance.get(`/participaciones/${id}/`).then(res => res.data),
    recordParticipacion: (data: Omit<Participacion, 'id'>): Promise<Participacion> =>
        axiosInstance.post('/participaciones/', data).then(res => res.data),
    updateParticipacion: (id: number, data: Partial<Participacion>): Promise<Participacion> =>
        axiosInstance.put(`/participaciones/${id}/`, data).then(res => res.data),
    deleteParticipacion: (id: number): Promise<void> =>
        axiosInstance.delete(`/participaciones/${id}/`).then(() => {}),

    // Predicciones
    fetchPredicciones: (filters?: FilterParams): Promise<Prediccion[]> =>
        axiosInstance.get('/predicciones/', { params: filters }).then(res => res.data),
    getPrediccionById: (id: number): Promise<Prediccion> =>
        axiosInstance.get(`/predicciones/${id}/`).then(res => res.data),
    createPrediccion: (data: { estudiante: number, materia: number }): Promise<Prediccion> =>
        axiosInstance.post('/predicciones/generar_prediccion_ml/', data).then(res => res.data),
    fetchRecomendacionesPorPrediccion: (prediccionId: number): Promise<string[]> =>
        axiosInstance.get(`/predicciones/${prediccionId}/recomendaciones/`).then(res => res.data),

    // Dashboard
    fetchDashboardGeneral: (): Promise<DashboardStats> =>
        axiosInstance.get('/dashboard/general/').then(res => res.data),
    fetchDashboardEstadisticas: (): Promise<DashboardStats> =>
        axiosInstance.get('/dashboard/estadisticas/').then(res => res.data),
    fetchEstudianteDashboard: (estudianteId?: number): Promise<EstudianteDashboard> => {
        // Asegurarnos de que tenemos el token de autenticación
        const token = localStorage.getItem('accessToken');
        const url = estudianteId
            ? `/dashboard/estudiante/${estudianteId}/`
            : '/dashboard/estudiante/';

        return axiosInstance.get(url, {
            headers: token ? {
                'Authorization': `Bearer ${token}`
            } : undefined
        }).then(res => res.data)
        .catch(error => {
            console.error('Error al obtener dashboard de estudiante:', error);
            throw error;
        });
    },
    fetchComparativoRendimiento: (filters?: { estudiante?: number; materia?: number }): Promise<ComparativoRendimiento> =>
        axiosInstance.get('/dashboard/comparativo/', { params: filters }).then(res => res.data),

    // Notificaciones
    fetchNotificaciones: (): Promise<Notificacion[]> =>
        axiosInstance.get('/notificaciones/').then(res => res.data),
    getNotificacionById: (id: number): Promise<Notificacion> =>
        axiosInstance.get(`/notificaciones/${id}/`).then(res => res.data),
    createNotificacion: (data: Omit<Notificacion, 'id' | 'fecha_creacion' | 'fecha_lectura'>): Promise<Notificacion> =>
        axiosInstance.post('/notificaciones/', data).then(res => res.data),
    updateNotificacion: (id: number, data: Partial<Notificacion>): Promise<Notificacion> =>
        axiosInstance.put(`/notificaciones/${id}/`, data).then(res => res.data),
    marcarNotificacionComoLeida: (id: number): Promise<Notificacion> =>
        axiosInstance.post(`/notificaciones/${id}/marcar_como_leida/ `, {}).then(res => res.data),
    deleteNotificacion: (id: number): Promise<void> =>
        axiosInstance.delete(`/notificaciones/${id}/`).then(() => {}),
};

export default api; // Cambiado a exportación por defecto
