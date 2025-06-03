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

    
       <div className="rounded-xl border shadow-sm overflow-hidden">
 <Table>
  <TableCaption className="text-muted-foreground">
    Lista de materias registradas
  </TableCaption>
  <TableHeader className="bg-black">
    <TableRow>
      <TableHead className="font-semibold text-white uppercase tracking-wide">Código</TableHead>
      <TableHead className="font-semibold text-white uppercase tracking-wide">Nombre</TableHead>
      <TableHead className="font-semibold text-white uppercase tracking-wide">Descripción</TableHead>
      <TableHead className="font-semibold text-white uppercase tracking-wide">Créditos</TableHead>
      <TableHead className="font-semibold text-white uppercase tracking-wide">Profesor</TableHead>
      <TableHead className="font-semibold text-white uppercase tracking-wide text-right">Acciones</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredMaterias.length === 0 ? (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground italic">
          No se encontraron materias
        </TableCell>
      </TableRow>
    ) : (
      filteredMaterias.map((materia: Materia, index: number) => (
        <TableRow
          key={materia.id}
          className={`hover:bg-gray-100 transition ${
            index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          }`}
        >
          <TableCell className="font-mono text-sm text-gray-700">{materia.codigo}</TableCell>
          <TableCell className="font-semibold text-gray-900">{materia.nombre}</TableCell>
          <TableCell className="max-w-xs truncate text-gray-600">
            {materia.descripcion || (
              <span className="italic text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="text-center text-gray-700 font-medium">{materia.creditos}</TableCell>
          <TableCell className="text-gray-800">
            {materia.profesor_detail ? (
              `${materia.profesor_detail.first_name} ${materia.profesor_detail.last_name}`
            ) : (
              <span className="italic text-muted-foreground">No asignado</span>
            )}
          </TableCell>
          <TableCell className="text-right space-x-2">
            <button
              onClick={() => handleOpenEditDialog(materia)}
              className="px-3 py-1 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Editar
            </button>
            {isAdmin && (
              <button
                onClick={() => handleDeleteMateria(materia.id)}
                className="px-3 py-1 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            )}
          </TableCell>
        </TableRow>
      ))
    )}
  </TableBody>
</Table>
</div>
      

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
