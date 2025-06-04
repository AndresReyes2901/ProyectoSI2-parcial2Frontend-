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
        role: "ESTUDIANTE"
    });
    const [filterCurso, setFilterCurso] = useState<string>('ALL');

    const isAdmin = user?.role === 'ADMINISTRATIVO';
    const isProfesor = user?.role === 'PROFESOR';

    const {
        data: estudiantes = [],
        isLoading,
        error
    } = useQuery({
        queryKey: ['estudiantes', filterCurso],
        queryFn: () => api.fetchEstudiantes(filterCurso === 'ALL' ? {} : {curso: Number(filterCurso)}),
    });

    const {data: cursos = []} = useQuery({
        queryKey: ['cursos'],
        queryFn: api.fetchCursos
    });

    const createEstudianteMutation = useMutation({
        mutationFn: (data: EstudianteForm) => api.createUsuario({...data, role: 'ESTUDIANTE'}),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['estudiantes']});
            toast({title: "Estudiante creado", description: "El estudiante ha sido creado exitosamente"});
            handleCloseDialog();
        },
        onError: () => {
            toast({variant: "destructive", title: "Error", description: "No se pudo crear el estudiante."});
        }
    });

    const updateEstudianteMutation = useMutation({
        mutationFn: ({id, data}: {id: number, data: Partial<EstudianteForm>}) => api.adminUpdateUsuario(id, data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({queryKey: ['estudiantes']});
            toast({title: "Estudiante actualizado", description: response.message || "Actualización exitosa"});
            handleCloseDialog();
        },
        onError: () => {
            toast({variant: "destructive", title: "Error", description: "No se pudo actualizar el estudiante."});
        }
    });

    const deleteEstudianteMutation = useMutation({
        mutationFn: (id: number) => api.deleteUsuario(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['estudiantes']});
            toast({title: "Estudiante eliminado", description: "El estudiante ha sido eliminado"});
        },
        onError: () => {
            toast({variant: "destructive", title: "Error", description: "No se pudo eliminar el estudiante."});
        }
    });

    if (!isAdmin && !isProfesor) {
        return (
            <div className="flex justify-center items-center h-96">
                <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
            </div>
        );
    }

    const filteredEstudiantes = estudiantes.filter((e: Estudiante) => {
        const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
        return (
            fullName.includes(searchTerm.toLowerCase()) ||
            e.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.curso_detail?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || false)
        );
    });

    const handleOpenCreateDialog = () => {
        setCurrentEstudiante(null);
        setFormData({username: "", password: "", email: "", first_name: "", last_name: "", curso: undefined, is_active: true, role: "ESTUDIANTE"});
        setIsDialogOpen(true);
    };

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

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setCurrentEstudiante(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: name === 'curso' ? (value ? parseInt(value) : undefined) : value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentEstudiante) {
            updateEstudianteMutation.mutate({id: currentEstudiante.id, data: formData});
        } else {
            createEstudianteMutation.mutate(formData);
        }
    };

    const handleDeleteEstudiante = (id: number) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este estudiante?")) {
            deleteEstudianteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin"/><p className="ml-2">Cargando estudiantes...</p></div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-96 text-red-500">Error al cargar los estudiantes.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                {isAdmin && (
                    <Button onClick={handleOpenCreateDialog}><UserPlus className="mr-2 h-4 w-4"/> Nuevo Estudiante</Button>
                )}
            </div>
            <div className="flex items-center space-x-2 mb-4">
                <Search className="w-5 h-5 text-gray-500"/>
                <Input placeholder="Buscar por nombre, email o curso" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm"/>
                <Select value={filterCurso} onValueChange={(value) => setFilterCurso(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por curso"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {cursos.map((c: Curso) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableCaption className="text-muted-foreground">Lista de estudiantes registrados</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Curso</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Estado</TableHead>
                            {isAdmin && <TableHead>Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEstudiantes.map((e) => (
                            <TableRow key={e.id}>
                                <TableCell>{e.username}</TableCell>
                                <TableCell>{e.first_name} {e.last_name}</TableCell>
                                <TableCell>{e.curso_detail?.nombre || 'Sin asignar'}</TableCell>
                                <TableCell>{e.email}</TableCell>
                                <TableCell>{e.is_active ? 'Activo' : 'Inactivo'}</TableCell>
                                {isAdmin && (
                                    <TableCell className="space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenEditDialog(e)}><Edit className="w-4 h-4"/></Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteEstudiante(e.id)}><Trash2 className="w-4 h-4"/></Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentEstudiante ? 'Editar Estudiante' : 'Nuevo Estudiante'}</DialogTitle>
                        <DialogDescription>Complete los datos del estudiante</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Usuario</Label>
                                <Input name="username" value={formData.username} onChange={handleInputChange} required/>
                            </div>
                            {!currentEstudiante && (
                                <div>
                                    <Label>Contraseña</Label>
                                    <Input name="password" type="password" value={formData.password} onChange={handleInputChange} required/>
                                </div>
                            )}
                            <div>
                                <Label>Nombre</Label>
                                <Input name="first_name" value={formData.first_name} onChange={handleInputChange} required/>
                            </div>
                            <div>
                                <Label>Apellido</Label>
                                <Input name="last_name" value={formData.last_name} onChange={handleInputChange} required/>
                            </div>
                            <div>
                                <Label>Email</Label>
                                <Input name="email" type="email" value={formData.email} onChange={handleInputChange} required/>
                            </div>
                            <div>
                                <Label>Curso</Label>
                                <select name="curso" value={formData.curso || ''} onChange={handleInputChange} className="w-full border rounded px-2 py-1">
                                    <option value="">Sin curso</option>
                                    {cursos.map((c: Curso) => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">{currentEstudiante ? 'Actualizar' : 'Crear'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Estudiantes;
