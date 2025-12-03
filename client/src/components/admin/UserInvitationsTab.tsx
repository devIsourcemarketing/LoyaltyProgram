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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PARTNER_CATEGORIES, MARKET_SEGMENTS } from "@/../../shared/constants";

interface InviteFormData {
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  partnerCategory?: string;
  marketSegment?: string;
  country?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  contactNumber?: string;
}

export default function UserInvitationsTab() {
  const { t } = useTranslation();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isBulkInviteDialogOpen, setIsBulkInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
    partnerCategory: "",
    marketSegment: "",
    country: "",
    address: "",
    city: "",
    zipCode: "",
    contactNumber: "",
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
      setInviteForm({ 
        email: "", 
        firstName: "", 
        lastName: "",
        companyName: "",
        partnerCategory: "",
        marketSegment: "",
        country: "",
        address: "",
        city: "",
        zipCode: "",
        contactNumber: "",
      });
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

        // Process CSV data - mapear todos los campos
        const users = jsonData.map((row) => {
          const email = row.email || row.Email || row.EMAIL || row["USER ID"] || "";
          
          // Si no hay firstName/lastName, intentar generarlos del email
          let firstName = row.firstName || row.FirstName || row.first_name || row["First Name"] || "";
          let lastName = row.lastName || row.LastName || row.last_name || row["Last Name"] || "";
          
          if (!firstName && !lastName && email) {
            // Extraer nombre del email (antes del @)
            const emailName = email.split('@')[0];
            // Capitalizar primera letra
            firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            lastName = "User"; // Apellido por defecto
          }
          
          return {
            email,
            firstName,
            lastName,
            companyName: row.companyName || row.CompanyName || row.company_name || row["Company Name"] || row["COMPANY NAME"] || "",
            partnerCategory: row.partnerCategory || row.PartnerCategory || row.partner_category || row["Partner Category"] || row["PARTNER CATEGORY"] || "",
            marketSegment: row.marketSegment || row.MarketSegment || row.market_segment || row["Market Segment"] || row["MARKET SEGMENT"] || "",
            country: row.country || row.Country || row.COUNTRY || row["KL REGION"] || "",
            address: row.address || row.Address || row.ADDRESS || "",
            city: row.city || row.City || row.CITY || "",
            zipCode: row.zipCode || row.ZipCode || row.zip_code || row["Zip Code"] || row["ZIP CODE"] || "",
            contactNumber: row.contactNumber || row.ContactNumber || row.contact_number || row["Contact Number"] || row["CONTACT NUMBER"] || "",
          };
        }).filter(user => user.email);

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
      { 
        email: "user@example.com", 
        firstName: t("admin.firstNameField"), 
        lastName: t("admin.lastNameField"),
        companyName: "Company Name",
        partnerCategory: "Partner Category",
        marketSegment: "Market Segment",
        country: "Country",
        address: "Address",
        city: "City",
        zipCode: "12345",
        contactNumber: "+1234567890"
      },
      { 
        email: "other@example.com", 
        firstName: "John", 
        lastName: "Doe",
        companyName: "Acme Corp",
        partnerCategory: "Enterprise",
        marketSegment: "SMB",
        country: "Colombia",
        address: "123 Main St",
        city: "Bogotá",
        zipCode: "110111",
        contactNumber: "+57123456789"
      },
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
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
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
                <div>
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Nombre de la empresa"
                    value={inviteForm.companyName || ""}
                    onChange={(e) => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partnerCategory">Categoría del Partner</Label>
                    <Select
                      value={inviteForm.partnerCategory || ""}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, partnerCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTNER_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="marketSegment">Segmento del Mercado</Label>
                    <Select
                      value={inviteForm.marketSegment || ""}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, marketSegment: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKET_SEGMENTS.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      placeholder="País"
                      value={inviteForm.country || ""}
                      onChange={(e) => setInviteForm({ ...inviteForm, country: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      placeholder="Ciudad"
                      value={inviteForm.city || ""}
                      onChange={(e) => setInviteForm({ ...inviteForm, city: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    placeholder="Dirección completa"
                    value={inviteForm.address || ""}
                    onChange={(e) => setInviteForm({ ...inviteForm, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode">Código Postal</Label>
                    <Input
                      id="zipCode"
                      placeholder="Código postal"
                      value={inviteForm.zipCode || ""}
                      onChange={(e) => setInviteForm({ ...inviteForm, zipCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactNumber">Número de Contacto</Label>
                    <Input
                      id="contactNumber"
                      type="tel"
                      placeholder="+57 123 456 7890"
                      value={inviteForm.contactNumber || ""}
                      onChange={(e) => setInviteForm({ ...inviteForm, contactNumber: e.target.value })}
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
                  <Label htmlFor="csvFile">Archivo CSV</Label>
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
