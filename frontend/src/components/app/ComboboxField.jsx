import { Controller } from "react-hook-form";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/kit/combobox";

const sameOption = (a, b) => String(a?.value) === String(b?.value);

/**
 * Combobox (shadcn + Base UI) cho danh sách dài cần tìm kiếm.
 * options: [{ value, label }] — value trả ra dạng chuỗi như <select> cũ.
 * Nhận id / aria-describedby / error do FormRow truyền xuống.
 */
export function ComboboxField({
  options,
  value,
  onChange,
  onBlur,
  placeholder = "Chọn…",
  emptyText = "Không tìm thấy kết quả phù hợp.",
  error,
  disabled,
  showClear = false,
  className,
  id,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
}) {
  const selected = options.find((o) => String(o.value) === String(value ?? "")) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(opt) => onChange?.(opt ? String(opt.value) : "")}
      isItemEqualToValue={sameOption}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        onBlur={onBlur}
        disabled={disabled}
        showClear={showClear}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={String(item.value)} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** Bản dùng với react-hook-form. */
export function ComboboxFieldRHF({ control, name, rules, ...props }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => <ComboboxField {...props} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
    />
  );
}
