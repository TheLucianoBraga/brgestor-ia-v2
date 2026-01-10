import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useExport } from '@/hooks/useExport';
import { toast } from 'sonner';

interface ImportCustomersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any[]) => Promise<void>;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

const TARGET_FIELDS = [
  { key: 'full_name', label: 'Nome Completo', required: true },
  { key: 'whatsapp', label: 'WhatsApp', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ', required: false },
  { key: 'rg_ie', label: 'RG/IE', required: false },
  { key: 'birth_date', label: 'Data Nascimento', required: false },
  { key: 'secondary_phone', label: 'Telefone Secundário', required: false },
  { key: 'notes', label: 'Observações', required: false },
  { key: 'product_name', label: 'Produto', required: false },
  { key: 'plan_name', label: 'Plano', required: false },
  { key: 'price', label: 'Valor', required: false },
  { key: 'due_date', label: 'Vencimento', required: false },
  { key: 'street', label: 'Rua', required: false },
  { key: 'number', label: 'Número', required: false },
  { key: 'district', label: 'Bairro', required: false },
  { key: 'city', label: 'Cidade', required: false },
  { key: 'state', label: 'Estado', required: false },
  { key: 'cep', label: 'CEP', required: false },
];

export const ImportCustomersModal: React.FC<ImportCustomersModalProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const { parseImportFile, validateImportData } = useExport();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<{
    data: any[];
    errors: { row: number; field: string; message: string }[];
    totalRows: number;
    validRows: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setRawData([]);
    setSourceColumns([]);
    setColumnMapping({});
    setValidationResult(null);
    setImportResult(null);
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      toast.error('Formato de arquivo inválido. Use Excel (.xlsx) ou CSV.');
      return;
    }

    setFile(selectedFile);

    try {
      const data = await parseImportFile(selectedFile);
      if (data.length === 0) {
        toast.error('Arquivo vazio ou formato inválido');
        return;
      }
      setRawData(data);
      setSourceColumns(Object.keys(data[0]));
      
      // Auto-map columns based on similar names
      const autoMapping: Record<string, string> = {};
      Object.keys(data[0]).forEach(sourceCol => {
        const lowerSource = sourceCol.toLowerCase();
        TARGET_FIELDS.forEach(target => {
          const lowerTarget = target.label.toLowerCase();
          const lowerKey = target.key.toLowerCase();
          if (
            lowerSource.includes(lowerTarget) || 
            lowerTarget.includes(lowerSource) ||
            lowerSource.includes(lowerKey) ||
            lowerKey.includes(lowerSource)
          ) {
            if (!Object.values(autoMapping).includes(target.key)) {
              autoMapping[sourceCol] = target.key;
            }
          }
        });
      });
      setColumnMapping(autoMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Erro ao processar arquivo');
    }
  };

  const handleMappingChange = (sourceCol: string, targetKey: string) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      if (targetKey === '__none__') {
        delete newMapping[sourceCol];
      } else {
        // Remove previous mapping to this target
        Object.entries(newMapping).forEach(([key, value]) => {
          if (value === targetKey && key !== sourceCol) {
            delete newMapping[key];
          }
        });
        newMapping[sourceCol] = targetKey;
      }
      return newMapping;
    });
  };

  const handleValidate = () => {
    const validators: Record<string, (value: any) => string | null> = {
      full_name: (v) => !v || String(v).trim() === '' ? 'Nome é obrigatório' : null,
      whatsapp: (v) => {
        if (!v) return 'WhatsApp é obrigatório';
        const cleaned = String(v).replace(/\D/g, '');
        if (cleaned.length < 10 || cleaned.length > 11) return 'WhatsApp inválido';
        return null;
      },
      email: (v) => {
        if (!v || String(v).trim() === '') return null;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(v)) ? null : 'Email inválido';
      },
      price: (v) => {
        if (!v) return null;
        const num = parseFloat(String(v).replace(',', '.'));
        return isNaN(num) ? 'Valor inválido' : null;
      },
    };

    const result = validateImportData(rawData, columnMapping, validators);
    setValidationResult(result);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.data.length === 0) return;

    setImporting(true);
    try {
      await onImport(validationResult.data);
      setImportResult({
        success: validationResult.validRows,
        failed: validationResult.errors.length,
      });
      setStep('result');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar dados');
    } finally {
      setImporting(false);
    }
  };

  const requiredMapped = TARGET_FIELDS
    .filter(f => f.required)
    .every(f => Object.values(columnMapping).includes(f.key));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Clientes
            <Badge variant="secondary" className="ml-2">
              {step === 'upload' && 'Passo 1/4'}
              {step === 'mapping' && 'Passo 2/4'}
              {step === 'preview' && 'Passo 3/4'}
              {step === 'result' && 'Passo 4/4'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="import-file"
                />
                <Label
                  htmlFor="import-file"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Clique para selecionar arquivo</p>
                    <p className="text-sm text-muted-foreground">
                      Formatos aceitos: Excel (.xlsx) ou CSV
                    </p>
                  </div>
                </Label>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Dicas para importação</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>A primeira linha deve conter os nomes das colunas</li>
                    <li>Nome e WhatsApp são obrigatórios</li>
                    <li>WhatsApp deve conter apenas números (DDD + número)</li>
                    <li>Datas devem estar no formato DD/MM/AAAA</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mapeie as colunas do seu arquivo para os campos do sistema.
                Campos com <span className="text-destructive">*</span> são obrigatórios.
              </p>

              <ScrollArea className="h-[400px] pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coluna no Arquivo</TableHead>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Campo no Sistema</TableHead>
                      <TableHead>Exemplo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceColumns.map(col => (
                      <TableRow key={col}>
                        <TableCell className="font-medium">{col}</TableCell>
                        <TableCell>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMapping[col] || '__none__'}
                            onValueChange={(v) => handleMappingChange(col, v)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Não importar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Não importar</SelectItem>
                              {TARGET_FIELDS.map(field => (
                                <SelectItem 
                                  key={field.key} 
                                  value={field.key}
                                  disabled={Object.values(columnMapping).includes(field.key) && columnMapping[col] !== field.key}
                                >
                                  {field.label}{field.required && ' *'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {rawData[0]?.[col] || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {!requiredMapped && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Mapeie os campos obrigatórios: Nome Completo e WhatsApp
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && validationResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  {validationResult.totalRows} linhas no arquivo
                </Badge>
                <Badge variant="default" className="bg-emerald-500">
                  {validationResult.validRows} válidas
                </Badge>
                {validationResult.errors.length > 0 && (
                  <Badge variant="destructive">
                    {validationResult.errors.length} erros
                  </Badge>
                )}
              </div>

              {validationResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erros encontrados</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-[100px] mt-2">
                      <ul className="space-y-1 text-sm">
                        {validationResult.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>
                            Linha {err.row}: {err.field} - {err.message}
                          </li>
                        ))}
                        {validationResult.errors.length > 10 && (
                          <li>... e mais {validationResult.errors.length - 10} erros</li>
                        )}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Plano</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResult.data.slice(0, 20).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.full_name || '-'}</TableCell>
                        <TableCell>{row.whatsapp || '-'}</TableCell>
                        <TableCell>{row.email || '-'}</TableCell>
                        <TableCell>{row.product_name || '-'}</TableCell>
                        <TableCell>{row.plan_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {validationResult.data.length > 20 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          ... e mais {validationResult.data.length - 20} linhas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && importResult && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-semibold">Importação Concluída!</h3>
              <div className="flex items-center justify-center gap-4">
                <Badge variant="default" className="bg-emerald-500 text-lg py-2 px-4">
                  {importResult.success} importados
                </Badge>
                {importResult.failed > 0 && (
                  <Badge variant="destructive" className="text-lg py-2 px-4">
                    {importResult.failed} com erro
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            {step === 'result' ? 'Fechar' : 'Cancelar'}
          </Button>

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={handleValidate} disabled={!requiredMapped}>
                Validar Dados
              </Button>
            </>
          )}

          {step === 'preview' && validationResult && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Voltar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validationResult.validRows === 0 || importing}
              >
                {importing ? 'Importando...' : `Importar ${validationResult.validRows} Clientes`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
