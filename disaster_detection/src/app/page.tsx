import DashboardHeader from "@/components/DashboardHeader";
import GeospatialDashboard from "@/components/GeospatialDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <DashboardHeader />

        <section className="bg-white rounded-xl border border-zinc-200 p-4 md:p-5 shadow-sm">
          <GeospatialDashboard />
        </section>
      </main>
    </div>
  );
}
