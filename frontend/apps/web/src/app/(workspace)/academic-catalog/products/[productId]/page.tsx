import { ProductDetailScreen } from "@/features/academic-catalog"
export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) { const { productId } = await params; return <ProductDetailScreen productId={productId} /> }
