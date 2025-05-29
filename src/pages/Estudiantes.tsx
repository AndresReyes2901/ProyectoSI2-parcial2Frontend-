import React, {useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
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
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Search, Edit, Trash2, UserPlus, Loader2} from 'lucide-react';
import {User} from '@/types/auth';
import {Curso} from '@/types/academic';
import {toast} from "@/hooks/use-toast";
import {Badge} from '@/components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

// Tipo para estudiante
interface Estudiante extends Omit<User, 'curso_detail'> {
    curso?: number;
    curso_detail?: {
        id: number;
        nombre: string;
        nivel: string;
        materias: number[];
    };
    is_active: boolean;
}

// Tipo para el formulario
interface EstudianteForm {
    username: string;
    password?: string;
    email: string;
    first_name: string;
    last_name: string;
    curso?: number;
    is_active: boolean;
    role?: 'ESTUDIANTE' | 'PROFESOR' | 'ADMINISTRATIVO';
}

const Estudiantes: React.FC = () => {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentEstudiante, setCurrentEstudiante] = useState<Estudiante | null>(null);
    const [formData, setFormData] = useState<EstudianteForm>({
        username: "",
        password: "",
        email: "",
        first_name: "",
        last_name: "",
        curso: undefined,
        is_active: true,
        role: "ESTUDIANTE" // Por defecto será estudiante
    });
    const [filterCurso, setFilterCurso] = useState<string>('ALL');

    // Verificar si el usuario es administrador o profesor
    const isAdmin = user?.role === 'ADMINISTRATIVO';
    const isProfesor = user?.role === 'PROFESOR';

    // Consulta para obtener todos los estudiantes
    const {
        data: estudiantes = [],
        isLoading,
        error
    } = useQuery({
        queryKey: ['estudiantes', filterCurso],
        queryFn: () => api.fetchEstudiantes(
            filterCurso === 'ALL'
                ? {}
                : { curso: Number(filterCurso) }
        ),
    });

    // Consulta para obtener los cursos
    const {data: cursos = []} = useQuery({
        queryKey: ['cursos'],
        queryFn: api.fetchCursos
    });

    // Mutación para crear un nuevo estudiante
    const createEstudianteMutation = useMutation({
        mutationFn: (data: EstudianteForm) => {
            return api.createUsuario({
                ...data,
                role: 'ESTUDIANTE',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['estudiantes']});
            toast({
                title: "Estudiante creado",
                description: "El estudiante ha sido creado exitosamente",
            });
            handleCloseDialog();
        },
        onError: (error) => {
            console.error("Error al crear estudiante:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo crear el estudiante. Por favor, intente nuevamente.",
            });
        }
    });

    // Mutación para actualizar un estudiante
    const updateEstudianteMutation = useMutation({
        mutationFn: ({id, data}: { id: number; data: Partial<EstudianteForm> }) => {
            return api.adminUpdateUsuario(id, data);
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({queryKey: ['estudiantes']});
            toast({
                title: "Estudiante actualizado",
                description: response.message || "Los datos del estudiante han sido actualizados",
            });
            handleCloseDialog();
        },
        onError: (error) => {
            console.error("Error al actualizar estudiante:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo actualizar el estudiante. Por favor, intente nuevamente.",
            });
        }
    });

    // Mutación para eliminar un estudiante
    const deleteEstudianteMutation = useMutation({
        mutationFn: (id: number) => {
            return api.deleteUsuario(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['estudiantes']});
            toast({
                title: "Estudiante eliminado",
                description: "El estudiante ha sido eliminado del sistema",
            });
        },
        onError: (error) => {
            console.error("Error al eliminar estudiante:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo eliminar el estudiante. Por favor, intente nuevamente.",
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

    // Filtrar estudiantes por término de búsqueda
    const filteredEstudiantes = estudiantes.filter((estudiante: Estudiante) => {
        const fullName = `${estudiante.first_name} ${estudiante.last_name}`.toLowerCase();
        return (
            fullName.includes(searchTerm.toLowerCase()) ||
            estudiante.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            estudiante.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (estudiante.curso_detail?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || false)
        );
    });

    // Manejador para abrir el diálogo de creación
    const handleOpenCreateDialog = () => {
        setCurrentEstudiante(null);
        setFormData({
            username: "",
            password: "",
            email: "",
            first_name: "",
            last_name: "",
            curso: undefined,
            is_active: true,
            role: "ESTUDIANTE" // Por defecto será estudiante
        });
        setIsDialogOpen(true);
    };

    // Manejador para abrir el diálogo de edición
    const handleOpenEditDialog = (estudiante: Estudiante) => {
        setCurrentEstudiante(estudiante);
        setFormData({
            username: estudiante.username,
            email: estudiante.email,
            first_name: estudiante.first_name,
            last_name: estudiante.last_name,
            curso: estudiante.curso,
            is_active: estudiante.is_active,
            role: estudiante.role
        });
        setIsDialogOpen(true);
    };

    // Manejador para cerrar el diálogo
    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setCurrentEstudiante(null);
    };

    // Manejador para cambios en el formulario
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'curso' ? (value ? parseInt(value) : undefined) : value
        }));
    };

    // Manejador para enviar el formulario
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (currentEstudiante) {
            // Actualizar estudiante existente
            const updateData: Partial<EstudianteForm> = {
                username: formData.username,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                curso: formData.curso,
                is_active: formData.is_active,
                role: formData.role
            };

            updateEstudianteMutation.mutate({
                id: currentEstudiante.id,
                data: updateData
            });
        } else {
            // Crear nuevo estudiante (aquí sí incluimos la contraseña)
            createEstudianteMutation.mutate(formData);
        }
    };

    // Manejador para eliminar estudiante
    const handleDeleteEstudiante = (id: number) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este estudiante? Esta acción no se puede deshacer.")) {
            deleteEstudianteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin"/>
                <p className="ml-2">Cargando estudiantes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-96 text-red-500">
                <p>Error al cargar los estudiantes. Por favor, intenta nuevamente.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Encabezado */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Estudiantes</h1>
                {isAdmin && (
                    <Button onClick={handleOpenCreateDialog}>
                        <UserPlus className="mr-2 h-4 w-4"/> Nuevo Estudiante
                    </Button>
                )}
            </div>

            {/* BARRA DE FILTROS: búsqueda + selector de curso */}
            <div className="flex items-center space-x-2 mb-4">
                <Search className="w-5 h-5 text-gray-500"/>
                <Input
                    placeholder="Buscar por nombre, email o curso"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select
                    value={filterCurso}
                    onValueChange={(value) => setFilterCurso(value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por curso"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {cursos.map((c: Curso) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                                {c.nombre}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Pestañas: Tabla / Tarjetas */}
            <Tabs defaultValue="tabla" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="tabla">Vista de Tabla</TabsTrigger>
                    <TabsTrigger value="tarjetas">Vista de Tarjetas</TabsTrigger>
                </TabsList>

                <TabsContent value="tabla">
                    <div className="rounded-md border">
                        <Table>
                            <TableCaption>Lista de estudiantes registrados</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Curso</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEstudiantes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4">
                                            No se encontraron estudiantes
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEstudiantes.map((estudiante: Estudiante) => (
                                        <TableRow key={estudiante.id}>
                                            <TableCell>{estudiante.id}</TableCell>
                                            <TableCell>
                                                {estudiante.first_name} {estudiante.last_name}
                                            </TableCell>
                                            <TableCell>{estudiante.username}</TableCell>
                                            <TableCell>{estudiante.email}</TableCell>
                                            <TableCell>
                                                {estudiante.curso_detail?.nombre || 'No asignado'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEditDialog(estudiante)}
                                                >
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                                {isAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteEstudiante(estudiante.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500"/>
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
                        {filteredEstudiantes.length === 0 ? (
                            <div className="col-span-full text-center py-10">
                                <p>No se encontraron estudiantes</p>
                            </div>
                        ) : (
                            filteredEstudiantes.map((estudiante: Estudiante) => (
                                <Card key={estudiante.id}>
                                    <CardHeader>
                                        <CardTitle>
                                            {estudiante.first_name} {estudiante.last_name}
                                        </CardTitle>
                                        <CardDescription>{estudiante.username}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm">Email: {estudiante.email}</p>
                                        <p className="text-sm mt-2">
                                            Curso:{' '}
                                            {estudiante.curso_detail ? (
                                                <Badge variant="secondary">
                                                    {estudiante.curso_detail.nombre}
                                                </Badge>
                                            ) : (
                                                'No asignado'
                                            )}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenEditDialog(estudiante)}
                                        >
                                            <Edit className="h-3 w-3 mr-1"/> Editar
                                        </Button>
                                        {isAdmin && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteEstudiante(estudiante.id)}
                                            >
                                                <Trash2 className="h-3 w-3 mr-1"/> Eliminar
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Diálogo para crear/editar estudiante */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {currentEstudiante ? "Editar Estudiante" : "Nuevo Estudiante"}
                        </DialogTitle>
                        <DialogDescription>
                            {currentEstudiante
                                ? "Actualiza la información del estudiante aquí."
                                : "Ingresa los datos del nuevo estudiante."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">Nombre</Label>
                                    <Input
                                        id="first_name"
                                        name="first_name"
                                        placeholder="Nombre"
                                        value={formData.first_name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Apellido</Label>
                                    <Input
                                        id="last_name"
                                        name="last_name"
                                        placeholder="Apellido"
                                        value={formData.last_name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">Nombre de usuario</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="Nombre de usuario"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    placeholder="correo@ejemplo.com"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {!currentEstudiante && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="******"
                                        value={formData.password || ""}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="curso">Curso</Label>
                                <select
                                    id="curso"
                                    name="curso"
                                    value={formData.curso || ""}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-md"
                                >
                                    <option value="">Seleccionar curso</option>
                                    {cursos.map((curso: Curso) => (
                                        <option key={curso.id} value={curso.id}>
                                            {curso.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="is_active">Estado</Label>
                                <select
                                    id="is_active"
                                    name="is_active"
                                    value={formData.is_active ? "true" : "false"}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            is_active: e.target.value === "true",
                                        }))
                                    }
                                    className="w-full px-3 py-2 border rounded-md"
                                >
                                    <option value="true">Activo</option>
                                    <option value="false">Inactivo</option>
                                </select>
                            </div>

                            {isAdmin && (
                                <div className="space-y-2">
                                    <Label htmlFor="role">Rol</Label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role || ""}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="ESTUDIANTE">Estudiante</option>
                                        <option value="ADMINISTRATIVO">Administrativo</option>
                                        <option value="PROFESOR">Profesor</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={createEstudianteMutation.isPending || updateEstudianteMutation.isPending}
                            >
                                {(createEstudianteMutation.isPending || updateEstudianteMutation.isPending) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                )}
                                {currentEstudiante ? "Actualizar" : "Crear"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Estudiantes;
