import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { PaginatedResponse, getMateriasByRole } from '@/services/api';
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
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Materia, Asistencia, Curso } from '@/types/academic';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import { CalendarCheck, Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Estudiante extends User {
  curso?: number;
}

const Asistencias: React.FC = () => {
  const {user} = useAuth();
  const queryClient = useQueryClient();
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [asistencias, setAsistencias] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';
  const hasAccess = isAdmin || isProfesor;

  const {
    data: materias = [],
    isLoading: isLoadingMaterias
  } = useQuery({
    queryKey: ['materias-profesor'],
    queryFn: () => getMateriasByRole(user, selectedMateria, setSelectedMateria),
    enabled: hasAccess
  });

  const {
    data: cursos = [],
    isLoading: isLoadingCursos
  } = useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: api.fetchCursos,
    enabled: hasAccess,
  });

  const cursosDisponibles = useMemo(() => {
    if (!selectedMateria || !cursos.length) return [];
    return cursos.filter((curso) => curso.materias?.includes(selectedMateria));
  }, [selectedMateria, cursos]);

  const {
    data: estudiantes = [],
    isLoading: isLoadingEstudiantes
  } = useQuery<Estudiante[]>({
    queryKey: ['estudiantes', selectedCurso],
    queryFn: async () => {
      if (!selectedCurso) return [];
      return api.fetchEstudiantes({curso: selectedCurso});
    },
    enabled: hasAccess && !!selectedCurso,
  });

  const {
    data: asistenciasResponse,
    isLoading: isLoadingAsistencias,
    refetch: refetchAsistencias
  } = useQuery({
    queryKey: ['asistencias', selectedMateria, selectedCurso, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null, currentPage],
    queryFn: async () => {
      if (!selectedMateria || !selectedDate || !selectedCurso) return { results: [], count: 0 };

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');


      const response = await api.fetchAsistencias({
        materia: selectedMateria,
        fecha: formattedDate,
        curso: selectedCurso,
        page: currentPage,
        page_size: 100
      });

      return response;
    },
    enabled: hasAccess && !!selectedMateria && !!selectedDate && !!selectedCurso
  });


  const asistenciasData = useMemo(() => {
    if (!asistenciasResponse) return [];

    if ('results' in asistenciasResponse) {

      const paginatedResponse = asistenciasResponse as PaginatedResponse<Asistencia>;


      const count = paginatedResponse.count;
      setTotalPages(Math.ceil(count / 100));

      return paginatedResponse.results;
    }


    setTotalPages(1);
    return asistenciasResponse as Asistencia[];
  }, [asistenciasResponse]);

  const registrarAsistenciasMutation = useMutation({
    mutationFn: async (asistenciasArray: Partial<Asistencia>[]) => {
      try {
        const result = await api.bulkRecordAsistencias(asistenciasArray as Omit<Asistencia, 'id'>[]);
        return result;
      } catch (error) {
        console.error("Error al registrar asistencias en bulk:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['asistencias', selectedMateria, selectedCurso, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null]
      });

      if (result.errores && result.errores.length > 0) {
        toast({
          variant: "destructive",
          title: "Error parcial al guardar asistencias",
          description: `Se crearon ${result.creados} y se actualizaron ${result.actualizados} asistencias, pero hubo ${result.errores.length} errores.`,
        });
      } else {
        toast({
          title: "Asistencias registradas",
          description: `Se crearon ${result.creados} y se actualizaron ${result.actualizados} asistencias exitosamente.`,
        });
      }
      setSaving(false);
    },
    onError: (error) => {
      console.error("Error al registrar asistencias:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar las asistencias. Por favor, intente nuevamente.",
      });
      setSaving(false);
    }
  });

  useEffect(() => {
    if (!hasAccess) return;


    if (asistenciasData.length > 0) {
      // Inicialización con datos del servidor
      const asistenciasMap: Record<number, boolean> = {};
      asistenciasData.forEach((asistencia: Asistencia) => {
        asistenciasMap[asistencia.estudiante] = asistencia.presente;
      });


      if (Object.keys(asistencias).length === 0) {
        setAsistencias(asistenciasMap);
      }
    } else if (estudiantes.length > 0 && Object.keys(asistencias).length === 0) {

      const asistenciasMap: Record<number, boolean> = {};
      estudiantes.forEach((est: Estudiante) => {
        asistenciasMap[est.id] = true; // Inicializar como ausente (false)
      });
      setAsistencias(asistenciasMap);
    }
  }, [asistenciasData, estudiantes, hasAccess]);

  useEffect(() => {
    // Reset de valores al cambiar materia o fecha
    setSelectedCurso(null);
    setAsistencias({});
    setCurrentPage(1); // Resetear la paginación
  }, [selectedMateria, selectedDate]);

  useEffect(() => {
    if (cursosDisponibles.length > 0) {
      if (!selectedCurso || !cursosDisponibles.find(c => c.id === selectedCurso)) {
        setSelectedCurso(cursosDisponibles[0].id);
      }
    } else {
      setSelectedCurso(null);
    }


    if (selectedCurso) {
      setCurrentPage(1);
    }
  }, [cursosDisponibles, selectedCurso]);

  const handleToggleAsistencia = (estudianteId: number) => {
    console.log(`Cambiando estado de asistencia para estudiante ${estudianteId}: ${asistencias[estudianteId]} -> ${!asistencias[estudianteId]}`);
    setAsistencias(prev => {
      const newAsistencias = { ...prev };
      newAsistencias[estudianteId] = !prev[estudianteId];
      return newAsistencias;
    });
  };

  const handleSaveAsistencias = async () => {
    if (!selectedMateria || !selectedDate || !selectedCurso) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una materia, un curso y una fecha",
      });
      return;
    }

    setSaving(true);

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const asistenciasArray = estudiantes.map((estudiante: Estudiante) => ({
      estudiante: estudiante.id,
      materia: selectedMateria,
      fecha: formattedDate,
      presente: asistencias[estudiante.id] === undefined ? false : asistencias[estudiante.id]
    }));

    registrarAsistenciasMutation.mutate(asistenciasArray);
  };

  // Manejador para cambio de página
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const isLoading = isLoadingMaterias || isLoadingEstudiantes || isLoadingCursos;
  const isLoadingData = !!selectedMateria && !!selectedDate && !!selectedCurso && isLoadingAsistencias;

  if (isLoading && !isLoadingData) {
    return (
      <div className="flex justify-center items-center h-96 flex-col">
        <Loader2 className="h-8 w-8 animate-spin mb-2"/>
        <p className="text-gray-600">Cargando información...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Registro de Asistencias</h1>
        <CalendarCheck className="h-8 w-8 text-academic-green"/>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Materia, Curso y Fecha</CardTitle>
          <CardDescription>Selecciona la materia, el curso y la fecha para registrar asistencias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="materia">Materia</Label>
              <Select
                onValueChange={(value) => setSelectedMateria(parseInt(value))}
                value={selectedMateria?.toString() || ""}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar Materia"/>
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

            <div className="space-y-2">
              <Label htmlFor="curso">Curso</Label>
              <Select
                onValueChange={(value) => setSelectedCurso(parseInt(value))}
                value={selectedCurso?.toString() || ""}
                disabled={!selectedMateria || cursosDisponibles.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={!selectedMateria ? "Seleccione materia primero" : (cursosDisponibles.length === 0 ? "No hay cursos" : "Seleccionar Curso")}/>
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

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {selectedDate ? (
                      format(selectedDate, "PPP", {locale: es})
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
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMateria && selectedCurso && selectedDate ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Asistencias: {materias.find(m => m.id === selectedMateria)?.nombre} - {cursos.find(c => c.id === selectedCurso)?.nombre} - {format(selectedDate, 'PPP', {locale: es})}
            </CardTitle>
            <CardDescription>
              Registro de asistencias para la fecha seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border relative">
              {isLoadingData && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-academic-purple"/>
                </div>
              )}
              <Table>
                <TableCaption>
                  Lista de estudiantes para registrar asistencia
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Asistencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        No hay estudiantes registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    estudiantes.map((estudiante: Estudiante) => (
                      <TableRow key={estudiante.id}>
                        <TableCell className="font-medium">
                          {estudiante.first_name} {estudiante.last_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {asistencias[estudiante.id] ? (
                            <Badge className="bg-green-600">Presente</Badge>
                          ) : (
                            <Badge variant="destructive">Ausente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={asistencias[estudiante.id]}
                            onCheckedChange={() => handleToggleAsistencia(estudiante.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoadingData}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoadingData}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveAsistencias}
                disabled={saving || isLoadingData}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2"/>
                    Guardar Asistencias
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Selecciona una materia, un curso y una fecha para registrar asistencias</p>
        </div>
      )}
    </div>
  );
};

export default Asistencias;
