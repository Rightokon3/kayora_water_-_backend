/**
 * Form validation helpers.
 *
 * Pure functions, no React/UI dependencies, so they're trivially
 * testable and reusable from any screen. Every validator returns a
 * human-readable error string (or undefined when valid) rather than
 * a boolean, so screens can show the message directly.
 */

export const MIN_PASSWORD_LENGTH = 8;

export function validateUsername(username: string): string | undefined {
  if (!username.trim()) {
    return "Username is required";
  }
  if (username.trim().length < 3) {
    return "Username must be at least 3 characters";
  }
  if (!/^[a-zA-Z0-9 .]+$/.test(username.trim())) {
    return "Username can only contain letters, numbers, dots";
  }
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email is required";
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.trim())) {
    return "Enter a valid email address";
  }
  return undefined;
}

export function validatePhone(phone: string): string | undefined {
  if (!phone.trim()) {
    return "Phone number is required";
  }
  // Accepts +234XXXXXXXXXX or local 0XXXXXXXXXX style numbers,
  // 10-15 digits after an optional leading +.
  const phonePattern = /^\+?[0-9]{10,15}$/;
  if (!phonePattern.test(phone.trim().replace(/\s/g, ""))) {
    return "Enter a valid phone number";
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return undefined;
}

export function validatePasswordMatch(
  password: string,
  repeatPassword: string
): string | undefined {
  if (!repeatPassword) {
    return "Please repeat your password";
  }
  if (password !== repeatPassword) {
    return "Passwords do not match";
  }
  return undefined;
}

/** Identifier field on login accepts either a username or an email. */
export function validateIdentifier(identifier: string): string | undefined {
  if (!identifier.trim()) {
    return "Username or email is required";
  }
  return undefined;
}

export type LoginFormValues = {
  identifier: string;
  password: string;
};

export type LoginFormErrors = {
  identifierError?: string;
  passwordError?: string;
  isValid: boolean;
};

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const identifierError = validateIdentifier(values.identifier);
  const passwordError = !values.password ? "Password is required" : undefined;

  return {
    identifierError,
    passwordError,
    isValid: !identifierError && !passwordError,
  };
}

export type SignupFormValues = {
  username: string;
  email: string;
  phone: string;
  password: string;
  repeatPassword: string;
};

export type SignupFormErrors = {
  usernameError?: string;
  emailError?: string;
  phoneError?: string;
  passwordError?: string;
  repeatPasswordError?: string;
  isValid: boolean;
};

export function validateSignupForm(values: SignupFormValues): SignupFormErrors {
  const usernameError = validateUsername(values.username);
  const emailError = validateEmail(values.email);
  const phoneError = validatePhone(values.phone);
  const passwordError = validatePassword(values.password);
  const repeatPasswordError = passwordError
    ? undefined // don't pile on a second error until the first password is valid
    : validatePasswordMatch(values.password, values.repeatPassword);

  return {
    usernameError,
    emailError,
    phoneError,
    passwordError,
    repeatPasswordError,
    isValid:
      !usernameError &&
      !emailError &&
      !phoneError &&
      !passwordError &&
      !repeatPasswordError,
  };
}
