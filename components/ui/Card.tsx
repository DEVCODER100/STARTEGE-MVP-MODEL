export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-bg-surface rounded-card border-subtle p-4 ${className}`}>
      {children}
    </div>
  );
}
