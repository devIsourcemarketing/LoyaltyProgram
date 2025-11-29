import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  Gift, 
  Plus,
  Check,
  X,
  Download,
  Calendar,
  MapPin,
  Award,
  Upload,
  UserPlus,
  Trash2,
  Edit,
  Settings,
  Globe,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RewardModal from "@/components/modals/reward-modal";
import DealModal from "@/components/modals/deal-modal";
import { CSVUploader } from "@/components/CSVUploader";
import SupportTicketsTab from "@/components/admin/SupportTicketsTab";
import PointsConfigTab from "@/components/admin/PointsConfigTab";
import UserInvitationsTab from "@/components/admin/UserInvitationsTab";
import RegionsOverview from "@/components/admin/RegionsOverview";
import RegionsManagementTab from "@/components/admin/RegionsManagementTab";
import ProgramConfigTab from "@/components/admin/ProgramConfigTab";
import GrandPrizeTab from "@/components/admin/GrandPrizeTab";
import MonthlyPrizesTab from "@/components/admin/MonthlyPrizesTab";
import MastersTab from "@/components/admin/MastersTab";
import type { User, Deal, Reward } from "@shared/schema";
import type { AuthUser } from "@/lib/auth";
import type { UploadResult } from '@uppy/core';
import { useTranslation } from "@/hooks/useTranslation";

interface ReportsData {
  userCount: number;
  dealCount: number;
  totalRevenue: number;
  redeemedRewards: number;
}

// User creation form schema
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  role: z.enum(["user", "admin", "regional-admin", "super-admin"]).default("user"),
  isActive: z.boolean().default(true),
  adminRegionId: z.string().optional().nullable(),
});

