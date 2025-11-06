export const normalizeCurrencyValue = (value: string): string => {
  if (!value) {
    return "";
  }

  const sanitized = value.replace(/,/g, "").replace(/[^0-9.]/g, "");

  if (!sanitized) {
    return "";
  }

  const hasDecimal = sanitized.includes(".");
  const parts = sanitized.split(".");
  const integerPartRaw = parts[0] ?? "";
  const decimalPartRaw = parts.slice(1).join("");

  let integerPart = integerPartRaw.replace(/^0+(?=\d)/, "");

  if (!integerPart) {
    integerPart = hasDecimal ? "0" : "";
  }

  if (!hasDecimal) {
    return integerPart;
  }

  const decimalPart = decimalPartRaw.slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : `${integerPart}.`;
};

export const formatCurrencyDisplay = (value: string): string => {
  if (!value) {
    return "";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "";
  }

  return numericValue.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatAmountFromNumber = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return value.toFixed(2);
};
