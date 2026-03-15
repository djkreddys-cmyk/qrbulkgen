export const siteUrl = "https://www.qrbulkgen.com";

export const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    billing: "For testing workflows and shipping quick campaigns",
    ctaLabel: "Create Free Account",
    ctaHref: "/login",
    summary: "Best for solo founders validating QR use cases before scaling.",
    features: [
      "Unlimited single QR generation",
      "Core styles, colors, and logo support",
      "Bulk dashboard visibility",
      "Public feedback and rating flows",
    ],
  },
  {
    name: "Growth",
    price: "$29/mo",
    billing: "For active operations teams running weekly campaigns",
    ctaLabel: "Start Growth",
    ctaHref: "/login",
    summary: "Ideal for marketing teams, packaging workflows, and recurring bulk jobs.",
    features: [
      "Bulk CSV generation with ZIP delivery",
      "Job history, monitoring, and artifacts",
      "Feedback, rating, gallery, and PDF QR types",
      "Shared mobile monitoring for teams",
    ],
    featured: true,
  },
  {
    name: "Scale",
    price: "$99/mo",
    billing: "For larger catalogs, events, and fulfillment programs",
    ctaLabel: "Talk to Sales",
    ctaHref: "/pricing",
    summary: "Built for operations that need high confidence, faster support, and predictable output.",
    features: [
      "Priority support and launch help",
      "Higher throughput and larger batch windows",
      "Launch review for campaigns and data imports",
      "Advanced rollout planning for teams",
    ],
  },
];

export const homepageStats = [
  {
    id: "types",
    label: "QR types available",
    value: "18+",
    title: "Cover direct payloads, tracked experiences, and business workflows from one generator.",
    body:
      "The product supports direct QR payloads like URL, Text, Email, Phone, and WiFi, plus richer tracked flows like Rating, Feedback, PDF, and Image Gallery.",
    bullets: ["18+ supported QR paths", "Structured forms by QR type", "One styling layer across every flow"],
  },
  {
    id: "formats",
    label: "Formats supported",
    value: "PNG, SVG, ZIP",
    title: "Move from preview to production file formats without leaving the product.",
    body:
      "Single generation supports instant image downloads while bulk workflows package finished rows into ZIP artifacts for vendors, packaging teams, and campaign operators.",
    bullets: ["Single downloads in PNG and SVG", "Bulk artifact delivery as ZIP", "Mobile share support for finished outputs"],
  },
  {
    id: "public",
    label: "Public experiences",
    value: "Ratings, feedback, gallery, PDF",
    title: "Turn scans into response, learning, and content experiences.",
    body:
      "QRBulkGen is not limited to redirects. Teams can launch scan destinations that capture ratings, collect feedback, open PDFs, or show image galleries with expiry-aware handling.",
    bullets: ["Scan-aware rating flows", "Feedback question summaries", "Hosted content pages with expiry support"],
  },
  {
    id: "history",
    label: "Shared history",
    value: "Web + mobile sync",
    title: "Use one account across devices without losing job visibility.",
    body:
      "The same backend job history powers the web dashboard and the mobile app, which means teams can create on desktop and monitor or share results from phone.",
    bullets: ["Shared dashboard across devices", "Job analysis in web and mobile", "Single account session continuity"],
  },
  {
    id: "bulk",
    label: "Bulk workflow",
    value: "CSV queue + ZIP delivery",
    title: "Handle volume with a real queue-based pipeline, not manual repetition.",
    body:
      "Bulk QR generation validates uploads, queues jobs, processes rows in the worker, and returns finished ZIP artifacts with status, counts, and analysis available later.",
    bullets: ["CSV validation before queueing", "Worker-backed processing pipeline", "Completed ZIP delivery with history"],
  },
  {
    id: "analysis",
    label: "Analysis reports",
    value: "Per-job + QR type insights",
    title: "See more than output counts with analysis built into the operating system.",
    body:
      "Dashboard reporting includes per-job generation metrics, QR-type performance, scan tracking, rating summaries, and feedback analysis so teams can improve what they ship.",
    bullets: ["Per-job analysis expansions", "QR-type report breakdowns", "Engagement metrics for tracked experiences"],
  },
];

