import { createFileRoute } from "@tanstack/react-router";
import { DownloadPage } from "@/components/download-page";
export const Route = createFileRoute("/$slug")({
 head: ({params}) => ({meta: [
 {title: `${params.slug} – Android App Download | Desitales`},
 {name:"description",content:`Download the Android app from ${params.slug} on Desitales.`},
 {property:"og:title",content:`${params.slug} – App Download`},
 {property:"og:description",content:`Official app download page for ${params.slug}.`},
 {property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}
 ]}),
 component: Page
});
function Page() { const {slug} = Route.useParams(); return <DownloadPage slug={slug} />; }
