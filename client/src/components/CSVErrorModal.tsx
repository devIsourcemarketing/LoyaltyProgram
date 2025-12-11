import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/useTranslation";

interface CSVError {
  row?: number;
  type: 'duplicate' | 'user_not_found' | 'invalid_format' | 'missing_field' | 'invalid_date';
  message: string;
  field?: string;
}

interface CSVErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: CSVError[];
  errorStats?: {
    duplicate: number;
    user_not_found: number;
    invalid_format: number;
    missing_field: number;
    invalid_date: number;
  };
  totalProcessed?: number;
  successCount?: number;
}

const errorTypeColors: Record<CSVError['type'], string> = {
  duplicate: 'bg-orange-100 text-orange-800 border-orange-300',
  user_not_found: 'bg-red-100 text-red-800 border-red-300',
  invalid_format: 'bg-purple-100 text-purple-800 border-purple-300',
  missing_field: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  invalid_date: 'bg-blue-100 text-blue-800 border-blue-300',
};

const errorTypeLabels: Record<CSVError['type'], string> = {
  duplicate: 'Duplicado',
  user_not_found: 'Usuario no encontrado',
  invalid_format: 'Formato inválido',
  missing_field: 'Campo faltante',
  invalid_date: 'Fecha inválida',
};

export function CSVErrorModal({ 
  isOpen, 
  onClose, 
  errors, 
  errorStats,
  totalProcessed = 0,
  successCount = 0 
}: CSVErrorModalProps) {
  const { t } = useTranslation();

  const errorCount = errors.length;
  const successRate = totalProcessed > 0 ? Math.round((successCount / totalProcessed) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-6 w-6 text-red-500" />
              {t('admin.csvImport.errorTitle')}
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <DialogDescription>
            {totalProcessed > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  <strong>{successCount}</strong> de <strong>{totalProcessed}</strong> deals importados 
                  (<strong>{successRate}%</strong> de éxito)
                </p>
                <p className="text-sm text-red-600">
                  <strong>{errorCount}</strong> error{errorCount !== 1 ? 'es' : ''} encontrado{errorCount !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Statistics Summary */}
        {errorStats && (
          <div className="flex flex-wrap gap-2 pb-3 border-b">
            {errorStats.duplicate > 0 && (
              <Badge variant="outline" className={errorTypeColors.duplicate}>
                {errorStats.duplicate} {errorTypeLabels.duplicate}
              </Badge>
            )}
            {errorStats.user_not_found > 0 && (
              <Badge variant="outline" className={errorTypeColors.user_not_found}>
                {errorStats.user_not_found} {errorTypeLabels.user_not_found}
              </Badge>
            )}
            {errorStats.invalid_format > 0 && (
              <Badge variant="outline" className={errorTypeColors.invalid_format}>
                {errorStats.invalid_format} {errorTypeLabels.invalid_format}
              </Badge>
            )}
            {errorStats.missing_field > 0 && (
              <Badge variant="outline" className={errorTypeColors.missing_field}>
                {errorStats.missing_field} {errorTypeLabels.missing_field}
              </Badge>
            )}
            {errorStats.invalid_date > 0 && (
              <Badge variant="outline" className={errorTypeColors.invalid_date}>
                {errorStats.invalid_date} {errorTypeLabels.invalid_date}
              </Badge>
            )}
          </div>
        )}

        {/* Error List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {errors.map((error, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {error.row && (
                        <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">
                          Fila {error.row}
                        </span>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`${errorTypeColors[error.type]} text-xs`}
                      >
                        {errorTypeLabels[error.type]}
                      </Badge>
                      {error.field && (
                        <span className="text-xs text-gray-600">
                          Campo: <strong>{error.field}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{error.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
