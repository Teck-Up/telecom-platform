export const fmtCurrency = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

export const fmtDate = (value: string): string =>
  new Date(value).toLocaleDateString('fr-FR')

export const fmtDateTime = (value: string): string =>
  new Date(value).toLocaleString('fr-FR')

export const fmtTime = (value: string): string =>
  new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
