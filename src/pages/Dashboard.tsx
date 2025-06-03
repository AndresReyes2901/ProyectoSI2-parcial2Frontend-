import React, { useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UsersRound, CalendarCheck2, ClipboardCheck, Grid2X2, AlertCircle, Award, BookOpen, Users, CheckSquare,LibraryBig,FileText } from 'lucide-react';

import { DashboardStats, EstudianteDashboard } from '@/types/academic';
import { toast } from '@/components/ui/use-toast';
import { Bar ,Line,Pie} from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend ,PointElement, LineElement, ArcElement} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend,PointElement, LineElement, ArcElement)


const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isEstudiante = user?.role === 'ESTUDIANTE';

  // Consultar datos estadísticos generales
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: api.fetchDashboardEstadisticas,
    enabled: !isEstudiante, // Solo cargamos las estadísticas generales si no es estudiante
  });

  // Si el usuario es estudiante, consultar su dashboard específico
  const { data: estudianteDashboard, isLoading: isLoadingEstudiante, error: estudianteError } = useQuery<EstudianteDashboard>({
    queryKey: ['dashboard-estudiante'],
    queryFn: () => api.fetchEstudianteDashboard(),
    enabled: isEstudiante,
    retry: 2, // Intentar la petición hasta 2 veces si falla
    retryDelay: 1000, // Esperar 1 segundo entre intentos
  });

  // Mostrar errores en toast
  useEffect(() => {
    if (estudianteError) {
      console.error('Error al cargar el dashboard de estudiante:', estudianteError);
      toast({
        title: 'Error al cargar el dashboard',
        description: 'No se pudieron cargar tus datos académicos. Por favor, intenta de nuevo más tarde.',
        variant: 'destructive',
      });
    }
  }, [estudianteError]);

  // Función para convertir nombres de trimestres
  const mapearTrimestre = (trimestre: string) => {
    const trimMap: Record<string, string> = {
      'PRIMERO': '1er Trim',
      'SEGUNDO': '2do Trim',
      'TERCERO': '3er Trim',
    };
    return trimMap[trimestre] || trimestre;
  };

  // Procesamiento de datos para el dashboard de estudiante
  const notasEstudianteData = useMemo(() => {
    if (!isEstudiante || !estudianteDashboard?.notas || estudianteDashboard.notas.length === 0) {
      return [];
    }

    // Obtenemos la primera materia para mostrar sus notas por trimestre
    const materia = estudianteDashboard.notas[0];
    return Object.entries(materia.trimestres).map(([key, trimestre]) => ({
      name: `${mapearTrimestre(trimestre.trimestre)} ${trimestre.año}`,
      nota: trimestre.nota_total
    }));
  }, [estudianteDashboard]);

  // Datos para componentes de evaluación
  const componentesEvaluacionData = useMemo(() => {
    if (!isEstudiante || !estudianteDashboard?.notas || estudianteDashboard.notas.length === 0) {
      return [];
    }

    // Obtenemos la primera materia
    const materia = estudianteDashboard.notas[0];
    const trimestresKeys = Object.keys(materia.trimestres);
    const ultimoTrimestreKey = trimestresKeys[trimestresKeys.length - 1];
    const ultimoTrimestre = materia.trimestres[ultimoTrimestreKey];

    if (!ultimoTrimestre) return [];

    return [
      { name: 'Ser', valor: ultimoTrimestre.componentes.ser, fullMark: 10 },
      { name: 'Saber', valor: ultimoTrimestre.componentes.saber, fullMark: 35 },
      { name: 'Hacer', valor: ultimoTrimestre.componentes.hacer, fullMark: 35 },
      { name: 'Decidir', valor: ultimoTrimestre.componentes.decidir, fullMark: 10 },
      { name: 'Autoeval.', valor: ultimoTrimestre.componentes.autoevaluacion, fullMark: 10 }
    ];
  }, [estudianteDashboard]);

  // Datos para estudiantes - Asistencia por materia
  const asistenciaPorMateriaData = useMemo(() => {
    if (!isEstudiante || !estudianteDashboard?.asistencias) {
      return [];
    }

    return estudianteDashboard.asistencias.map(asistencia => ({
      name: asistencia.materia_nombre,
      porcentaje: asistencia.porcentaje,
      color: asistencia.porcentaje >= 85 ? '#059669' : asistencia.porcentaje >= 75 ? '#eab308' : '#dc2626'
    }));
  }, [estudianteDashboard]);

  // Datos para estudiantes - Participaciones por materia
  const participacionesPorMateriaData = useMemo(() => {
    if (!isEstudiante || !estudianteDashboard?.participaciones) {
      return [];
    }

    return estudianteDashboard.participaciones.map(participacion => ({
      name: participacion.materia_nombre,
      total: participacion.total,
      promedio: participacion.promedio_valor
    }));
  }, [estudianteDashboard]);

  // Procesamiento de datos para gráficos de notas por trimestre
  const notasData = useMemo(() => {
    // Si no existen trimestres_stats o stats es undefined, usamos datos de ejemplo
    if (!stats?.trimestres_stats || stats.trimestres_stats.length === 0) {
      // Datos de ejemplo para cuando no hay trimestres
      return [
        { name: '1er Trim', promedio: 0 },
        { name: '2do Trim', promedio: 0 },
        { name: '3er Trim', promedio: 0 }
      ];
    }

    // Mapear trimestres a formato para gráficos
    return stats.trimestres_stats.map(trimestre => ({
      name: mapearTrimestre(trimestre.trimestre),
      promedio: trimestre.promedio
    }));
  }, [stats]);

  // Datos para gráfico de asistencia
  const asistenciaData = useMemo(() => {
    const asistenciaProm = stats?.asistencia_promedio ?? 0;

    return [
      { name: 'Presente', value: asistenciaProm, color: '#059669' },
      { name: 'Ausente', value: 100 - asistenciaProm, color: '#dc2626' }
    ];
  }, [stats]);

  // Datos para gráfico de estadísticas por materia
  const materiasData = useMemo(() => {
    if (!stats?.materias_stats || stats.materias_stats.length === 0) {
      return [];
    }

    return stats.materias_stats.map(materia => ({
      materia: materia.nombre,
      estudiantes: materia.total_estudiantes,
      promedio: materia.promedio_notas
    }));
  }, [stats]);

  // Datos para distribución de predicciones
  const prediccionesData = useMemo(() => {
    if (!stats?.predicciones_distribucion || stats.predicciones_distribucion.length === 0) {
      return [];
    }

    const colorMap: Record<string, string> = {
      'ALTO': '#059669', // Verde para rendimiento alto
      'MEDIO': '#eab308', // Amarillo para rendimiento medio
      'BAJO': '#dc2626'   // Rojo para rendimiento bajo
    };

    return stats.predicciones_distribucion.map(item => ({
      name: item.nivel_rendimiento,
      value: item.cantidad,
      color: colorMap[item.nivel_rendimiento] || '#6366f1'
    }));
  }, [stats]);

  const isLoading = (isLoadingStats && !isEstudiante) || (isEstudiante && isLoadingEstudiante);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-academic-blue border-t-transparent" />
      </div>
    );
  }

  if ((isEstudiante && estudianteError) || (!isEstudiante && statsError)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-12 w-12 mb-2" />
        <h3 className="text-lg font-medium">Error al cargar el dashboard</h3>
        <p>No se pudieron obtener los datos. Por favor intenta de nuevo más tarde.</p>
      </div>
    );
  }

  // Renderizar dashboard específico para estudiantes
  if (isEstudiante && estudianteDashboard) {
    // Calcular promedio general de todas las materias
    const promedioDeMaterias = estudianteDashboard.notas.map(materia => {
      let sum = 0;
      let count = 0;
      Object.values(materia.trimestres).forEach(trimestre => {
        sum += trimestre.nota_total;
        count++;
      });
      return count > 0 ? sum / count : 0;
    });

    const promedioGeneral = promedioDeMaterias.length > 0 ?
      promedioDeMaterias.reduce((a, b) => a + b, 0) / promedioDeMaterias.length : 0;

    // Calcular asistencia promedio general
    const asistenciaPromedio = estudianteDashboard.asistencias.length > 0 ?
      estudianteDashboard.asistencias.reduce((sum, item) => sum + item.porcentaje, 0) / estudianteDashboard.asistencias.length : 0;

    // Total de participaciones
    const totalParticipaciones = estudianteDashboard.participaciones.reduce((sum, item) => sum + item.total, 0);

    //dashboard estudiante
    return (
      <div className="space-y-6 animate-fade-in bg-white p-6 rounded-lg">
     

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Card Promedio General */}
  <Card className="relative bg-zinc-900 shadow-sm hover:shadow-md transition-shadow text-white overflow-hidden rounded-lg">
    <Award className="absolute right-4 top-4 h-16 w-16 text-white/20 pointer-events-none" />
    <CardHeader className="pb-2 z-10 relative">
      <CardTitle className="text-sm font-medium text-white/80">
        Promedio General
      </CardTitle>
    </CardHeader>
    <CardContent className="z-10 relative">
      <div className="text-3xl font-bold text-white">
        {promedioGeneral.toFixed(1)}
      </div>
      <p className="text-xs text-white/80 mt-1">
        Calificación promedio general
      </p>
    </CardContent>
  </Card>

  {/* Card Materias */}
  <Card className="relative bg-zinc-900 shadow-sm hover:shadow-md transition-shadow text-white overflow-hidden rounded-lg">
    <LibraryBig className="absolute right-4 top-4 h-16 w-16 text-white/20 pointer-events-none" />
    <CardHeader className="pb-2 z-10 relative">
      <CardTitle className="text-sm font-medium text-white/80">
        Materias
      </CardTitle>
    </CardHeader>
    <CardContent className="z-10 relative">
      <div className="text-3xl font-bold text-white">
        {estudianteDashboard.notas.length}
      </div>
      <p className="text-xs text-white/80 mt-1">
        Materias cursadas
      </p>
    </CardContent>
  </Card>

  {/* Card Asistencia */}
  <Card className="relative bg-zinc-900 shadow-sm hover:shadow-md transition-shadow text-white overflow-hidden rounded-lg">
    <CalendarCheck2 className="absolute right-4 top-4 h-16 w-16 text-white/20 pointer-events-none" />
    <CardHeader className="pb-2 z-10 relative">
      <CardTitle className="text-sm font-medium text-white/80">
        Asistencia
      </CardTitle>
    </CardHeader>
    <CardContent className="z-10 relative">
      <div className="text-3xl font-bold text-white">
        {asistenciaPromedio.toFixed(1)}%
      </div>
      <p className="text-xs text-white/80 mt-1">
        Porcentaje de asistencia
      </p>
    </CardContent>
  </Card>

  {/* Card Participaciones */}
  <Card className="relative bg-zinc-900 shadow-sm hover:shadow-md transition-shadow text-white overflow-hidden rounded-lg">
    <ClipboardCheck className="absolute right-4 top-4 h-16 w-16 text-white/20 pointer-events-none" />
    <CardHeader className="pb-2 z-10 relative">
      <CardTitle className="text-sm font-medium text-white/80">
        Participaciones
      </CardTitle>
    </CardHeader>
    <CardContent className="z-10 relative">
      <div className="text-3xl font-bold text-white">
        {totalParticipaciones}
      </div>
      <p className="text-xs text-white/80 mt-1">
        Total de participaciones
      </p>
    </CardContent>
  </Card>
</div>
        {/* Notas por Materia y Componentes */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
  {/* Notas por Trimestre */}
  {notasEstudianteData.length > 0 && (
    <Card className="bg-zinc-900 shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white">
          Notas por Trimestre
        </CardTitle>
        <CardDescription className="text-gray-300">
          {estudianteDashboard.notas.length > 0
            ? estudianteDashboard.notas[0].nombre
            : 'Evolución de notas'}
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-white p-4 rounded-b-lg">
        <div style={{ width: '100%', height: 300 }}>
          <Line
            data={{
              labels: notasEstudianteData.map((d) => d.name),
              datasets: [
                {
                  label: 'Nota',
                  data: notasEstudianteData.map((d) => d.nota),
                  borderColor: '#1e40af',
                  backgroundColor: 'rgba(30, 64, 175, 0.3)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  borderWidth: 3,
                  pointBackgroundColor: '#1e40af',
                  pointBorderWidth: 2,
                },
              ],
            }}
            options={{
              scales: {
                y: {
                  min: 0,
                  max: 100,
                  ticks: { color: '#666' },
                  grid: { color: '#f0f0f0' },
                },
                x: {
                  ticks: { color: '#666' },
                  grid: { color: '#f0f0f0' },
                },
              },
              plugins: {
                tooltip: {
                  backgroundColor: 'white',
                  borderColor: '#e2e8f0',
                  borderWidth: 1,
                  padding: 8,
                  displayColors: false,
                  titleColor: '#000',
                  bodyColor: '#000',
                  callbacks: {
                    label: (context) =>
                      `Nota: ${context.parsed.y.toFixed(1)}`,
                  },
                },
                legend: { display: false },
              },
              maintainAspectRatio: false,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )}

  {/* Asistencia por Materias */}
  {asistenciaPorMateriaData.length > 0 && (
    <Card className="bg-zinc-900 shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white">
          Asistencia por Materias
        </CardTitle>
        <CardDescription className="text-gray-300">
          Porcentaje de asistencia en cada materia
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-white p-4 rounded-b-lg">
        <div style={{ width: '100%', height: 300 }}>
          <Bar
            data={{
              labels: asistenciaPorMateriaData.map((d) => d.name),
              datasets: [
                {
                  label: 'Porcentaje',
                  data: asistenciaPorMateriaData.map((d) => d.porcentaje),
                  backgroundColor: asistenciaPorMateriaData.map((d) => d.color),
                  borderWidth: 1,
                },
              ],
            }}
            options={{
              indexAxis: 'y',
              scales: {
                x: {
                  min: 0,
                  max: 100,
                  ticks: {
                    color: '#666',
                    callback: (value) => `${value}%`,
                  },
                  grid: { color: '#f0f0f0' },
                },
                y: {
                  ticks: { color: '#666' },
                  grid: { display: false },
                },
              },
              plugins: {
                tooltip: {
                  backgroundColor: 'white',
                  borderColor: '#e2e8f0',
                  borderWidth: 1,
                  padding: 8,
                  titleColor: '#000',
                  bodyColor: '#000',
                  callbacks: {
                    label: (context) =>
                      `Asistencia: ${context.parsed.x.toFixed(1)}%`,
                  },
                },
                legend: { display: false },
              },
              maintainAspectRatio: false,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )}

  {/* Participaciones por Materias */}
  {participacionesPorMateriaData.length > 0 && (
    <Card className="bg-zinc-900 shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white">
          Participaciones por Materias
        </CardTitle>
        <CardDescription className="text-gray-300">
          Cantidad y calificación promedio de participaciones
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-white p-4 rounded-b-lg">
        <div style={{ width: '100%', height: 300 }}>
          <Bar
            data={{
              labels: participacionesPorMateriaData.map((d) => d.name),
              datasets: [
                {
                  label: 'Total participaciones',
                  data: participacionesPorMateriaData.map((d) => d.total),
                  backgroundColor: '#8884d8',
                  yAxisID: 'left-y-axis',
                },
                {
                  label: 'Promedio valor',
                  data: participacionesPorMateriaData.map((d) => d.promedio),
                  backgroundColor: '#82ca9d',
                  yAxisID: 'right-y-axis',
                },
              ],
            }}
            options={{
              scales: {
                'left-y-axis': {
                  type: 'linear',
                  position: 'left',
                  beginAtZero: true,
                  ticks: { color: '#666' },
                  grid: { color: '#f0f0f0' },
                },
                'right-y-axis': {
                  type: 'linear',
                  position: 'right',
                  beginAtZero: true,
                  min: 0,
                  max: 10,
                  ticks: { color: '#666' },
                  grid: { drawOnChartArea: false },
                },
                x: {
                  ticks: { color: '#666' },
                  grid: { color: '#f0f0f0' },
                },
              },
              plugins: {
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  titleColor: '#fff',
                  bodyColor: '#fff',
                  borderColor: '#333',
                  borderWidth: 1,
                  cornerRadius: 6,
                  boxPadding: 6,
                },
                legend: { position: 'top', labels: { color: '#666' } },
              },
              maintainAspectRatio: false,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )}
</div>


        {/* Predicciones */}
        {estudianteDashboard.predicciones && estudianteDashboard.predicciones.length > 0 && (
  <Card className="bg-white shadow-sm">
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-gray-900">
        Predicción de Rendimiento
      </CardTitle>
      <CardDescription>
        Estimación de rendimiento académico
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {estudianteDashboard.predicciones.map((prediccion) => {
          const bgColor =
            prediccion.nivel_rendimiento === 'ALTO'
              ? 'bg-green-100'
              : prediccion.nivel_rendimiento === 'MEDIO'
              ? 'bg-yellow-100'
              : 'bg-red-100';

          const textColor =
            prediccion.nivel_rendimiento === 'ALTO'
              ? 'text-green-800'
              : prediccion.nivel_rendimiento === 'MEDIO'
              ? 'text-yellow-800'
              : 'text-red-800';

          const badgeVariant =
            prediccion.nivel_rendimiento === 'ALTO'
              ? 'outline'
              : prediccion.nivel_rendimiento === 'MEDIO'
              ? 'secondary'
              : 'destructive';

          return (
            <div key={prediccion.id} className={`p-4 rounded-lg ${bgColor}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`font-semibold text-lg ${textColor}`}>
                  {prediccion.materia_nombre}
                </h3>
                <Badge variant={badgeVariant} className="flex items-center gap-1 px-3 py-1 text-sm">
                  🎯 {prediccion.nivel_rendimiento}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <div className={`flex justify-between ${textColor}`}>
                  <span>Nota predicha:</span>
                  <span className="font-bold">{prediccion.valor_numerico.toFixed(1)}</span>
                </div>
                <div className={`flex justify-between ${textColor}`}>
                  <span>Prob. aprobar:</span>
                  <span className="font-bold">{prediccion.probabilidad_aprobar.toFixed(1)}%</span>
                </div>
                <div className={`flex justify-between ${textColor}`}>
                  <span>Promedio actual:</span>
                  <span className="font-bold">{prediccion.variables.promedio_notas.toFixed(1)}</span>
                </div>
                <div className={`flex justify-between ${textColor}`}>
                  <span>Asistencia:</span>
                  <span className="font-bold">{prediccion.variables.porcentaje_asistencia.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>
  </Card>
)}

        {/* Tabla de Notas por Materia */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Resumen de Notas por Materia
            </CardTitle>
            <CardDescription>
              Calificaciones de cada trimestre por materia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materia</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">1er Trim.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">2do Trim.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">3er Trim.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {estudianteDashboard.notas.map(materia => {
                    const primerTrimestre = Object.entries(materia.trimestres).find(([key]) => key.includes('PRIMERO'));
                    const segundoTrimestre = Object.entries(materia.trimestres).find(([key]) => key.includes('SEGUNDO'));
                    const tercerTrimestre = Object.entries(materia.trimestres).find(([key]) => key.includes('TERCERO'));

                    const nota1 = primerTrimestre ? primerTrimestre[1].nota_total : null;
                    const nota2 = segundoTrimestre ? segundoTrimestre[1].nota_total : null;
                    const nota3 = tercerTrimestre ? tercerTrimestre[1].nota_total : null;

                    const notasValidas = [nota1, nota2, nota3].filter(nota => nota !== null) as number[];
                    const promedio = notasValidas.length > 0 ?
                      notasValidas.reduce((sum, nota) => sum + nota, 0) / notasValidas.length :
                      0;

                    const getBgColor = (nota: number | null) => {
                      if (nota === null) return '';
                      return nota >= 70 ? 'bg-green-50' : nota >= 51 ? 'bg-yellow-50' : 'bg-red-50';
                    };

                    const getTextColor = (nota: number | null) => {
                      if (nota === null) return '';
                      return nota >= 70 ? 'text-green-700' : nota >= 51 ? 'text-yellow-700' : 'text-red-700';
                    };

                    return (
                      <tr key={materia.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{materia.nombre}</td>
                        <td className={`px-4 py-3 text-center text-sm ${getBgColor(nota1)} ${getTextColor(nota1)}`}>
                          {nota1 !== null ? nota1.toFixed(1) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-center text-sm ${getBgColor(nota2)} ${getTextColor(nota2)}`}>
                          {nota2 !== null ? nota2.toFixed(1) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-center text-sm ${getBgColor(nota3)} ${getTextColor(nota3)}`}>
                          {nota3 !== null ? nota3.toFixed(1) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-center text-sm font-bold ${getBgColor(promedio)} ${getTextColor(promedio)}`}>
                          {promedio.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  // Dashboard para administradores y profesores (el que ya tenías)
return (
  <div className="space-y-10 px-4 bg-white animate-fade-in">
    
    {/* KPI Section */}
    <section>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen General</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Estudiantes */}
        <Card className="relative bg-zinc-900 text-white overflow-hidden shadow-md">
          <UsersRound className="absolute right-3 top-3 h-14 w-14 text-white/20 pointer-events-none" />
          <CardHeader className="pb-1 relative z-10">
            <CardTitle className="text-sm font-medium text-white/90">Total Estudiantes</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{stats?.total_estudiantes ?? 0}</div>
            <p className="text-xs text-gray-300 mt-1">Estudiantes activos</p>
          </CardContent>
        </Card>

        {/* Materias */}
        <Card className="relative bg-zinc-900 text-white overflow-hidden shadow-md">
          <LibraryBig className="absolute right-3 top-3 h-14 w-14 text-white/20 pointer-events-none" />
          <CardHeader className="pb-1 relative z-10">
            <CardTitle className="text-sm font-medium text-white/90">Materias</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{stats?.total_materias ?? 0}</div>
            <p className="text-xs text-gray-300 mt-1">Materias registradas</p>
          </CardContent>
        </Card>

        {/* Promedio General */}
        <Card className="relative bg-zinc-900 text-white overflow-hidden shadow-md">
          <FileText className="absolute right-3 top-3 h-14 w-14 text-white/20 pointer-events-none" />
          <CardHeader className="pb-1 relative z-10">
            <CardTitle className="text-sm font-medium text-white/90">Promedio General</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{(stats?.promedio_general ?? 0).toFixed(1)}</div>
            <p className="text-xs text-gray-300 mt-1">Calificación promedio</p>
          </CardContent>
        </Card>

        {/* Asistencia */}
        <Card className="relative bg-zinc-900 text-white overflow-hidden shadow-md">
          <CalendarCheck2 className="absolute right-3 top-3 h-14 w-14 text-white/20 pointer-events-none" />
          <CardHeader className="pb-1 relative z-10">
            <CardTitle className="text-sm font-medium text-white/90">Asistencia</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{(stats?.asistencia_promedio ?? 0).toFixed(1)}%</div>
            <p className="text-xs text-gray-300 mt-1">Promedio de asistencia</p>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* Estadísticas por materia */}
    {materiasData.length > 0 && (
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rendimiento Académico por Materia</h2>
        <Card className="bg-zinc-900 text-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Promedios por Materia</CardTitle>
            <CardDescription className="text-gray-400">Comparativa horizontal de promedios</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto bg-white rounded-lg p-4">
            <Bar
              data={{
                labels: materiasData.map((item) => item.materia),
                datasets: [
                  {
                    label: 'Promedio',
                    data: materiasData.map((item) => item.promedio),
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                scales: {
                  x: { min: 0, max: 100 },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => `Promedio: ${context.parsed.x.toFixed(1)}`,
                    },
                  },
                  legend: { display: false },
                },
              }}
            />
          </CardContent>
        </Card>
      </section>
    )}

    {/* Distribuciones */}
    <section>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Distribuciones</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asistencia */}
        <Card className="bg-zinc-900 text-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Distribución de Asistencia</CardTitle>
            <CardDescription className="text-gray-400">Porcentajes generales de asistencia</CardDescription>
          </CardHeader>
          <CardContent className="h-64 bg-white rounded-lg p-4">
            <Pie
              data={{
                labels: asistenciaData.map((item) => item.name),
                datasets: [
                  {
                    data: asistenciaData.map((item) => item.value),
                    backgroundColor: asistenciaData.map((item) => item.color),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%`,
                    },
                  },
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Predicciones */}
        {prediccionesData.length > 0 && (
          <Card className="bg-zinc-900 text-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">Predicciones de Rendimiento</CardTitle>
              <CardDescription className="text-gray-400">Distribución por nivel de rendimiento</CardDescription>
            </CardHeader>
            <CardContent className="h-64 bg-white rounded-lg p-4">
              <Pie
                data={{
                  labels: prediccionesData.map((item) => item.name),
                  datasets: [
                    {
                      data: prediccionesData.map((item) => item.value),
                      backgroundColor: prediccionesData.map((item) => item.color),
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${context.parsed} estudiantes`,
                      },
                    },
                  },
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  </div>
);
  {/*hasta aqui */}
};

export default Dashboard;
