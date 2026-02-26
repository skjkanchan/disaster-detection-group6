import GeospatialDashboard from "@/components/GeospatialDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold text-zinc-900">
          Disaster Damage Dashboard
        </h1>
        <p className="text-sm text-zinc-600">
          Geospatial view of damage assessments
        </p>
      </header>

      <section className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm">
        <GeospatialDashboard />
      </section>
    </div>
  );
}
