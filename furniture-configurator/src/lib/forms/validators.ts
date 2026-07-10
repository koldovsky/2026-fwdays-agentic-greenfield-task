export function validatePositiveInteger({ value }: { value: number }) {
  return Number.isInteger(value) && value > 0
    ? undefined
    : "Значення має бути додатним цілим числом";
}
