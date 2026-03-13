import Link from "next/link"

export default function Navbar(){

return(

<nav className="flex justify-between items-center p-6 border-b">

<h1 className="text-xl font-bold">
QRBulkGen
</h1>

<div className="flex gap-6 text-gray-700">

<Link href="/">Home</Link>
<Link href="/blog">Blog</Link>
<Link href="/pricing">Pricing</Link>
<Link href="/dashboard">Dashboard</Link>
<Link href="/login">Login</Link>

</div>

</nav>

)

}
