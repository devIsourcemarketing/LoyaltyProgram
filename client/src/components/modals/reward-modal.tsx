import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import type { Reward } from "@shared/schema";

const rewardSchema = z.object({
  name: z.string().min(1, "Reward name is required"),
  description: z.string().optional(),
  pointsCost: z.string().min(1, "Points cost is required"),
  category: z.string().min(1, "Category is required"),
  region: z.string().min(1, "Region is required"),
  isActive: z.boolean().default(true),
  stockQuantity: z.string().optional(),
  imageUrl: z.string().optional(),
  estimatedDeliveryDays: z.string().optional(),
});

type RewardForm = z.infer<typeof rewardSchema>;

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward?: Reward | null;
}

const categories = [
  "Gift Cards",
  "Electronics",
  "Travel",
  "Accessories",
  "Software",
  "Training",
  "Merchandise",
  "Experiences"
];

export default function RewardModal({ isOpen, onClose, reward }: RewardModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = !!reward;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Get current user to determine region access
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const form = useForm<RewardForm>({
    resolver: zodResolver(rewardSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsCost: "",
      category: "",
      region: "",
      isActive: true,
      stockQuantity: "",
      imageUrl: "",
      estimatedDeliveryDays: "",
    },
  });

  // Reset form when reward prop changes OR when modal opens
  useEffect(() => {
    if (!isOpen) return; // Solo ejecutar cuando el modal está abierto
    
    if (reward) {
      form.reset({
        name: reward.name || "",
        description: reward.description || "",
        pointsCost: reward.pointsCost?.toString() || "",
        category: reward.category || "",
        region: reward.region || "",
        isActive: reward.isActive ?? true,
        stockQuantity: reward.stockQuantity?.toString() || "",
        imageUrl: reward.imageUrl || "",
        estimatedDeliveryDays: reward.estimatedDeliveryDays?.toString() || "",
      });
      // Set image preview if exists
      setImagePreview(reward.imageUrl || null);
    } else if (currentUser) {
      // Si es regional-admin, auto-asignar su región
      // Usar region si existe, sino country como fallback
      const defaultRegion = currentUser.role === "regional-admin" 
        ? (currentUser.region || currentUser.country || "")
        : "";
      
      console.log("Setting default region:", defaultRegion, "for user:", currentUser);
      
      form.reset({
        name: "",
        description: "",
        pointsCost: "",
        category: "",
        region: defaultRegion,
        isActive: true,
        stockQuantity: "",
        imageUrl: "",
        estimatedDeliveryDays: "",
      });
      
      // Clear image preview for new reward
      setImagePreview(null);
      
      // Establecer el valor del campo explícitamente
      if (defaultRegion) {
        form.setValue("region", defaultRegion);
      }
    }
  }, [reward, form, currentUser, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Por favor sube una imagen en formato PNG, JPG o WEBP",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB for better performance)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: "Imagen demasiado grande",
        description: `El tamaño de la imagen es ${fileSizeMB}MB. El tamaño máximo permitido es 2MB. Por favor, reduce el tamaño de la imagen.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        // Upload to Cloudinary via backend
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            image: base64String,
            folder: 'rewards',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const data = await response.json();
        
        // Update form with image URL
        form.setValue('imageUrl', data.url);
        setImagePreview(data.url);

        toast({
          title: t("common.success"),
          description: "Imagen subida exitosamente",
        });
      };

      reader.onerror = () => {
        throw new Error('Failed to read file');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Error",
        description: "Error al subir la imagen. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    form.setValue('imageUrl', '');
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createRewardMutation = useMutation({
    mutationFn: async (data: RewardForm) => {
      const rewardData = {
        ...data,
        pointsCost: parseInt(data.pointsCost),
        stockQuantity: data.stockQuantity ? parseInt(data.stockQuantity) : null,
        imageUrl: data.imageUrl || null,
        estimatedDeliveryDays: data.estimatedDeliveryDays ? parseInt(data.estimatedDeliveryDays) : null,
      };
      
      if (isEditing) {
        return apiRequest("PATCH", `/api/admin/rewards/${reward.id}`, rewardData);
      } else {
        return apiRequest("POST", "/api/admin/rewards", rewardData);
      }
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: `Reward ${isEditing ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} reward`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RewardForm) => {
    createRewardMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {isEditing ? t("rewards.editReward") : t("rewards.createNewReward")}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="$100 Amazon Gift Card"
                        data-testid="input-reward-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="pointsCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points Cost</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="10000"
                        data-testid="input-points-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Detailed description of the reward..."
                      className="h-24"
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rewards.regionLabel")}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={currentUser?.role === "regional-admin"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-region">
                          <SelectValue placeholder={t("admin.selectRegionPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NOLA">NOLA</SelectItem>
                        <SelectItem value="SOLA">SOLA</SelectItem>
                        <SelectItem value="BRASIL">BRASIL</SelectItem>
                        <SelectItem value="MEXICO">MEXICO</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {currentUser?.role === "regional-admin" && field.value && (
                      <p className="text-xs text-gray-500 mt-1">
                        Región bloqueada: {field.value}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="100"
                        data-testid="input-stock-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedDeliveryDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rewards.estimatedDeliveryTimeDays")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="15"
                        data-testid="input-estimated-delivery-days"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image (PNG or JPG)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Image Preview */}
                      {imagePreview ? (
                        <div className="relative w-full h-48 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={imagePreview}
                            alt="Reward preview"
                            className="w-full h-full object-contain"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveImage}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#29CCB1] transition-colors bg-gray-50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 mb-1">Click para subir imagen</p>
                          <p className="text-xs text-gray-400">PNG, JPG o WEBP (máx 2MB)</p>
                        </div>
                      )}

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploading}
                      />

                      {/* Upload Button */}
                      {!imagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploading ? "Subiendo..." : "Subir Imagen"}
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-gray-500">
                      Inactive rewards won't be visible to users
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRewardMutation.isPending}
                data-testid="button-submit-reward"
              >
                {createRewardMutation.isPending 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update Reward" : "Create Reward")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
