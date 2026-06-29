import { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FileUp, Loader2, ScanLine } from 'lucide-react'
import { analyzePaymentDocument } from '../services/ai'
import {
  hasBankDetails,
  mapAnalysisToScanResult,
  type PaymentScanResult,
} from '../types/ai'

interface PaymentDocumentScannerProps {
  onScanningChange: (scanning: boolean) => void
  onAnalyzed: (result: PaymentScanResult) => void
  disabled?: boolean
}

export default function PaymentDocumentScanner({
  onScanningChange,
  onAnalyzed,
  disabled = false,
}: PaymentDocumentScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [scanning, setScanning] = useState(false)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image (JPEG, PNG, etc.)')
      return
    }

    setScanning(true)
    onScanningChange(true)
    try {
      const data = await analyzePaymentDocument(file)
      const result = mapAnalysisToScanResult(data)
      const hasFormData = Boolean(
        result.amount
        || result.reference
        || result.payment_method
        || result.account_rib
        || result.issuer_name
        || result.bank_name
      )
      if (!hasFormData) {
        toast.error('Document analysé mais aucune donnée exploitable détectée. Saisissez les champs manuellement.')
        return
      }
      onAnalyzed(result)
      const partial = !result.amount || !result.reference || !result.payment_method
      const bankPartial = !hasBankDetails({
        bank_name: result.bank_name ?? '',
        bank_agency: result.bank_agency ?? '',
        issuer_name: result.issuer_name ?? '',
        account_rib: result.account_rib ?? '',
        maturity_date: result.maturity_date ?? '',
      })
      toast.success(
        partial || bankPartial
          ? 'Document partiellement analysé — vérifiez les champs bancaires et complétez si besoin.'
          : 'Document analysé avec succès ! Veuillez vérifier et valider les informations.'
      )
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined
      toast.error(message || 'Échec de l\'analyse OCR. Saisie manuelle disponible.')
    } finally {
      setScanning(false)
      onScanningChange(false)
    }
  }, [onAnalyzed, onScanningChange])

  const handleFiles = (files: FileList | null) => {
    if (!files?.length || disabled || scanning) return
    processFile(files[0])
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={disabled || scanning}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
        } ${disabled || scanning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex flex-col items-center gap-2">
          {scanning ? (
            <Loader2 size={22} className="text-blue-600 animate-spin" />
          ) : (
            <ScanLine size={22} className="text-blue-600" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-800">
              Scanner un document (Chèque, Virement, Traite)
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <FileUp size={12} />
              Glisser-déposer ou cliquer pour importer une image
            </p>
          </div>
        </div>
      </button>
    </div>
  )
}

export function PaymentFormScanOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-[1px]">
      <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
        <Loader2 size={18} className="animate-spin text-blue-600" />
        Analyse de la pièce jointe par l&apos;IA...
      </div>
    </div>
  )
}
