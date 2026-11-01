import PortalLink from "@/components/PortalLink";
import { Card, Container, Footer, Gradient, Navbar, Subheading } from "@/components/ui";

const features = [
  {
    title: "Faculty records",
    description: "Keep rank, tenure status, department and notes for every faculty member.",
  },
  {
    title: "Offices & cubicles",
    description: "Track every space by building, room, floor, window and current status.",
  },
  {
    title: "Assignments with history",
    description: "Assign and release offices while keeping a full record of past allocations.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col overflow-hidden">
      {/* Hero */}
      <div className="relative">
        <Gradient className="absolute inset-2 bottom-0 rounded-4xl ring-1 ring-black/5 ring-inset" />
        <div className="absolute inset-2 bottom-0 rounded-4xl bg-white/35" />
        <Container className="relative">
          <Navbar />
          <div className="pt-16 pb-24 sm:pt-24 sm:pb-32 md:pt-32 md:pb-40">
            <p className="inline-flex items-center rounded-full bg-maroon/85 px-3 py-0.5 text-sm/6 font-medium text-gold-100">
              Team 1
            </p>
            <h1 className="mt-6 text-6xl/[0.9] font-medium tracking-tight text-balance text-gray-950 sm:text-8xl/[0.85]">
              Faculty Allocation System
            </h1>
            <p className="mt-8 max-w-lg text-xl/7 font-medium text-gray-950/75 sm:text-2xl/8">
              Manage faculty office assignments.
            </p>
            <div className="mt-12 flex flex-col gap-x-6 gap-y-4 sm:flex-row">
              <PortalLink href="/admin">Admin Page</PortalLink>
              <PortalLink href="/faculty" variant="secondary">
                Faculty Page
              </PortalLink>
            </div>
          </div>
        </Container>
      </div>

      {/* Features */}
      <main className="flex-1">
        <Container className="py-24">
          <Subheading>What it does</Subheading>
          <h2 className="mt-2 max-w-3xl text-4xl font-medium tracking-tighter text-pretty text-gray-950 sm:text-5xl">
            Every office, every faculty member, in one place.
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="relative overflow-hidden p-7">
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-gold to-maroon" />
                <h3 className="text-lg/7 font-medium text-gray-950">{feature.title}</h3>
                <p className="mt-2 text-sm/6 text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
