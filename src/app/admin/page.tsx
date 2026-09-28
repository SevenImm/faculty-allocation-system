export default function AdminPage() {

    const faculty = [
        {
            id: 1,
            name: "John Smith",
            classification: "Professor",
            office: "CWT 203"
        },
        {
            id: 2,
            name: "John Rod",
            classification: "Staff",
            office: null
        },
        {
            id: 3,
            name: "Jotaro Kujo",
            classification: "staff",
            office: "CWT 303"
        }
    ];
    
    return (
        <main>
            <h1>Admin Dashboard</h1>
            <div>
                <h2 className="">Faculty Members</h2>
                <div>
                    <button>[ + Add Faculty ] </button>
                </div>
            </div>
        </main>
    );
}