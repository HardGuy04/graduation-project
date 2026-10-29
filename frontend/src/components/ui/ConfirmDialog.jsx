import { ConfirmDialog as AppConfirmDialog } from "../app/Dialog";

export default function ConfirmDialog(props) {
  return <AppConfirmDialog cancelLabel="Hủy bỏ" {...props} open={!!props.open} />;
}
