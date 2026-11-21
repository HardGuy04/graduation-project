import { Link, useSearchParams } from "react-router-dom";
import { HiOutlinePlus } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { VercelTabs } from "@/components/kit/vercel-tabs";
import { PageHeader } from "../../components/app/PageHeader";
import AppointmentsPanel from "./PatientAppointments";
import RecordsPanel from "./PatientRecords";

const TABS = ["appointments", "history"];

export default function PatientVisits() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "appointments";

  function onTabChange(next) {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Lịch khám"
        title="Lịch khám của bạn"
        description="Theo dõi các lịch hẹn sắp tới và xem lại hồ sơ, đơn thuốc của những lần khám trước."
        actions={
          <Button asChild>
            <Link to="/patient/book"><HiOutlinePlus /> Đặt lịch mới</Link>
          </Button>
        }
      />

      <div className="-mx-1 overflow-x-auto scrollbar-none px-1 pb-2">
        <VercelTabs
          ariaLabel="Lịch khám"
          value={tab}
          onValueChange={onTabChange}
          contentClassName="mt-6"
          tabs={[
            { value: "appointments", label: "Lịch hẹn", content: <AppointmentsPanel /> },
            { value: "history", label: "Lịch sử khám", content: <RecordsPanel /> },
          ]}
        />
      </div>
    </div>
  );
}
