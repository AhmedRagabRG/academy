import { EditProductScreen } from "@/features/academic-catalog"
export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) { const { productId } = await params; return <EditProductScreen productId={productId} /> }
