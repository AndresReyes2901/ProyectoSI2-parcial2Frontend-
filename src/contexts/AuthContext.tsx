import React, {createContext, useContext, useReducer, useEffect} from 'react';
import {AuthState, User, LoginCredentials, AuthResponse} from '@/types/auth';
import api from '@/services/api';
import {toast} from '@/hooks/use-toast';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
    | { type: 'LOGIN_FAILURE'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'UPDATE_USER'; payload: User }
    | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } };

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN_START':
            return {...state, isLoading: true, error: null};
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            };
        case 'LOGIN_FAILURE':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            };
        case 'LOGOUT':
            return initialState;
        case 'UPDATE_USER':
            return {...state, user: action.payload};
        case 'RESTORE_SESSION':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
            };
        default:
            return state;
    }
}

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        // Restaurar sesión desde localStorage
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                dispatch({type: 'RESTORE_SESSION', payload: {user, token}});
            } catch (error) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            }
        }
    }, []);

    const login = async (credentials: LoginCredentials): Promise<boolean> => {
        dispatch({type: 'LOGIN_START'});

        try {
            const response = await api.login(credentials);

            // Verificar si la respuesta contiene los campos necesarios
            if (!response.access) {
                throw new Error('La respuesta del servidor no contiene el token de acceso');
            }

            if (!response.user) {
                throw new Error('La respuesta del servidor no contiene información del usuario');
            }
            const user: User = response.user;


            // Guardar en localStorage
            localStorage.setItem('accessToken', response.access);
            localStorage.setItem('refreshToken', response.refresh);
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {user, token: response.access},
            });

            toast({
                title: "Inicio de sesión exitoso",
                description: `Bienvenido/a ${user.first_name}`,
            });

            return true;
        } catch (error) {
            let errorMessage = 'Error al iniciar sesión';

            if (error.code === 'ECONNABORTED') {
                errorMessage = 'El servidor está tardando demasiado en responder. Por favor, inténtelo de nuevo más tarde.';
            } else if (error.response) {
                // Error con respuesta del servidor
                if (error.response.status === 401) {
                    errorMessage = 'Credenciales incorrectas. Verifique su usuario y contraseña.';
                } else if (error.response.data?.detail) {
                    errorMessage = error.response.data.detail;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.status >= 500) {
                    errorMessage = 'Error en el servidor. Por favor, inténtelo más tarde.';
                }
            } else if (error.request) {
                // La solicitud fue realizada pero no se recibió respuesta
                errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
            } else if (error.message) {
                // Error en la configuración de la solicitud
                errorMessage = error.message;
            }

            dispatch({type: 'LOGIN_FAILURE', payload: errorMessage});

            toast({
                title: "Error de autenticación",
                description: errorMessage,
                variant: "destructive",
            });

            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        dispatch({type: 'LOGOUT'});

        toast({
            title: "Sesión cerrada",
            description: "Has cerrado sesión correctamente",
        });
    };

    const updateUser = (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        dispatch({type: 'UPDATE_USER', payload: user});
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
