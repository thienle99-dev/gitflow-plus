import MainLayout from "@/layouts/MainLayout";

export default function RepoView() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-surface-0">
      <div className="flex-1 min-h-0 overflow-hidden">
        <MainLayout />
      </div>
    </div>
  );
}
