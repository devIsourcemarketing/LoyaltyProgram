import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Deal } from "@shared/schema";

const dealSchema = z.object({
  productType: z.enum(["software", "hardware", "equipment"], {
    required_error: "Please select a product type",
  }),
  dealType: z.enum(["new_customer", "renewal"], {
    required_error: "Please select a deal type",
  }),
  productName: z.string().min(1, "Product name is required"),
  dealValue: z.string().min(1, "Deal value is required"),
  quantity: z.string().min(1, "Quantity is required"),
  closeDate: z.string().min(1, "Close date is required"),
  licenseAgreementNumber: z.string().optional(),
  region: z.string().optional(), // New field for region
  clientInfo: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

type DealForm = z.infer<typeof dealSchema>;

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: Deal | null;
}

export default function DealModal({ isOpen, onClose, deal }: DealModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!deal;

  // Get current user information to pre-fill region
  const { data: currentUser } = useQuery<{
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    region: string;
    regionCategory: string;
    role: string;
  }>({
    queryKey: ["/api/auth/me"],
    enabled: isOpen && !isEditing, // Only fetch when creating new deal
  });

  const form = useForm<DealForm>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      productType: undefined,
      dealType: undefined,
      productName: "",
      dealValue: "",
      quantity: "",
      closeDate: "",
      licenseAgreementNumber: "",
      region: "",
      clientInfo: "",
      status: "pending",
    },
  });

  useEffect(() => {
    if (deal) {
      const closeDate = deal.closeDate ? new Date(deal.closeDate).toISOString().split('T')[0] : "";
      form.reset({
        productType: deal.productType,
        dealType: deal.dealType || "new_customer",
        productName: deal.productName || "",
        dealValue: deal.dealValue?.toString() || "",
        quantity: deal.quantity?.toString() || "",
        closeDate: closeDate,
        licenseAgreementNumber: deal.licenseAgreementNumber || "",
        region: currentUser?.region || "", // Use current user's region for existing deals too
        clientInfo: deal.clientInfo || "",
        status: deal.status,
      });
    } else {
      // Pre-fill region with user's region for new deals
      form.reset({
        productType: undefined,
        dealType: undefined,
        productName: "",
        dealValue: "",
        quantity: "",
        closeDate: "",
        licenseAgreementNumber: "",
        region: currentUser?.region || "",
        clientInfo: "",
        status: "pending",
      });
    }
  }, [deal, form, currentUser]);

  const createDealMutation = useMutation({
    mutationFn: async (data: DealForm) => {
      const dealData = {
        ...data,
        dealValue: data.dealValue,
        quantity: parseInt(data.quantity),
        closeDate: data.closeDate,
      };
      
      if (isEditing) {
        return apiRequest("PATCH", `/api/admin/deals/${deal?.id}`, dealData);
      } else {
        return apiRequest("POST", "/api/deals", dealData);
      }
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: isEditing 
          ? "Deal updated successfully" 
          : "Deal registered successfully and is pending approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "register"} deal`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DealForm) => {
    createDealMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {isEditing ? t('deals.editDeal') : t('deals.registerNewDeal')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deals.productType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-product-type">
                          <SelectValue placeholder={t('deals.selectProductType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="software">{t('deals.software')}</SelectItem>
                        <SelectItem value="hardware">{t('deals.hardware')}</SelectItem>
                        <SelectItem value="equipment">{t('deals.equipment')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deals.dealType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-deal-type">
                          <SelectValue placeholder={t('deals.selectDealType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new_customer">{t('deals.newCustomer')}</SelectItem>
                        <SelectItem value="renewal">{t('deals.renewal')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deals.productName')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enterprise Software License"
                        data-testid="input-product-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dealValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deals.dealValue')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="25000"
                        data-testid="input-deal-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deals.quantity')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="100"
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="closeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deals.closeDate')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        data-testid="input-close-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('deals.status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder={t('deals.selectStatus')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">{t('deals.pending')}</SelectItem>
                        <SelectItem value="approved">{t('deals.approved')}</SelectItem>
                        <SelectItem value="rejected">{t('deals.rejected')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="licenseAgreementNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deals.licenseAgreementNumber')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="LA-2024-001234"
                      data-testid="input-license-agreement-number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deals.region')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={currentUser?.region || field.value}
                      disabled={true}
                      placeholder={t('deals.regionAutoAssigned')}
                      className="bg-gray-50 text-gray-600 cursor-not-allowed"
                      data-testid="input-region"
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500 mt-1">
                    {t('deals.regionAssignedAutomatically')}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('deals.clientInfo')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('deals.clientInfoPlaceholder')}
                      className="h-24"
                      data-testid="textarea-client-info"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createDealMutation.isPending}
                data-testid="button-submit-deal"
              >
                {createDealMutation.isPending 
                  ? (isEditing ? t('deals.updating') : t('deals.submitting')) 
                  : (isEditing ? t('deals.updateDeal') : t('deals.submitDeal'))
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