// User edit form schema (without password)
const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().optional().nullable(),
  role: z.enum(["user", "admin", "regional-admin", "super-admin"]),
  isActive: z.boolean(),
  adminRegionId: z.string().optional().nullable(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

export default function Admin() {
  const { t } = useTranslation();
  const [location] = useLocation();
  
  // Get tab from URL and update state when URL changes
  const getTabFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromUrl());

  useEffect(() => {
    const tab = getTabFromUrl();
    setActiveTab(tab);
  }, [location]);

  // Also listen to popstate for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromUrl();
      setActiveTab(tab);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportFilters, setReportFilters] = useState({
    region: "all",
    startDate: "",
    endDate: "",
  });
  const [topScorersRegion, setTopScorersRegion] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // User creation form
  const createUserForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      country: "",
      role: "user",
      isActive: true,
    },
  });

  // User edit form
  const editUserForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      country: "",
      role: "user",
      isActive: true,
    },
  });

  // Check if user is admin
  const { data: currentUser } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
  });

  // Region configs query - for super-admin to select regions
  const { data: regionConfigs } = useQuery<Array<{
    id: string;
    name: string;
    region: string;
    category: string;
    subcategory: string;
  }>>({
    queryKey: ["/api/admin/region-configs"],
    enabled: currentUser?.role === "super-admin",
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
  });

  // Pending users query
  const { data: pendingUsers, isLoading: pendingUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users/pending"],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
  });

  // Pending reward redemptions query
  const { data: pendingRedemptions, isLoading: pendingRedemptionsLoading } = useQuery<Array<any>>({
    queryKey: ["/api/admin/rewards/pending"],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
  });

  // All reward redemptions query
  const { data: allRedemptions, isLoading: allRedemptionsLoading } = useQuery<Array<any>>({
    queryKey: ["/api/admin/rewards/redemptions"],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
  });

  const { data: dealsData, isLoading: dealsLoading } = useQuery<{ deals: Array<Deal & { userFirstName?: string; userLastName?: string; userName?: string }>, total: number }>({
    queryKey: ["/api/admin/deals", currentPage],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "20");
      
      const url = `/api/admin/deals?${params.toString()}`;
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const { data: pendingDeals, isLoading: pendingDealsLoading } = useQuery<Array<Deal & { userFirstName?: string; userLastName?: string; userName?: string }>>({
    queryKey: ["/api/admin/deals/pending"],
    enabled: currentUser?.role === "admin",
  });

  // Top Scorers query
  const { data: topScorers, isLoading: topScorersLoading } = useQuery<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    region: string;
    points: number;
    company: string | null;
  }>>({
    queryKey: ["/api/admin/top-scorers", topScorersRegion],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // For super-admin, allow filtering by region
      if (currentUser?.role === "super-admin" && topScorersRegion !== "all") {
        params.append("region", topScorersRegion);
      }
      
      // Always request top 10
      params.append("limit", "10");
      
      const url = `/api/admin/top-scorers${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery<ReportsData>({
    queryKey: ["/api/admin/reports", reportFilters.region, reportFilters.startDate, reportFilters.endDate],
    enabled: currentUser?.role === "admin" || currentUser?.role === "regional-admin" || currentUser?.role === "super-admin",
    queryFn: async () => {
      const params = new URLSearchParams();
      // Solo enviar region si es super-admin y seleccionó una región específica
      if (currentUser?.role === "super-admin" && reportFilters.region !== "all") {
        params.append("region", reportFilters.region);
      }
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      const url = `/api/admin/reports${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const approveDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest("POST", `/api/deals/${dealId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("common.dealApprovedSuccessfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to approve deal",
        variant: "destructive",
      });
    },
  });

  const rejectDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest("POST", `/api/deals/${dealId}/reject`);
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("common.dealRejected"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to reject deal",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("common.userRoleUpdatedSuccessfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleApproveDeal = (dealId: string) => {
    approveDealMutation.mutate(dealId);
  };

  const handleRejectDeal = (dealId: string) => {
    rejectDealMutation.mutate(dealId);
  };

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDealModalOpen(true);
  };

  const handleUpdateUserRole = (userId: string, role: string) => {
    updateUserRoleMutation.mutate({ userId, role });
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      return apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("common.success"),
        description: t("common.userCreatedSuccessfully"),
      });
      setIsCreateUserModalOpen(false);
      createUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (data: CreateUserForm) => {
    // Si es regional-admin, automáticamente asignar su región
    // Si es super-admin, usar la región seleccionada
    const userData = {
      ...data,
      adminRegionId: currentUser?.role === "regional-admin" && data.role === "regional-admin" 
        ? currentUser.adminRegionId 
        : data.adminRegionId
    };
    createUserMutation.mutate(userData);
  };

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: EditUserForm }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("common.success"),
        description: t("common.userUpdatedSuccessfully"),
      });
      setIsEditUserModalOpen(false);
      setSelectedUser(null);
      editUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editUserForm.reset({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      country: user.country,
      role: user.role,
      isActive: user.isActive,
      adminRegionId: user.adminRegionId || null,
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = (data: EditUserForm) => {
    if (selectedUser) {
      editUserMutation.mutate({ userId: selectedUser.id, userData: data });
    }
  };

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: t("common.success"),
        description: t("common.userDeletedSuccessfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  // Users CSV processing mutation
  const processUsersCSVMutation = useMutation({
    mutationFn: async (csvPath: string) => {
      return apiRequest("POST", `/api/admin/csv/users/process`, { csvPath });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("common.success"),
        description: `${data.message}${data.errors && data.errors.length > 0 ? `. ${data.errorCount} errors occurred.` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to process users CSV file",
        variant: "destructive",
      });
    },
  });

  const handleGetUsersCSVUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/admin/csv/users/upload-url");
    const data: any = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUsersCSVUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = (result.successful[0] as any).uploadURL;
      if (uploadURL) {
        processUsersCSVMutation.mutate(uploadURL);
      }
    }
  };

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("common.success"),
        description: t("common.userApprovedSuccessfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  // Reject user mutation
  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("common.success"),
        description: t("common.userRejectedSuccessfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  // Update reward shipment status mutation
  const updateShipmentStatusMutation = useMutation({
    mutationFn: async ({ redemptionId, shipmentStatus }: { redemptionId: string; shipmentStatus: string }) => {
      return apiRequest("PUT", `/api/admin/rewards/${redemptionId}/shipment`, { shipmentStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/redemptions"] });
      toast({
        title: t("common.success"),
        description: "Shipment status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update shipment status",
        variant: "destructive",
      });
    },
  });

  const handleApproveUser = (userId: string) => {
    approveUserMutation.mutate(userId);
  };

  const handleRejectUser = (userId: string) => {
    rejectUserMutation.mutate(userId);
  };

  // Approve reward redemption mutation
  const approveRedemptionMutation = useMutation({
    mutationFn: async (redemptionId: string) => {
      return apiRequest("POST", `/api/admin/rewards/${redemptionId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/pending"] });
      toast({
        title: t("common.success"),
        description: "Reward redemption approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to approve redemption",
        variant: "destructive",
      });
    },
  });

  // Reject reward redemption mutation
  const rejectRedemptionMutation = useMutation({
    mutationFn: async ({ redemptionId, reason }: { redemptionId: string; reason?: string }) => {
      return apiRequest("POST", `/api/admin/rewards/${redemptionId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/pending"] });
      toast({
        title: t("common.success"),
        description: "Reward redemption rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to reject redemption",
        variant: "destructive",
      });
    },
  });

  const handleApproveRedemption = (redemptionId: string) => {
    approveRedemptionMutation.mutate(redemptionId);
  };

  const handleRejectRedemption = (redemptionId: string, reason?: string) => {
    rejectRedemptionMutation.mutate({ redemptionId, reason });
  };

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return apiRequest("DELETE", `/api/admin/rewards/${rewardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      toast({
        title: t("common.success"),
        description: "Reward deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to delete reward",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReward = (rewardId: string) => {
    if (confirm("Are you sure you want to delete this reward? This action cannot be undone.")) {
      deleteRewardMutation.mutate(rewardId);
    }
  };

  const processCSVMutation = useMutation({
    mutationFn: async (csvPath: string) => {
      return apiRequest("POST", `/api/admin/csv/process`, { csvPath });
    },
    onSuccess: (data: any) => {
      toast({
        title: t("common.success"),
        description: `${data.message}${data.errors ? `. ${data.errors.length} errors occurred.` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deals/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to process CSV file",
        variant: "destructive",
      });
    },
  });

  const handleGetCSVUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/csv/upload-url");
      const data: any = await response.json();
      
      if (!data.uploadURL) {
        console.error("No uploadURL in response:", data);
        toast({
          title: t("common.error"), 
          description: "No upload URL received from server",
          variant: "destructive",
        });
        throw new Error("No upload URL received");
      }
      
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      toast({
        title: t("common.error"),
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCSVUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0] as any;
      
      // Try different possible properties for the upload URL
      const uploadURL = uploadedFile.uploadURL || uploadedFile.url || uploadedFile.response?.uploadURL;
      
      if (uploadURL) {
        processCSVMutation.mutate(uploadURL);
      } else {
        toast({
          title: t("common.error"),
          description: "Failed to get upload URL from file upload",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportRewardRedemptions = async () => {
    try {
      toast({
        title: t("admin.generatingRewardRedemptionsReport"),
        description: t("admin.creatingExcelReport"),
      });

      // Build query parameters for the redemptions export
      const params = new URLSearchParams();
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      // Add region filter - only if super-admin and not "all"
      if (currentUser?.role === "super-admin" && reportFilters.region !== "all") {
        params.append("region", reportFilters.region);
      }
      
      const url = `/api/admin/reports/reward-redemptions/export${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Create a temporary download link
      const response = await fetch(url, { 
        credentials: "include",
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate reward redemptions report');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `reward-redemptions-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: t("admin.reportDownloaded"),
        description: `Your reward redemptions report has been saved as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error generating reward redemptions Excel report:', error);
      toast({
        title: t("admin.exportFailed"),
        description: "There was an error generating your reward redemptions report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExportDealsPerUser = async () => {
    try {
      toast({
        title: t("admin.generatingDealsPerUserReport"),
        description: t("admin.creatingExcelReport"),
      });

      // Build query parameters for the deals per user export
      const params = new URLSearchParams();
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      // Add region filter - only if super-admin and not "all"
      if (currentUser?.role === "super-admin" && reportFilters.region !== "all") {
        params.append("region", reportFilters.region);
      }
      
      const url = `/api/admin/reports/deals-per-user/export${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Create a temporary download link
      const response = await fetch(url, { 
        credentials: "include",
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate deals per user report');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `deals-per-user-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: t("admin.reportDownloaded"),
        description: `Your deals per user report has been saved as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error generating deals per user Excel report:', error);
      toast({
        title: t("admin.exportFailed"),
        description: "There was an error generating your deals per user report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExportUserRanking = async () => {
    try {
      toast({
        title: t("admin.generatingUserRanking"),
        description: t("admin.creatingExcelReport"),
      });

      // Build query parameters for the ranking export
      const params = new URLSearchParams();
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);
      
      // Add region filter - only if super-admin and not "all"
      if (currentUser?.role === "super-admin" && reportFilters.region !== "all") {
        params.append("region", reportFilters.region);
      }
      
      const url = `/api/admin/reports/user-ranking/export${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Create a temporary download link
      const response = await fetch(url, { 
        credentials: "include",
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate ranking report');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `user-ranking-${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: t("admin.rankingDownloaded"),
        description: `Your user ranking has been saved as ${filename}`,
      });
      
    } catch (error) {
      console.error('Error generating ranking report:', error);
      toast({
        title: t("admin.exportFailed"),
        description: "There was an error generating your ranking report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "regional-admin" && currentUser.role !== "super-admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                {t('admin.noPermissionAdminPanel')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-4 pb-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0">
          {/* Regions Overview Section */}
          <RegionsOverview />

          {/* Reports Section */}
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle>{t('admin.generateReports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Selector de Región - Solo para Super Admin */}
                {currentUser?.role === "super-admin" && (
                  <div>
                    <Label htmlFor="region">{t('admin.region')}</Label>
                    <Select
                      value={reportFilters.region}
                      onValueChange={(value) => setReportFilters(prev => ({ ...prev, region: value }))}
                    >
                      <SelectTrigger data-testid="select-report-region">
                        <SelectValue placeholder={t("common.allRegions")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.allRegions")}</SelectItem>
                        <SelectItem value="NOLA">NOLA</SelectItem>
                        <SelectItem value="SOLA">SOLA</SelectItem>
                        <SelectItem value="BRASIL">BRASIL</SelectItem>
                        <SelectItem value="MEXICO">MEXICO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="startDate">{t('admin.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">{t('admin.endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleExportUserRanking} data-testid="button-export-user-ranking">
                  <Download className="w-4 h-4 mr-2" />
                  {t('admin.exportUserRanking')}
                </Button>
                <Button onClick={handleExportRewardRedemptions} variant="secondary" data-testid="button-export-reward-redemptions">
                  <Download className="w-4 h-4 mr-2" />
                  {t('admin.exportRewardRedemptions')}
                </Button>
                <Button onClick={handleExportDealsPerUser} variant="outline" data-testid="button-export-deals-per-user">
                  <Download className="w-4 h-4 mr-2" />
                  {t('admin.exportDealsPerUser')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Top Scorers - Goleadores de la temporada */}
          <Card className="shadow-material mt-6">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle>{t('admin.topScorers')}</CardTitle>
                
                {/* Region filter for super-admin */}
                {currentUser?.role === "super-admin" && (
                  <div className="w-full sm:w-auto">
                    <Select
                      value={topScorersRegion}
                      onValueChange={setTopScorersRegion}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-top-scorers-region">
                        <SelectValue placeholder={t("common.allRegions")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.allRegions")}</SelectItem>
                        <SelectItem value="NOLA">NOLA</SelectItem>
                        <SelectItem value="SOLA">SOLA</SelectItem>
                        <SelectItem value="BRASIL">BRASIL</SelectItem>
                        <SelectItem value="MEXICO">MEXICO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {topScorersLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : topScorers && topScorers.length > 0 ? (
                <div className="space-y-3">
                  {topScorers.map((user, index) => (
                    <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">{user.firstName} {user.lastName}</h4>
                          <p className="text-sm text-gray-600 truncate">
                            {user.email} • {user.region}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                        <p className="text-2xl font-bold text-[#29CCB1]">{user.points}</p>
                        <p className="text-xs text-gray-500">{t('points')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t('admin.noTopScorers')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Invitations Tab */}
        <TabsContent value="invitations" className="mt-0">
          <UserInvitationsTab />
        </TabsContent>

        {/* Users Tab - Consolidated with sub-tabs */}
        <TabsContent value="users" className="mt-0">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                {t('admin.userManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="active" data-testid="subtab-active-users">
                    {t('admin.activeUsers')}
                  </TabsTrigger>
                  <TabsTrigger value="pending" data-testid="subtab-pending-users">
                    {t('admin.pendingApprovals')}
                    {pendingUsers && pendingUsers.length > 0 && (
                      <Badge className="ml-2 bg-yellow-500">{pendingUsers.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Active Users Sub-Tab */}
                <TabsContent value="active">
                  <div className="flex justify-end space-x-2 mb-4">
                    <CSVUploader
                      onGetUploadParameters={handleGetUsersCSVUploadParameters}
                      onComplete={handleUsersCSVUploadComplete}
                      buttonClassName="bg-[#29CCB1] hover:bg-[#00A88E] text-white rounded-lg font-medium"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('admin.importUsersCSV')}
                    </CSVUploader>
                    <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-[#29CCB1] hover:bg-[#00A88E] text-white rounded-lg" data-testid="button-create-user">
                          <UserPlus className="w-4 h-4 mr-2" />
                          {t('admin.createUser')}
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>{t('admin.createNewUser')}</DialogTitle>
                      <DialogDescription>
                        Add a new user to the loyalty program platform.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createUserForm}>
                      <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createUserForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.firstName')}</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} data-testid="input-first-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.lastName')}</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={createUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('common.username')}</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} data-testid="input-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('common.email')}</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('common.password')}</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createUserForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('common.country')}</FormLabel>
                              <FormControl>
                                <Input placeholder="United States" {...field} data-testid="input-country" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('common.role')}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-role">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="user">{t('admin.roleUser')}</SelectItem>
                                    <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
                                    {(currentUser?.role === "super-admin" || currentUser?.role === "regional-admin") && (
                                      <SelectItem value="regional-admin">{t('admin.roleRegionalAdmin')}</SelectItem>
                                    )}
                                    {currentUser?.role === "super-admin" && (
                                      <SelectItem value="super-admin">{t('admin.roleSuperAdmin')}</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Region selector - solo para super-admin cuando crea regional-admin */}
                          {currentUser?.role === "super-admin" && createUserForm.watch("role") === "regional-admin" && (
                            <FormField
                              control={createUserForm.control}
                              name="adminRegionId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("auth.assignedRegion")}</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-admin-region">
                                        <SelectValue placeholder={t("admin.selectRegionPlaceholder")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {regionConfigs?.map((region) => (
                                        <SelectItem key={region.id} value={region.id}>
                                          {region.region} - {region.category}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Este admin solo verá datos de esta región
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Indicador para regional-admin: se asignará automáticamente su región */}
                          {currentUser?.role === "regional-admin" && createUserForm.watch("role") === "regional-admin" && (
                            <FormItem>
                              <FormLabel>{t("auth.assignedRegion")}</FormLabel>
                              <div className="flex items-center gap-2 p-2 border rounded-md" style={{ backgroundColor: '#E6F7FF', borderColor: '#33BBFF' }}>
                                <MapPin className="h-4 w-4 text-blue-600" />
                                <div className="text-sm text-blue-900">
                                  <div className="font-medium">{currentUser.regionInfo?.region}</div>
                                  <div className="text-xs text-blue-700">{currentUser.regionInfo?.category}</div>
                                </div>
                              </div>
                              <FormDescription>
                                Se asignará automáticamente tu región
                              </FormDescription>
                            </FormItem>
                          )}
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateUserModalOpen(false)}
                            data-testid="button-cancel-create"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createUserMutation.isPending}
                            data-testid="button-submit-create"
                          >
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                {/* Edit User Modal */}
                <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>{t('admin.editUser')}</DialogTitle>
                      <DialogDescription>
                        {t('admin.updateUserInfo')} {selectedUser?.firstName} {selectedUser?.lastName}.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...editUserForm}>
                      <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={editUserForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.firstName')}</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} data-testid="input-edit-first-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editUserForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.lastName')}</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} data-testid="input-edit-last-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={editUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('common.username')}</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe" {...field} data-testid="input-edit-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('common.email')}</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@example.com" {...field} data-testid="input-edit-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editUserForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('common.country')}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="United States" 
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-edit-country" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={editUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('common.role')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-role">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="user">{t('admin.roleUser')}</SelectItem>
                                    <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
                                    {(currentUser?.role === "super-admin" || currentUser?.role === "regional-admin") && (
                                      <SelectItem value="regional-admin">{t('admin.roleRegionalAdmin')}</SelectItem>
                                    )}
                                    {currentUser?.role === "super-admin" && (
                                      <SelectItem value="super-admin">{t('admin.roleSuperAdmin')}</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editUserForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-status">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="true">Active</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Region selector - solo para super-admin editando regional-admin */}
                        {currentUser?.role === "super-admin" && editUserForm.watch("role") === "regional-admin" && (
                          <FormField
                            control={editUserForm.control}
                            name="adminRegionId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("auth.assignedRegion")}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-admin-region">
                                      <SelectValue placeholder={t("admin.selectRegionPlaceholder")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {regionConfigs?.map((region) => (
                                      <SelectItem key={region.id} value={region.id}>
                                        {region.region} - {region.category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Este admin solo verá datos de esta región
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Indicador para regional-admin: no puede cambiar su región */}
                        {currentUser?.role === "regional-admin" && selectedUser?.role === "regional-admin" && selectedUser?.adminRegionId && (
                          <FormItem>
                            <FormLabel>{t("auth.assignedRegion")}</FormLabel>
                            <div className="flex items-center gap-2 p-2 border rounded-md" style={{ backgroundColor: '#F1F5F8', borderColor: '#D1D5DB' }}>
                              <MapPin className="h-4 w-4 text-gray-600" />
                              <div className="text-sm text-gray-700">
                                <div className="font-medium">{t("auth.assignedRegionNotModifiable")}</div>
                              </div>
                            </div>
                            <FormDescription>
                              {t("auth.onlySuperAdminCanChange")}
                            </FormDescription>
                          </FormItem>
                        )}
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsEditUserModalOpen(false)}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={editUserMutation.isPending}
                            data-testid="button-submit-edit"
                          >
                            {editUserMutation.isPending ? "Updating..." : "Update User"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                CSV format: First Name, Last Name, Username, Email, Password, Country, Role
              </div>

              {usersLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F1F5F8]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.user')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.username')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.role')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.country')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.status')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.joined')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} data-testid={`row-user-${user.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900" data-testid={`text-username-${user.id}`}>
                              {user.username}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {/* Show role as badge if user shouldn't be editable, otherwise show select */}
                            {(user.role === "regional-admin" || user.role === "super-admin" || 
                              (currentUser?.role === "regional-admin" && user.role === "admin") ||
                              user.id === currentUser?.id) ? (
                              <Badge className={
                                user.role === "super-admin" ? "bg-red-100 text-red-800" :
                                user.role === "regional-admin" ? "bg-purple-100 text-purple-800" :
                                user.role === "admin" ? "bg-orange-100 text-orange-800" : 
                                "bg-blue-100 text-blue-800"
                              }>
                                {user.role}
                              </Badge>
                            ) : (
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-24" data-testid={`select-role-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">{t('admin.roleUser')}</SelectItem>
                                  {currentUser?.role !== "regional-admin" && (
                                    <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.country}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={user.isActive ? "text-white" : "bg-red-100 text-red-800"} style={{ backgroundColor: user.isActive ? '#29CCB1' : undefined }}>
                              {user.isActive ? t('common.active') : t('common.inactive')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt.toString())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              {updateUserRoleMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              ) : (
                                <span className="text-green-600">✓</span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                                disabled={user.id === currentUser?.id}
                                className={user.id === currentUser?.id 
                                  ? "text-gray-400 cursor-not-allowed" 
                                  : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
                                data-testid={`button-edit-${user.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={user.id === currentUser?.id}
                                    className={user.id === currentUser?.id 
                                      ? "text-gray-400 cursor-not-allowed ml-2" 
                                      : "text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"}
                                    data-testid={`button-delete-${user.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('admin.deleteUser')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('admin.deleteUserConfirmation')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel data-testid="button-cancel-delete">
                                      {t('common.cancel')}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      disabled={deleteUserMutation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                      data-testid="button-confirm-delete"
                                    >
                                      {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-users">
                  No users found
                </p>
              )}
                </TabsContent>

                {/* Pending Approvals Sub-Tab */}
                <TabsContent value="pending">
                  <div className="text-sm text-gray-600 mb-4">
                    New user registrations awaiting administrator approval
                  </div>

                  {pendingUsersLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : pendingUsers && pendingUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-[#F1F5F8]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Country
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Registration Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {pendingUsers.map((user: any) => (
                            <tr key={user.id} data-testid={`row-pending-user-${user.id}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={user.role === "admin" ? "text-white" : "text-white"} style={{ backgroundColor: user.role === "admin" ? "#7633FF" : "#33BBFF" }}>
                                  {user.role}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {user.country}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(user.createdAt.toString())}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => handleApproveUser(user.id)}
                                    disabled={approveUserMutation.isPending || rejectUserMutation.isPending}
                                    className="bg-[#29CCB1] hover:bg-[#00A88E] text-white rounded-lg font-medium"
                                    data-testid={`button-approve-${user.id}`}
                                  >
                                    {approveUserMutation.isPending ? "Approving..." : "Approve"}
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectUser(user.id)}
                                    disabled={approveUserMutation.isPending || rejectUserMutation.isPending}
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                                    data-testid={`button-reject-${user.id}`}
                                  >
                                    {rejectUserMutation.isPending ? "Rejecting..." : "Reject"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8" data-testid="text-no-pending-users">
                      No pending user approvals
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-0">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Deal Management</CardTitle>
                <CSVUploader
                  onGetUploadParameters={handleGetCSVUploadParameters}
                  onComplete={handleCSVUploadComplete}
                  buttonClassName="bg-[#29CCB1] hover:bg-[#00A88E] text-white rounded-lg font-medium"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Deals CSV
                </CSVUploader>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                CSV format: usuario, valor, status, tipo, acuerdo (optional) (where status = pending/approved/rejected, tipo = software/hardware)
              </div>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : dealsData?.deals && dealsData.deals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F1F5F8]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          License Agreement
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dealsData.deals.map((deal) => (
                        <tr key={deal.id} data-testid={`row-deal-${deal.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {deal.userFirstName && deal.userLastName 
                                  ? `${deal.userFirstName} ${deal.userLastName}`
                                  : deal.userName || 'Unknown User'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {deal.productName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {deal.quantity} {deal.productType === "software" ? "licenses" : "units"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(deal.dealValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">
                              {deal.productType.charAt(0).toUpperCase() + deal.productType.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-license-agreement-${deal.id}`}>
                            {deal.licenseAgreementNumber || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getStatusColor(deal.status)} border-0`}>
                              {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {deal.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveDeal(deal.id)}
                                    disabled={approveDealMutation.isPending}
                                    data-testid={`button-approve-deal-${deal.id}`}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectDeal(deal.id)}
                                    disabled={rejectDealMutation.isPending}
                                    data-testid={`button-reject-deal-${deal.id}`}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditDeal(deal)}
                                className="hover:bg-[#E6F7FF]" style={{ color: '#33BBFF' }}
                                data-testid={`button-edit-deal-${deal.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" data-testid="text-no-deals">
                  No deals found
                </p>
              )}
            </CardContent>
            {dealsData && dealsData.total > 20 && (
              <div className="px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, dealsData.total)} of {dealsData.total} deals
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm text-gray-600">
                      Page {currentPage} of {Math.ceil(dealsData.total / 20)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(dealsData.total / 20)}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Rewards Tab - Consolidated with sub-tabs */}
        <TabsContent value="rewards" className="mt-0">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="w-5 h-5 mr-2" />
                {t('admin.rewardManagement')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="catalog" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="catalog" data-testid="subtab-reward-catalog">
                    {t('admin.rewardCatalog')}
                  </TabsTrigger>
                  <TabsTrigger value="approvals" data-testid="subtab-reward-approvals">
                    {t('admin.pendingApprovals')}
                    {pendingRedemptions && pendingRedemptions.length > 0 && (
                      <Badge className="ml-2 bg-yellow-500">{pendingRedemptions.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="history" data-testid="subtab-reward-history">
                    {t('admin.redemptionHistory')}
                  </TabsTrigger>
                </TabsList>

                {/* Reward Catalog Sub-Tab */}
                <TabsContent value="catalog">
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => {
                        setSelectedReward(null);
                        setIsRewardModalOpen(true);
                      }}
                      data-testid="button-add-reward"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('rewards.addReward') || 'Add Reward'}
                    </Button>
                  </div>

                  {rewardsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                      ))}
                    </div>
                  ) : rewards && rewards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rewards.map((reward) => (
                        <Card key={reward.id} className="border overflow-hidden" data-testid={`card-admin-reward-${reward.id}`}>
                          {/* Image Preview */}
                          {reward.imageUrl && (
                            <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                              <img
                                src={reward.imageUrl}
                                alt={reward.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3 mb-3">
                              {!reward.imageUrl && (
                                <div className="w-10 h-10 bg-gradient-to-br from-accent-400 to-accent-600 rounded-lg flex items-center justify-center">
                                  <Gift className="text-white h-5 w-5" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{reward.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {reward.pointsCost.toLocaleString()} {t('rewards.points')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mb-3">
                              <Badge variant="outline">
                                {reward.category}
                              </Badge>
                              {reward.region && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {reward.region}
                                </Badge>
                              )}
                            </div>
                            
                            {reward.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {reward.description}
                              </p>
                            )}
                            
                            {reward.stockQuantity && (
                              <p className="text-xs text-gray-500 mb-3">
                                Stock: {reward.stockQuantity}
                              </p>
                            )}
                            
                            <div className="flex justify-between items-center">
                              <Badge className={reward.isActive ? "text-white" : "bg-red-100 text-red-800"} style={{ backgroundColor: reward.isActive ? '#29CCB1' : undefined }}>
                                {reward.isActive ? t('rewards.active') : t('rewards.inactive')}
                              </Badge>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedReward(reward);
                                    setIsRewardModalOpen(true);
                                  }}
                                  data-testid={`button-edit-reward-${reward.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteReward(reward.id)}
                                  disabled={deleteRewardMutation.isPending}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`button-delete-reward-${reward.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-rewards-admin">
                        {t('rewards.noRewardsConfigured')}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {t('rewards.addRewardsForUsers')}
                      </p>
                      <Button
                        onClick={() => {
                          setSelectedReward(null);
                          setIsRewardModalOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('rewards.addFirstReward')}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Pending Approvals Sub-Tab */}
                <TabsContent value="approvals">
                  <div className="text-sm text-gray-600 mb-4">
                    {t('rewards.userRedemptionsAwaiting')}
                  </div>

                  {pendingRedemptionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : pendingRedemptions && pendingRedemptions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-[#F1F5F8]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.user')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.reward')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('rewards.requestedDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('common.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('common.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {pendingRedemptions.map((redemption: any) => (
                            <tr key={redemption.id} data-testid={`row-pending-redemption-${redemption.id}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {redemption.userFirstName} {redemption.userLastName}
                                  </div>
                                  <div className="text-sm text-gray-500">@{redemption.userName}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {redemption.rewardName}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(redemption.redeemedAt.toString())}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  {redemption.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => handleApproveRedemption(redemption.id)}
                                    disabled={approveRedemptionMutation.isPending}
                                    className="bg-[#29CCB1] hover:bg-[#00A88E] text-white rounded-lg font-medium"
                                    size="sm"
                                    data-testid={`button-approve-redemption-${redemption.id}`}
                                  >
                                    {approveRedemptionMutation.isPending ? t('admin.approving') : t('admin.approveRedemption')}
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectRedemption(redemption.id, "Rejected by administrator")}
                                    disabled={rejectRedemptionMutation.isPending}
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    size="sm"
                                    data-testid={`button-reject-redemption-${redemption.id}`}
                                  >
                                    {rejectRedemptionMutation.isPending ? t('admin.rejecting') : t('admin.rejectRedemption')}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8" data-testid="text-no-pending-redemptions">
                      {t('admin.noRedemptionsToApprove')}
                    </p>
                  )}
                </TabsContent>

                {/* Redemption History Sub-Tab */}
                <TabsContent value="history">
                  <div className="text-sm text-gray-600 mb-4">
                    {t('rewards.completeRedemptionHistory')}
                  </div>

                  {allRedemptionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : allRedemptions && allRedemptions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-[#F1F5F8]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.user')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.reward')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.pointsCost')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('rewards.requestedDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('common.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('rewards.approvedBy')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('rewards.approvedDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.shipmentStatus')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('common.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allRedemptions.map((redemption: any) => (
                            <tr key={redemption.id} data-testid={`row-redemption-${redemption.id}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {redemption.userFirstName} {redemption.userLastName}
                                  </div>
                                  <div className="text-sm text-gray-500">@{redemption.userName}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {redemption.rewardName}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {redemption.pointsCost?.toLocaleString()} {t('rewards.points')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(redemption.redeemedAt.toString())}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={`${
                                  redemption.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  redemption.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {redemption.status === 'approved' ? t('rewards.approved') :
                                   redemption.status === 'pending' ? t('rewards.pending') : t('rewards.rejected')}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {redemption.approvedBy ? 'Admin' : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {redemption.approvedAt ? formatDate(redemption.approvedAt.toString()) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={`${
                                  redemption.shipmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                                  redemption.shipmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {redemption.shipmentStatus === 'delivered' ? t('rewards.delivered') :
                                   redemption.shipmentStatus === 'shipped' ? t('rewards.shipped') : t('rewards.pending')}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {redemption.status === 'approved' && (
                                  <div className="flex space-x-2">
                                    {redemption.shipmentStatus === 'pending' && (
                                      <Button
                                        size="sm"
                                        onClick={() => updateShipmentStatusMutation.mutate({ 
                                          redemptionId: redemption.id, 
                                          shipmentStatus: 'shipped' 
                                        })}
                                        disabled={updateShipmentStatusMutation.isPending}
                                        className="bg-[#33BBFF] hover:bg-[#3355FF] text-white rounded-lg font-medium"
                                        data-testid={`button-ship-${redemption.id}`}
                                      >
                                        {updateShipmentStatusMutation.isPending ? t('admin.updating') : t('admin.markShipped')}
                                      </Button>
                                    )}
                                    {redemption.shipmentStatus === 'shipped' && (
                                      <Button
                                        size="sm"
                                        onClick={() => updateShipmentStatusMutation.mutate({ 
                                          redemptionId: redemption.id, 
                                          shipmentStatus: 'delivered' 
                                        })}
                                        disabled={updateShipmentStatusMutation.isPending}
                                        className="bg-[#29CCB1] hover:bg-[#00A88E]"
                                        data-testid={`button-deliver-${redemption.id}`}
                                      >
                                        {updateShipmentStatusMutation.isPending ? t('admin.updating') : t('admin.markDelivered')}
                                      </Button>
                                    )}
                                    {redemption.shipmentStatus === 'delivered' && (
                                      <span className="text-green-600 font-medium">✓ Delivered</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8" data-testid="text-no-redemptions">
                      No reward redemptions found
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="mt-0">
          <RegionsManagementTab />
        </TabsContent>

        {/* Masters Tab - Master Data Management */}
        <TabsContent value="masters" className="mt-0">
          <MastersTab />
        </TabsContent>

        {/* Settings Tab - with sub-tabs for Support, Points Config, and Program Configuration */}
        <TabsContent value="settings" className="mt-0">
          <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                {t('admin.systemSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="support" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="support" data-testid="subtab-support">
                    {t('admin.supportTickets')}
                  </TabsTrigger>
                  <TabsTrigger value="points-config" data-testid="subtab-points-config">
                    {t('admin.pointsConfiguration')}
                  </TabsTrigger>
                  <TabsTrigger value="program-config" data-testid="subtab-program-config">
                    {t('admin.programConfiguration')}
                  </TabsTrigger>
                  <TabsTrigger value="grand-prize" data-testid="subtab-grand-prize">
                    {t('admin.grandPrizeFinal')}
                  </TabsTrigger>
                  <TabsTrigger value="monthly-prizes" data-testid="subtab-monthly-prizes">
                    {t('admin.monthlyPrizes')}
                  </TabsTrigger>
                </TabsList>

                {/* Support Tickets Sub-Tab */}
                <TabsContent value="support">
                  <SupportTicketsTab />
                </TabsContent>

                {/* Points Config Sub-Tab */}
                <TabsContent value="points-config">
                  <PointsConfigTab />
                </TabsContent>

                {/* Program Configuration Sub-Tab */}
                <TabsContent value="program-config">
                  <ProgramConfigTab />
                </TabsContent>

                {/* Grand Prize Sub-Tab */}
                <TabsContent value="grand-prize">
                  <GrandPrizeTab />
                </TabsContent>

                {/* Monthly Prizes Sub-Tab */}
                <TabsContent value="monthly-prizes">
                  <MonthlyPrizesTab />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RewardModal
        isOpen={isRewardModalOpen}
        onClose={() => {
          setIsRewardModalOpen(false);
          setSelectedReward(null);
        }}
        reward={selectedReward}
      />
      
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => {
          setIsDealModalOpen(false);
          setSelectedDeal(null);
        }}
        deal={selectedDeal}
      />
    </div>
  );
}






