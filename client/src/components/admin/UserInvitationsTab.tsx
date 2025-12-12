import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Upload, Mail, CheckCircle, Clock, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from "xlsx";
import { useTranslation } from "@/hooks/useTranslation";

interface InviteFormData {
  email: string;
  firstName: string;
  lastName: string;
}

export default function UserInvitationsTab() {
  const { t } = useTranslation();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isBulkInviteDialogOpen, setIsBulkInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: "",
    firstName: "",
    lastName: "",
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkUsers, setBulkUsers] = useState<InviteFormData[]>([]);
  const [csvPreview, setCsvPreview] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending users
  const { data: pendingUsers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users/pending"],
  });

  // Single invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      try {
        console.log("Sending invite data:", data);
        
        const response = await fetch("/api/admin/users/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || `Error ${response.status}`);
          } catch (e) {
            throw new Error(`Server error: ${response.status}`);
          }
        }

        const responseData = await response.json();
        console.log("Success response:", responseData);
        return responseData;
      } catch (error: any) {
        console.error("Invite error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: t("admin.invitationSent"),
        description: t("admin.invitationSentSuccessfully"),
      });
      setIsInviteDialogOpen(false);
      setInviteForm({ email: "", firstName: "", lastName: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("admin.couldNotSendInvitation"),
        variant: "destructive",
      });
    },
  });

  // Bulk invite mutation
  const bulkInviteMutation = useMutation({
    mutationFn: async (users: InviteFormData[]) => {
      try {
        console.log("Sending bulk invite data:", users);
        
        const response = await fetch("/api/admin/users/invite-bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ users }),
        });

        console.log("Bulk response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Bulk error response:", errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || `Error ${response.status}`);
          } catch (e) {
            throw new Error(`Server error: ${response.status}`);
          }
        }

        const responseData = await response.json();
        console.log("Bulk success response:", responseData);
        return responseData;
      } catch (error: any) {
        console.error("Bulk invite error:", error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      toast({
        title: t("admin.invitationsProcessed"),
        description: `${data.summary.successful} de ${data.summary.total} invitaciones enviadas exitosamente.`,
      });
      setIsBulkInviteDialogOpen(false);
      setBulkUsers([]);
      setCsvFile(null);
      setCsvPreview("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.couldNotSendInvitations"),
        variant: "destructive",
      });
    },
  });

  const handleSingleInvite = () => {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      toast({
        title: t("admin.requiredFields"),
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate(inviteForm);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Process CSV data
        const users = jsonData.map((row) => ({
          email: row.email || row.Email || row.EMAIL || "",
          firstName: row.firstName || row.FirstName || row.first_name || row["First Name"] || "",
          lastName: row.lastName || row.LastName || row.last_name || row["Last Name"] || "",
        })).filter(user => user.email && user.firstName && user.lastName);

        setBulkUsers(users);
        setCsvPreview(`${users.length} usuarios válidos encontrados en el archivo.`);

        if (users.length === 0) {
          toast({
            title: t("common.error"),
            description: t("admin.noValidUsersFound"),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast({
          title: t("common.error"),
          description: t("admin.couldNotProcessCSVFile"),
          variant: "destructive",
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleBulkInvite = () => {
    if (bulkUsers.length === 0) {
      toast({
        title: t("admin.noUsers"),
        description: t("admin.pleaseLoadCSVFile"),
        variant: "destructive",
      });
      return;
    }
    bulkInviteMutation.mutate(bulkUsers);
  };

  const downloadCsvTemplate = () => {
    const template = [
      { email: "user@example.com", firstName: t("admin.firstNameField"), lastName: t("admin.lastNameField") },
      { email: "other@example.com", firstName: "John", lastName: "Doe" },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("admin.usersSheet"));
    XLSX.writeFile(workbook, "plantilla-usuarios.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.userManagement')}</h2>
          <p className="text-muted-foreground">
            {t('admin.inviteAndManageUsers')}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                {t('admin.inviteUser')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.inviteNewUser')}</DialogTitle>
                <DialogDescription>
                  {t('admin.userWillReceiveEmail')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t("admin.firstNameField")} *</Label>
                    <Input
                      id="firstName"
                      placeholder={t("admin.firstNameField")}
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t("admin.lastNameField")} *</Label>
                    <Input
                      id="lastName"
                      placeholder={t("admin.lastNameField")}
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSingleInvite} 
                  className="w-full"
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? t("admin.sendingInvitation") : t("admin.sendInvitation")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkInviteDialogOpen} onOpenChange={setIsBulkInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                {t('admin.importCSV')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('admin.importUsersCSV')}</DialogTitle>
                <DialogDescription>
                  {t('admin.uploadCSVDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    El archivo CSV debe contener las columnas: <strong>email</strong>, <strong>firstName</strong>, <strong>lastName</strong>
                  </AlertDescription>
                </Alert>

                <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>

                <div>
                  <Label htmlFor="csvFile">{t('common.csvFile')}</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                </div>

                {csvPreview && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{csvPreview}</AlertDescription>
                  </Alert>
                )}

                {bulkUsers.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border rounded p-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>{t("common.name")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkUsers.map((user, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{user.email}</TableCell>
                            <TableCell className="text-xs">{user.firstName} {user.lastName}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <Button 
                  onClick={handleBulkInvite} 
                  className="w-full"
                  disabled={bulkInviteMutation.isPending || bulkUsers.length === 0}
                >
                  {bulkInviteMutation.isPending 
                    ? "Enviando invitaciones..." 
                    : `Enviar ${bulkUsers.length} Invitaciones`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.pendingUsersApproval")}</CardTitle>
          <CardDescription>
            {t("admin.pendingUsersApprovalDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t("admin.loading")}</div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.noPendingUsers")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("common.country")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("common.registrationDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.country}</TableCell>
                    <TableCell>
                      {user.isApproved ? (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aprobado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
