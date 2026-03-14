import Link from "next/link"
import Navbar from "../components/Navbar"

export default function Home(){

return(

<div>

<Navbar/>

{/* HERO */}

<section className="text-center mt-24 px-6">

<h1 className="text-5xl font-bold">
Bulk QR Code Generator for Businesses
</h1>

<p className="mt-6 text-gray-600 max-w-xl mx-auto">
Generate thousands of QR codes from CSV instantly. 
Perfect for product packaging, marketing campaigns, events, and inventory systems.
</p>

<div className="mt-8 flex justify-center gap-4">

<Link
href="/generate/single"
className="px-6 py-3 bg-black text-white rounded-lg"
>
Generate QR Codes
</Link>

<Link
href="/blog"
className="px-6 py-3 border rounded-lg"
>
Read Blog
</Link>

</div>

</section>

{/* FEATURES */}

<section className="mt-32 max-w-6xl mx-auto px-6">

<h2 className="text-3xl font-bold text-center">
Features
</h2>

<div className="grid grid-cols-3 gap-10 mt-12">

<div>
<h3 className="font-semibold text-lg">
Bulk Generation
</h3>
<p className="text-gray-600 mt-2">
Generate thousands of QR codes at once using CSV files.
</p>
</div>

<div>
<h3 className="font-semibold text-lg">
Instant Downloads
</h3>
<p className="text-gray-600 mt-2">
Download all generated QR codes as a ZIP file instantly.
</p>
</div>

<div>
<h3 className="font-semibold text-lg">
Marketing Ready
</h3>
<p className="text-gray-600 mt-2">
Use QR codes for marketing campaigns and product packaging.
</p>
</div>

</div>

</section>

{/* USE CASES */}

<section className="mt-32 bg-gray-50 py-16">

<div className="max-w-6xl mx-auto px-6">

<h2 className="text-3xl font-bold text-center">
Use Cases
</h2>

<div className="grid grid-cols-3 gap-10 mt-10">

<div>
<h3 className="font-semibold">
Product Packaging
</h3>
<p className="text-gray-600">
Add QR codes to product boxes.
</p>
</div>

<div>
<h3 className="font-semibold">
Event Tickets
</h3>
<p className="text-gray-600">
Generate QR codes for thousands of tickets.
</p>
</div>

<div>
<h3 className="font-semibold">
Inventory Systems
</h3>
<p className="text-gray-600">
Track products with QR codes.
</p>
</div>

</div>

</div>

</section>

{/* BLOG SECTION */}

<section className="mt-32 max-w-6xl mx-auto px-6">

<h2 className="text-3xl font-bold text-center">
Latest Articles
</h2>

<div className="grid grid-cols-3 gap-8 mt-10">

<Link href="/blog/bulk-qr-code-generator">

<div className="border p-6 rounded">

<h3 className="font-semibold">
Bulk QR Code Generator Guide
</h3>

<p className="text-gray-600 mt-2">
Learn how to generate thousands of QR codes using CSV.
</p>

</div>

</Link>

<Link href="/blog/qr-codes-for-marketing">

<div className="border p-6 rounded">

<h3 className="font-semibold">
QR Codes for Marketing
</h3>

<p className="text-gray-600 mt-2">
How businesses use QR codes in campaigns.
</p>

</div>

</Link>

</div>

</section>

{/* CTA */}

<section className="text-center mt-32 mb-24">

<h2 className="text-3xl font-bold">
Start Generating QR Codes Today
</h2>

<Link
href="/generate/single"
className="inline-block mt-6 px-8 py-3 bg-black text-white rounded-lg"
>
Generate QR Codes
</Link>

</section>

</div>

)

}
