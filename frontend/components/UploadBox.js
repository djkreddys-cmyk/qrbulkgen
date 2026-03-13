"use client"

import { useState } from "react"

export default function UploadBox() {

 const [file,setFile] = useState(null)

 return (

  <div className="border p-6 rounded">

    <input
      type="file"
      accept=".csv"
      onChange={(e)=>setFile(e.target.files[0])}
    />

    <button
      className="mt-4 bg-black text-white px-4 py-2 rounded"
    >
      Upload
    </button>

    {file && (
      <p className="mt-3">
        Selected: {file.name}
      </p>
    )}

  </div>

 )

}