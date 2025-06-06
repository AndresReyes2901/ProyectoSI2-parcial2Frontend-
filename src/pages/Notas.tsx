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
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Nota, Periodo, Materia, EstadisticasMateria, ReporteTrimestral } from '@/types/academic';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import { Pencil, Save, Loader2, BookOpen, BarChart, FileText, Download } from 'lucide-react';

interface NotaFormData {
  estudiante: number;
  materia: number;
  periodo: number;
  ser_puntaje: number;
  decidir_puntaje: number;
  hacer_puntaje: number;
  saber_puntaje: number;
  autoevaluacion_ser: number;
  autoevaluacion_decidir: number;
  comentario?: string;
}

const Notas: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentNota, setCurrentNota] = useState<Nota | null>(null);
  const [activeTab, setActiveTab] = useState("notas");
  const [formData, setFormData] = useState<NotaFormData>({
    estudiante: 0,
    materia: 0,
    periodo: 0,
    ser_puntaje: 0,
    decidir_puntaje: 0,
    hacer_puntaje: 0,
    saber_puntaje: 0,
    autoevaluacion_ser: 0,
    autoevaluacion_decidir: 0,
    comentario: ''
  });

  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';

  const {
    data: periodos = [],
    isLoading: isLoadingPeriodos
  } = useQuery({
    queryKey: ['periodos'],
    queryFn: api.fetchPeriodos
  });

  const {
    data: materias = [],
    isLoading: isLoadingMaterias
  } = useQuery({
    queryKey: ['materias-profesor'],
    queryFn: () => getMateriasByRole(user, selectedMateria, setSelectedMateria)
  });

  const {
    data: cursos = [],
    isLoading: isLoadingCursos
  } = useQuery({
    queryKey: ['cursos'],
    queryFn: api.fetchCursos
  });

  const cursosDisponibles = useMemo(() => {
    if (!selectedMateria || !cursos.length) return [];
    return cursos.filter((curso) => curso.materias?.includes(selectedMateria));
  }, [selectedMateria, cursos]);

  const {
    data: estudiantes = [],
    isLoading: isLoadingEstudiantes
  } = useQuery({
    queryKey: ['estudiantes', selectedCurso],
    queryFn: async () => {
      if (!selectedCurso) return [];
      return api.fetchEstudiantes({ curso: selectedCurso });
    },
    enabled: !!selectedCurso
  });

  const {
    data: notas = [],
    isLoading: isLoadingNotas,
    refetch: refetchNotas
  } = useQuery<Nota[]>({
    queryKey: ['notas', selectedMateria, selectedPeriodo],
    queryFn: async () => {
      if (!selectedMateria || !selectedPeriodo) return [];
      const response = await api.fetchNotas({
        materia: selectedMateria,
        periodo: selectedPeriodo
      });

      // Si es una respuesta paginada, devuelve los resultados
      if ('results' in response) {
        return response.results;
      }
      // Si ya es un array, devuélvelo directamente
      return response;
    },
    enabled: !!selectedMateria && !!selectedPeriodo
  });

  const {
    data: estadisticasMateria,
    isLoading: isLoadingEstadisticas
  } = useQuery<EstadisticasMateria | null>({
    queryKey: ['estadisticas-materia', selectedMateria, selectedPeriodo],
    queryFn: () => {
      if (!selectedMateria || !selectedPeriodo) return null;
      return api.fetchEstadisticasMateria(selectedMateria, selectedPeriodo);
    },
    enabled: isAdmin && activeTab === "estadisticas" && !!selectedMateria && !!selectedPeriodo
  });

  const {
    data: reporteTrimestral,
    isLoading: isLoadingReporte
  } = useQuery<ReporteTrimestral | null>({
    queryKey: ['reporte-trimestral', selectedCurso, selectedPeriodo],
    queryFn: () => {
      if (!selectedCurso || !selectedPeriodo) return null;
      return api.fetchReporteTrimestral(selectedCurso, selectedPeriodo);
    },
    enabled: isAdmin && activeTab === "reportes" && !!selectedCurso && !!selectedPeriodo
  });

  const createNotaMutation = useMutation({
    mutationFn: (data: NotaFormData) => {
      return api.createNota(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notas', selectedMateria, selectedPeriodo],
        refetchType: 'active',
        exact: false
      });
      refetchNotas();
      toast({
        title: "Calificación registrada",
        description: "La calificación ha sido registrada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.detail || "No se pudo registrar la calificación. Por favor, intente nuevamente.",
      });
    }
  });

  const updateNotaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NotaFormData> }) => {
      return api.updateNota(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notas', selectedMateria, selectedPeriodo],
        refetchType: 'active',
        exact: false
      });
      refetchNotas();
      toast({
        title: "Calificación actualizada",
        description: "La calificación ha sido actualizada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.detail || "No se pudo actualizar la calificación. Por favor, intente nuevamente.",
      });
    }
  });

  useEffect(() => {
    if (selectedMateria) {
      const cursosFiltrados = cursosDisponibles;
      if (cursosFiltrados.length > 0) {
        setSelectedCurso(cursosFiltrados[0].id);
      } else {
        setSelectedCurso(null);
      }
    } else {
      setSelectedCurso(null);
    }
  }, [selectedMateria, cursosDisponibles]);

  useEffect(() => {
    if (selectedMateria && selectedPeriodo) {
      setFormData(prev => ({
        ...prev,
        materia: selectedMateria,
        periodo: selectedPeriodo
      }));
    }
  }, [selectedMateria, selectedPeriodo]);

  if (!isAdmin && !isProfesor) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  const handleOpenDialog = (estudiante: User, notaExistente?: Nota) => {
    if (notaExistente) {
      setCurrentNota(notaExistente);
      setFormData({
        estudiante: notaExistente.estudiante,
        materia: notaExistente.materia,
        periodo: notaExistente.periodo,
        ser_puntaje: notaExistente.ser_puntaje,
        decidir_puntaje: notaExistente.decidir_puntaje,
        hacer_puntaje: notaExistente.hacer_puntaje,
        saber_puntaje: notaExistente.saber_puntaje,
        autoevaluacion_ser: notaExistente.autoevaluacion_ser,
        autoevaluacion_decidir: notaExistente.autoevaluacion_decidir,
        comentario: notaExistente.comentario || ''
      });
    } else {
      setCurrentNota(null);
      setFormData({
        estudiante: estudiante.id,
        materia: selectedMateria || 0,
        periodo: selectedPeriodo || 0,
        ser_puntaje: 0,
        decidir_puntaje: 0,
        hacer_puntaje: 0,
        saber_puntaje: 0,
        autoevaluacion_ser: 0,
        autoevaluacion_decidir: 0,
        comentario: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentNota(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (['ser_puntaje', 'decidir_puntaje', 'hacer_puntaje', 'saber_puntaje', 'autoevaluacion_ser', 'autoevaluacion_decidir'].includes(name)) {
      let numValue = parseFloat(value);
      if (isNaN(numValue)) numValue = 0;
      if (numValue < 0) numValue = 0;

      const maxValues: Record<string, number> = {
        ser_puntaje: 10,
        decidir_puntaje: 10,
        hacer_puntaje: 35,
        saber_puntaje: 35,
        autoevaluacion_ser: 5,
        autoevaluacion_decidir: 5
      };

      if (numValue > maxValues[name]) {
        numValue = maxValues[name];
      }

      numValue = Math.round(numValue * 100) / 100;

      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentNota) {
      updateNotaMutation.mutate({
        id: currentNota.id,
        data: formData
      });
    } else {
      createNotaMutation.mutate(formData);
    }
  };

  const getEstudianteNombre = (id: number) => {
    const estudiante = estudiantes.find((e: User) => e.id === id);
    if (estudiante) {
      return `${estudiante.first_name} ${estudiante.last_name}`;
    }
    return "Estudiante no encontrado";
  };

  const getMateriaNombre = (id: number) => {
    const materia = materias.find((m: Materia) => m.id === id);
    return materia ? materia.nombre : "Materia no encontrada";
  };

  const getPeriodoNombre = (id: number) => {
    const periodo = periodos.find((p: Periodo) => p.id === id);
    return periodo ? `${periodo.trimestre_display} - ${periodo.año_academico}` : "Periodo no encontrado";
  };

  const getCursoNombre = (id: number) => {
    const curso = cursos.find((c) => c.id === id);
    return curso ? curso.nombre : "Curso no encontrado";
  };

  const findNotaForEstudiante = (estudianteId: number) => {
    return notas.find((nota: Nota) => nota.estudiante === estudianteId);
  };

  const isLoading = isLoadingPeriodos || isLoadingMaterias || isLoadingCursos ||
                    (selectedCurso && isLoadingEstudiantes) ||
                    (selectedMateria && selectedPeriodo && isLoadingNotas) ||
                    (isAdmin && activeTab === "estadisticas" && isLoadingEstadisticas) ||
                    (isAdmin && activeTab === "reportes" && isLoadingReporte);

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0]);
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportNotas = () => {
    if (!notas || notas.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay calificaciones disponibles para exportar",
        variant: "destructive"
      });
      return;
    }

    const dataToExport = notas.map((nota: Nota) => ({
      Estudiante: getEstudianteNombre(nota.estudiante),
      Materia: getMateriaNombre(nota.materia),
      Periodo: getPeriodoNombre(nota.periodo),
      Ser: nota.ser_puntaje.toFixed(2),
      Decidir: nota.decidir_puntaje.toFixed(2),
      Hacer: nota.hacer_puntaje.toFixed(2),
      Saber: nota.saber_puntaje.toFixed(2),
      'Auto-Ser': nota.autoevaluacion_ser.toFixed(2),
      'Auto-Decidir': nota.autoevaluacion_decidir.toFixed(2),
      'Nota Total': nota.nota_total?.toFixed(2) || 'N/A',
      Estado: nota.aprobado ? 'Aprobado' : 'Reprobado',
      Comentario: nota.comentario || ''
    }));

    exportToCSV(dataToExport, `notas_${getMateriaNombre(selectedMateria!)}_${getPeriodoNombre(selectedPeriodo!)}`);

    toast({
      title: "Exportación exitosa",
      description: "Se han exportado las calificaciones correctamente",
    });
  };

  const handleExportEstadisticas = () => {
    if (!estadisticasMateria) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay estadísticas disponibles para exportar",
        variant: "destructive"
      });
      return;
    }

    const generalData = [{
      Materia: estadisticasMateria.materia_nombre,
      Periodo: estadisticasMateria.periodo,
      Promedio_Total: estadisticasMateria.promedio_total.toFixed(2),
      Total_Estudiantes: estadisticasMateria.total_estudiantes,
      Aprobados: estadisticasMateria.aprobados,
      Reprobados: estadisticasMateria.reprobados,
      Porcentaje_Aprobacion: `${estadisticasMateria.porcentaje_aprobacion}%`,
      Mejor_Nota: estadisticasMateria.mejor_nota.toFixed(2),
      Peor_Nota: estadisticasMateria.peor_nota.toFixed(2)
    }];

    const promediosData = [{
      Ser: estadisticasMateria.promedios.ser.toFixed(2),
      Saber: estadisticasMateria.promedios.saber.toFixed(2),
      Hacer: estadisticasMateria.promedios.hacer.toFixed(2),
      Decidir: estadisticasMateria.promedios.decidir.toFixed(2),
      'Auto-Ser': estadisticasMateria.promedios.autoevaluacion_ser.toFixed(2),
      'Auto-Decidir': estadisticasMateria.promedios.autoevaluacion_decidir.toFixed(2)
    }];

    const estudiantesData = estadisticasMateria.estudiantes.map(est => ({
      Estudiante: est.nombre,
      Ser: est.ser.toFixed(2),
      Saber: est.saber.toFixed(2),
      Hacer: est.hacer.toFixed(2),
      Decidir: est.decidir.toFixed(2),
      'Nota Total': est.nota_total.toFixed(2),
      Estado: est.aprobado ? 'Aprobado' : 'Reprobado'
    }));

    exportToCSV(generalData, `estadisticas_general_${estadisticasMateria.materia_nombre}`);
    exportToCSV(promediosData, `estadisticas_promedios_${estadisticasMateria.materia_nombre}`);
    exportToCSV(estudiantesData, `estadisticas_estudiantes_${estadisticasMateria.materia_nombre}`);

    toast({
      title: "Exportación exitosa",
      description: "Se han exportado las estadísticas correctamente",
    });
  };

  const handleExportReporte = () => {
    if (!reporteTrimestral) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay reporte disponible para exportar",
        variant: "destructive"
      });
      return;
    }

    const cursoData = [{
      Curso: getCursoNombre(selectedCurso!),
      Periodo: `${reporteTrimestral.periodo.trimestre} - ${reporteTrimestral.periodo.año_academico}`,
      Promedio_General: reporteTrimestral.estadisticas_curso.promedio_general.toFixed(2),
      Total_Materias: reporteTrimestral.estadisticas_curso.total_materias,
      Materias_Aprobadas: reporteTrimestral.estadisticas_curso.materias_aprobadas,
      Materias_Reprobadas: reporteTrimestral.estadisticas_curso.materias_reprobadas,
      Porcentaje_Aprobacion: `${reporteTrimestral.estadisticas_curso.porcentaje_aprobacion.toFixed(2)}%`,
      Total_Estudiantes: reporteTrimestral.total_estudiantes
    }];

    const estudiantesData = [];
    for (const estudiante of reporteTrimestral.estudiantes) {
      for (const materia of estudiante.materias) {
        estudiantesData.push({
          Estudiante: estudiante.nombre,
          Usuario: estudiante.username,
          Materia: materia.nombre,
          Ser: materia.ser.toFixed(2),
          Saber: materia.saber.toFixed(2),
          Hacer: materia.hacer.toFixed(2),
          Decidir: materia.decidir.toFixed(2),
          'Nota Total': materia.nota_total.toFixed(2),
          Estado: materia.aprobado ? 'Aprobado' : 'Reprobado',
          'Promedio General': estudiante.promedio_general.toFixed(2),
          'Materias Aprobadas': estudiante.aprobadas,
          'Materias Reprobadas': estudiante.reprobadas,
          'Total Materias': estudiante.total_materias
        });
      }
    }

    exportToCSV(cursoData, `reporte_resumen_${getCursoNombre(selectedCurso!).replace(/\s/g, '_')}`);
    exportToCSV(estudiantesData, `reporte_detallado_${getCursoNombre(selectedCurso!).replace(/\s/g, '_')}`);

    toast({
      title: "Exportación exitosa",
      description: "Se ha exportado el reporte trimestral correctamente",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p className="text-gray-600">Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
     

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={isAdmin ? "grid w-full grid-cols-3" : "grid w-full grid-cols-1"}>
          <TabsTrigger value="notas">
            <BookOpen className="h-4 w-4 mr-2" />
            Registro de Notas
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="estadisticas">
                <BarChart className="h-4 w-4 mr-2" />
                Estadísticas de Materia
              </TabsTrigger>
              <TabsTrigger value="reportes">
                <FileText className="h-4 w-4 mr-2" />
                Reportes Trimestrales
              </TabsTrigger>
            </>
          )}
        </TabsList>

    

