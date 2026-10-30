import sharp from 'sharp';
import {createHash} from 'node:crypto';

// Leave room for multipart metadata below the deployment's request-size limit.
export const MAX_EVIDENCE_BYTES=3*1024*1024;
export async function prepareEvidenceImage(input:Buffer,mime:string){
 if(!input.length||input.length>MAX_EVIDENCE_BYTES)throw Error('Photo size must be between 1 byte and 3 MB');
 const formats:Record<string,string>={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'};
 if(!formats[mime])throw Error('Choose a JPEG, PNG or WebP photo');
 const decoder=sharp(input,{limitInputPixels:20000000,failOn:'warning'});
 const metadata=await decoder.metadata();
 if(metadata.format!==formats[mime])throw Error('Photo contents do not match its file type');
 if((metadata.pages||1)>1)throw Error('Choose a single photo');
 const bytes=await decoder.rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
 if(bytes.length>MAX_EVIDENCE_BYTES)throw Error('Photo size is too large after processing');
 return {bytes,mime:'image/jpeg' as const,sha256:createHash('sha256').update(bytes).digest('hex')};
}
