import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getMateriasByRole } from '@/services/api';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Materia, Participacion, Curso } from '@/types/academic';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Plus, Pencil, Loader2, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface ParticipacionFormData {
  estudiante: number;
  materia: number;
  fecha: string;
  tipo: string;
  valor: number;
  descripcion: string;
}

const tiposParticipacion = [
  { value: 'VOLUNTARIA', label: 'Pregunta voluntaria' },
  { value: 'SOLICITADA',  label: 'Participación solicitada' },
  { value: 'EJERCICIO',   label: 'Resolución de ejercicio' },
  { value: 'PRESENTACION',label: 'Presentación' },
  { value: 'DEBATE',      label: 'Debate' },
];

interface ParticipacionFilters {
  estudiante?: number;
  materia?: number;
  curso?: number;
  fecha?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo?: string;
}

const Participaciones: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEstudiante, setSelectedEstudiante] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentParticipacion, setCurrentParticipacion] = useState<Participacion | null>(null);
  const [formData, setFormData] = useState<ParticipacionFormData>({
    estudiante: 0,
    materia: 0,
    fecha: format(new Date(), 'yyyy-MM-dd'),
    tipo: 'VOLUNTARIA',
    valor: 5,
    descripcion: '',
  });

  // Verificar si el usuario es administrador o profesor
  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';

  // Manejador para abrir diálogo de nueva participación
  const handleOpenCreateDialog = () => {
    setCurrentParticipacion(null);
    setFormData({
      estudiante: 0,
      materia: selectedMateria || 0,
      fecha: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      tipo: 'VOLUNTARIA',
      valor: 5,
      descripcion: '',
    });
    setIsDialogOpen(true);
  };

  // Manejador para abrir diálogo de edición de participación
  const handleOpenEditDialog = (participacion: Participacion) => {
    setCurrentParticipacion(participacion);
    setFormData({
      estudiante: participacion.estudiante,
      materia: participacion.materia,
      fecha: participacion.fecha,
      tipo: participacion.tipo,
      valor: participacion.valor,
      descripcion: participacion.descripcion || '',
    });
    setIsDialogOpen(true);
  };

  // Manejador para cerrar diálogo
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentParticipacion(null);
  };

  // Manejador para cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'valor' ? parseInt(value) :
              (name === 'estudiante' || name === 'materia') ? parseInt(value) : value
    }));
  };

  // Manejador para enviar el formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estudiante || !formData.materia) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar un estudiante y una materia",
      });
      return;
    }

    if (currentParticipacion) {
      // Actualizar participación existente
      updateParticipacionMutation.mutate({
        id: currentParticipacion.id,
        data: formData
      });
    } else {
      // Crear nueva participación
      createParticipacionMutation.mutate(formData);
    }
  };

  // Manejador para eliminar participación
  const handleDeleteParticipacion = (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta participación?")) {
      deleteParticipacionMutation.mutate(id);
    }
  };

  // Consulta para obtener materias del profesor si es profesor
  // o todas las materias si es administrador
  const {
    data: materias = [],
    isLoading: isLoadingMaterias
  } = useQuery<Materia[]>({
    queryKey: ['materias-profesor'],
    queryFn: () => getMateriasByRole(user, selectedMateria, setSelectedMateria)
  });

  // Nueva consulta para obtener cursos
  const {
    data: cursos = [],
    isLoading: isLoadingCursos
  } = useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: api.fetchCursos,
  });

  // Calcular cursos disponibles basados en la materia seleccionada
  const cursosDisponibles = useMemo(() => {
    if (!selectedMateria || !cursos.length) return [];
    return cursos.filter((curso) => curso.materias?.includes(selectedMateria));
  }, [selectedMateria, cursos]);

  // Consulta para obtener estudiantes filtrados por curso
  const {
    data: estudiantes = [],
    isLoading: isLoadingEstudiantes
  } = useQuery<User[]>({
    queryKey: ['estudiantes', selectedCurso],
    queryFn: async () => {
      if (!selectedCurso) return [];
      return api.fetchEstudiantes({ curso: selectedCurso });
    },
    enabled: !!selectedCurso,
  });

  // Consulta para obtener participaciones según filtros
  const {
    data: participaciones = [],
    isLoading: isLoadingParticipaciones,
    refetch: refetchParticipaciones
  } = useQuery({
    queryKey: ['participaciones', selectedMateria, selectedCurso, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      const filters: { materia?: number; curso?: number; fecha?: string } = {};

      if (selectedMateria) {
        filters.materia = selectedMateria;
      }

      if (selectedCurso) {
        filters.curso = selectedCurso;
      }

      if (selectedDate) {
        filters.fecha = selectedDate.toISOString().slice(0, 10);
      }

      if (Object.keys(filters).length === 0) {
        return [];
      }

      return api.fetchParticipaciones(filters);
    },
    enabled: !!(selectedMateria || selectedCurso || selectedDate)
  });

  // Mutación para crear una nueva participación
  const createParticipacionMutation = useMutation({
    mutationFn: (data: ParticipacionFormData) => api.recordParticipacion(data as Participacion),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['participaciones', selectedMateria, selectedCurso, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
        refetchType: 'active',
        exact: false
      });
      refetchParticipaciones();
      toast({
        title: "Participación registrada",
        description: "La participación ha sido registrada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error al registrar participación:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la participación. Por favor, intente nuevamente.",
      });
    }
  });

  // Mutación para actualizar una participación
  const updateParticipacionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ParticipacionFormData }) => {
      return api.updateParticipacion(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['participaciones', selectedMateria, selectedCurso, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
        refetchType: 'active',
        exact: false
      });
      refetchParticipaciones();
      toast({
        title: "Participación actualizada",
        description: "La participación ha sido actualizada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error al actualizar participación:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la participación. Por favor, intente nuevamente.",
      });
    }
  });

  // Mutación para eliminar una participación
  const deleteParticipacionMutation = useMutation({
    mutationFn: (id: number) => api.deleteParticipacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['participaciones', selectedMateria, selectedCurso, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
        refetchType: 'active',
        exact: false
      });
      refetchParticipaciones();
      toast({
        title: "Participación eliminada",
        description: "La participación ha sido eliminada exitosamente",
      });
    },
    onError: (error) => {
      console.error("Error al eliminar participación:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la participación. Por favor, intente nuevamente.",
      });
    }
  });

  // Efecto para actualizar formData cuando cambia la selección de materia o fecha
  useEffect(() => {
    const newMateria = selectedMateria || formData.materia;
    const newFecha = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : formData.fecha;

    if (newMateria !== formData.materia || newFecha !== formData.fecha) {
      setFormData(prev => ({
        ...prev,
        materia: newMateria,
        fecha: newFecha,
        estudiante: 0,
      }));
    }
  }, [selectedMateria, selectedDate]);

  // Efecto para manejar cambios en la selección de materia
  useEffect(() => {
    setSelectedCurso(null);
    setSelectedEstudiante(null);
    setFormData(prev => ({ ...prev, estudiante: 0 }));
  }, [selectedMateria]);

  // Efecto para auto-seleccionar el primer curso disponible
  useEffect(() => {
    if (cursosDisponibles.length > 0) {
      if (!selectedCurso || !cursosDisponibles.find(c => c.id === selectedCurso)) {
        setSelectedCurso(cursosDisponibles[0].id);
      }
    } else {
      setSelectedCurso(null);
    }
  }, [cursosDisponibles]);

  // Control de acceso - hacemos esto después de los hooks
  if (!isAdmin && !isProfesor) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  // Obtener el nombre del estudiante
  const getEstudianteNombre = (id: number) => {
    const estudiante = estudiantes.find((e: User) => e.id === id);
    if (estudiante) {
      return `${estudiante.first_name} ${estudiante.last_name}`;
    }
    return "Estudiante no encontrado";
  };

  // Obtener el nombre de la materia
  const getMateriaNombre = (id: number) => {
    const materia = materias.find((m: Materia) => m.id === id);
    return materia ? materia.nombre : "Materia no encontrada";
  };

  // Obtener el label del tipo de participación
  const getTipoParticipacionLabel = (valor: string) => {
    const tipo = tiposParticipacion.find(t => t.value === valor);
    return tipo ? tipo.label : valor;
  };

  // Verificar si está cargando
  const isLoading = isLoadingMaterias || isLoadingEstudiantes || isLoadingCursos ||
                    ((!!selectedMateria || !!selectedDate) && isLoadingParticipaciones);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando información...</p>
      </div>
    );
  }

  const isPending = createParticipacionMutation.isPending || updateParticipacionMutation.isPending;

  return (
   
  <div className="p-6 space-y-6">
    {/* Encabezado */}
   <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
  <header className="mb-4">
    <h2 className="text-xl font-bold text-blue-800">Configura tu vista</h2>
    <p className="text-sm text-blue-700">
      Escoge los criterios para visualizar y registrar las participaciones de los estudiantes.
    </p>
  </header>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {/* Select de Materia */}
    <div className="space-y-1">
      <Label htmlFor="materia" className="text-sm font-medium text-gray-700">Materia</Label>
      <Select
        onValueChange={(value) => setSelectedMateria(parseInt(value))}
        value={selectedMateria?.toString() || ""}
      >
        <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm">
          <SelectValue placeholder="Seleccionar Materia" />
        </SelectTrigger>
        <SelectContent>
          {materias.map((materia: Materia) => (
            <SelectItem key={materia.id} value={materia.id.toString()}>
              {materia.nombre} ({materia.codigo})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Select de Curso */}
    <div className="space-y-1">
      <Label htmlFor="curso" className="text-sm font-medium text-gray-700">Curso</Label>
      <Select
        onValueChange={(value) => setSelectedCurso(parseInt(value))}
        value={selectedCurso?.toString() || ""}
        disabled={!selectedMateria || cursosDisponibles.length === 0}
      >
        <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm disabled:opacity-70">
          <SelectValue placeholder={
            !selectedMateria
              ? "Seleccione materia primero"
              : (cursosDisponibles.length === 0
                ? "No hay cursos para esta materia"
                : "Seleccionar Curso")
          } />
        </SelectTrigger>
        <SelectContent>
          {cursosDisponibles.map((curso: Curso) => (
            <SelectItem key={curso.id} value={curso.id.toString()}>
              {curso.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Fecha */}
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700">Fecha</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            {selectedDate ? (
              format(selectedDate, "PPP", { locale: es })
            ) : (
              <span>Seleccionar fecha</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={setSelectedDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    {/* Botón Registrar */}
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700">Acciones</Label>
      <Button
        className="w-full"
        onClick={handleOpenCreateDialog}
        disabled={!selectedMateria || !selectedCurso || estudiantes.length === 0}
      >
        <Plus className="mr-2 h-4 w-4" />
        Registrar Participación
      </Button>
      {estudiantes.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No hay estudiantes registrados en este curso
        </p>
      )}
    </div>
  </div>
</section>


      {participaciones.length > 0 ? (
  <Card>
    <CardHeader>
      <CardTitle>
        Participaciones Registradas
        {selectedMateria && ` - ${getMateriaNombre(selectedMateria)}`}
        {selectedDate && ` - ${format(selectedDate, 'PPP', { locale: es })}`}
      </CardTitle>
      <CardDescription>
        Lista de participaciones según los filtros seleccionados
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="rounded-md border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-black">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Estudiante
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Materia
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                Puntaje
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participaciones.map((participacion: Participacion, index: number) => (
              <tr
                key={participacion.id}
                className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {format(new Date(participacion.fecha), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getEstudianteNombre(participacion.estudiante)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {getMateriaNombre(participacion.materia)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge variant="outline" className="text-sm">
                    {getTipoParticipacionLabel(participacion.tipo)}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <Badge className="text-sm">{participacion.valor}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleOpenEditDialog(participacion)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteParticipacion(participacion.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-sm text-gray-600">
          Total de participaciones: {participaciones.length}
        </div>
      </div>
    </CardContent>
  </Card>
) : (
  <div className="text-center py-8 text-gray-500">
    <MessageCircle className="mx-auto h-12 w-12 opacity-30 mb-2" />
    {selectedMateria || selectedDate ? (
      <p>No hay participaciones registradas para los filtros seleccionados</p>
    ) : (
      <p>Selecciona una materia y/o fecha para ver participaciones</p>
    )}
  </div>
)}


      {/* Diálogo para crear/editar participación */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {currentParticipacion ? "Editar Participación" : "Nueva Participación"}
            </DialogTitle>
            <DialogDescription>
              {currentParticipacion
                ? "Actualiza la información de la participación"
                : "Registra una nueva participación en clase"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="estudiante">Estudiante</Label>
                <Select
                  name="estudiante"
                  onValueChange={(value) => handleInputChange({
                    target: { name: 'estudiante', value }
                  } as React.ChangeEvent<HTMLSelectElement>)}
                  value={formData.estudiante?.toString() || ""}
                  disabled={!!currentParticipacion || !selectedCurso || estudiantes.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={!selectedCurso ? "Seleccione curso primero" : (estudiantes.length === 0 ? "No hay estudiantes en este curso" : "Seleccionar Estudiante")} />
                  </SelectTrigger>
                  <SelectContent>
                    {estudiantes.map((estudiante: User) => (
                      <SelectItem key={estudiante.id} value={estudiante.id.toString()}>
                        {estudiante.first_name} {estudiante.last_name} ({estudiante.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="materia">Materia</Label>
                <Select
                  name="materia"
                  onValueChange={(value) => handleInputChange({
                    target: { name: 'materia', value }
                  } as React.ChangeEvent<HTMLSelectElement>)}
                  value={formData.materia.toString() || ""}
                  disabled={!!currentParticipacion || !!selectedMateria}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar Materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {materias.map((materia: Materia) => (
                      <SelectItem key={materia.id} value={materia.id.toString()}>
                        {materia.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Participación</Label>
                  <Select
                    name="tipo"
                    onValueChange={(value) => handleInputChange({
                      target: { name: 'tipo', value }
                    } as React.ChangeEvent<HTMLSelectElement>)}
                    value={formData.tipo}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposParticipacion.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor">
                    Puntaje (1-10)
                  </Label>
                  <Input
                    id="valor"
                    name="valor"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.valor}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  placeholder="Describe brevemente la participación"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentParticipacion ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Participaciones;
