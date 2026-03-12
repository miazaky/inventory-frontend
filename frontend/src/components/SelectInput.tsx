interface SelectOption { value: string; label: string; }
interface SelectInputProps {
  label?: string; value: string; onChange: (value: string) => void;
  options: SelectOption[]; placeholder?: string; required?: boolean; disabled?: boolean;
}
export function SelectInput({ label, value, onChange, options, placeholder = "Pasirinkti...", required, disabled }: SelectInputProps) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}{required && <span className="req">*</span>}
        </label>
      )}
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled} className="input">
        <option value="">{placeholder}</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
