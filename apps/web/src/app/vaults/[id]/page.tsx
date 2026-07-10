import VaultDetailContent from "./vault-detail-content";

export default async function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Data now loads client-side via InstantDB live queries.
    return <VaultDetailContent params={{ id }} />;
}
