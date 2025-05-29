import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { User } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { School, BookOpen, UserRound, Mail, UserCircle, ShieldAlert } from 'lucide-react';

const Perfil: React.FC = () => {
  const { user: authUser, updateUser } = useAuth();
  const [profileData, setProfileData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: ''
  });

  const isAdmin = authUser?.role === 'ADMINISTRATIVO';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await api.getProfile();
        setProfileData(data);
        setFormData({
          first_name: data.first_name,
          last_name: data.last_name
        });
      } catch (error) {
        console.error('Error al cargar el perfil:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la información del perfil',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      // Los usuarios comunes solo pueden actualizar nombre y apellido
      const updatedUser = await api.updateUsuario(formData);
      setProfileData(prev => prev ? { ...prev, ...updatedUser } : null);
      updateUser({ ...authUser!, ...updatedUser });
      setIsEditing(false);
      toast({
        title: 'Perfil actualizado',
        description: 'Tu información ha sido actualizada correctamente',
      });
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la información del perfil',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Función para traducir el rol a español
  const getRoleInSpanish = (role: string) => {
    switch (role) {
      case 'ADMINISTRATIVO':
        return 'Administrativo';
      case 'PROFESOR':
        return 'Profesor';
      case 'ESTUDIANTE':
        return 'Estudiante';
      default:
        return role;
    }
  };

  if (isLoading && !profileData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Perfil de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={profileData?.profile?.foto} alt={profileData?.first_name} />
                <AvatarFallback className="text-2xl bg-academic-blue text-white">
                  {profileData && getInitials(profileData.first_name, profileData.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-medium text-lg">{profileData?.first_name} {profileData?.last_name}</p>
                <div className="flex items-center justify-center gap-1 my-1">
                  <UserRound className="h-4 w-4 text-gray-500" />
                  <p className="text-sm text-gray-500">{profileData?.username}</p>
                </div>
                <div className="flex items-center justify-center gap-1 my-1">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <p className="text-sm text-gray-500">{profileData?.email}</p>
                </div>
                <div className="mt-3 px-4 py-1 bg-blue-100 text-blue-800 rounded-full inline-flex items-center">
                  {profileData?.role === 'ESTUDIANTE' && <School className="h-4 w-4 mr-1" />}
                  {profileData?.role === 'PROFESOR' && <BookOpen className="h-4 w-4 mr-1" />}
                  {profileData?.role === 'ADMINISTRATIVO' && <ShieldAlert className="h-4 w-4 mr-1" />}
                  {getRoleInSpanish(profileData?.role || '')}
                </div>

                {profileData?.role === 'ESTUDIANTE' && profileData?.curso_detail && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Curso actual</p>
                    <p className="text-sm font-medium bg-green-100 text-green-800 py-1 px-3 rounded-full">
                      {profileData.curso_detail.nombre}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Como administrador, puedes actualizar toda tu información de contacto"
                  : "Puedes actualizar tu nombre y apellido. Para cambios en otros campos, contacta al administrador"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Correo Electrónico
                    {!isAdmin && <span className="text-xs text-gray-500 ml-2">(Solo lectura)</span>}
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData?.email || ''}
                    disabled={true} // El correo siempre es de solo lectura para usuarios comunes
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Nombre de Usuario
                    <span className="text-xs text-gray-500 ml-2">(Solo lectura)</span>
                  </Label>
                  <Input
                    id="username"
                    value={profileData?.username || ''}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">
                    Rol
                    <span className="text-xs text-gray-500 ml-2">(Solo lectura)</span>
                  </Label>
                  <Input
                    id="role"
                    value={getRoleInSpanish(profileData?.role || '')}
                    disabled
                  />
                </div>

                {profileData?.role === 'ESTUDIANTE' && profileData?.curso_detail && (
                  <div className="space-y-2">
                    <Label htmlFor="curso">
                      Curso
                      <span className="text-xs text-gray-500 ml-2">(Solo lectura)</span>
                    </Label>
                    <Input
                      id="curso"
                      value={`${profileData.curso_detail.nombre} (${profileData.curso_detail.nivel})`}
                      disabled
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            first_name: profileData?.first_name || '',
                            last_name: profileData?.last_name || ''
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => setIsEditing(true)}>
                      Editar Perfil
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
