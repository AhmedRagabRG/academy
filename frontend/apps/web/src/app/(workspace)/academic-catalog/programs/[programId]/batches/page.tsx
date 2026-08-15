import { ProgramBatchesScreen } from "@/features/program-batches"
export default async function Page({params}:{params:Promise<{programId:string}>}){const{programId}=await params;return <ProgramBatchesScreen programId={programId}/>}
