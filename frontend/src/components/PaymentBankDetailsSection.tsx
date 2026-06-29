import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PaymentBankDetails } from '../types/ai'
import { hasBankDetails } from '../types/ai'

interface PaymentBankDetailsSectionProps {
  value: PaymentBankDetails
  onChange: (value: PaymentBankDetails) => void
  defaultOpen?: boolean
}

export default function PaymentBankDetailsSection({
  value,
  onChange,
  defaultOpen = false,
}: PaymentBankDetailsSectionProps) {
  const [open, setOpen] = useState(defaultOpen || hasBankDetails(value))

  useEffect(() => {
    if (hasBankDetails(value)) {
      setOpen(true)
    }
  }, [value.bank_name, value.bank_agency, value.issuer_name, value.account_rib, value.maturity_date])

  const setField = (field: keyof PaymentBankDetails, next: string) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-800"
      >
        <span>Détails bancaires du document</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="p-3 space-y-3 border-t border-slate-200">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banque</label>
            <input
              value={value.bank_name}
              onChange={e => setField('bank_name', e.target.value)}
              placeholder="UIB, BIAT..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agence / Domiciliation</label>
            <input
              value={value.bank_agency}
              onChange={e => setField('bank_agency', e.target.value)}
              placeholder="Agence UIB 1 AV UIB"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Émetteur / Titulaire (Tireur)</label>
            <input
              value={value.issuer_name}
              onChange={e => setField('issuer_name', e.target.value)}
              placeholder="FOULEN BEN FOULEN"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">RIB / RIP (20 chiffres)</label>
            <input
              value={value.account_rib}
              onChange={e => setField('account_rib', e.target.value)}
              placeholder="12 000 00000 00 00000 0 22"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date d&apos;échéance</label>
            <input
              type="date"
              value={value.maturity_date}
              onChange={e => setField('maturity_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
