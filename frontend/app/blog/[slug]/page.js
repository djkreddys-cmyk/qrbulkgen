export default async function BlogPost({ params }) {

  const { slug } = await params

  const title = slug.replaceAll("-", " ")

  return (

    <article className="max-w-3xl mx-auto mt-20">

      <h1 className="text-4xl font-bold">
        {title}
      </h1>

      <p className="mt-6 text-gray-600">
        This article explains how businesses use QR codes.
      </p>

    </article>

  )

}