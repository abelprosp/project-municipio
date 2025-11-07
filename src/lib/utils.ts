import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Validação de CNPJ
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return true; // CNPJ é opcional
  const cleaned = cnpj.replace(/[^\d]/g, '');
  if (cleaned.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validar dígitos verificadores
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

// Validação de email
export function validateEmail(email: string): boolean {
  if (!email) return true; // Email é opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validação de data (verificar se é uma data válida e não no passado se necessário)
export function validateDate(date: string, allowPast: boolean = true): boolean {
  if (!date) return true; // Data é opcional
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return false;
  if (!allowPast && dateObj < new Date()) return false;
  return true;
}

// Validação de UF (2 caracteres)
export function validateUF(uf: string): boolean {
  if (!uf) return false; // UF é obrigatório
  const ufRegex = /^[A-Z]{2}$/;
  return ufRegex.test(uf.toUpperCase());
}

export function formatDateLocal(
  date: string | null | undefined,
  fallback: string = "Sem prazo definido"
): string {
  if (!date || date.trim() === "") {
    return fallback;
  }

  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) {
      return fallback;
    }
    return format(parsed, "dd/MM/yyyy");
  } catch (error) {
    return fallback;
  }
}
