import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Edit, Trash2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface RegionCategory {
  id: string;
  region: string;
  category: string;
  subcategory?: string;
  level?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function RegionCategoriesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RegionCategory | null>(null);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    region: "",
    category: "",
    subcategory: "",
    level: "",
  });

  // Regiones disponibles en el sistema
  const AVAILABLE_REGIONS = ["NOLA", "SOLA", "BRASIL", "MEXICO"];

  // Obtener categorías maestras disponibles
  const { data: categoriesMaster } = useQuery<any[]>({
    queryKey: ["/api/admin/categories-master"],
  });

  // Solo categorías activas
  const activeCategoriesMaster = categoriesMaster?.filter(c => c.active) || [];

  const { data: categories, isLoading } = useQuery<RegionCategory[]>({
    queryKey: ["/api/admin/region-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/region-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/region-categories"] });
      toast({
        title: t("common.success"),
        description: "Categoría de región creada exitosamente",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Error al crear categoría",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/region-categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/region-categories"] });
      toast({
        title: t("common.success"),
        description: "Categoría de región actualizada exitosamente",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Error al actualizar categoría",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/region-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/region-categories"] });
      toast({
        title: t("common.success"),
        description: "Categoría de región eliminada exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Error al eliminar categoría",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item: RegionCategory) => {
    setEditingItem(item);
    setFormData({
      region: item.region,
      category: item.category,
      subcategory: item.subcategory || "",
      level: item.level || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData({
      region: "",
      category: "",
      subcategory: "",
      level: "",
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  // Filtrar y agrupar por región
  const filteredCategories = categories?.filter(cat => 
    selectedRegionFilter === "all" || cat.region === selectedRegionFilter
  );
  
  const groupedCategories = filteredCategories?.reduce((acc, cat) => {
    if (!acc[cat.region]) {
      acc[cat.region] = [];
    }
    acc[cat.region].push(cat);
    return acc;
  }, {} as Record<string, RegionCategory[]>);

  // Estadísticas por región
  const getRegionStats = (region: string) => {
    const regionCategories = categories?.filter(c => c.region === region) || [];
    return {
      total: regionCategories.length,
      withSubcategory: regionCategories.filter(c => c.subcategory).length,
      withLevel: regionCategories.filter(c => c.level).length,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Categorías por Región</h3>
          <p className="text-sm text-gray-600">
            Gestiona las categorías disponibles para cada región. Cada región puede tener sus propias categorías personalizadas (Ej: NOLA → ENTERPRISE/SMB/MSSP, SOLA → Diamond/Gold/Silver).
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedRegionFilter} onValueChange={setSelectedRegionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las regiones</SelectItem>
              {AVAILABLE_REGIONS.map((region) => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Categoría" : "Nueva Categoría de Región"}
              </DialogTitle>
              <DialogDescription>
                Define las categorías disponibles para una región específica. Estas categorías se usarán al crear configuraciones de región.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="region">Región *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una región" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {editingItem ? "La región no se puede modificar" : "Selecciona la región a la que pertenece esta categoría"}
                </p>
              </div>
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={activeCategoriesMaster.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCategoriesMaster.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                        {cat.description && ` - ${cat.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {activeCategoriesMaster.length === 0 
                    ? "Primero crea categorías maestras en la pestaña 'Categorías Globales'"
                    : "Selecciona de las categorías maestras disponibles"
                  }
                </p>
              </div>
              <div>
                <Label htmlFor="subcategory">Subcategoría (Opcional)</Label>
                <Input
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Ej: COLOMBIA, Premier, PLATINUM"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Subdivisión geográfica o de nivel dentro de la categoría
                </p>
              </div>
              <div>
                <Label htmlFor="level">Nivel (Opcional)</Label>
                <Input
                  id="level"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="Ej: 1, 2, 3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nivel jerárquico o de clasificación
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "Guardando..." : "Guardar"}
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
        <>
          {/* Mostrar estadísticas por región */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AVAILABLE_REGIONS.map((region) => {
              const stats = getRegionStats(region);
              const isActive = selectedRegionFilter === region || selectedRegionFilter === "all";
              return (
                <Card 
                  key={region} 
                  className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-blue-500' : 'opacity-60'}`}
                  onClick={() => setSelectedRegionFilter(region)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {region}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-gray-500">
                      {stats.total === 1 ? "categoría" : "categorías"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Listado de categorías */}
          {groupedCategories && Object.keys(groupedCategories).length > 0 ? (
            <div className="grid gap-4">
              {Object.entries(groupedCategories).map(([region, items]) => (
                <Card key={region}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      {region}
                      <Badge variant="outline" className="ml-2">
                        {items.length} {items.length === 1 ? "categoría" : "categorías"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Categorías configuradas para la región {region}
                    </CardDescription>
                  </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.category}</span>
                          {item.subcategory && (
                            <Badge variant="secondary">{item.subcategory}</Badge>
                          )}
                          {item.level && (
                            <Badge variant="outline">Nivel {item.level}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará la categoría "{item.category}".
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              {selectedRegionFilter === "all" 
                ? "No hay categorías configuradas. Crea la primera categoría para comenzar."
                : `No hay categorías configuradas para ${selectedRegionFilter}. Crea una nueva categoría.`
              }
            </p>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
