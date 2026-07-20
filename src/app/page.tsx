import Dashboard from "@/components/Dashboard";
import AuthNav from "@/components/AuthNav";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="wrap">
      <div className="top">
        <div className="brand">
          <span className="flame">🔥</span>
          <div>
            <h1>CircuitEats</h1>
            <div className="sub">Live ratings across the food-festival circuit</div>
          </div>
        </div>
        <AuthNav />
      </div>

      <Dashboard />

      <div className="foot">CircuitEats · Phase 2 · scoped leaderboards on real Postgres · seeded from Elkhorn Ribfest 2026</div>
    </main>
  );
}
