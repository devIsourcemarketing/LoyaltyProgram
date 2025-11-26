import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Edit, Trash2, Trophy, Upload, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface PrizeTemplate {
  id: string;
  name: string; // Nombre
  description: string; // Descripción
  imageUrl?: string; // Imagen
  prizeRule: string; // Regla del premio (json con posiciones/valores)
  size?: string; // Talla
  validFrom?: Date; // Vigencia desde
  validTo?: Date; // Vigencia hasta
  type: "recurring" | "grand"; // Tipo: Premio Recurrente o Premio Mayor
  createdAt?: Date;
  updatedAt?: Date;
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "N/A"];

export default function PrizeTemplatesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrizeTemplate | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filterType, setFilterType] = useState<"all" | "recurring" | "grand">("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prizeRule: "",
    size: "N/A",
    validFrom: "",
    validTo: "",
    type: "recurring" as "recurring" | "grand",
  });

  const { data: templates, isLoading } = useQuery<PrizeTemplate[]>({
    queryKey: ["/api/admin/prize-templates"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al subir imagen");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { imageUrl?: string }) => {
      return apiRequest("POST", "/api/admin/prize-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prize-templates"] });
      toast({
        title: t("common.success"),
        description: "Plantilla de premio creada exitosamente",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Error al crear plantilla",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData & { imageUrl?: string } }) => {
      return apiRequest("PATCH", `/api/admin/prize-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prize-templates"] });
      toast({
        title: t("common.success"),
        description: "Plantilla de premio actualizada exitosamente",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Error al actualizar plantilla",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/prize-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prize-templates"] });
      toast({
        title: t("common.success"),
        description: "Plantilla de premio eliminada exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Error al eliminar plantilla",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = editingItem?.imageUrl;
    
    // Subir imagen si hay una nueva
    if (imageFile) {
      try {
        const result = await uploadMutation.mutateAsync(imageFile);
        imageUrl = result.url;
      } catch (error) {
        toast({
          title: t("common.error"),
          description: "Error al subir la imagen",
          variant: "destructive",
        });
        return;
      }
    }
    
    const dataToSubmit = {
      ...formData,
      imageUrl,
    };
    
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (item: PrizeTemplate) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      prizeRule: item.prizeRule,
      size: item.size || "N/A",
      validFrom: item.validFrom ? new Date(item.validFrom).toISOString().split('T')[0] : "",
      validTo: item.validTo ? new Date(item.validTo).toISOString().split('T')[0] : "",
      type: item.type,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      prizeRule: "",
      size: "N/A",
      validFrom: "",
      validTo: "",
      type: "recurring",
    });
    setImageFile(null);
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
      } else {
        toast({
          title: t("common.error"),
          description: "Solo se permiten archivos de imagen (JPG, PNG)",
          variant: "destructive",
        });
      }
    }
  };

  // Filtrar según tipo seleccionado
  const filteredTemplates = templates?.filter(t => {
    if (filterType === "all") return true;
    return t.type === filterType;
  }) || [];
  
  const recurringTemplates = filteredTemplates.filter(t => t.type === "recurring");
  const grandTemplates = filteredTemplates.filter(t => t.type === "grand");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Plantillas de Premios</h3>
          <p className="text-sm text-gray-600">
            Configuración global de plantillas. Estas plantillas estarán disponibles para todas las regiones y pueden ser utilizadas en la configuración de premios mensuales y anuales.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={filterType} onValueChange={(value: "all" | "recurring" | "grand") => setFilterType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="recurring">Solo Recurrentes</SelectItem>
              <SelectItem value="grand">Solo Premio Mayor</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Plantilla" : "Nueva Plantilla de Premio"}
              </DialogTitle>
              <DialogDescription>
                Esta plantilla estará disponible globalmente para todas las regiones. Define los campos estándar que podrán ser utilizados al configurar premios en cada región.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo de Premio *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "recurring" | "grand") => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Premio Recurrente</SelectItem>
                    <SelectItem value="grand">Premio Mayor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Nombre del Premio *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Bono $100, Viaje a París, Camiseta exclusiva"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el premio en detalle..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="image">Imagen (JPG, PNG)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleImageChange}
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 text-gray-500" />
                </div>
                {imageFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Archivo seleccionado: {imageFile.name}
                  </p>
                )}
                {editingItem?.imageUrl && !imageFile && (
                  <div className="mt-2">
                    <img 
                      src={editingItem.imageUrl} 
                      alt="Preview" 
                      className="h-20 w-20 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="prizeRule">Regla del Premio *</Label>
                <Textarea
                  id="prizeRule"
                  value={formData.prizeRule}
                  onChange={(e) => setFormData({ ...formData, prizeRule: e.target.value })}
                  placeholder='Ej: {"1": "500 puntos", "2-5": "250 puntos", "6-10": "100 puntos"}'
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define las posiciones y valores del premio (JSON o texto libre)
                </p>
              </div>

              <div>
                <Label htmlFor="size">Talla (si aplica)</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData({ ...formData, size: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Vigencia Desde
                  </Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="validTo">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Vigencia Hasta
                  </Label>
                  <Input
                    id="validTo"
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending || uploadMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending || uploadMutation.isPending) 
                    ? "Guardando..." 
                    : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : (
        <div className="space-y-6">
          {/* Premios Recurrentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-600" />
                Premios Recurrentes
                <Badge variant="outline" className="ml-2">
                  {recurringTemplates.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Plantillas para premios mensuales o periódicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recurringTemplates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {recurringTemplates.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="h-16 w-16 object-cover rounded ml-3"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.size && item.size !== "N/A" && (
                          <Badge variant="secondary">Talla: {item.size}</Badge>
                        )}
                        {item.validFrom && item.validTo && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(item.validFrom).toLocaleDateString()} - {new Date(item.validTo).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará la plantilla "{item.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No hay plantillas de premios recurrentes configuradas
                </p>
              )}
            </CardContent>
          </Card>

          {/* Premios Mayores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Premios Mayores
                <Badge variant="outline" className="ml-2">
                  {grandTemplates.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Plantillas para premios especiales o grandes premios anuales
              </CardDescription>
            </CardHeader>
            <CardContent>
              {grandTemplates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {grandTemplates.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="h-16 w-16 object-cover rounded ml-3"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.size && item.size !== "N/A" && (
                          <Badge variant="secondary">Talla: {item.size}</Badge>
                        )}
                        {item.validFrom && item.validTo && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(item.validFrom).toLocaleDateString()} - {new Date(item.validTo).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará la plantilla "{item.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No hay plantillas de premios mayores configuradas
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
