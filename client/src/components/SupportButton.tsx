import { useState } from "react";
import { MessageCircle, HelpCircle, X, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const supportTicketSchema = z.object({
  subject: z.string().min(5, "El asunto debe tener al menos 5 caracteres"),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
  priority: z.enum(["low", "medium", "high"]),
});

type SupportTicketForm = z.infer<typeof supportTicketSchema>;

export default function SupportButton() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Get current user to determine region
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const userRegion = (currentUser as any)?.region || "NOLA";

  // Region-specific FAQs
  const getFaqsByRegion = (region: string) => {
    const baseFaqs = [
      {
        question: t("support.faq.q1.question"),
        answer: t("support.faq.q1.answer"),
      },
      {
        question: t("support.faq.q2.question"),
        answer: t("support.faq.q2.answer"),
      },
      {
        question: t("support.faq.q3.question"),
        answer: t("support.faq.q3.answer"),
      },
      {
        question: t("support.faq.q4.question"),
        answer: t("support.faq.q4.answer"),
      },
      {
        question: t("support.faq.q5.question"),
        answer: t("support.faq.q5.answer"),
      },
      {
        question: t("support.faq.q6.question"),
        answer: t("support.faq.q6.answer"),
      },
      {
        question: t("support.faq.q7.question"),
        answer: t("support.faq.q7.answer"),
      },
      {
        question: t("support.faq.q8.question"),
        answer: t("support.faq.q8.answer"),
      },
      {
        question: t("support.faq.q9.question"),
        answer: t("support.faq.q9.answer"),
      },
      {
        question: t("support.faq.q10.question"),
        answer: t("support.faq.q10.answer"),
      },
      {
        question: t("support.faq.q11.question"),
        answer: t("support.faq.q11.answer"),
      },
      {
        question: t("support.faq.q12.question"),
        answer: t("support.faq.q12.answer"),
      },
    ];

    // Add region-specific FAQs
    if (region === "MEXICO") {
      return [
        ...baseFaqs,
        {
          question: t("support.faq.mexico.q1.question"),
          answer: t("support.faq.mexico.q1.answer"),
        },
        {
          question: t("support.faq.mexico.q2.question"),
          answer: t("support.faq.mexico.q2.answer"),
        },
      ];
    }

    return baseFaqs;
  };

  const faqs = getFaqsByRegion(userRegion);

  const form = useForm<SupportTicketForm>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: "",
      message: "",
      priority: "medium",
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: SupportTicketForm) => {
      return apiRequest("POST", "/api/support-tickets", data);
    },
    onSuccess: () => {
      toast({
        title: t("admin.ticketSent"),
        description:
          t("support.requestSent")
      });
      setTicketDialogOpen(false);
      setMenuOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || t("admin.couldNotSendTicket"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupportTicketForm) => {
    createTicketMutation.mutate(data);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {menuOpen && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-56 mb-2">
            <button
              onClick={() => {
                setTicketDialogOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
              data-testid="button-open-ticket"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{t('support.submitApplication')}</span>
            </button>
            <button
              onClick={() => {
                setFaqDialogOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
              data-testid="button-open-faq"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="text-sm">{t('support.faqTitle')}</span>
            </button>
            <button
              onClick={() => {
                setTermsDialogOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
              data-testid="button-open-terms"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm">{t('support.termsAndConditions')}</span>
            </button>
          </div>
        )}

        <Button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
          data-testid="button-support"
        >
          {menuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-support-ticket">
          <DialogHeader>
            <DialogTitle>{t("support.supportRequest")}</DialogTitle>
            <DialogDescription>
              {t("support.supportRequestDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("support.subject")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("support.subjectPlaceholder")}
                        {...field}
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("support.priority")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder={t("support.selectPriority")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t("support.low")}</SelectItem>
                        <SelectItem value="medium">{t("support.medium")}</SelectItem>
                        <SelectItem value="high">{t("support.high")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("support.message")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("support.messagePlaceholder")}
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTicketDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  data-testid="button-submit-ticket"
                >
                  {createTicketMutation.isPending ? (
                    t("support.submitting")
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("support.submitTicket")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="dialog-faq">
          <DialogHeader>
            <DialogTitle>{t("support.faqTitle")}</DialogTitle>
            <DialogDescription>
              {t("support.faqDescription")}
            </DialogDescription>
          </DialogHeader>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left" data-testid={`faq-question-${index}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 faq-answer" data-testid={`faq-answer-${index}`}>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              {t("support.cantFind")}{" "}
              <button
                onClick={() => {
                  setFaqDialogOpen(false);
                  setTicketDialogOpen(true);
                }}
                className="text-primary hover:underline font-medium text-green-600"
                data-testid="button-contact-support"
              >
                 {t("support.pleaseContact")}
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto" data-testid="dialog-terms">
          <DialogHeader>
            <DialogTitle>{t(`support.terms.${userRegion}.title`)}</DialogTitle>
            <DialogDescription>
              {t(`support.terms.${userRegion}.subtitle`)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: t(`support.terms.${userRegion}.content`) }} />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setTermsDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