<TabsContent value="notas" className="mt-4 space-y-6">
  <section className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
  <header className="mb-4">
    <h2 className="text-xl font-bold text-green-800">Filtrar notas por materia, curso y periodo</h2>
    <p className="text-sm text-green-700">
      Elige la combinación adecuada para registrar o revisar las calificaciones disponibles.
    </p>
  </header>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* Materia */}
    <div className="space-y-1">
      <Label htmlFor="materia" className="text-sm font-medium text-gray-700">Materia</Label>
      <Select
        onValueChange={(value) => setSelectedMateria(parseInt(value))}
        value={selectedMateria?.toString() ?? ""}
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

    {/* Curso */}
    <div className="space-y-1">
      <Label htmlFor="curso" className="text-sm font-medium text-gray-700">Curso</Label>
      <Select
        onValueChange={(value) => setSelectedCurso(parseInt(value))}
        value={selectedCurso?.toString() ?? ""}
        disabled={!selectedMateria || cursosDisponibles.length === 0}
      >
        <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm disabled:opacity-70">
          <SelectValue
            placeholder={
              !selectedMateria
                ? "Seleccione materia primero"
                : cursosDisponibles.length === 0
                ? "No hay cursos"
                : "Seleccionar Curso"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {cursosDisponibles.map((curso) => (
            <SelectItem key={curso.id} value={curso.id.toString()}>
              {curso.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Periodo */}
    <div className="space-y-1">
      <Label htmlFor="periodo" className="text-sm font-medium text-gray-700">Periodo Académico</Label>
      <Select
        onValueChange={(value) => setSelectedPeriodo(parseInt(value))}
        value={selectedPeriodo?.toString() ?? ""}
      >
        <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm">
          <SelectValue placeholder="Seleccionar Periodo" />
        </SelectTrigger>
        <SelectContent>
          {periodos.map((periodo: Periodo) => (
            <SelectItem key={periodo.id} value={periodo.id.toString()}>
              {periodo.trimestre_display} - {periodo.año_academico}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
</section>


  {selectedMateria && selectedCurso && selectedPeriodo ? (
    <Card>
      <CardHeader>
        <CardTitle>
          Calificaciones: {getMateriaNombre(selectedMateria)} - {getCursoNombre(selectedCurso)} - {getPeriodoNombre(selectedPeriodo)}
        </CardTitle>
        <CardDescription>
          Registro de calificaciones para el periodo seleccionado
        </CardDescription>
      </CardHeader>
      <CardContent>
       <div className="rounded-md border">
  <Table>
    <TableCaption>
      Lista de estudiantes y sus calificaciones para {getMateriaNombre(selectedMateria)}
    </TableCaption>
    <TableHeader className="bg-black">
      <TableRow>
        <TableHead className="font-semibold text-white uppercase tracking-wide">Estudiante</TableHead>
        <TableHead className="font-semibold text-white uppercase tracking-wide text-center">Saber Ser (máx. 10)</TableHead>
        <TableHead className="font-semibold text-white uppercase tracking-wide text-center">Saber Decidir (máx. 10)</TableHead>
        <TableHead className="font-semibold text-white uppercase tracking-wide text-center">Saber Hacer (máx. 35)</TableHead>
        <TableHead className="font-semibold text-white uppercase tracking-wide text-center">Saber Conocer (máx. 35)</TableHead>
        <TableHead className="font-semibold text-white uppercase tracking-wide text-center">Nota Total</TableHead>
        <TableHead className="font-semibold text-white uppercase tracking-wide text-right">Acciones</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {estudiantes.length === 0 ? (
        <TableRow>
          <TableCell colSpan={7} className="text-center py-6 text-muted-foreground italic">
            No hay estudiantes registrados en este curso
          </TableCell>
        </TableRow>
      ) : (
        estudiantes.map((estudiante: User, index) => {
          const notaExistente = findNotaForEstudiante(estudiante.id);
          const notaTotal = notaExistente?.nota_total ?? null;
          const isApproved = notaExistente?.aprobado;
          const rowBgClass = index % 2 === 0 ? "bg-gray-50" : "bg-white";

          return (
            <TableRow key={estudiante.id} className={rowBgClass}>
              <TableCell className="font-semibold text-gray-900">
                {estudiante.first_name} {estudiante.last_name}
              </TableCell>
              <TableCell className="text-center text-gray-700">
                {notaExistente?.ser_puntaje?.toFixed(2) ?? "-"}
              </TableCell>
              <TableCell className="text-center text-gray-700">
                {notaExistente?.decidir_puntaje?.toFixed(2) ?? "-"}
              </TableCell>
              <TableCell className="text-center text-gray-700">
                {notaExistente?.hacer_puntaje?.toFixed(2) ?? "-"}
              </TableCell>
              <TableCell className="text-center text-gray-700">
                {notaExistente?.saber_puntaje?.toFixed(2) ?? "-"}
              </TableCell>
              <TableCell className={`text-center font-bold ${isApproved ? "text-green-600" : "text-red-600"}`}>
                {notaTotal !== null ? notaTotal.toFixed(2) : "-"}
              </TableCell>
              <TableCell className="text-right">
                <button
                  onClick={() => handleOpenDialog(estudiante, notaExistente)}
                  className={`px-3 py-1 text-sm font-medium rounded transition ${
                    notaExistente
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-700 text-white hover:bg-gray-800"
                  }`}
                >
                  {notaExistente ? "Editar" : "Registrar"}
                </button>
              </TableCell>
            </TableRow>
          );
        })
      )}
    </TableBody>
  </Table>
</div>


        
        <div className="mt-4 flex justify-end">
          <Button onClick={handleExportNotas}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Notas
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : (
    <div className="text-center py-8 text-gray-500">
      <p>Selecciona una materia, un curso y un periodo para ver y registrar calificaciones</p>
    </div>
  )}
</TabsContent>


        {isAdmin && (
  <TabsContent value="estadisticas" className="mt-4 space-y-6 text-black"> {/* texto negro para todo aquí */}
  <Card className="bg-white border border-zinc-300 shadow-md">
    <CardHeader>
      <CardTitle className="text-black text-xl">Estadísticas de Materia</CardTitle>
      <CardDescription className="text-zinc-600">
        Ver estadísticas detalladas por materia y periodo
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="estadistica-materia" className="text-black">Materia</Label>
          <Select
            onValueChange={(value) => setSelectedMateria(parseInt(value))}
            value={selectedMateria?.toString() || ""}
          >
            <SelectTrigger className="bg-zinc-100 border border-zinc-300 text-black">
              <SelectValue placeholder="Seleccionar Materia" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black">
              {materias.map((materia: Materia) => (
                <SelectItem key={materia.id} value={materia.id.toString()} className="hover:bg-gray-200">
                  {materia.nombre} ({materia.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estadistica-periodo" className="text-black">Periodo</Label>
          <Select
            onValueChange={(value) => setSelectedPeriodo(parseInt(value))}
            value={selectedPeriodo?.toString() || ""}
          >
            <SelectTrigger className="bg-zinc-100 border border-zinc-300 text-black">
              <SelectValue placeholder="Seleccionar Periodo" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black">
              {periodos.map((periodo: Periodo) => (
                <SelectItem key={periodo.id} value={periodo.id.toString()} className="hover:bg-gray-200">
                  {periodo.trimestre_display} - {periodo.año_academico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {estadisticasMateria ? (
        <div className="space-y-10">
          {/* Cards principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card className="bg-white border-l-4 border-blue-500 shadow-md">
    <CardHeader className="pb-2">
      <CardTitle className="text-gray-800 text-xl font-semibold">Promedio Total & Estudiantes</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4 items-center">
      <div className="text-center">
        <p className="text-sm text-gray-500">Promedio</p>
        <p className="text-3xl font-bold text-academic-blue">{estadisticasMateria.promedio_total.toFixed(2)}</p>
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-500">Estudiantes</p>
        <p className="text-3xl font-bold text-black">{estadisticasMateria.total_estudiantes}</p>
      </div>
    </CardContent>
  </Card>

  <Card className="bg-white border-l-4 border-green-500 shadow-md">
    
    <CardContent className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-500">Aprobados</p>
        <p className="text-3xl font-bold text-green-600">{estadisticasMateria.aprobados}</p>
        <Progress value={estadisticasMateria.porcentaje_aprobacion} className="h-2 mt-1" />
        <p className="text-xs text-gray-500 mt-1">
          {estadisticasMateria.porcentaje_aprobacion}% de aprobación
        </p>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Mayor nota:</span>
        <span className="font-bold text-green-600">{estadisticasMateria.mejor_nota.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Menor nota:</span>
        <span className="font-bold text-red-600">{estadisticasMateria.peor_nota.toFixed(2)}</span>
      </div>
    </CardContent>
  </Card>
</div>


          {/* Dimensiones */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-black">Promedios por dimensión</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {[ 
                { label: 'Ser', valor: estadisticasMateria.promedios.ser, total: 10 },
                { label: 'Saber', valor: estadisticasMateria.promedios.saber, total: 35 },
                { label: 'Hacer', valor: estadisticasMateria.promedios.hacer, total: 35 },
                { label: 'Decidir', valor: estadisticasMateria.promedios.decidir, total: 10 },
                { label: 'Auto. Ser', valor: estadisticasMateria.promedios.autoevaluacion_ser, total: 5 },
                { label: 'Auto. Decidir', valor: estadisticasMateria.promedios.autoevaluacion_decidir, total: 5 }
              ].map((dim) => (
                <div className="space-y-1" key={dim.label}>
                  <label className="text-sm text-black">{dim.label} ({dim.valor.toFixed(2)}/{dim.total})</label>
                  <Progress value={(dim.valor / dim.total) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de estudiantes */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-black">Notas por estudiante</h3>
            <div className="rounded-md border border-zinc-300 overflow-x-auto">
              <Table>
                <TableHeader className="bg-black text-white">
                  <TableRow>
                    <TableHead className="text-white">Estudiante</TableHead>
                    <TableHead className="text-center">Ser</TableHead>
                    <TableHead className="text-center">Saber</TableHead>
                    <TableHead className="text-center">Hacer</TableHead>
                    <TableHead className="text-center">Decidir</TableHead>
                    <TableHead className="text-center">Nota Total</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white text-black">
                  {estadisticasMateria.estudiantes.map((est) => (
                    <TableRow key={est.estudiante_id} className="hover:bg-gray-100">
                      <TableCell className="font-medium">{est.nombre}</TableCell>
                      <TableCell className="text-center">{est.ser.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{est.saber.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{est.hacer.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{est.decidir.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold">{est.nota_total.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 text-sm rounded ${est.aprobado ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                          {est.aprobado ? 'Aprobado' : 'Reprobado'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-60">
          <BarChart className="h-16 w-16 text-gray-600 mb-4" />
          <p className="text-gray-600">Selecciona una materia y un periodo para ver estadísticas detalladas</p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleExportEstadisticas} className="bg-academic-blue hover:bg-academic-blue/90 text-white">
          <Download className="h-4 w-4 mr-2" />
          Exportar Estadísticas
        </Button>
      </div>
    </CardContent>
  </Card>
</TabsContent>



        )}

        {isAdmin && (
          <TabsContent value="reportes" className="mt-4 space-y-6 bg-white text-black">
  <Card className="bg-white text-black">
    <CardHeader>
      <CardTitle>Reportes Trimestrales</CardTitle>
      <CardDescription>Ver informes trimestrales por curso</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="reporte-curso" className="text-black">Curso</Label>
          <Select
            onValueChange={(value) => setSelectedCurso(parseInt(value))}
            value={selectedCurso?.toString() || ""}
          >
            <SelectTrigger className="bg-white text-black border border-gray-300">
              <SelectValue placeholder="Seleccionar Curso" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black">
              {cursos.map((curso) => (
                <SelectItem key={curso.id} value={curso.id.toString()} className="text-black">
                  {curso.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reporte-periodo" className="text-black">Periodo</Label>
          <Select
            onValueChange={(value) => setSelectedPeriodo(parseInt(value))}
            value={selectedPeriodo?.toString() || ""}
          >
            <SelectTrigger className="bg-white text-black border border-gray-300">
              <SelectValue placeholder="Seleccionar Periodo" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black">
              {periodos.map((periodo: Periodo) => (
                <SelectItem key={periodo.id} value={periodo.id.toString()} className="text-black">
                  {periodo.trimestre_display} - {periodo.año_academico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {reporteTrimestral ? (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-black">Resumen del curso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card className="bg-white border-l-4 border-blue-500 shadow-md">
    <CardHeader className="pb-2">
      <CardTitle className="text-gray-800 text-xl font-semibold">Promedio & Estudiantes</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4 items-center">
      <div className="text-center">
        <p className="text-sm text-gray-500">Promedio General</p>
        <p className="text-3xl font-bold text-academic-blue">
          {reporteTrimestral.estadisticas_curso.promedio_general.toFixed(2)}
        </p>
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-500">Total Estudiantes</p>
        <p className="text-3xl font-bold text-black">
          {reporteTrimestral.total_estudiantes}
        </p>
      </div>
    </CardContent>
  </Card>

  <Card className="bg-white border-l-4 border-green-500 shadow-md">
    <CardHeader className="pb-2">
      <CardTitle className="text-gray-800 text-xl font-semibold">Aprobación & Reprobación</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-500">Materias Aprobadas</p>
        <p className="text-2xl font-bold text-green-600">
          {reporteTrimestral.estadisticas_curso.materias_aprobadas} / {reporteTrimestral.estadisticas_curso.total_materias}
        </p>
        <Progress value={reporteTrimestral.estadisticas_curso.porcentaje_aprobacion} className="h-2 mt-1" />
        <p className="text-xs text-muted-foreground mt-1">
          {reporteTrimestral.estadisticas_curso.porcentaje_aprobacion.toFixed(2)}% de aprobación
        </p>
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-500">Materias Reprobadas</p>
        <p className="text-3xl font-bold text-red-600">
          {reporteTrimestral.estadisticas_curso.materias_reprobadas}
        </p>
      </div>
    </CardContent>
  </Card>
</div>

          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-black">Rendimiento de estudiantes</h3>
            <div className="space-y-4">
              {reporteTrimestral.estudiantes.map((estudiante) => (
                <Card key={estudiante.estudiante_id} className="bg-zinc-100 text-black">
                  <CardHeader>
                    <CardTitle>{estudiante.nombre}</CardTitle>
                    <CardDescription>
                      Usuario: {estudiante.username} | Promedio: {estudiante.promedio_general.toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-gray-300 bg-white">
                      <Table>
                        <TableHeader className="bg-black text-white">
                          <TableRow>
                            <TableHead>Materia</TableHead>
                            <TableHead className="text-center text-white">Ser</TableHead>
                            <TableHead className="text-center text-white">Saber</TableHead>
                            <TableHead className="text-center text-white">Hacer</TableHead>
                            <TableHead className="text-center text-white">Decidir</TableHead>
                            <TableHead className="text-center text-white">Nota Total</TableHead>
                            <TableHead className="text-center text-white">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white text-black">
                          {estudiante.materias.map((materia) => (
                            <TableRow key={materia.materia_id} className="hover:bg-gray-100">
                              <TableCell>{materia.nombre}</TableCell>
                              <TableCell className="text-center">{materia.ser.toFixed(2)}</TableCell>
                              <TableCell className="text-center">{materia.saber.toFixed(2)}</TableCell>
                              <TableCell className="text-center">{materia.hacer.toFixed(2)}</TableCell>
                              <TableCell className="text-center">{materia.decidir.toFixed(2)}</TableCell>
                              <TableCell className="text-center font-bold">{materia.nota_total.toFixed(2)}</TableCell>
                              <TableCell className="text-center">
                                <span className={`badge px-2 py-1 rounded text-white ${materia.aprobado ? 'bg-green-600' : 'bg-red-600'}`}>
                                  {materia.aprobado ? 'Aprobado' : 'Reprobado'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex justify-between w-full text-sm text-black">
                      <span>Materias aprobadas: <strong className="text-green-600">{estudiante.aprobadas}</strong></span>
                      <span>Materias reprobadas: <strong className="text-red-600">{estudiante.reprobadas}</strong></span>
                      <span>Total materias: <strong>{estudiante.total_materias}</strong></span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-60 text-black">
          <FileText className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600">Selecciona un curso y un periodo para ver el reporte trimestral</p>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={handleExportReporte} className="bg-academic-blue text-white hover:bg-academic-blue/90">
          <Download className="h-4 w-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>
    </CardContent>
  </Card>
</TabsContent>

        )}
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {currentNota ? "Editar Calificación" : "Registrar Calificación"}
            </DialogTitle>
            <DialogDescription>
              {currentNota
                ? `Actualizar calificación de ${getEstudianteNombre(formData.estudiante)}`
                : `Registrar calificación para ${getEstudianteNombre(formData.estudiante)}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label>Estudiante:</Label>
                <p className="font-medium">{getEstudianteNombre(formData.estudiante)}</p>
              </div>

              <div className="space-y-1">
                <Label>Materia:</Label>
                <p className="font-medium">{getMateriaNombre(formData.materia)}</p>
              </div>

              <div className="space-y-1">
                <Label>Periodo:</Label>
                <p className="font-medium">{getPeriodoNombre(formData.periodo)}</p>
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                Los valores pueden incluir hasta 2 decimales. Por ejemplo: 8.75
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ser_puntaje">
                    Saber Ser (máx. 10)
                  </Label>
                  <Input
                    id="ser_puntaje"
                    name="ser_puntaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.ser_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="decidir_puntaje">
                    Saber Decidir (máx. 10)
                  </Label>
                  <Input
                    id="decidir_puntaje"
                    name="decidir_puntaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.decidir_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hacer_puntaje">
                    Saber Hacer (máx. 35)
                  </Label>
                  <Input
                    id="hacer_puntaje"
                    name="hacer_puntaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="35"
                    value={formData.hacer_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saber_puntaje">
                    Saber Conocer (máx. 35)
                  </Label>
                  <Input
                    id="saber_puntaje"
                    name="saber_puntaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="35"
                    value={formData.saber_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="autoevaluacion_ser">
                    Autoevaluación Ser (máx. 5)
                  </Label>
                  <Input
                    id="autoevaluacion_ser"
                    name="autoevaluacion_ser"
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={formData.autoevaluacion_ser}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoevaluacion_decidir">
                    Autoevaluación Decidir (máx. 5)
                  </Label>
                  <Input
                    id="autoevaluacion_decidir"
                    name="autoevaluacion_decidir"
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={formData.autoevaluacion_decidir}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario">Comentario</Label>
                <textarea
                  id="comentario"
                  name="comentario"
                  placeholder="Observaciones o comentarios sobre el desempeño del estudiante"
                  value={formData.comentario}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createNotaMutation.isPending || updateNotaMutation.isPending}
              >
                {(createNotaMutation.isPending || updateNotaMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {currentNota ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notas;

