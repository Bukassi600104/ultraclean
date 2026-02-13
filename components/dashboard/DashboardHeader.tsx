interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center border-b bg-white px-4 lg:px-8">
      <h1 className="font-heading text-lg font-semibold text-gray-900 pl-12 lg:pl-0">
        {title}
      </h1>
    </header>
  );
}
