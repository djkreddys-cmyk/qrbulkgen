"use client"

import Navbar from "../../components/Navbar"
import UploadBox from "../../components/UploadBox"

export default function UploadPage() {

 return (

   <div>

     <Navbar/>

     <div className="max-w-xl mx-auto mt-20">

       <h2 className="text-2xl font-bold mb-6">
         Upload CSV File
       </h2>

       <UploadBox/>

     </div>

   </div>

 )

}