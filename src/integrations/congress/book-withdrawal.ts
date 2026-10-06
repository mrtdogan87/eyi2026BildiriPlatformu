import type {Prisma} from '@prisma/client';
// Public access decisions belong to the PDF, independently of the archive switch.
export async function bookWithdrawn(db:Prisma.TransactionClient,congressId:string,bookId:string){
 const settings=await db.archiveSettings.findUnique({where:{congressId},select:{withdrawnBooks:true}});
 if((settings?.withdrawnBooks as string[]|undefined)?.includes(bookId))return true;
 return !!await db.archiveEvent.findFirst({where:{congressId,action:'AUTHOR_BOOK_WITHDRAW',detail:{path:['bookId'],equals:bookId}},select:{id:true}});
}
