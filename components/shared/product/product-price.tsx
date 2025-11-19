import { cn } from "@/lib/utils";

interface ProductPriceProps {
  value: number | string;   // Prisma.Decimal comes through as string
  currency?: string;        // "GBP", "EUR", "USD", etc.
  className?: string;
}

const currencySymbols: Record<string, string> = {
  'USD': "$",
  'GBP': "£",
  'EUR': "€",
  'JPY': "¥",
};

const ProductPrice = ({value, currency="USD", className}: ProductPriceProps) => {
    const num = typeof value === "string" ? Number(value) : value;

    // fallback if NaN
    if (Number.isNaN(num)) return null;

    const symbol = currencySymbols[currency];

    // Ensures two decimal places
    const stringValue = num.toFixed(2);
    // Split into integer and decimal parts
    const [integerPart, decimalPart] = stringValue.split(".");
    return (
        <p className={cn("text-2xl", className)}>
        <span className="text-xs align-super">{symbol}</span>
        {integerPart}
        <span className="text-sm align-top">.{decimalPart}</span>
        </p>
    );
};
export default ProductPrice;