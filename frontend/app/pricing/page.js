import Navbar from "../../components/Navbar"

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For trying single and small batch QR workflows.",
    features: ["Single QR generation", "Basic customization", "Recent job history"],
  },
  {
    name: "Growth",
    price: "$19/mo",
    description: "For teams running regular bulk campaigns.",
    features: ["Bulk CSV generation", "ZIP download", "Dashboard analytics"],
  },
  {
    name: "Scale",
    price: "$79/mo",
    description: "For high-volume operations and support needs.",
    features: ["Higher batch limits", "Priority processing", "Priority support"],
  },
]

export default function PricingPage() {
  return (
    <div>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-center">Pricing</h1>
        <p className="text-center text-gray-600 mt-4">
          Choose a plan based on your QR volume and workflow needs.
        </p>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {plans.map((plan) => (
            <article key={plan.name} className="border rounded-lg p-6 bg-white">
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className="text-3xl mt-2">{plan.price}</p>
              <p className="text-gray-600 mt-3">{plan.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
