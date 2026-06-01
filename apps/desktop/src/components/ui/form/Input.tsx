import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

type InputVariant = "surface-0" | "surface-1";

type SharedInputProps = InputProps & {
  variant?: InputVariant;
};

const variantClasses: Record<InputVariant, string> = {
  "surface-0": "bg-surface-0 border border-border rounded-mac",
  "surface-1": "bg-surface-1 border border-border rounded-mac",
};

const Input = forwardRef<HTMLInputElement, SharedInputProps>(function Input(
  { className = "", type = "text", variant = "surface-0", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={`w-full px-2.5 py-1.5 text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});

export default Input;
