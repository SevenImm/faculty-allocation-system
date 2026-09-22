import PortalLink from '@/components/PortalLink';
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
     <div className="text-center">
        <h1 className="text-4xl font-bold">
          Team 1
        </h1>
        <h1 className="text-4xl font-bold">
         Faculty Allocation System
        </h1>

        <p className="mt-4 text-lg">
          Manage faculty office assignments
       </p>
       <div className='mt-6 flex gap-4 justify-center'>
        <PortalLink href='/faculty'>Faculty Page</PortalLink>
        <PortalLink href='/admin'>Admin Page</PortalLink>
        </div>
      </div>
    </main>
  );
}