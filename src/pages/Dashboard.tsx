import React, { useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, ClipboardCheck, Grid2X2, AlertCircle, Award, BookOpen, Users, CheckSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { DashboardStats, EstudianteDashboard } from '@/types/academic';
import { toast } from '@/components/ui/use-toast';

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

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="bg-gradient-academic rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                ¡Bienvenido/a, {user?.first_name || estudianteDashboard.estudiante.nombre_completo.split(' ')[0]}!
              </h1>
              <p className="text-white/90 text-lg">
                Panel académico de estudiante
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 mb-2">
                ESTUDIANTE
              </Badge>
              <p className="text-white/80 text-sm">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Promedio General
              </CardTitle>
              <Award className="h-5 w-5 text-academic-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{promedioGeneral.toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Calificación promedio general
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Materias
              </CardTitle>
              <BookOpen className="h-5 w-5 text-academic-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{estudianteDashboard.notas.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                Materias cursadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Asistencia
              </CardTitle>
              <CheckSquare className="h-5 w-5 text-academic-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {asistenciaPromedio.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Porcentaje de asistencia
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Participaciones
              </CardTitle>
              <Users className="h-5 w-5 text-academic-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {totalParticipaciones}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total de participaciones
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notas por Materia y Componentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notas por trimestre */}
          {notasEstudianteData.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Notas por Trimestre
                </CardTitle>
                <CardDescription>
                  {estudianteDashboard.notas.length > 0 ? estudianteDashboard.notas[0].nombre : 'Evolución de notas'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={notasEstudianteData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value) => [`${Number(value).toFixed(1)}`, 'Nota']}
                    />
                    <Line
                      type="monotone"
                      dataKey="nota"
                      stroke="#1e40af"
                      strokeWidth={3}
                      dot={{ fill: '#1e40af', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Componentes de la nota del último trimestre */}
          {componentesEvaluacionData.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Componentes de Evaluación
                </CardTitle>
                <CardDescription>
                  Último trimestre de {estudianteDashboard.notas.length > 0 ? estudianteDashboard.notas[0].nombre : 'la materia'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={componentesEvaluacionData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis domain={[0, 35]} />
                    <Radar
                      name="Puntos obtenidos"
                      dataKey="valor"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value) => [`${Number(value).toFixed(2)}`, 'Puntos']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Asistencias y Participaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asistencia por materias */}
          {asistenciaPorMateriaData.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Asistencia por Materias
                </CardTitle>
                <CardDescription>
                  Porcentaje de asistencia en cada materia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={asistenciaPorMateriaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Asistencia']}
                    />
                    <Bar
                      dataKey="porcentaje"
                      name="Porcentaje"
                    >
                      {asistenciaPorMateriaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Participaciones */}
          {participacionesPorMateriaData.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Participaciones por Materias
                </CardTitle>
                <CardDescription>
                  Cantidad y calificación promedio de participaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={participacionesPorMateriaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total" name="Total participaciones" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="promedio" name="Promedio valor" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
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
              <div className="space-y-4">
                {estudianteDashboard.predicciones.map((prediccion) => {
                  const bgColor = prediccion.nivel_rendimiento === 'ALTO' ?
                    'bg-green-100' :
                    prediccion.nivel_rendimiento === 'MEDIO' ? 'bg-yellow-100' : 'bg-red-100';

                  const textColor = prediccion.nivel_rendimiento === 'ALTO' ?
                    'text-green-800' :
                    prediccion.nivel_rendimiento === 'MEDIO' ? 'text-yellow-800' : 'text-red-800';

                  return (
                    <div key={prediccion.id} className={`p-4 rounded-lg ${bgColor}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-semibold ${textColor}`}>{prediccion.materia_nombre}</h3>
                        <Badge
                          variant={
                            prediccion.nivel_rendimiento === 'ALTO' ? 'outline' :
                              prediccion.nivel_rendimiento === 'MEDIO' ? 'secondary' : 'destructive'
                          }
                        >
                          {prediccion.nivel_rendimiento}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                        <div>
                          <p className={`text-xs font-medium ${textColor}`}>Nota predicha</p>
                          <p className={`text-lg font-bold ${textColor}`}>{prediccion.valor_numerico.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${textColor}`}>Prob. aprobar</p>
                          <p className={`text-lg font-bold ${textColor}`}>{prediccion.probabilidad_aprobar.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${textColor}`}>Promedio actual</p>
                          <p className={`text-lg font-bold ${textColor}`}>{prediccion.variables.promedio_notas.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${textColor}`}>Asistencia</p>
                          <p className={`text-lg font-bold ${textColor}`}>{prediccion.variables.porcentaje_asistencia.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  )
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
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-academic rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              ¡Bienvenido/a, {user?.first_name}!
            </h1>
            <p className="text-white/90 text-lg">
              {user?.role === 'ADMINISTRATIVO'
                ? 'Panel de administración del sistema académico'
                : 'Dashboard de gestión académica'
              }
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 mb-2">
              {user?.role}
            </Badge>
            <p className="text-white/80 text-sm">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Estudiantes
            </CardTitle>
            <User className="h-5 w-5 text-academic-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.total_estudiantes ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Estudiantes activos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Materias
            </CardTitle>
            <Calendar className="h-5 w-5 text-academic-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.total_materias ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Materias registradas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Promedio General
            </CardTitle>
            <ClipboardCheck className="h-5 w-5 text-academic-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(stats?.promedio_general ?? 0).toFixed(1)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Calificación promedio
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Asistencia
            </CardTitle>
            <Grid2X2 className="h-5 w-5 text-academic-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(stats?.asistencia_promedio ?? 0).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Promedio de asistencia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de Notas */}
        {notasData.length > 0 && (
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Tendencia de Notas
              </CardTitle>
              <CardDescription>
                Evolución del promedio académico por trimestre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={notasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}`, 'Promedio']}
                  />
                  <Line
                    type="monotone"
                    dataKey="promedio"
                    stroke="#1e40af"
                    strokeWidth={3}
                    dot={{ fill: '#1e40af', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Distribución de Asistencia */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Distribución de Asistencia
            </CardTitle>
            <CardDescription>
              Porcentaje de asistencia general
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={asistenciaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {asistenciaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Predicciones por Nivel */}
      {prediccionesData.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Predicciones de Rendimiento
            </CardTitle>
            <CardDescription>
              Distribución de estudiantes según nivel de rendimiento predicho
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prediccionesData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prediccionesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, 'Estudiantes']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Materias y Promedios */}
      {materiasData.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Estadísticas por Materia
            </CardTitle>
            <CardDescription>
              Promedio de notas por materia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materiasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="materia" stroke="#666" />
                <YAxis stroke="#666" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}`, 'Promedio']}
                />
                <Bar
                  dataKey="promedio"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  name="Promedio"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
