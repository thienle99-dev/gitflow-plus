import { forwardRef, type SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

type SelectVariant = "surface-0" | "surface-1";

type SharedSelectProps = SelectProps & {
  variant?: SelectVariant;
};

const variantClasses: Record<SelectVariant, string> = {
  "surface-0": "bg-surface-0 border border-border rounded-mac",
  "surface-1": "bg-surface-1 border border-border rounded-mac",
};

const Select = forwardRef<HTMLSelectElement, SharedSelectProps>(function Select(
  { className = "", variant = "surface-0", ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`w-full px-2.5 py-1.5 text-text-primary outline-none focus:border-accent appearance-none cursor-pointer transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});

export default Select;