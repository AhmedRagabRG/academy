import { EditProgramBatchScreen } from "@/features/program-batches"
export default async function Page({params}:{params:Promise<{programId:string;batchId:string}>}){const{programId,batchId}=await params;return <EditProgramBatchScreen programId={programId} batchId={batchId}/>}