export const landingPages = [
  {
    slug: "bulk-qr-codes",
    href: "/bulk-qr-codes",
    title: "Bulk QR Code Generator",
    description:
      "Generate thousands of branded QR codes from CSV with ZIP delivery, row-level tracking, and production-ready job history.",
    heroKicker: "Bulk production",
    heroTitle: "Run bulk QR campaigns without spreadsheet chaos.",
    heroBody:
      "Upload CSV files, queue jobs, track progress, and download finished ZIP artifacts when the worker completes. Perfect for product labeling, print vendors, and campaign operations.",
    bullets: [
      "Queue CSV jobs with counts, statuses, and artifact tracking",
      "Use one consistent style system across single and bulk generation",
      "Handle feedback, ratings, PDFs, image galleries, and more in one workflow",
    ],
    workflowTitle: "Bulk runs need an operations-grade handoff, not a one-time generator.",
    workflowBody:
      "Teams using bulk QR codes usually care about vendor handoff, inventory labeling, or campaign rollout deadlines. The real value is not just creating files. It is validating rows, watching queue progress, and downloading one production-ready ZIP at the end.",
    workflowPoints: [
      "Validate CSV structure before queueing work",
      "Watch status changes while the worker processes rows",
      "Download finished ZIP artifacts only when the batch is truly ready",
    ],
    faqs: [
      {
        question: "What does a bulk CSV need?",
        answer:
          "Each QR type has its own required columns, and every file includes a filename column so generated outputs stay organized.",
      },
      {
        question: "Can I monitor jobs after upload?",
        answer:
          "Yes. Dashboard and mobile bulk monitoring show queued, processing, completed, and failed states with counts.",
      },
    ],
  },
  {
    slug: "single-qr-codes",
    href: "/single-qr-codes",
    title: "Single QR Code Generator",
    description:
      "Generate single QR codes with live preview, color control, error correction, logo support, and instant download.",
    heroKicker: "Single generation",
    heroTitle: "Create one polished QR in seconds.",
    heroBody:
      "For one-off labels, demos, landing pages, product inserts, and quick campaign assets, QRBulkGen gives you instant preview and production-safe output.",
    bullets: [
      "Live preview before download",
      "Color, dot style, corner style, and logo support",
      "PNG and SVG delivery from the same workflow",
    ],
    workflowTitle: "Single QR generation should feel instant, but still polished.",
    workflowBody:
      "The single flow is for teams that need one strong QR now: a package insert, quick event asset, support link, or campaign test. The product should help you preview, style, and download in one pass without sacrificing consistency.",
    workflowPoints: [
      "See the design before you export anything",
      "Keep styling controls simple enough for fast iteration",
      "Move from one-off use cases into bulk only when the workflow proves itself",
    ],
    faqs: [
      {
        question: "Is this only for URLs?",
        answer:
          "No. Single QR supports URLs, text, contact cards, event data, WiFi payloads, social links, ratings, feedback, and more.",
      },
      {
        question: "Can I use this before I need bulk?",
        answer:
          "Yes. Many teams start with single QR creation, then graduate to CSV-based bulk generation once the workflow is proven.",
      },
    ],
  },
  {
    slug: "qr-codes-for-marketing",
    href: "/qr-codes-for-marketing",
    title: "QR Codes for Marketing Campaigns",
    description:
      "Launch campaign-ready QR codes for packaging, posters, flyers, direct mail, and conversion-focused landing experiences.",
    heroKicker: "Marketing use case",
    heroTitle: "Turn every print touchpoint into a measurable campaign.",
    heroBody:
      "Use QR codes for offers, product launches, event registrations, loyalty flows, and post-purchase engagement. Keep the creative strong while operations stay clean.",
    bullets: [
      "Design-consistent outputs for print and digital campaigns",
      "Feedback and rating experiences for post-campaign insight",
      "Blog, landing page, and pricing links for funnel continuity",
    ],
    workflowTitle: "Marketing QR campaigns work best when the destination feels intentional.",
    workflowBody:
      "Great campaign QR codes do more than open a random page. They continue the message, preserve the offer context, and support response capture after the campaign lands. That means the generator, landing flow, and reporting need to work together.",
    workflowPoints: [
      "Keep scan destinations aligned with the CTA on print",
      "Use feedback and rating to measure response, not just scans",
      "Connect campaign QR pages to the wider pricing and content funnel",
    ],
    faqs: [
      {
        question: "Can marketers use branded QR codes?",
        answer:
          "Yes. The styling system supports foreground/background colors, dot styles, corner styling, and optional logos.",
      },
      {
        question: "Can we link to campaign-specific pages?",
        answer:
          "Yes. Use the single generator for one-off campaigns or bulk CSV jobs for large print runs and segmented destinations.",
      },
    ],
  },
  {
    slug: "qr-codes-for-events",
    href: "/qr-codes-for-events",
    title: "QR Codes for Events and Tickets",
    description:
      "Create event, ticket, registration, and on-site engagement QR codes for high-volume check-in and attendee communication.",
    heroKicker: "Events use case",
    heroTitle: "Move attendees from invite to check-in with one scan.",
    heroBody:
      "Generate event QR codes for invites, schedules, maps, booth engagement, session feedback, and sponsor activations from a single operational system.",
    bullets: [
      "Use event QR type for schedule details and venue context",
      "Bulk-generate attendee assets with CSV imports",
      "Collect feedback after sessions or activations",
    ],
    workflowTitle: "Event teams need QR coverage before, during, and after the event.",
    workflowBody:
      "A useful event QR system supports registration, schedules, wayfinding, booth engagement, and post-session feedback. The workflow has to stay clear for operators while still feeling smooth for attendees who scan in fast-moving environments.",
    workflowPoints: [
      "Use one setup for attendee-facing details and operator-facing bulk output",
      "Generate event assets in batches when guest lists grow",
      "Capture feedback while sessions and activations are still fresh",
    ],
    faqs: [
      {
        question: "Can this support large attendee lists?",
        answer:
          "Yes. Bulk CSV generation and ZIP outputs are built for repeated high-volume jobs, with job states visible in dashboard and mobile.",
      },
      {
        question: "Can attendees leave feedback after an event?",
        answer:
          "Yes. Public feedback and rating flows are already supported so post-event response capture is part of the same platform.",
      },
    ],
  },
  {
    slug: "qr-codes-for-inventory-packaging",
    href: "/qr-codes-for-inventory-packaging",
    title: "QR Codes for Inventory and Packaging",
    description:
      "Create scannable labels for product packaging, inventory control, warehouse workflows, and post-purchase experiences.",
    heroKicker: "Operations use case",
    heroTitle: "Keep packaging, inventory, and product experience connected.",
    heroBody:
      "From warehouse bin labels to customer-facing inserts, QRBulkGen lets operations teams generate clean outputs at scale and keep artifact delivery organized.",
    bullets: [
      "Generate product-linked QR codes in bulk",
      "Track ZIP outputs and row-level job items",
      "Use PDF, gallery, and support content after purchase",
    ],
    workflowTitle: "Packaging and inventory workflows need reliability more than gimmicks.",
    workflowBody:
      "For packaging inserts, warehouse labels, and product-linked experiences, teams need clean naming, predictable output, and a simple way to route scans into the right support content after purchase. That is where a real queue and artifact history matter.",
    workflowPoints: [
      "Keep SKU-scale batches organized with downloadable artifacts",
      "Support support-doc, gallery, and feedback flows after purchase",
      "Make warehouse and brand teams work from the same operational output",
    ],
    faqs: [
      {
        question: "Can operations teams reuse one style across many SKUs?",
        answer:
          "Yes. Bulk jobs reuse the same visual settings, helping brands maintain consistency across packaging runs and warehouse labeling.",
      },
      {
        question: "Can files be reviewed after generation?",
        answer:
          "Yes. Dashboard history and artifacts keep output status visible, and completed jobs can be downloaded later.",
      },
    ],
  },
];

