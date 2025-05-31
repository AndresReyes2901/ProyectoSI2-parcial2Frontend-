import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  User, 
  Calendar, 
  LayoutDashboard,
  ClipboardCheck,
  NotebookText,
  CalendarCheck2,
  LogOut,
  BrainCircuit,
  UsersRound,
  LibraryBig,
  BarChart,
  BookOpenCheck,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const estudianteNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 	LayoutDashboard },
  ];

  const profesorNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 	LayoutDashboard },
    { path: '/notas', label: 'Registro de Notas', icon: NotebookText },
    { path: '/asistencias', label: 'Asistencias', icon: CalendarCheck2 },
    { path: '/participaciones', label: 'Participaciones', icon: ClipboardCheck },
    { path: '/prediccion-rendimiento', label: 'Predicciones IA', icon: Brain },
  ];

  const administrativoNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 	LayoutDashboard },
    { path: '/estudiantes', label: 'Estudiantes', icon: UsersRound },
    { path: '/materias', label: 'Materias', icon: LibraryBig },
    { path: '/cursos', label: 'Cursos', icon: Calendar },
    { path: '/asistencias', label: 'Asistencias', icon: CalendarCheck2 },
    { path: '/participaciones', label: 'Participaciones', icon: ClipboardCheck },
    { path: '/notas', label: 'Registro de Notas', icon: NotebookText },
    { path: '/prediccion-rendimiento', label: 'Predicciones IA', icon: Brain },
  ];

  // Seleccionar el menú adecuado según el rol del usuario
  let navItems = [];
  if (user?.role === 'ADMINISTRATIVO') {
    navItems = administrativoNavItems;
  } else if (user?.role === 'PROFESOR') {
    navItems = profesorNavItems;
  } else if (user?.role === 'ESTUDIANTE') {
    navItems = estudianteNavItems;
  }

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-full",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-academic rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <div>
                <h1 className="text-sidebar-foreground font-bold text-lg">Aula Inteligente</h1>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <	LayoutDashboard className="h-4 w-4" />
          </Button>
        </div>
      </div>

{/* User Info */}
{!isCollapsed && user && (
  <div className="p-4 border-b border-sidebar-border">
    <div className="flex flex-col items-center space-y-2 text-center">
      <div className="w-12 h-12 bg-sidebar-accent rounded-full flex items-center justify-center">
        <User className="h-6 w-6 text-sidebar-foreground" />
      </div>
      <div className="flex flex-col items-center">
        <p className="text-sidebar-foreground font-medium text-sm truncate">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-sidebar-foreground/70 text-xs truncate">
          {user.role}
        </p>
      </div>
    </div>
  </div>
)}


      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
                isCollapsed && "justify-center"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      
    </div>
  );
};

export default Sidebar;
