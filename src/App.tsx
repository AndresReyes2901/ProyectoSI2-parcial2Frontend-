import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Layout from "@/components/layout/Layout";

// Páginas
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Asistencias from "./pages/Asistencias";
import Cursos from "./pages/Cursos";
import Estudiantes from "./pages/Estudiantes";
import Materias from "./pages/Materias";
import Notas from "./pages/Notas";
import Participaciones from "./pages/Participaciones";
import PrediccionRendimiento from "./pages/PrediccionRendimiento";
import Perfil from "./pages/Perfil";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Ruta de login */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Rutas protegidas */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Rutas para profesores y administrativos */}
              <Route path="notas" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <Notas />
                </ProtectedRoute>
              } />
              
              <Route path="asistencias" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <Asistencias />
                </ProtectedRoute>
              } />
              
              <Route path="participaciones" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <Participaciones />
                </ProtectedRoute>
              } />
              
              <Route path="prediccion-rendimiento" element={
                <ProtectedRoute allowedRoles={['PROFESOR', 'ADMINISTRATIVO']}>
                  <PrediccionRendimiento />
                </ProtectedRoute>
              } />
              
              {/* Rutas solo para administrativos */}
              <Route path="estudiantes" element={
                <ProtectedRoute allowedRoles={['ADMINISTRATIVO']}>
                  <Estudiantes />
                </ProtectedRoute>
              } />
              
              <Route path="materias" element={
                <ProtectedRoute allowedRoles={['ADMINISTRATIVO', 'PROFESOR']}>
                  <Materias />
                </ProtectedRoute>
              } />
              
              <Route path="cursos" element={
                <ProtectedRoute allowedRoles={['ADMINISTRATIVO']}>
                  <Cursos />
                </ProtectedRoute>
              } />
              
              {/* Ruta para el perfil de usuario */}
              <Route path="profile" element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              } />

              {/* Ruta para página no encontrada */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
