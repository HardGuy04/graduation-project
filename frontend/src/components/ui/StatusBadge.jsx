import { AppointmentBadge, InvoiceBadge, Badge } from "../app/Badge";
import { ROOM_STATUS_LABEL } from "../../utils/constants";

export function AppointmentStatusBadge({ status, className }) {
  return <AppointmentBadge status={status} className={className} />;
}

export function InvoiceStatusBadge({ status, className }) {
  return <InvoiceBadge status={status} className={className} />;
}

const ROOM_TONE = { available: "mint", in_use: "sky", maintenance: "danger", inactive: "muted" };

export function RoomStatusBadge({ status, className }) {
  return (
    <Badge tone={ROOM_TONE[status] || "muted"} dot className={className}>
      {ROOM_STATUS_LABEL[status] || status}
    </Badge>
  );
}

export function AccountStatusBadge({ status, className }) {
  const active = status === "active";
  return (
    <Badge tone={active ? "mint" : "danger"} dot className={className}>
      {active ? "Đang hoạt động" : "Đã khóa"}
    </Badge>
  );
}
