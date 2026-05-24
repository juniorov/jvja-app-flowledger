import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { formatAmount } from '@/shared/utils/formatters'

/**
 * Composable para formateo de moneda usando la configuración del workspace activo.
 */
export function useCurrency() {
  const workspaceStore = useWorkspaceStore()

  /**
   * Formatea un monto usando la moneda del workspace por defecto.
   * @param {number} amount
   * @param {'CRC' | 'USD'} [currency]  Si se omite, usa la del workspace
   * @returns {string}
   */
  function format(amount, currency) {
    const cur = currency ?? workspaceStore.workspace?.baseCurrency ?? 'CRC'
    return formatAmount(amount, cur)
  }

  /**
   * Símbolo de la moneda base del workspace.
   * @returns {string}  "₡" o "$"
   */
  const currencySymbol = () => {
    const base = workspaceStore.workspace?.baseCurrency ?? 'CRC'
    return base === 'CRC' ? '₡' : '$'
  }

  return { format, currencySymbol }
}
