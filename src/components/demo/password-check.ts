export const EMPTY_PASSWORD_MESSAGE = "Enter the demo password.";

export function checkPassword(password: string): string | null {
  return password === "" ? EMPTY_PASSWORD_MESSAGE : null;
}
