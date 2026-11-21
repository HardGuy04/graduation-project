import { Controller } from "react-hook-form";
import { vi } from "date-fns/locale";
import { AnimatedCalendar } from "@/components/kit/calender";
import { cn } from "@/lib/utils";
import { parseISODate, toISODate } from "@/lib/date";

const VI_STRINGS = {
  weekdays: ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"],
  weekdaysShort: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  months: Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`),
  monthsShort: Array.from({ length: 12 }, (_, i) => `Th${i + 1}`),
  today: "Hôm nay",
  clear: "Xóa",
  close: "Đóng",
  selectTime: "Chọn giờ",
  backToCalendar: "Quay lại lịch",
  selected: "đã chọn",
  weekNumber: "Tuần",
};

/**
 * AnimatedCalendar (JolyUI) với giá trị dạng chuỗi "yyyy-MM-dd" như input type="date" cũ.
 * Nhận id / aria-describedby / error do FormRow truyền xuống.
 */
export function DateField({ value, onChange, onBlur, min, max, placeholder = "Chọn ngày", error, className, disabled, ...props }) {
  return (
    <AnimatedCalendar
      mode="single"
      value={parseISODate(value)}
      onChange={(d) => onChange?.(toISODate(d))}
      onBlur={onBlur}
      minDate={parseISODate(min)}
      maxDate={parseISODate(max)}
      placeholder={placeholder}
      formatStr="dd/MM/yyyy '·' EEEE"
      locale={vi}
      localeStrings={VI_STRINGS}
      weekStartsOn={1}
      error={!!error}
      disabled={disabled}
      className={cn(
        "h-11 w-full rounded-field border-input bg-card px-4 hover:bg-card [&>span]:w-full [&>span]:justify-start",
        className
      )}
      {...props}
    />
  );
}

/** Bản dùng với react-hook-form. */
export function DateFieldRHF({ control, name, rules, ...props }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => <DateField {...props} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
    />
  );
}
