import MainLayout from "@/layouts/MainLayout";
import TitleBar from "@/components/layout/TitleBar";

export default function RepoView() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-surface-0">
      <TitleBar />
      <div className="flex-1 min-h-0 overflow-hidden">
        <MainLayout />
      </div>
    </div>
  );
}
