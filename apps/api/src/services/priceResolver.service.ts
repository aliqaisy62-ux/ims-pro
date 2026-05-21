import { PriceType, Currency } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export function resolvePrice(
  item: {
    retailPrice: Decimal
    wholesalePrice: Decimal
    specialPrice: Decimal
    dollarPrice: Decimal
    dinarPrice: Decimal
  },
  priceType: PriceType,
  currency: Currency,
  exchangeRate: Decimal
): Decimal {
  switch (priceType) {
    case 'RETAIL':
      return item.retailPrice
    case 'WHOLESALE':
      return item.wholesalePrice
    case 'SPECIAL':
      return item.specialPrice
    case 'DINAR':
      return item.dinarPrice
    case 'DOLLAR':
      if (currency === 'IQD') {
        return new Decimal(item.dollarPrice.toString()).mul(exchangeRate)
      }
      return item.dollarPrice
    default:
      return item.retailPrice
  }
}
