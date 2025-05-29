import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Materia } from '@/types/academic';
import { User } from '@/types/auth';

interface MateriaFormData {
  nombre: string;
  descripcion: string;
  codigo: string;
  creditos: number;
  profesor: number;  // Cambiado de opcional a requerido
}

const Materias: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMateria, setCurrentMateria] = useState<Materia | null>(null);
  const [formData, setFormData] = useState<MateriaFormData>({
    nombre: "",
    descripcion: "",
    codigo: "",
    creditos: 0,
    profesor: 0
  });

  // Verificar si el usuario es administrador o profesor
  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role=== 'PROFESOR';

  // Consulta para obtener todas las materias
  const {
    data: materias = [],
    isLoading: isLoadingMaterias,
    error: materiasError
  } = useQuery({
    queryKey: ['materias'],
    queryFn: api.fetchMaterias
  });

  // Consulta para obtener profesores
  const {
    data: profesores = [],
    isLoading: isLoadingProfesores
  } = useQuery({
    queryKey: ['profesores'],
    queryFn: async () => {
      const response = await api.fetchUsuarios({ rol: 'PROFESOR' });
      return response;
    }
  });


  const createMateriaMutation = useMutation({
    mutationFn: (data: MateriaFormData) => api.createMateria(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      toast({
        title: "Materia creada",
        description: "La materia ha sido creada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error al crear materia:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la materia. Por favor, intente nuevamente.",
      });
    }
  });

  // Mutación para actualizar una materia
  const updateMateriaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MateriaFormData }) => api.updateMateria(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      toast({
        title: "Materia actualizada",
        description: "La materia ha sido actualizada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error al actualizar materia:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la materia. Por favor, intente nuevamente.",
      });
    }
  });

  // Mutación para eliminar una materia
  const deleteMateriaMutation = useMutation({
    mutationFn: (id: number) => api.deleteMateria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      toast({
        title: "Materia eliminada",
        description: "La materia ha sido eliminada del sistema",
      });
    },
    onError: (error) => {
      console.error("Error al eliminar materia:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la materia. Por favor, intente nuevamente.",
      });
    }
  });

  // Control de acceso - hacemos esto después de los hooks
  if (!isAdmin && !isProfesor) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  // Filtrar materias por término de búsqueda
  const filteredMaterias = materias.filter((materia: Materia) => {
    const nombreMatch = materia.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const codigoMatch = materia.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const profesorMatch = materia.profesor_detail?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         materia.profesor_detail?.last_name.toLowerCase().includes(searchTerm.toLowerCase());

    return nombreMatch || codigoMatch || profesorMatch;
  });

  // Manejador para abrir el diálogo de creación
  const handleOpenCreateDialog = () => {
    setCurrentMateria(null);
    setFormData({
      nombre: "",
      descripcion: "",
      codigo: "",
      creditos: 0,
      profesor: 0
    });
    setIsDialogOpen(true);
  };

  // Manejador para abrir el diálogo de edición
  const handleOpenEditDialog = (materia: Materia) => {
    setCurrentMateria(materia);
    setFormData({
      nombre: materia.nombre,
      descripcion: materia.descripcion || "",
      codigo: materia.codigo,
      creditos: materia.creditos || 0,
      profesor: materia.profesor
    });
    setIsDialogOpen(true);
  };

  // Manejador para cerrar el diálogo
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentMateria(null);
  };

  // Manejador para cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'profesor' ? (value ? parseInt(value) : 0) : name === 'creditos' ? parseInt(value) : value
    }));
  };

  // Manejador para enviar el formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentMateria) {
      // Actualizar materia existente
      updateMateriaMutation.mutate({
        id: currentMateria.id,
        data: formData
      });
    } else {
      // Crear nueva materia
      createMateriaMutation.mutate(formData);
    }
  };

  // Manejador para eliminar materia
  const handleDeleteMateria = (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta materia? Esta acción no se puede deshacer.")) {
      deleteMateriaMutation.mutate(id);
    }
  };

  if (isLoadingMaterias || isLoadingProfesores) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando información...</p>
      </div>
    );
  }

  if (materiasError) {
    return (
      <div className="flex justify-center items-center h-96 text-red-500">
        <p>Error al cargar las materias. Por favor, intenta nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Materias</h1>
        {isAdmin && (
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Materia
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Search className="w-5 h-5 text-gray-500" />
        <Input
          placeholder="Buscar por nombre, código o profesor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tabla">Vista de Tabla</TabsTrigger>
          <TabsTrigger value="tarjetas">Vista de Tarjetas</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla">
          <div className="rounded-md border">
            <Table>
              <TableCaption>Lista de materias registradas</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No se encontraron materias
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterias.map((materia: Materia) => (
                    <TableRow key={materia.id}>
                      <TableCell>{materia.codigo}</TableCell>
                      <TableCell className="font-medium">{materia.nombre}</TableCell>
                      <TableCell className="max-w-xs truncate">{materia.descripcion || "-"}</TableCell>
                      <TableCell>{materia.creditos}</TableCell>
                      <TableCell>
                        {materia.profesor_detail ? (
                          `${materia.profesor_detail.first_name} ${materia.profesor_detail.last_name}`
                        ) : "No asignado"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(materia)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMateria(materia.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="tarjetas">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterias.length === 0 ? (
              <div className="col-span-full text-center py-10">
                <p>No se encontraron materias</p>
              </div>
            ) : (
              filteredMaterias.map((materia: Materia) => (
                <Card key={materia.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{materia.nombre}</CardTitle>
                        <CardDescription>{materia.codigo}</CardDescription>
                      </div>
                      <Badge variant="outline">{materia.profesor_detail ? "Con profesor" : "Sin profesor"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {materia.descripcion ? (
                      <p className="text-sm text-muted-foreground">{materia.descripcion}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sin descripción</p>
                    )}
                    <div className="mt-4">
                      <p className="text-sm font-semibold">Créditos:</p>
                      <p className="text-sm">{materia.creditos}</p>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-semibold">Profesor:</p>
                      <p className="text-sm">
                        {materia.profesor_detail ? (
                          `${materia.profesor_detail.first_name} ${materia.profesor_detail.last_name}`
                        ) : "No asignado"}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(materia)}>
                      <Edit className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    {isAdmin && (
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteMateria(materia.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo para crear/editar materia */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {currentMateria ? "Editar Materia" : "Nueva Materia"}
            </DialogTitle>
            <DialogDescription>
              {currentMateria
                ? "Actualiza la información de la materia aquí."
                : "Ingresa los datos de la nueva materia."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    placeholder="Nombre de la materia"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    name="codigo"
                    placeholder="Ej: MAT101"
                    value={formData.codigo}
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
                  placeholder="Descripción de la materia"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditos">Créditos</Label>
                <Input
                  id="creditos"
                  name="creditos"
                  type="number"
                  placeholder="Número de créditos"
                  value={formData.creditos}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profesor">Profesor</Label>
                <select
                  id="profesor"
                  name="profesor"
                  value={formData.profesor || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccionar profesor</option>
                  {profesores.map((profesor: User) => (
                    <option key={profesor.id} value={profesor.id}>
                      {profesor.first_name} {profesor.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMateriaMutation.isPending || updateMateriaMutation.isPending}
              >
                {(createMateriaMutation.isPending || updateMateriaMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {currentMateria ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materias;
