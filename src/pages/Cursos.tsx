import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,} from "@/components/ui/alert-dialog";
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import api from '@/services/api';
import {Curso, CursoCreate, Materia} from '@/types/academic';
import {Loader2, Pencil, Trash2, Plus, Search, Filter} from 'lucide-react';
import {toast} from "@/components/ui/use-toast";

const CursosPage: React.FC = () => {
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [currentCurso, setCurrentCurso] = useState<Partial<Curso> | null>(null);
    const [selectedMaterias, setSelectedMaterias] = useState<number[]>([]);
    const [filterNivel, setFilterNivel] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [cursosData, materiasData] = await Promise.all([
                    api.fetchCursos(),
                    api.fetchMaterias()
                ]);
                setCursos(cursosData);
                setMaterias(materiasData);
            } catch (err) {
                setError('Error al cargar los datos');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filtrar cursos según el nivel y término de búsqueda
    const filteredCursos = cursos.filter(curso => {
        const matchesNivel =
            filterNivel === 'ALL'
                ? true
                : curso.nivel === filterNivel;

        const matchesSearch = searchTerm
            ? curso.nombre.toLowerCase().includes(searchTerm.toLowerCase())
            : true;

        return matchesNivel && matchesSearch;
    });

    // Abrir el diálogo para crear/editar curso
    const handleOpenDialog = (curso?: Curso) => {
        if (curso) {
            setCurrentCurso(curso);
            setSelectedMaterias(curso.materias || []);
        } else {
            setCurrentCurso({
                nombre: '',
                nivel: 'PRIMARIA',
                materias: [],
            });
            setSelectedMaterias([]);
        }
        setIsDialogOpen(true);
    };

    // Abrir el diálogo para ver detalles del curso
    const handleViewCurso = async (id: number) => {
        try {
            const curso = await api.getCursoById(id);
            setCurrentCurso(curso);
            setIsViewDialogOpen(true);
        } catch (err) {
            setError('Error al obtener detalles del curso');
            console.error(err);
        }
    };

    // Manejar cambios en el formulario
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setCurrentCurso(prev => ({...prev, [name]: value}));
    };

    // Manejar cambios en el selector de nivel
    const handleNivelChange = (value: string) => {
        if (value === 'PRIMARIA' || value === 'SECUNDARIA') {
            setCurrentCurso(prev => ({...prev, nivel: value}));
        }
    };

    // Manejar cambios en las materias seleccionadas
    const handleMateriaToggle = (id: number) => {
        setSelectedMaterias(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // Guardar curso (crear o actualizar)
    const handleSaveCurso = async () => {
        if (!currentCurso || !currentCurso.nombre || !currentCurso.nivel) {
            setError('Por favor completa todos los campos obligatorios');
            return;
        }

        if (selectedMaterias.length === 0) {
            setError('Debes seleccionar al menos una materia');
            return;
        }

        try {
            const cursoToSave: CursoCreate = {
                nombre: currentCurso.nombre,
                nivel: currentCurso.nivel as "PRIMARIA" | "SECUNDARIA",
                materias: selectedMaterias,

            };

            let savedCurso;
            if (currentCurso.id) {
                // Actualizar curso existente
                savedCurso = await api.updateCurso(currentCurso.id, cursoToSave);
                toast({
                    title: "Curso actualizado",
                    description: `El curso ${savedCurso.nombre} ha sido actualizado correctamente.`,
                });
            } else {
                // Crear nuevo curso
                savedCurso = await api.createCurso(cursoToSave);
                toast({
                    title: "Curso creado",
                    description: `El curso ${savedCurso.nombre} ha sido creado correctamente.`,
                });
            }

            // Actualizar la lista de cursos
            setCursos(prev => {
                if (currentCurso.id) {
                    return prev.map(c => c.id === savedCurso.id ? savedCurso : c);
                } else {
                    return [...prev, savedCurso];
                }
            });

            setIsDialogOpen(false);
            setError(null);
        } catch (err) {
            setError('Error al guardar el curso');
            console.error(err);
        }
    };

    // Eliminar curso
    const handleDeleteCurso = async (id: number) => {
        try {
            await api.deleteCurso(id);
            setCursos(prev => prev.filter(c => c.id !== id));
            toast({
                title: "Curso eliminado",
                description: "El curso ha sido eliminado correctamente.",
            });
        } catch (err) {
            setError('Error al eliminar el curso');
            console.error(err);
        }
    };

    // Renderizar mensaje de carga o error
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                <span className="ml-2">Cargando cursos...</span>
            </div>
        );
    }

    if (error && cursos.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-red-500">{error}</p>
                <Button onClick={() => window.location.reload()} className="ml-4">
                    Reintentar
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">Gestión de Cursos</CardTitle>
                            <CardDescription>
                                Administra los cursos del sistema
                            </CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4"/> Nuevo Curso
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex items-center space-x-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                            <Input
                                placeholder="Buscar curso por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-muted-foreground"/>
                            <Select value={filterNivel} onValueChange={setFilterNivel}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filtrar por nivel"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="PRIMARIA">Primaria</SelectItem>
                                    <SelectItem value="SECUNDARIA">Secundaria</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {filteredCursos.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Nivel</TableHead>
                                        <TableHead>Materias</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCursos.map((curso) => (
                                        <TableRow key={curso.id}>
                                            <TableCell>{curso.id}</TableCell>
                                            <TableCell className="font-medium">{curso.nombre}</TableCell>
                                            <TableCell>{curso.nivel}</TableCell>
                                            <TableCell>{curso.materias?.length || 0}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewCurso(curso.id)}
                                                    >
                                                        Ver
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenDialog(curso)}
                                                    >
                                                        <Pencil className="h-4 w-4"/>
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <Trash2 className="h-4 w-4 text-red-500"/>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción no se puede deshacer. Esto eliminará
                                                                    permanentemente el curso {curso.nombre}.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDeleteCurso(curso.id)}
                                                                    className="bg-red-500 hover:bg-red-600"
                                                                >
                                                                    Eliminar
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
                            <div className="text-center">
                                <p className="mb-2 text-sm text-muted-foreground">No hay cursos que mostrar</p>
                                <Button onClick={() => handleOpenDialog()} variant="outline" size="sm">
                                    <Plus className="mr-2 h-4 w-4"/> Agregar curso
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Diálogo para crear/editar curso */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {currentCurso?.id ? 'Editar Curso' : 'Crear Nuevo Curso'}
                        </DialogTitle>
                        <DialogDescription>
                            Complete la información del curso. Los campos marcados con * son obligatorios.
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nombre" className="text-right">
                                Nombre *
                            </Label>
                            <Input
                                id="nombre"
                                name="nombre"
                                value={currentCurso?.nombre || ''}
                                onChange={handleInputChange}
                                maxLength={20}
                                className="col-span-3"
                                placeholder="Ej: 1ro A"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nivel" className="text-right">
                                Nivel *
                            </Label>
                            <Select
                                value={currentCurso?.nivel || 'PRIMARIA'}
                                onValueChange={handleNivelChange}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona un nivel"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRIMARIA">Primaria</SelectItem>
                                    <SelectItem value="SECUNDARIA">Secundaria</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">
                                Materias *
                            </Label>
                            <div
                                className="col-span-3 grid grid-cols-2 gap-3 h-[200px] overflow-y-auto border rounded-md p-4">
                                {materias.length > 0 ? (
                                    materias.map((materia) => (
                                        <div key={materia.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`materia-${materia.id}`}
                                                checked={selectedMaterias.includes(materia.id)}
                                                onCheckedChange={() => handleMateriaToggle(materia.id)}
                                            />
                                            <Label
                                                htmlFor={`materia-${materia.id}`}
                                                className="text-sm"
                                            >
                                                {materia.nombre}
                                            </Label>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 flex h-full items-center justify-center">
                                        <p className="text-sm text-muted-foreground">No hay materias disponibles</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is_active" className="text-right">
                                Estado
                            </Label>
                            <div className="flex items-center space-x-2">
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleSaveCurso}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Diálogo para ver detalles del curso */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Detalles del Curso</DialogTitle>
                    </DialogHeader>

                    {currentCurso && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium text-muted-foreground">ID:</div>
                                <div>{currentCurso.id}</div>

                                <div className="font-medium text-muted-foreground">Nombre:</div>
                                <div>{currentCurso.nombre}</div>

                                <div className="font-medium text-muted-foreground">Nivel:</div>
                                <div>{currentCurso.nivel}</div>

                                <div className="font-medium text-muted-foreground">Estado:</div>
                            </div>

                            <div>
                                <h4 className="mb-2 font-medium text-muted-foreground">Materias asignadas:</h4>
                                <div className="rounded-md border p-4 h-[200px] overflow-y-auto">
                                    {currentCurso.materias && currentCurso.materias.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {currentCurso.materias.map((materiaId) => {
                                                const materia = materias.find((m) => m.id === materiaId);
                                                return (
                                                    <div key={materiaId} className="rounded border p-2">
                                                        {materia ? materia.nombre : `Materia ID: ${materiaId}`}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <p className="text-sm text-muted-foreground">No hay materias asignadas</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button>Cerrar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CursosPage;

