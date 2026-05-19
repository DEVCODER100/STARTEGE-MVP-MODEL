export default function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium bg-bg-accent-dk text-accent-light ${className}`}>
      {children}
    </span>
  );
}
