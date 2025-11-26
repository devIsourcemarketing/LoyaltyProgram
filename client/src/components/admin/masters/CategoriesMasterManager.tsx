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
import { Plus, Edit, Trash2, Tag, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface CategoryMaster {
  id: string;
  name: string;
  description?: string;
  type?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function CategoriesMasterManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryMaster | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    active: true,
  });

  const { data: categories, isLoading } = useQuery<CategoryMaster[]>({
    queryKey: ["/api/admin/categories-master"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/categories-master", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories-master"] });
      toast({
        title: t("common.success"),
        description: t("admin.categoryCreatedSuccess"),
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.errorCreatingCategory"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/admin/categories-master/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories-master"] });
      toast({
        title: t("common.success"),
        description: t("admin.categoryUpdatedSuccess"),
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.errorUpdatingCategory"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/categories-master/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories-master"] });
      toast({
        title: t("common.success"),
        description: t("admin.categoryDeletedSuccess"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.errorDeletingCategory"),
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/admin/categories-master/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories-master"] });
      toast({
        title: t("common.success"),
        description: t("admin.statusUpdatedSuccess"),
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

  const handleEdit = (item: CategoryMaster) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      type: item.type || "",
      active: item.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id, active: !currentStatus });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "",
      active: true,
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  // Filtros
  const filteredCategories = categories?.filter(cat => {
    const typeMatch = filterType === "all" || cat.type === filterType;
    const statusMatch = filterStatus === "all" || 
      (filterStatus === "active" && cat.active) || 
      (filterStatus === "inactive" && !cat.active);
    return typeMatch && statusMatch;
  });

  // Tipos únicos
  const uniqueTypes = Array.from(new Set(categories?.map(c => c.type).filter(Boolean) || []));

  // Estadísticas
  const stats = {
    total: categories?.length || 0,
    active: categories?.filter(c => c.active).length || 0,
    inactive: categories?.filter(c => !c.active).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{t('admin.categoriesMaster')}</h3>
          <p className="text-sm text-gray-600">
            {t('admin.categoriesMasterDescription')}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('admin.typeLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allTypes')}</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type!}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.all')}</SelectItem>
              <SelectItem value="active">{t('admin.actives')}</SelectItem>
              <SelectItem value="inactive">{t('admin.inactives')}</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.newCategory')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? t('admin.editCategory') : t('admin.newMasterCategory')}
                </DialogTitle>
                <DialogDescription>
                  {t('admin.defineGlobalCategory')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('admin.categoryName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('admin.categoryNamePlaceholder')}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.uniqueCategoryName')}
                  </p>
                </div>
                <div>
                  <Label htmlFor="description">{t('admin.descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('admin.categoryDescriptionPlaceholder')}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="type">{t('admin.typeLabel')}</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder={t('admin.typePlaceholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.categoryClassification')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="active">{t('admin.activeCategory')}</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {t('admin.cancel')}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? t('admin.savingCategory') : t('admin.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">{t('admin.totalCategories')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">{t('admin.actives')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">{t('admin.inactives')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8">{t('admin.loading')}</div>
      ) : filteredCategories && filteredCategories.length > 0 ? (
        <div className="grid gap-4">
          {filteredCategories.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{item.name}</span>
                          {item.type && (
                            <Badge variant="outline">{item.type}</Badge>
                          )}
                          {item.active ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('common.active')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              {t('common.inactive')}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={item.active ? "outline" : "default"}
                      onClick={() => handleToggleActive(item.id, item.active)}
                    >
                      {item.active ? t('admin.deactivate') : t('admin.activate')}
                    </Button>
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
                          <AlertDialogTitle>{t('admin.deleteCategory')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('admin.deleteCategoryWarning').replace('{name}', item.name)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {t('admin.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              {t('admin.noCategoriesConfigured')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
