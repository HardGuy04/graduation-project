import { Card as AppCard, CardHeader as AppCardHeader } from "../app/Surface";

export default function Card(props) {
  return <AppCard {...props} />;
}

export function CardHeader({ title, subtitle, action, className }) {
  return <AppCardHeader title={title} description={subtitle} action={action} className={className} />;
}
