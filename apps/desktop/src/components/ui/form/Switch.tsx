type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export default function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: SwitchProps) {
  return (
    <label className={`flex items-center justify-between gap-4 py-1.5 select-none ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-text-primary">{label}</span>
        {description && <span className="text-2xs text-text-muted mt-0.5 leading-normal">{description}</span>}
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-8 h-[18px] bg-surface-3 rounded-full transition-colors duration-200 peer-checked:bg-accent"></div>
        <div className="absolute left-[2px] top-[2px] bg-white w-[14px] h-[14px] rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-3.5"></div>
      </div>
    </label>
  );
}
