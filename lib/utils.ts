import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert Prisma objects to plain JavaScript objects
export function convertToPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function formatNumberWithDecimal(num: number): string {
  const [int, decimal] = num.toString().split('.');
  return decimal ? `${int}.${decimal.slice(0, 2)}` : `${int}.00`;
}

// Format error messages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(error: any): string {
  if (error.name === 'ZodError') {
    const seen = new Set<string>()
    const messages = error.issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((issue: any) => issue.message) 
      .filter((msg: string) => {
        if (seen.has(msg)) return false
        seen.add(msg)
        return true
      })

    return messages.join('. ')
  } else if (
    error.name === 'PrismaClientKnownRequestError' && error.code === 'P2002'
  ) {
    // Handle Prisma unique constraint violation error
    const field = error.meta?.target ? error.meta.target[0] : 'Field';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  } else {
    // Handle other errors
    return typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
  }
}