export const blogPosts = [
  {
    slug: "bulk-qr-code-generator-guide",
    title: "Bulk QR Code Generator Guide for Operations Teams",
    description:
      "A practical guide to preparing CSV files, styling outputs, monitoring job states, and downloading finished QR ZIP artifacts.",
    category: "Bulk QR",
    date: "March 25, 2026",
    readTime: "7 min read",
    relatedLandingHref: "/bulk-qr-codes",
    sections: [
      {
        heading: "Why bulk QR generation breaks down in spreadsheets alone",
        paragraphs: [
          "The hard part of large QR campaigns is not generating one code. It is making hundreds or thousands of outputs consistent, downloadable, and traceable when something fails.",
          "A strong bulk workflow needs required-column validation, queue states, artifact packaging, and row-level visibility for issues. That is the difference between a demo and an operational tool.",
        ],
      },
      {
        heading: "What a production-safe CSV workflow should include",
        paragraphs: [
          "At minimum, every row should have the fields required for its QR type and a filename column so downstream downloads stay organized.",
          "The system should validate the file before queueing, capture total requested rows, and expose completion or failure counts so teams know when a print or packaging run is ready.",
        ],
        bullets: [
          "Validate required columns before queueing",
          "Keep a filename column for asset naming",
          "Track queued, processing, completed, and failed states",
          "Package the final result into one ZIP artifact",
        ],
      },
      {
        heading: "How QRBulkGen fits the workflow",
        paragraphs: [
          "QRBulkGen uploads the CSV, persists a bulk job, hands processing to a worker, and records counts plus artifacts for the finished run.",
          "That means the operator can move on to other tasks while the generation pipeline handles packaging and ZIP delivery in the background.",
        ],
      },
    ],
  },
  {
    slug: "qr-codes-for-marketing-campaigns",
    title: "How Marketing Teams Use QR Codes Without Killing Conversion",
    description:
      "Plan campaign QR experiences that feel intentional, branded, and measurable instead of rushed and generic.",
    category: "Marketing",
    date: "March 25, 2026",
    readTime: "6 min read",
    relatedLandingHref: "/qr-codes-for-marketing",
    sections: [
      {
        heading: "The real marketing goal is not the scan",
        paragraphs: [
          "A scan is only the handoff. The job of the QR code is to move someone into a useful next action: claim an offer, see product proof, register for an event, or leave feedback.",
          "That means campaign teams need better destination planning and stronger visual consistency than most free QR tools provide.",
        ],
      },
      {
        heading: "What strong campaign QR execution looks like",
        paragraphs: [
          "The visual should align with the campaign, the call to action should be clear, and the destination should continue the message instead of feeling disconnected.",
        ],
        bullets: [
          "Use styling that feels on-brand, not default",
          "Pair every QR code with a clear CTA",
          "Keep scan destinations fast and mobile-friendly",
          "Capture rating or feedback where it supports post-campaign learning",
        ],
      },
      {
        heading: "Where QR codes create the most lift",
        paragraphs: [
          "Print inserts, event signage, menus, product packaging, direct mail, and in-store promos all become stronger when the scan resolves to a useful, campaign-specific experience.",
        ],
      },
    ],
  },
  {
    slug: "event-qr-codes-check-in-feedback",
    title: "Event QR Codes for Check-In, Schedules, and Feedback",
    description:
      "Use one QR system for event registration, schedules, venue details, and post-session feedback without stitching tools together.",
    category: "Events",
    date: "March 25, 2026",
    readTime: "5 min read",
    relatedLandingHref: "/qr-codes-for-events",
    sections: [
      {
        heading: "Events need more than ticket scans",
        paragraphs: [
          "Modern event teams use QR codes before, during, and after the event. Registration links, booth engagement, session maps, and attendee feedback all fit naturally into the same motion.",
        ],
      },
      {
        heading: "Why bulk matters for events",
        paragraphs: [
          "Once attendee counts rise, teams need CSV workflows so assets can be prepared in batches, monitored reliably, and downloaded in one organized package.",
        ],
      },
      {
        heading: "Add feedback at the end, not as an afterthought",
        paragraphs: [
          "Feedback and rating QR flows are valuable immediately after sessions or activations, when context is still fresh. Building them into the same system shortens the turnaround from event to learning.",
        ],
      },
    ],
  },
  {
    slug: "inventory-packaging-qr-operations",
    title: "Using QR Codes for Inventory and Packaging Operations",
    description:
      "A playbook for packaging inserts, warehouse labels, product lookups, and post-purchase support content.",
    category: "Operations",
    date: "March 25, 2026",
    readTime: "6 min read",
    relatedLandingHref: "/qr-codes-for-inventory-packaging",
    sections: [
      {
        heading: "Packaging QR codes connect operations and customer experience",
        paragraphs: [
          "Packaging is one of the few surfaces owned by both operations and brand. A QR code on that surface can route to setup guides, product registration, support docs, warranties, or campaigns.",
        ],
      },
      {
        heading: "Operational detail still matters",
        paragraphs: [
          "If the asset naming is inconsistent, if counts are unknown, or if failed rows are hard to inspect, warehouse and vendor teams lose time quickly. Bulk generation needs job discipline.",
        ],
      },
      {
        heading: "Think beyond a single destination",
        paragraphs: [
          "Gallery, PDF, feedback, and rating flows open new post-purchase experiences. That lets the same packaging system support onboarding, product education, and customer insight.",
        ],
      },
    ],
  },
  {
    slug: "single-vs-bulk-qr-generator",
    title: "When to Use Single QR Generation vs Bulk CSV Generation",
    description:
      "Choose the right workflow based on campaign size, operational complexity, and turnaround needs.",
    category: "Workflow",
    date: "March 25, 2026",
    readTime: "5 min read",
    relatedLandingHref: "/single-qr-codes",
    sections: [
      {
        heading: "Use single generation when speed matters most",
        paragraphs: [
          "Single generation is best when a marketer, operator, or founder needs one polished output now. It gives instant preview, download, and style changes before the file is shared or printed.",
        ],
      },
      {
        heading: "Use bulk when consistency matters more than immediacy",
        paragraphs: [
          "CSV generation wins when the same visual system needs to be applied to many rows at once. Instead of repeating the same manual setup, teams queue one job and monitor status until delivery.",
        ],
      },
      {
        heading: "A healthy product should support both",
        paragraphs: [
          "Most teams need both flows. One-off generation handles urgent work and experiments, while bulk generation supports launches, warehouse runs, and event-scale output.",
        ],
      },
    ],
  },
  {
    slug: "feedback-rating-qr-codes",
    title: "Why Feedback and Rating QR Codes Belong in the Core Product",
    description:
      "Feedback collection becomes more useful when it is part of the same QR system as generation, packaging, and campaign delivery.",
    category: "Feedback",
    date: "March 25, 2026",
    readTime: "6 min read",
    relatedLandingHref: "/qr-codes-for-marketing",
    sections: [
      {
        heading: "The QR code should not stop at the destination",
        paragraphs: [
          "A QR scan can do more than open a page. It can ask for a rating, gather qualitative response, or guide someone into a more structured post-purchase workflow.",
        ],
      },
      {
        heading: "Why integrated flows matter",
        paragraphs: [
          "When feedback and rating live in a separate tool, teams lose context. When they live in the same generator platform, operators know which assets created which responses and can improve faster.",
        ],
      },
      {
        heading: "Use cases where this matters most",
        paragraphs: [],
        bullets: [
          "Events collecting session feedback",
          "Packaging inserts collecting post-purchase ratings",
          "Marketing campaigns measuring sentiment after activation",
          "Service businesses routing scans into quick response capture",
        ],
      },
    ],
  },
];

export function getBlogPost(slug) {
  return blogPosts.find((post) => post.slug === slug) || null;
}

export function getLandingPage(slug) {
  return landingPages.find((page) => page.slug === slug) || null;
}
