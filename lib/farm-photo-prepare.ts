export async function prepareFarmPhoto(original:Blob):Promise<Blob>{
 if(!['image/jpeg','image/png','image/webp'].includes(original.type)||original.size>25*1024*1024)throw Error('Choose a JPEG, PNG or WebP photo smaller than 25 MB');
 const image=await createImageBitmap(original);
 try{
  if(image.width*image.height>40_000_000)throw Error('Choose a photo smaller than 40 megapixels');
  const ratio=Math.min(1,2000/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
  canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);
  const context=canvas.getContext('2d');if(!context)throw Error('Photo preparation is unavailable. Keep your original and retry.');
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const upload=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Photo could not be prepared')),'image/jpeg',0.85));
  if(upload.size>3*1024*1024)throw Error('This photo is too large to send. Choose a smaller photo.');
  return upload;
 }finally{image.close();}
}
