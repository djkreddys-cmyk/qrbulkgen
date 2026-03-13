import Link from "next/link"

const posts = [
 {
   slug:"bulk-qr-code-generator-guide",
   title:"Bulk QR Code Generator Guide"
 },
 {
   slug:"qr-codes-for-marketing",
   title:"How Businesses Use QR Codes in Marketing"
 }
]

export default function Blog(){

 return(

  <div className="max-w-4xl mx-auto mt-20">

   <h1 className="text-3xl font-bold">
    QR Code Blog
   </h1>

   <ul className="mt-8 space-y-4">

   {posts.map(post => (

    <li key={post.slug}>

     <Link href={`/blog/${post.slug}`}>
      {post.title}
     </Link>

    </li>

   ))}

   </ul>

  </div>

 )

}