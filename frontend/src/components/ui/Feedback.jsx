import { Loading, Empty, ErrorNote } from "../app/Feedback";

export function Spinner({ label, className }) {
  return <Loading label={label} className={className} />;
}

export function EmptyState({ icon, title, description, action }) {
  return <Empty icon={icon} title={title} description={description} action={action} />;
}

export function ErrorState({ message }) {
  return <ErrorNote>{message || "Đã có lỗi xảy ra. Vui lòng thử lại."}</ErrorNote>;
}
